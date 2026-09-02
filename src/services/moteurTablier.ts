import { CommandeTablier, PieceACouper } from '../types';

/**
 * Constantes de déduction pour Volet Roulant
 * Règle atelier :
 * - Si Tablier AVEC VOLET (VOLET_COMPLET ou avec coulisses) :
 *    - Type 43 mm : Déduction Lame Tablier = -65 mm, Déduction Lame Finale = -65 mm
 *    - Type 55 mm : Déduction Lame Tablier = -28 mm, Déduction Lame Finale = -28 mm
 *    - Hauteur des 2 Coulisses = Hauteur saisie dans la commande (déduction = 0 mm)
 * - Si TABLIER SEUL (sans volet) :
 *    - Déduction = 0 mm (longueur de coupe = Largeur saisie)
 *    - Pas de coulisse générée
 */
export const DEDUCTION_VOLET_43_MM = -65;
export const DEDUCTION_VOLET_55_MM = -28;
export const DEDUCTION_VOLET_COULISSE_MM = 0;

export function getHauteurLameTablierHelper(code?: string, desig?: string, fallbackHauteur?: number): number {
  const str = `${code || ''} ${desig || ''}`.toUpperCase();
  if (str.includes('55') || code === 'ART0048' || code === 'ART0046') {
    return 55;
  }
  if (str.includes('43') || str.includes('40') || code === 'ART0040' || code === 'ART0045' || code === 'ART0047') {
    return 43;
  }
  if (fallbackHauteur && fallbackHauteur > 0 && fallbackHauteur <= 60 && fallbackHauteur !== 45) {
    return fallbackHauteur;
  }
  return 43;
}

export function getDeductionTablier(hauteurLame: number, isAvecVolet: boolean): number {
  if (!isAvecVolet) return 0;
  return Number(hauteurLame) === 55 ? DEDUCTION_VOLET_55_MM : DEDUCTION_VOLET_43_MM;
}

export function getDeductionLameFinale(hauteurLame: number, isAvecVolet: boolean): number {
  if (!isAvecVolet) return 0;
  return Number(hauteurLame) === 55 ? DEDUCTION_VOLET_55_MM : DEDUCTION_VOLET_43_MM;
}

export function calculerNbLame(hauteur: number, hauteurLameTablier: number): number {
  if (hauteurLameTablier <= 0) {
    throw new Error('La hauteur de lame de tablier doit être supérieure à 0');
  }
  // Règle validée par l'atelier (§9) : arrondi supérieur direct (Math.ceil) sans marge additionnelle
  return Math.ceil(hauteur / hauteurLameTablier);
}

export function calculerTablier(commande: CommandeTablier): {
  commande: CommandeTablier;
  nbLame: number;
  longueurLame: number;
  totalLames: number;
  piecesLames: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[];
  piecesLameFinale?: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[];
  piecesCoulisses?: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[];
} {
  const hLame = getHauteurLameTablierHelper(commande.articleCode, commande.articleDesignation, commande.hauteur_lame_tablier);
  const nbLame = calculerNbLame(commande.hauteur, hLame);
  const isAvecVolet = commande.typeFabrication === 'VOLET_COMPLET' || commande.avecCoulisses;
  const dedTablier = getDeductionTablier(hLame, !!isAvecVolet);
  const lenLame = commande.largeur + dedTablier;
  const totalLames = nbLame * Math.max(1, commande.quantite);
  
  // Format repère propre : e.g. "1R2" ou "1R2 (Cmd: S-A26698)"
  const repereCode = commande.repere.trim() || 'Tablier';
  const label = commande.refCommande ? `${repereCode} [${commande.refCommande}]` : repereCode;

  const piecesLames = [
    {
      longueur: lenLame,
      quantite: totalLames,
      label: `${label} (${totalLames} lames ${hLame}mm)`,
      repere: repereCode,
      refCommande: commande.refCommande
    }
  ];

  let piecesLameFinale: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[] | undefined;
  if (commande.avecLameFinale) {
    const dedLF = getDeductionLameFinale(hLame, !!isAvecVolet);
    const lenLF = commande.largeur + dedLF;
    piecesLameFinale = [
      {
        longueur: lenLF,
        quantite: Math.max(1, commande.quantite),
        label: `LF-${repereCode} (Lame finale ${lenLF}mm)`,
        repere: `LF-${repereCode}`,
        refCommande: commande.refCommande
      }
    ];
  }

  let piecesCoulisses: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[] | undefined;
  if (isAvecVolet) {
    // Hauteur des deux coulisses = Hauteur saisie
    const lenCoulisse = commande.hauteur;
    piecesCoulisses = [
      {
        longueur: lenCoulisse,
        quantite: 2 * Math.max(1, commande.quantite),
        label: `GL-${repereCode} (2 Coulisses ${lenCoulisse}mm)`,
        repere: `GL-${repereCode}`,
        refCommande: commande.refCommande
      }
    ];
  }

  return {
    commande: { ...commande, nb_lame: nbLame, hauteur_lame_tablier: hLame },
    nbLame,
    longueurLame: lenLame,
    totalLames,
    piecesLames,
    piecesLameFinale,
    piecesCoulisses
  };
}

export function fusionnerCommandesTablier(
  resultatsTabliers: { piecesLames: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[] }[]
): { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[] {
  const pool: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[] = [];
  for (const res of resultatsTabliers) {
    pool.push(...res.piecesLames);
  }
  return pool;
}

