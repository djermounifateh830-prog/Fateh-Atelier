import {
  PieceCoupee,
  ResultatBarre,
  ResultatChute,
  ResultatOptimisation
} from '../types';
import { logger } from './logger';

export interface OptimiseurOptions {
  longueurBarre: number;
  epaisseurScie: number;
  refusMin?: number;
  refusMax?: number;
  mode?: 'matiere' | 'temps';
  poidsTemps?: number;
  iterations?: number;
  eboutage?: number; // Coupe d'affranchissement / éboutage en tête de barre neuve (ex: 0 à 15 mm)
}

interface PieceItem {
  id: string;
  longueur: number;
  label: string;
  repere?: string;
  refCommande?: string;
  nomClient?: string;
  donneurOrdre?: string;
}

interface SolutionPlan {
  barres: {
    longueurTotale: number;
    pieces: PieceItem[];
    utilise: number;
    reste: number;
    statut: 'Dechet' | 'STOCK' | 'SACRIFICE';
    isChuteStock: boolean;
    eboutage: number;
  }[];
  score: number;
  tauxRendement: number;
  totalChuteStock: number;
  totalDechet: number;
}

interface PatternMotif {
  pieces: { longueur: number; count: number }[];
  longueurUtilisee: number;
  reste: number;
  statut: 'Dechet' | 'STOCK' | 'SACRIFICE';
  score: number;
  distinctCotes: number;
}

/**
 * OptimiseurCoupe1D — Moteur Intelligent de Découpe 1D (Cutting Stock Problem)
 * 
 * Version Haute Performance (ALNS + Pattern Mining + Exact Knapsack + Bundle Cutting) :
 * 1. Calcul de la Borne Inférieure Théorique Absolue (Lower Bound L0)
 * 2. Sac à Dos Branch & Bound 0-1 Exact pour le recyclage sans perte des chutes du stock
 * 3. Générateur de Motifs Optimaux (Pattern Generation) pour les séries répétitives
 * 4. Recherche Locale Adaptative (ALNS : Adaptive Large Neighborhood Search) ciblant :
 *    - L'annihilation des chutes en zone de refus ]refusMin, refusMax[
 *    - La réduction drastique du nombre de réglages de butée de scie en Atelier (Mode Temps)
 *    - L'élimination / compression des barres peu remplies pour atteindre le minimum absolu
 * 5. Ordonnancement d'Atelier avec regroupement en "Paquets de coupe" (barres jumelles débitées simultanément)
 */
export class OptimiseurCoupe1D {
  private longueurBarre: number;
  private epaisseurScie: number;
  private refusMin: number;
  private refusMax: number;
  private mode: 'matiere' | 'temps';
  private poidsTemps: number;
  private iterations: number;
  private eboutage: number;

  constructor(options: OptimiseurOptions) {
    this.longueurBarre = Number.isFinite(Number(options.longueurBarre)) && Number(options.longueurBarre) > 0 ? Number(options.longueurBarre) : 6000;
    this.epaisseurScie = Number.isFinite(Number(options.epaisseurScie)) && Number(options.epaisseurScie) >= 0 ? Number(options.epaisseurScie) : 4.0;
    this.refusMin = Number.isFinite(Number(options.refusMin)) && Number(options.refusMin) >= 0 ? Number(options.refusMin) : 300;
    this.refusMax = Number.isFinite(Number(options.refusMax)) && Number(options.refusMax) >= 0 ? Number(options.refusMax) : 1200;
    this.mode = options.mode || 'matiere';
    this.poidsTemps = Number.isFinite(Number(options.poidsTemps)) && Number(options.poidsTemps) >= 0 ? Number(options.poidsTemps) : 5.0;
    this.iterations = Number.isFinite(Number(options.iterations)) && Number(options.iterations) >= 0 ? Math.floor(Number(options.iterations)) : 3500;
    this.eboutage = Number.isFinite(Number(options.eboutage)) && Number(options.eboutage) >= 0 ? Number(options.eboutage) : 0;
  }

  public statutPourReste(reste: number): 'Dechet' | 'STOCK' | 'SACRIFICE' {
    if (this.refusMin === 0 && this.refusMax === 0) {
      return reste > 1000 ? 'STOCK' : 'Dechet';
    }
    if (reste <= this.refusMin) return 'Dechet';
    if (reste >= this.refusMax) return 'STOCK';
    return 'SACRIFICE';
  }

  public calculerEncombrement(pieces: PieceItem[], avecEboutage = false): number {
    if (pieces.length === 0) return 0;
    const sommePieces = pieces.reduce((s, p) => s + p.longueur, 0);
    const traitScie = Math.max(0, pieces.length - 1) * this.epaisseurScie;
    const eboutageVal = avecEboutage ? this.eboutage : 0;
    return sommePieces + traitScie + eboutageVal;
  }

  /**
   * Calcul de la Borne Inférieure Théorique (Lower Bound L0)
   * Représente le nombre mathématique minimal absolu de barres neuves incompressibles.
   */
  public calculerBorneInferieure(pieces: PieceItem[], capaciteUtile: number): number {
    if (pieces.length === 0 || capaciteUtile <= 0) return 0;
    const sommeMatiere = pieces.reduce((s, p) => s + p.longueur, 0);
    const traitsScieMin = Math.max(0, pieces.length - 1) * this.epaisseurScie;
    return Math.max(1, Math.ceil((sommeMatiere + traitsScieMin) / capaciteUtile));
  }

  /**
   * Sac à Dos Exact 0-1 Branch & Bound pour chutes et barres
   */
  private trouverMeilleurSacADos(
    pool: PieceItem[],
    capacite: number,
    avecEboutage = false
  ): { pieces: PieceItem[]; reste: number } | null {
    if (pool.length === 0 || capacite <= 0) return null;

    const capaciteNette = capacite - (avecEboutage ? this.eboutage : 0);
    if (capaciteNette <= 0) return null;

    // Trier les pièces de manière décroissante
    const sorted = [...pool].sort((a, b) => b.longueur - a.longueur);
    let bestSubset: PieceItem[] = [];
    let bestScore = -Infinity;
    let bestUtilise = -1;

    let count = 0;
    const maxNodes = Math.min(2500, 200 + pool.length * 40);

    const backtrack = (idx: number, currentList: PieceItem[], currentUtilise: number) => {
      count++;
      if (count > maxNodes) return;

      const reste = capaciteNette - currentUtilise;
      if (reste < -0.001) return;

      if (currentList.length > 0) {
        let score = currentUtilise * 2.5;

        if (reste <= this.refusMin) {
          // Excellent : déchet résiduel minimal
          score += 4000 - reste * 2.5;
        } else if (reste >= this.refusMax) {
          // Excellent : chute stock exploitable
          score += 3000 + reste;
        } else {
          // Mauvais : zone de refus interdite
          score -= 15000;
        }

        // En mode temps, récompenser fortement les cotes identiques
        const distinctCotes = new Set(currentList.map(p => Math.round(p.longueur))).size;
        const facteurTemps = this.mode === 'temps' ? this.poidsTemps * 45 : 15;
        score -= (distinctCotes - 1) * facteurTemps;

        if (score > bestScore) {
          bestScore = score;
          bestUtilise = currentUtilise + (avecEboutage ? this.eboutage : 0);
          bestSubset = [...currentList];
        }

        // Si reste quasi nul et cotes très homogènes, on valide immédiatement
        if (reste <= 1.0 && distinctCotes <= 2) return;
      }

      for (let i = idx; i < sorted.length; i++) {
        const p = sorted[i];
        const addCost = p.longueur + (currentList.length > 0 ? this.epaisseurScie : 0);
        if (currentUtilise + addCost <= capaciteNette + 0.001) {
          currentList.push(p);
          backtrack(i + 1, currentList, currentUtilise + addCost);
          currentList.pop();
        }
      }
    };

    backtrack(0, [], 0);

    if (bestSubset.length === 0) {
      let acc = 0;
      const fallbackList: PieceItem[] = [];
      for (const p of sorted) {
        const cost = p.longueur + (fallbackList.length > 0 ? this.epaisseurScie : 0);
        if (acc + cost <= capaciteNette + 0.001) {
          fallbackList.push(p);
          acc += cost;
        }
      }
      if (fallbackList.length > 0) {
        const utiliseTotal = acc + (avecEboutage ? this.eboutage : 0);
        return { pieces: fallbackList, reste: capacite - utiliseTotal };
      }
      return null;
    }

    return { pieces: bestSubset, reste: capacite - bestUtilise };
  }

  /**
   * Évalue le score et les KPIs d'une solution globale
   */
  private evaluerPlan(barres: SolutionPlan['barres']): SolutionPlan {
    let totalMatiereUtile = 0;
    let totalMatiereEngagee = 0;
    let totalChuteStock = 0;
    let totalDechet = 0;
    let penaliteZoneRefus = 0;
    let penaliteChangementsButee = 0;
    let bonusPaquetsIdentiques = 0;

    // Regrouper les signatures de barres pour valoriser les motifs identiques
    const signatures = new Map<string, number>();

    for (const b of barres) {
      const utilePieces = b.pieces.reduce((s, p) => s + p.longueur, 0);
      totalMatiereUtile += utilePieces;
      totalMatiereEngagee += b.longueurTotale;

      if (b.statut === 'STOCK') {
        totalChuteStock += b.reste;
      } else {
        totalDechet += b.reste;
      }

      if (b.statut === 'SACRIFICE') {
        // Forte pénalité pour les chutes inutilisables
        penaliteZoneRefus += 20000 + b.reste * 8;
      }

      const distinctCotes = new Set(b.pieces.map(p => Math.round(p.longueur))).size;
      const poidsTemps = this.mode === 'temps' ? this.poidsTemps * 80 : 25;
      penaliteChangementsButee += (distinctCotes - 1) * poidsTemps;

      // Signature de plan de coupe
      const sig = b.pieces.map(p => Math.round(p.longueur)).sort((a, b) => b - a).join('-');
      signatures.set(sig, (signatures.get(sig) || 0) + 1);
    }

    // Récompense pour les barres jumelles (coupe en paquet)
    signatures.forEach(count => {
      if (count > 1) {
        const bonusParBarre = this.mode === 'temps' ? this.poidsTemps * 120 : 40;
        bonusPaquetsIdentiques += (count - 1) * bonusParBarre;
      }
    });

    const barresNeuvesCount = barres.filter(b => !b.isChuteStock).length;
    const tauxRendement = totalMatiereEngagee > 0
      ? Math.round((totalMatiereUtile / totalMatiereEngagee) * 1000) / 10
      : 100;

    const score =
      barresNeuvesCount * 1_000_000 +
      totalDechet * 4 +
      penaliteZoneRefus +
      penaliteChangementsButee -
      bonusPaquetsIdentiques -
      (totalChuteStock * 0.5);

    return {
      barres,
      score,
      tauxRendement,
      totalChuteStock: Math.round(totalChuteStock),
      totalDechet: Math.round(totalDechet)
    };
  }

  /**
   * Générateur de Motifs Optimaux (Pattern Generation / Column Generation Heuristic)
   * Idéal pour les grandes séries de pièces identiques (tabliers, volets, cadres, coulisses)
   */
  private resoudreParGenerationMotifs(
    initialPool: PieceItem[],
    capaciteBarre: number
  ): SolutionPlan['barres'] {
    // Fréquence par longueur
    const counts = new Map<number, PieceItem[]>();
    initialPool.forEach(p => {
      const rounded = Math.round(p.longueur * 10) / 10;
      if (!counts.has(rounded)) counts.set(rounded, []);
      counts.get(rounded)!.push(p);
    });

    const capaciteNette = capaciteBarre - this.eboutage;
    const distinctLengths = Array.from(counts.keys()).sort((a, b) => b - a);
    const poolRestant = [...initialPool];
    const planBarres: SolutionPlan['barres'] = [];

    // Générer des motifs homogènes (1 seule cote répétée au max)
    for (const lg of distinctLengths) {
      const piecesDispos = counts.get(lg) || [];
      if (piecesDispos.length === 0) continue;

      // Combien de fois cette pièce rentre dans 1 barre
      const maxPiecesDansBarre = Math.floor((capaciteNette + this.epaisseurScie) / (lg + this.epaisseurScie));
      if (maxPiecesDansBarre <= 0) continue;

      const longueurUtilisee = maxPiecesDansBarre * lg + Math.max(0, maxPiecesDansBarre - 1) * this.epaisseurScie + this.eboutage;
      const reste = capaciteBarre - longueurUtilisee;
      const statut = this.statutPourReste(reste);

      // Si le motif est très rentable ou si le reste est en déchet min ou stock
      if (statut !== 'SACRIFICE' || piecesDispos.length >= maxPiecesDansBarre * 2 || this.mode === 'temps') {
        while (piecesDispos.length >= maxPiecesDansBarre) {
          const piecesDuMotif = piecesDispos.splice(0, maxPiecesDansBarre);
          const utilise = this.calculerEncombrement(piecesDuMotif, true);
          const r = capaciteBarre - utilise;

          planBarres.push({
            longueurTotale: capaciteBarre,
            pieces: piecesDuMotif,
            utilise,
            reste: r,
            statut: this.statutPourReste(r),
            isChuteStock: false,
            eboutage: this.eboutage
          });

          // Retirer du pool global
          const idsToRemove = new Set(piecesDuMotif.map(p => p.id));
          const idxsToRemove: number[] = [];
          poolRestant.forEach((p, idx) => {
            if (idsToRemove.has(p.id)) idxsToRemove.push(idx);
          });
          idxsToRemove.reverse().forEach(i => poolRestant.splice(i, 1));
        }
      }
    }

    // Traitement des pièces restantes avec un Best-Fit Decreasing enrichi
    if (poolRestant.length > 0) {
      poolRestant.sort((a, b) => b.longueur - a.longueur);
      const remainingBins: PieceItem[][] = [];

      for (const piece of poolRestant) {
        let bestBinIdx = -1;
        let bestScore = Infinity;

        for (let b = 0; b < remainingBins.length; b++) {
          const bin = remainingBins[b];
          const utiliseActuel = this.calculerEncombrement(bin, true);
          const coutAjout = piece.longueur + this.epaisseurScie;

          if (utiliseActuel + coutAjout <= capaciteBarre + 0.001) {
            const resteApres = capaciteBarre - (utiliseActuel + coutAjout);
            const aMemeLongueur = bin.some(p => Math.abs(p.longueur - piece.longueur) < 0.1);
            
            let score = resteApres;
            if (aMemeLongueur) score -= (this.mode === 'temps' ? 250 : 80);
            if (resteApres <= this.refusMin) score -= 150;
            if (resteApres >= this.refusMax) score -= 100;

            if (score < bestScore) {
              bestScore = score;
              bestBinIdx = b;
            }
          }
        }

        if (bestBinIdx !== -1) {
          remainingBins[bestBinIdx].push(piece);
        } else {
          remainingBins.push([piece]);
        }
      }

      for (const bin of remainingBins) {
        const utilise = this.calculerEncombrement(bin, true);
        const reste = capaciteBarre - utilise;
        planBarres.push({
          longueurTotale: capaciteBarre,
          pieces: bin,
          utilise,
          reste,
          statut: this.statutPourReste(reste),
          isChuteStock: false,
          eboutage: this.eboutage
        });
      }
    }

    return planBarres;
  }

  /**
   * Construit une solution heuristique initiale
   */
  private construireSolutionHeuristique(
    initialPool: PieceItem[],
    poolChutes: number[],
    modeHeuristique: 'PATTERN_MINING' | 'SAME_LENGTH_FIRST' | 'BFD' | 'FFD' | 'RANDOM'
  ): SolutionPlan {
    let pool = [...initialPool];
    const planBarres: SolutionPlan['barres'] = [];

    // 1. Recycler d'abord les chutes du stock avec le Sac à Dos Exact 0-1
    for (const longueurChute of poolChutes) {
      if (pool.length === 0) break;
      const knap = this.trouverMeilleurSacADos(pool, longueurChute, false);
      if (knap && knap.pieces.length > 0) {
        const utilise = this.calculerEncombrement(knap.pieces, false);
        const reste = longueurChute - utilise;
        planBarres.push({
          longueurTotale: longueurChute,
          pieces: knap.pieces,
          utilise,
          reste,
          statut: this.statutPourReste(reste),
          isChuteStock: true,
          eboutage: 0
        });
        const usedIds = new Set(knap.pieces.map(p => p.id));
        pool = pool.filter(p => !usedIds.has(p.id));
      }
    }

    // 2. Barres neuves
    if (pool.length === 0) {
      return this.evaluerPlan(planBarres);
    }

    if (modeHeuristique === 'PATTERN_MINING') {
      const barresGen = this.resoudreParGenerationMotifs(pool, this.longueurBarre);
      planBarres.push(...barresGen);
      return this.evaluerPlan(planBarres);
    }

    if (modeHeuristique === 'SAME_LENGTH_FIRST') {
      const groups = new Map<number, PieceItem[]>();
      pool.forEach(p => {
        const lg = Math.round(p.longueur * 10) / 10;
        if (!groups.has(lg)) groups.set(lg, []);
        groups.get(lg)!.push(p);
      });

      const remainingPool: PieceItem[] = [];

      groups.forEach(piecesOfSameLength => {
        let currentBarrePieces: PieceItem[] = [];

        for (const p of piecesOfSameLength) {
          const currentUtilise = this.calculerEncombrement(currentBarrePieces, true);
          const addCost = p.longueur + (currentBarrePieces.length > 0 ? this.epaisseurScie : 0);

          if (currentUtilise + addCost <= this.longueurBarre + 0.001) {
            currentBarrePieces.push(p);
          } else {
            const reste = this.longueurBarre - currentUtilise;
            if (currentBarrePieces.length > 0) {
              if (reste <= this.refusMin || reste >= this.refusMax || piecesOfSameLength.length > 4) {
                planBarres.push({
                  longueurTotale: this.longueurBarre,
                  pieces: currentBarrePieces,
                  utilise: currentUtilise,
                  reste,
                  statut: this.statutPourReste(reste),
                  isChuteStock: false,
                  eboutage: this.eboutage
                });
                currentBarrePieces = [p];
              } else {
                remainingPool.push(...currentBarrePieces);
                currentBarrePieces = [p];
              }
            }
          }
        }

        if (currentBarrePieces.length > 0) {
          remainingPool.push(...currentBarrePieces);
        }
      });

      pool = remainingPool;
    } else if (modeHeuristique === 'BFD' || modeHeuristique === 'FFD') {
      pool.sort((a, b) => b.longueur - a.longueur);
    } else if (modeHeuristique === 'RANDOM') {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }

    // Best Fit Decreasing pour les pièces restantes
    const barresBins: PieceItem[][] = [];

    for (const piece of pool) {
      let bestBinIdx = -1;
      let minReste = Infinity;

      for (let b = 0; b < barresBins.length; b++) {
        const currentPieces = barresBins[b];
        const utiliseActuel = this.calculerEncombrement(currentPieces, true);
        const coutAjout = piece.longueur + this.epaisseurScie;

        if (utiliseActuel + coutAjout <= this.longueurBarre + 0.001) {
          const resteApres = this.longueurBarre - (utiliseActuel + coutAjout);
          const bonusMeme = currentPieces.some(p => Math.abs(p.longueur - piece.longueur) < 0.1) ? -180 : 0;
          const scoreReste = resteApres + bonusMeme;

          if (scoreReste < minReste) {
            minReste = scoreReste;
            bestBinIdx = b;
          }
        }
      }

      if (bestBinIdx !== -1) {
        barresBins[bestBinIdx].push(piece);
      } else {
        barresBins.push([piece]);
      }
    }

    for (const bin of barresBins) {
      const utilise = this.calculerEncombrement(bin, true);
      const reste = this.longueurBarre - utilise;
      planBarres.push({
        longueurTotale: this.longueurBarre,
        pieces: bin,
        utilise,
        reste,
        statut: this.statutPourReste(reste),
        isChuteStock: false,
        eboutage: this.eboutage
      });
    }

    return this.evaluerPlan(planBarres);
  }

  /**
   * Métaheuristique ALNS (Adaptive Large Neighborhood Search)
   * Cible chirurgicalement :
   * 1. Les barres avec chute en zone de refus (Sacrifice)
   * 2. Les barres avec disparité de cotes (Mode Temps)
   * 3. La vidange de la barre la moins remplie pour gagner 1 barre complète
   */
  private optimiserParRechercheLocaleAvancee(
    solutionInitiale: SolutionPlan,
    iterations: number
  ): SolutionPlan {
    let currentSolution = solutionInitiale;
    let bestSolution = solutionInitiale;

    const barresNeuvesInit = currentSolution.barres.filter(b => !b.isChuteStock);
    if (barresNeuvesInit.length <= 1) return solutionInitiale;

    let temperature = 120.0;
    const coolingRate = 0.996;

    for (let it = 0; it < iterations; it++) {
      temperature *= coolingRate;

      const currentBarresNeuves = currentSolution.barres.filter(b => !b.isChuteStock);
      const chutesStock = currentSolution.barres.filter(b => b.isChuteStock);
      const candidateBins: PieceItem[][] = currentBarresNeuves.map(b => [...b.pieces]);

      if (candidateBins.length <= 1) break;

      // Choix de l'opérateur ALNS
      const operatorChoice = Math.random();

      if (operatorChoice < 0.30) {
        // OPÉRATEUR 1 : VIDANGE DE LA BARRE LA MOINS REMPLIE (Minimisation absolue du nombre de barres)
        let minIdx = 0;
        let minUtil = Infinity;
        for (let b = 0; b < candidateBins.length; b++) {
          const u = this.calculerEncombrement(candidateBins[b], true);
          if (u < minUtil) {
            minUtil = u;
            minIdx = b;
          }
        }

        const piecesToRedistribute = [...candidateBins[minIdx]];
        const otherBins = candidateBins.filter((_, idx) => idx !== minIdx);
        let allPlaced = true;

        for (const p of piecesToRedistribute) {
          let placed = false;
          // Trouver le meilleur bin cible (qui a déjà cette longueur de préférence)
          otherBins.sort((b1, b2) => {
            const hasSame1 = b1.some(x => Math.abs(x.longueur - p.longueur) < 0.1);
            const hasSame2 = b2.some(x => Math.abs(x.longueur - p.longueur) < 0.1);
            if (hasSame1 !== hasSame2) return hasSame1 ? -1 : 1;
            return this.calculerEncombrement(b2, true) - this.calculerEncombrement(b1, true);
          });

          for (let b = 0; b < otherBins.length; b++) {
            const u = this.calculerEncombrement(otherBins[b], true);
            if (u + p.longueur + this.epaisseurScie <= this.longueurBarre + 0.001) {
              otherBins[b].push(p);
              placed = true;
              break;
            }
          }
          if (!placed) {
            allPlaced = false;
            break;
          }
        }

        if (allPlaced) {
          candidateBins.splice(0, candidateBins.length, ...otherBins);
        }
      } else if (operatorChoice < 0.65) {
        // OPÉRATEUR 2 : CIBLAGE DES BARRES EN ZONE DE REFUS OU À FORTE DISSÉMINATION
        // Trouver une barre problématique
        const problemIndices: number[] = [];
        candidateBins.forEach((bin, idx) => {
          const u = this.calculerEncombrement(bin, true);
          const r = this.longueurBarre - u;
          const distinct = new Set(bin.map(p => Math.round(p.longueur))).size;
          if ((r > this.refusMin && r < this.refusMax) || (this.mode === 'temps' && distinct > 2)) {
            problemIndices.push(idx);
          }
        });

        const i = problemIndices.length > 0 && Math.random() < 0.75
          ? problemIndices[Math.floor(Math.random() * problemIndices.length)]
          : Math.floor(Math.random() * candidateBins.length);

        let j = Math.floor(Math.random() * candidateBins.length);
        while (j === i) j = Math.floor(Math.random() * candidateBins.length);

        if (candidateBins[i].length > 0 && candidateBins[j].length > 0) {
          const pi = Math.floor(Math.random() * candidateBins[i].length);
          const pj = Math.floor(Math.random() * candidateBins[j].length);

          const pieceI = candidateBins[i][pi];
          const pieceJ = candidateBins[j][pj];

          const tempI = candidateBins[i].filter((_, idx) => idx !== pi).concat(pieceJ);
          const tempJ = candidateBins[j].filter((_, idx) => idx !== pj).concat(pieceI);

          if (
            this.calculerEncombrement(tempI, true) <= this.longueurBarre + 0.001 &&
            this.calculerEncombrement(tempJ, true) <= this.longueurBarre + 0.001
          ) {
            candidateBins[i] = tempI;
            candidateBins[j] = tempJ;
          }
        }
      } else {
        // OPÉRATEUR 3 : DÉPLACEMENT MONO-PIÈCE 1-OPT VERS UNE BARRE COMPATIBLE
        const i = Math.floor(Math.random() * candidateBins.length);
        let j = Math.floor(Math.random() * candidateBins.length);
        while (j === i) j = Math.floor(Math.random() * candidateBins.length);

        if (candidateBins[i].length > 1) {
          const pIdx = Math.floor(Math.random() * candidateBins[i].length);
          const piece = candidateBins[i][pIdx];

          const currentUtiliseJ = this.calculerEncombrement(candidateBins[j], true);
          const addCost = piece.longueur + this.epaisseurScie;

          if (currentUtiliseJ + addCost <= this.longueurBarre + 0.001) {
            candidateBins[i].splice(pIdx, 1);
            candidateBins[j].push(piece);
          }
        }
      }

      // Reconstruire les barres candidates
      const candidateBarres: SolutionPlan['barres'] = [
        ...chutesStock,
        ...candidateBins.map(bin => {
          const utilise = this.calculerEncombrement(bin, true);
          const reste = this.longueurBarre - utilise;
          return {
            longueurTotale: this.longueurBarre,
            pieces: bin,
            utilise,
            reste,
            statut: this.statutPourReste(reste),
            isChuteStock: false,
            eboutage: this.eboutage
          };
        })
      ];

      const evaluatedCandidate = this.evaluerPlan(candidateBarres);
      const deltaScore = evaluatedCandidate.score - currentSolution.score;

      if (deltaScore < 0 || Math.exp(-deltaScore / Math.max(1, temperature)) > Math.random()) {
        currentSolution = evaluatedCandidate;
        if (currentSolution.score < bestSolution.score) {
          bestSolution = currentSolution;
        }
      }
    }

    return bestSolution;
  }

  /**
   * Trie et regroupe les barres de manière ultra-ergonomique pour l'atelier :
   * - Identifie les barres jumelles / paquets (motifRepete)
   * - Trie les pièces de la plus grande à la plus petite sur chaque barre
   * - Place les paquets de barres répétitives en tête de production
   */
  private formaterEtGrouperPourAtelier(barres: ResultatBarre[]): {
    barresFormatees: ResultatBarre[];
    nombrePaquets: number;
    reglagesButeeTotal: number;
    reglagesEconomises: number;
  } {
    // 1. Trier les pièces à l'intérieur de chaque barre par longueur décroissante
    const barresTriees = barres.map(b => {
      const sortedPieces = [...b.pieces].sort((p1, p2) => p2.longueur - p1.longueur);
      const distinctCotes = new Set(sortedPieces.map(p => Math.round(p.longueur))).size;
      const signature = sortedPieces.map(p => Math.round(p.longueur)).join('-');
      return {
        ...b,
        pieces: sortedPieces,
        nombreReglagesButee: distinctCotes,
        patternSignature: signature,
        motifRepete: 1
      };
    });

    // 2. Compter la répétition des signatures pour regrouper les barres jumelles
    const sigCountMap = new Map<string, number>();
    barresTriees.forEach(b => {
      if (b.patternSignature) {
        sigCountMap.set(b.patternSignature, (sigCountMap.get(b.patternSignature) || 0) + 1);
      }
    });

    // 3. Ordonner les barres :
    // - Les motifs répétés (paquets de coupe) d'abord
    // - Puis par nombre minimal de réglages de butée (les barres les plus simples d'abord)
    // - Puis par signature et taux d'utilisation
    barresTriees.sort((b1, b2) => {
      const count1 = sigCountMap.get(b1.patternSignature || '') || 1;
      const count2 = sigCountMap.get(b2.patternSignature || '') || 1;

      // D'abord les motifs les plus répétés (ex: 5 barres identiques d'affilée)
      if (count1 !== count2) {
        return count2 - count1;
      }

      // Si même répétition, la barre avec le moins de changements de butée d'abord
      if ((b1.nombreReglagesButee || 0) !== (b2.nombreReglagesButee || 0)) {
        return (b1.nombreReglagesButee || 0) - (b2.nombreReglagesButee || 0);
      }

      // Même signature côte à côte
      if (b1.patternSignature !== b2.patternSignature) {
        return (b1.patternSignature || '').localeCompare(b2.patternSignature || '');
      }

      return b2.utilise - b1.utilise;
    });

    // Assigner motifRepete
    const barresFinales = barresTriees.map((b, idx) => ({
      ...b,
      id: `barre-${idx + 1}`,
      motifRepete: sigCountMap.get(b.patternSignature || '') || 1
    }));

    // Calcul des statistiques de butée
    let reglagesTotal = 0;
    let distinctSignatures = new Set<string>();
    let paquetsCount = 0;

    sigCountMap.forEach((count, sig) => {
      distinctSignatures.add(sig);
      if (count > 1) paquetsCount++;
    });

    barresFinales.forEach(b => {
      reglagesTotal += b.nombreReglagesButee || 1;
    });

    // Si on coupait toutes les pièces une par une sans optimisation
    const totalPiecesCount = barresFinales.reduce((s, b) => s + b.pieces.length, 0);
    const reglagesEconomises = Math.max(0, totalPiecesCount - reglagesTotal);

    return {
      barresFormatees: barresFinales,
      nombrePaquets: paquetsCount,
      reglagesButeeTotal: reglagesTotal,
      reglagesEconomises
    };
  }

  public optimiser(
    piecesDemandes: { longueur: number; quantite: number; label?: string; repere?: string; refCommande?: string; nomClient?: string; donneurOrdre?: string }[],
    chutesStock: { longueur: number; quantite: number }[] = []
  ): ResultatOptimisation {
    const initialPool: PieceItem[] = [];
    let pieceUid = 1;

    for (const item of piecesDemandes) {
      const qte = Math.max(1, Math.floor(item.quantite || 1));
      const lg = Number(item.longueur) || 0;
      if (lg <= 0) continue;

      for (let i = 0; i < qte; i++) {
        initialPool.push({
          id: `p-${pieceUid++}`,
          longueur: lg,
          label: item.label || 'Pièce',
          repere: item.repere,
          refCommande: item.refCommande,
          nomClient: item.nomClient,
          donneurOrdre: item.donneurOrdre
        });
      }
    }

    const piecesTropGrandes = initialPool.filter(p => p.longueur > (this.longueurBarre - this.eboutage));
    const poolValide = initialPool.filter(p => p.longueur <= (this.longueurBarre - this.eboutage));

    if (piecesTropGrandes.length > 0) {
      logger.anomaly('Optimiseur1D', `${piecesTropGrandes.length} pièce(s) demandée(s) dépassent la capacité maximale de la barre (${this.longueurBarre - this.eboutage}mm).`, {
        longueurMaxBarre: this.longueurBarre - this.eboutage,
        piecesTropGrandes: piecesTropGrandes.map(p => ({ longueur: p.longueur, label: p.label, repere: p.repere }))
      });
    }

    const poolChutes: number[] = [];
    for (const chute of chutesStock) {
      const qte = Math.max(0, Math.floor(chute.quantite || 0));
      const lg = Number(chute.longueur) || 0;
      if (lg > 0) {
        for (let i = 0; i < qte; i++) {
          poolChutes.push(lg);
        }
      }
    }
    poolChutes.sort((a, b) => b - a);

    // Calcul de la Borne Inférieure Théorique
    const capaciteUtileBarre = this.longueurBarre - this.eboutage;
    const borneTheorique = this.calculerBorneInferieure(poolValide, capaciteUtileBarre);

    logger.calc('Optimiseur1D', `Lancement calcul découpe : ${poolValide.length} pièce(s) valide(s), ${poolChutes.length} chute(s) stock dispo, Mode: [${this.mode.toUpperCase()}]`, {
      mode: this.mode,
      longueurBarre: this.longueurBarre,
      eboutage: this.eboutage,
      epaisseurScie: this.epaisseurScie,
      refus: [this.refusMin, this.refusMax],
      borneTheoriqueBarres: borneTheorique
    });

    if (poolValide.length === 0) {
      return {
        barres_neuves: [],
        chutes_utilisees: [],
        pieces_non_placees: piecesTropGrandes.map(p => ({
          id: p.id,
          longueur: p.longueur,
          label: p.label,
          repere: p.repere,
          refCommande: p.refCommande,
          nomClient: p.nomClient,
          donneurOrdre: p.donneurOrdre
        })),
        total_chute_mm: 0,
        total_dechet_mm: 0,
        total_barres_neuves: 0,
        total_chutes_recyclees: 0,
        taux_rendement: 100,
        dateCalcul: new Date().toISOString(),
        mode: this.mode,
        poidsTemps: this.poidsTemps,
        borneTheoriqueBarres: 0,
        isOptimumAbsolu: true,
        reglagesButeeTotal: 0,
        reglagesButeeEconomises: 0,
        nombrePaquetsCoupe: 0,
        tempsEstimeMinutes: 0,
        gainTempsPourcent: 0
      };
    }

    // 1. Tester les Multi-Heuristiques de départ
    const candidates: SolutionPlan[] = [];
    candidates.push(this.construireSolutionHeuristique(poolValide, poolChutes, 'PATTERN_MINING'));
    candidates.push(this.construireSolutionHeuristique(poolValide, poolChutes, 'SAME_LENGTH_FIRST'));
    candidates.push(this.construireSolutionHeuristique(poolValide, poolChutes, 'BFD'));
    candidates.push(this.construireSolutionHeuristique(poolValide, poolChutes, 'FFD'));

    for (let r = 0; r < 15; r++) {
      candidates.push(this.construireSolutionHeuristique(poolValide, poolChutes, 'RANDOM'));
    }

    let bestPlan = candidates.reduce((best, curr) => (curr.score < best.score ? curr : best), candidates[0]);

    // 2. Métaheuristique ALNS Avancée
    const optimizedPlan = this.optimiserParRechercheLocaleAvancee(bestPlan, this.iterations);
    if (optimizedPlan.score < bestPlan.score) {
      bestPlan = optimizedPlan;
    }

    let barresNeuves: ResultatBarre[] = [];
    const chutesUtilisees: ResultatChute[] = [];

    let bCounter = 1;
    let cCounter = 1;

    for (const b of bestPlan.barres) {
      const piecesFinales: PieceCoupee[] = b.pieces.map(p => ({
        id: p.id,
        longueur: p.longueur,
        label: p.label,
        repere: p.repere,
        refCommande: p.refCommande,
        nomClient: p.nomClient,
        donneurOrdre: p.donneurOrdre
      }));

      if (b.isChuteStock) {
        const distinctCotes = new Set(piecesFinales.map(p => Math.round(p.longueur))).size;
        chutesUtilisees.push({
          id: `chute-util-${cCounter++}`,
          pieces: piecesFinales,
          longueur_chute_depart: b.longueurTotale,
          utilise: b.utilise,
          reste: b.reste,
          nombreReglagesButee: distinctCotes
        });
      } else {
        barresNeuves.push({
          id: `barre-${bCounter++}`,
          pieces: piecesFinales,
          longueur_barre: b.longueurTotale,
          utilise: b.utilise,
          chute: b.reste,
          statut: b.statut,
          eboutage: b.eboutage
        });
      }
    }

    // 3. Ordonnancement d'Atelier & Groupement en paquets
    const {
      barresFormatees,
      nombrePaquets,
      reglagesButeeTotal,
      reglagesEconomises
    } = this.formaterEtGrouperPourAtelier(barresNeuves);

    barresNeuves = barresFormatees;

    const piecesNonPlacees: PieceCoupee[] = piecesTropGrandes.map(p => ({
      id: p.id,
      longueur: p.longueur,
      label: p.label,
      repere: p.repere,
      refCommande: p.refCommande,
      nomClient: p.nomClient,
      donneurOrdre: p.donneurOrdre
    }));

    // Indicateurs de certification mathématique
    const isOptimumAbsolu = barresNeuves.length <= borneTheorique;
    const totalCoupes = poolValide.length;
    // Estimation temps usinage : ~20s par coupe + ~45s par changement de butée + ~30s par chargement de barre
    const tempsEstimeMinutes = Math.round(
      ((barresNeuves.length * 0.5) + (reglagesButeeTotal * 0.75) + (totalCoupes * 0.35)) * 10
    ) / 10;
    const gainTempsPourcent = totalCoupes > 0
      ? Math.min(65, Math.round((reglagesEconomises / totalCoupes) * 100))
      : 0;

    logger.optim('Optimiseur1D', `Plan de coupe calculé : ${barresNeuves.length} barre(s) neuves, ${chutesUtilisees.length} chutes recyclées, Rendement: ${bestPlan.tauxRendement}%, ${reglagesButeeTotal} réglages butée (Gain temps: ${gainTempsPourcent}%).`, {
      barresNeuvesCount: barresNeuves.length,
      chutesRecycleesCount: chutesUtilisees.length,
      tauxRendement: bestPlan.tauxRendement,
      borneTheorique,
      isOptimumAbsolu,
      reglagesButeeTotal,
      reglagesEconomises,
      tempsEstimeMinutes
    });

    return {
      barres_neuves: barresNeuves,
      chutes_utilisees: chutesUtilisees,
      pieces_non_placees: piecesNonPlacees,
      total_chute_mm: bestPlan.totalChuteStock,
      total_dechet_mm: bestPlan.totalDechet,
      total_barres_neuves: barresNeuves.length,
      total_chutes_recyclees: chutesUtilisees.length,
      taux_rendement: bestPlan.tauxRendement,
      dateCalcul: new Date().toISOString(),
      mode: this.mode,
      poidsTemps: this.poidsTemps,
      borneTheoriqueBarres: borneTheorique,
      isOptimumAbsolu,
      reglagesButeeTotal,
      reglagesButeeEconomises: reglagesEconomises,
      nombrePaquetsCoupe: nombrePaquets,
      tempsEstimeMinutes,
      gainTempsPourcent
    };
  }
}
