import React, { useMemo, useState } from 'react';
import { ResultatOptimisation, Article, PieceCoupee, BesoinMoustiquaire, SuiviOF, LigneRetourOF, FamilleProduit } from '../../types';
import { detecterAgence } from '../../services/codificationService';
import { calculerBesoinMaille } from '../../services/moteurMoustiquaire';
import { StorageService } from '../../services/storage';
import { X, Printer, Download, Send, CheckCircle2, PackageCheck, Layers, Recycle, Scissors } from 'lucide-react';

export type FamilleOF = 'CAISSON' | 'TABLIER' | 'PRECADRE' | 'MOUSTIQUAIRE';

export interface SectionDebitOF {
  id?: string;
  titreSection: string;
  article: Article | null;
  resultat: ResultatOptimisation;
  coloris?: string;
  badge?: string;
  avecPeinture?: boolean;
  avecSousFace?: boolean;
  montageSousFace?: string;
  isSousFace?: boolean;
  famille?: FamilleProduit | string;
  type?: 'CT' | 'SF' | 'LF' | 'GL' | 'PRC';
  commandesInvolved?: string[];
}

export interface OrdreFabricationModalProps {
  isOpen: boolean;
  onClose: () => void;
  titreProduit?: string;
  refCommande: string;
  nomClient?: string;
  dateCommande?: string;
  coloris?: string;
  article?: Article | null;
  resultat?: ResultatOptimisation | null;
  sections?: SectionDebitOF[];
  lignesMoustiquaires?: BesoinMoustiquaire[];
  famille?: FamilleProduit;
  donneurOrdre?: string;
  numCommandeCaisson?: string;
  numCommandeSousFace?: string;
  numCommandeTablier?: string;
  numCommandeMoustiquaire?: string;
  numCommandePrecadre?: string;
  onOFEmis?: () => void;
}

interface PieceDecoupeeInfo {
  repere: string;
  cmdTag: string;
  longueur: number;
  labelPropre: string;
}

interface GroupeBarreNeuve {
  quantite: number;
  longueurBarre: number;
  pieces: PieceCoupee[];
  piecesInfo: PieceDecoupeeInfo[];
  utilise: number;
  chute: number;
  statut: 'Dechet' | 'STOCK' | 'SACRIFICE';
  barreIndices: number[];
}

interface GroupeChuteRecup {
  quantite: number;
  support: number;
  pieces: PieceCoupee[];
  piecesInfo: PieceDecoupeeInfo[];
  utilise: number;
  reste: number;
  chuteIndices: number[];
}

interface SectionTraitee {
  titre: string;
  badge?: string;
  article: Article | null;
  resultat: ResultatOptimisation;
  barreLongueur: number;
  lameScie: number;
  margeDebord: number;
  avecPeinture: boolean;
  avecSousFace: boolean;
  montageSousFace: string;
  isSousFace: boolean;
  famille: FamilleOF;
  commandesInvolved?: string[];
  groupesBarresNeuves: GroupeBarreNeuve[];
  groupesChutesRecup: GroupeChuteRecup[];
}

interface SynthseMatiereItem {
  famille: FamilleOF;
  codeArt: string;
  designation: string;
  longueurBarre: number;
  nbBarresNeuves: number;
  metrageBarresM: number;
  chutes: {
    longueurDepart: number;
    quantite: number;
    restePrevu: number;
    statutReste: string;
  }[];
}

/** Extrait le repère et le N° de commande d'une pièce sans redondance */
function extraireRepereEtLg(p: PieceCoupee): PieceDecoupeeInfo {
  const longueur = Math.round(p.longueur);
  let rep = (p.repere || '').trim();
  let cmd = (p.refCommande || '').trim();

  if (!rep && p.label) {
    const cleanLabel = p.label.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
    const match = cleanLabel.match(/^([^—:,\s]+)/);
    rep = match ? match[1].trim() : cleanLabel;
  }

  if (!cmd && p.label) {
    const matchCmd = p.label.match(/\[Cmd\s+([^\]]+)\]/i);
    if (matchCmd) {
      cmd = matchCmd[1].trim();
    }
  }

  return {
    repere: rep || 'PCE',
    cmdTag: cmd,
    longueur,
    labelPropre: p.label || ''
  };
}

/** Détermine de manière fiable la famille d'un profilé */
function determinerFamille(sec: SectionDebitOF, fallbackFamille?: FamilleProduit): FamilleOF {
  if (sec.famille) {
    const f = String(sec.famille).toUpperCase();
    if (f.includes('TABLIER') || f.includes('VOLET')) return 'TABLIER';
    if (f.includes('MOUSTIQUAIRE') || f.includes('MSTQ')) return 'MOUSTIQUAIRE';
    if (f.includes('PRECADRE') || f.includes('PRC')) return 'PRECADRE';
    if (f.includes('CAISSON')) return 'CAISSON';
  }

  if (sec.type) {
    if (sec.type === 'PRC') return 'PRECADRE';
    if (sec.type === 'LF') return 'TABLIER';
    if (sec.type === 'CT') {
      const tit = (sec.titreSection || '').toUpperCase();
      if (tit.includes('TABLIER') || tit.includes('LAME')) return 'TABLIER';
      return 'CAISSON';
    }
    if (sec.type === 'SF') {
      const tit = (sec.titreSection || '').toUpperCase();
      if (tit.includes('MSTQ') || tit.includes('MOUST') || tit.includes('BARRE INF')) return 'MOUSTIQUAIRE';
      return 'CAISSON';
    }
    if (sec.type === 'GL') {
      const tit = (sec.titreSection || '').toUpperCase();
      if (tit.includes('MSTQ') || tit.includes('MOUST')) return 'MOUSTIQUAIRE';
      return 'TABLIER';
    }
  }

  const titreUpper = (sec.titreSection || sec.article?.designation || '').toUpperCase();
  if (titreUpper.includes('CAISSON') || titreUpper.includes('SOUS-FACE') || titreUpper.includes('SF 200') || titreUpper.includes('SF 300') || titreUpper.includes('SOMO 25') || titreUpper.includes('SOMO 30')) {
    return 'CAISSON';
  }
  if (titreUpper.includes('TABLIER') || titreUpper.includes('LAME TABLIER') || titreUpper.includes('LAME FINALE') || titreUpper.includes('COULISSE VOLET') || titreUpper.includes('T-45') || titreUpper.includes('T-55') || titreUpper.includes('T-77')) {
    return 'TABLIER';
  }
  if (titreUpper.includes('PRÉCADRE') || titreUpper.includes('PRECADRE') || titreUpper.includes('RENFORT') || titreUpper.includes('TRAVERSE') || titreUpper.includes('MONTANT')) {
    return 'PRECADRE';
  }
  if (titreUpper.includes('MOUSTIQUAIRE') || titreUpper.includes('MSTQ') || titreUpper.includes('MAILLE') || titreUpper.includes('PLISSÉE') || titreUpper.includes('CADRE MSTQ') || titreUpper.includes('BARRE INF')) {
    return 'MOUSTIQUAIRE';
  }

  if (fallbackFamille === 'TABLIER') return 'TABLIER';
  if (fallbackFamille === 'PRECADRE') return 'PRECADRE';
  if (fallbackFamille === 'MOUSTIQUAIRE') return 'MOUSTIQUAIRE';
  return 'CAISSON';
}

export const OrdreFabricationModal: React.FC<OrdreFabricationModalProps> = ({
  isOpen,
  onClose,
  titreProduit = 'Fiche de Coupe',
  refCommande,
  nomClient,
  dateCommande,
  coloris = '',
  article = null,
  resultat = null,
  sections,
  lignesMoustiquaires = [],
  famille = 'CAISSON',
  donneurOrdre = '',
  numCommandeCaisson = '',
  numCommandeSousFace = '',
  numCommandeTablier = '',
  numCommandeMoustiquaire = '',
  numCommandePrecadre = '',
  onOFEmis
}) => {
  const [ofEmis, setOfEmis] = useState<boolean>(false);
  const [isEmitting, setIsEmitting] = useState<boolean>(false);

  // Traitement et structuration de toutes les sections
  const listeSections: SectionTraitee[] = useMemo(() => {
    let rawSections: SectionDebitOF[] = [];

    if (sections && sections.length > 0) {
      rawSections = sections.filter(s => s && s.resultat);
    } else if (resultat) {
      rawSections = [{ titreSection: titreProduit, article, resultat, coloris, famille }];
    }

    return rawSections.map((sec, idx) => {
      const res = sec.resultat;
      const art = sec.article;
      const barresNeuves = Array.isArray(res.barres_neuves) ? res.barres_neuves : [];
      const chutesUtilisees = Array.isArray(res.chutes_utilisees) ? res.chutes_utilisees : [];

      const barreLongueur = art?.longeur || barresNeuves[0]?.longueur_barre || 6000;
      const lameScie = art?.lame || 4.0;
      const margeDebord = art?.debordement || 0.0;
      const familleCalculee = determinerFamille(sec, famille);

      // Groupement BARRES NEUVES
      const mapBarres = new Map<string, GroupeBarreNeuve>();
      barresNeuves.forEach((b, bIdx) => {
        const pieces = Array.isArray(b.pieces) ? b.pieces : [];
        const piecesInfo = pieces.map(p => extraireRepereEtLg(p));
        const sig = piecesInfo.map(p => `${p.longueur}_${p.repere}_${p.cmdTag}`).join('|');
        if (!mapBarres.has(sig)) {
          mapBarres.set(sig, {
            quantite: 0,
            longueurBarre: b.longueur_barre,
            pieces,
            piecesInfo,
            utilise: b.utilise,
            chute: b.chute,
            statut: b.statut,
            barreIndices: []
          });
        }
        const g = mapBarres.get(sig)!;
        g.quantite += 1;
        g.barreIndices.push(bIdx + 1);
      });
      const groupesBarresNeuves = Array.from(mapBarres.values()).sort((a, b) => b.quantite - a.quantite);

      // Groupement CHUTES RÉCUPÉRÉES
      const mapChutes = new Map<string, GroupeChuteRecup>();
      chutesUtilisees.forEach((c, cIdx) => {
        const pieces = Array.isArray(c.pieces) ? c.pieces : [];
        const piecesInfo = pieces.map(p => extraireRepereEtLg(p));
        const sig = `${Math.round(c.longueur_chute_depart)}:` + piecesInfo.map(p => `${p.longueur}_${p.repere}_${p.cmdTag}`).join('|');
        if (!mapChutes.has(sig)) {
          mapChutes.set(sig, {
            quantite: 0,
            support: c.longueur_chute_depart,
            pieces,
            piecesInfo,
            utilise: c.utilise,
            reste: c.reste,
            chuteIndices: []
          });
        }
        const g = mapChutes.get(sig)!;
        g.quantite += 1;
        g.chuteIndices.push(cIdx + 1);
      });
      const groupesChutesRecup = Array.from(mapChutes.values()).sort((a, b) => b.support - a.support);

      const titreBrut = sec.titreSection || art?.designation || `Poste ${idx + 1}`;
      const titrePropre = titreBrut.replace(/\s*\([^)]*\)/g, '').trim();
      const isSousFaceDetected = !!sec.isSousFace || sec.badge === 'SOUS-FACE' || titreBrut.includes('SF') || titreBrut.includes('Sous-Face');

      return {
        titre: titrePropre,
        badge: sec.badge,
        article: art,
        resultat: res,
        barreLongueur,
        lameScie,
        margeDebord,
        avecPeinture: !!sec.avecPeinture,
        avecSousFace: !!sec.avecSousFace,
        montageSousFace: sec.montageSousFace || 'NON_MONTEE',
        isSousFace: isSousFaceDetected,
        famille: familleCalculee,
        commandesInvolved: sec.commandesInvolved,
        groupesBarresNeuves,
        groupesChutesRecup
      };
    });
  }, [sections, resultat, article, titreProduit, coloris, famille]);

  // Regroupement par Familles
  const sectionsParFamille = useMemo(() => {
    const caissons = listeSections.filter(s => s.famille === 'CAISSON');
    const tabliers = listeSections.filter(s => s.famille === 'TABLIER');
    const precadres = listeSections.filter(s => s.famille === 'PRECADRE');
    const moustiquaires = listeSections.filter(s => s.famille === 'MOUSTIQUAIRE');

    return {
      caissons,
      tabliers,
      precadres,
      moustiquaires
    };
  }, [listeSections]);

  // Tableau récapitulatif global de toute la matière première et chutes à déstocker
  const syntheseMatieres: SynthseMatiereItem[] = useMemo(() => {
    const map = new Map<string, SynthseMatiereItem>();

    listeSections.forEach(sec => {
      const codeArt = sec.article?.code_art || sec.resultat.articleCode || 'ART-STANDARD';
      const designation = sec.article?.designation || sec.resultat.articleDesignation || sec.titre;
      const key = `${sec.famille}_${codeArt}`;

      if (!map.has(key)) {
        map.set(key, {
          famille: sec.famille,
          codeArt,
          designation,
          longueurBarre: sec.barreLongueur || 6000,
          nbBarresNeuves: 0,
          metrageBarresM: 0,
          chutes: []
        });
      }

      const item = map.get(key)!;
      const nbNeuves = sec.resultat.total_barres_neuves || 0;
      item.nbBarresNeuves += nbNeuves;
      item.metrageBarresM += (nbNeuves * item.longueurBarre) / 1000;

      sec.groupesChutesRecup.forEach(g => {
        item.chutes.push({
          longueurDepart: Math.round(g.support),
          quantite: g.quantite,
          restePrevu: Math.round(g.reste),
          statutReste: g.reste >= 1200 ? 'À STOCKER' : 'DÉCHET'
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const ordreFamilles: Record<FamilleOF, number> = { CAISSON: 1, TABLIER: 2, PRECADRE: 3, MOUSTIQUAIRE: 4 };
      return ordreFamilles[a.famille] - ordreFamilles[b.famille];
    });
  }, [listeSections]);

  // Totaux globaux
  const totalBarresNeuvesToutesSections = listeSections.reduce((s, sec) => s + (sec.resultat.total_barres_neuves || 0), 0);
  const totalChutesRecycleesToutesSections = listeSections.reduce((s, sec) => s + (sec.resultat.total_chutes_recyclees || 0), 0);
  const totalStockableMm = listeSections.reduce((s, sec) => s + (sec.resultat.total_chute_mm || 0), 0);
  const totalDechetMm = listeSections.reduce((s, sec) => s + (sec.resultat.total_dechet_mm || 0), 0);

  if (!isOpen) return null;
  if (listeSections.length === 0) return null;

  const clientAffiche = nomClient || 'CLIENT';
  const cmdAffichee = refCommande || 'COMMANDE';
  const dateAffichee = dateCommande || new Date().toLocaleDateString('fr-FR');
  const agenceInfo = detecterAgence(cmdAffichee);

  const labelFinition = (avecPeinture: boolean) => (avecPeinture ? 'AVEC PEINTURE' : 'SANS PEINTURE');
  const labelMontage = (avecSousFace: boolean, montage: string) => (!avecSousFace ? '' : montage === 'MONTEE_ATELIER' ? 'AVEC MONTAGE' : 'SANS MONTAGE');

  /* ─── RENDU HTML POUR EXPORT / TÉLÉCHARGEMENT ─────────────────────────────── */
  const buildSectionHTML = (sec: SectionTraitee) => {
    const isCaissonSection = sec.titre.toUpperCase().includes('CAISSON');
    const conditionsHtml = isCaissonSection ? [
      labelFinition(sec.avecPeinture),
      sec.avecSousFace ? labelMontage(sec.avecSousFace, sec.montageSousFace) : ''
    ].filter(Boolean).join(' | ') : '';

    const barresHTML = sec.groupesBarresNeuves.map(g => `
      <tr>
        <td style="text-align:center;font-weight:900;color:#047857;font-size:18px;background:#f0fdf4;padding:6px 4px;vertical-align:middle;">${g.quantite}</td>
        <td colspan="2" style="padding:0;vertical-align:top;border-right:1.5px solid #64748b;">
          <table style="width:100%;border-collapse:collapse;margin:0;">
            <tbody>
              ${g.piecesInfo.map((p, pIdx) => `
                <tr style="${pIdx > 0 ? 'border-top:1.5px solid #cbd5e1;' : ''}">
                  <td style="width:210px;font-family:Consolas,monospace;font-size:13px;padding:6px 8px;border:none;border-right:1.5px solid #cbd5e1;vertical-align:middle;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <strong style="font-size:14px;color:#0f172a;background:#fef3c7;padding:3px 8px;border-radius:4px;border:1px solid #fde68a;">${p.repere}</strong>
                      ${p.cmdTag ? `<span style="font-size:11px;background:#e2e8f0;color:#334155;padding:2px 6px;border-radius:4px;font-weight:bold;">[Cmd ${p.cmdTag}]</span>` : ''}
                    </div>
                  </td>
                  <td style="font-family:Consolas,monospace;font-weight:900;font-size:16px;color:#0f172a;padding:6px 8px;border:none;vertical-align:middle;text-align:center;">
                    <strong style="font-size:16px;color:#0f172a;font-family:Consolas,monospace;">${p.longueur}</strong>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </td>
        <td style="text-align:center;font-weight:900;font-family:Consolas,monospace;font-size:16px;color:#1e293b;padding:6px 4px;vertical-align:middle;">${Math.round(g.chute)} mm</td>
        <td style="text-align:center;font-weight:900;font-size:13px;color:${g.statut === 'STOCK' ? '#047857' : '#64748b'};padding:6px 4px;vertical-align:middle;">${g.statut === 'STOCK' ? '📦 À STOCKER' : '🗑️ DÉCHET'}</td>
        <td style="font-size:12px;color:#94a3b8;font-family:Consolas,monospace;padding:6px 4px;vertical-align:middle;">................................</td>
      </tr>`).join('');

    const chutesHTML = sec.groupesChutesRecup.map(g => `
      <tr>
        <td style="text-align:center;font-weight:900;color:#1d4ed8;font-size:18px;background:#eff6ff;padding:6px 4px;vertical-align:middle;">${g.quantite}</td>
        <td style="text-align:center;font-weight:900;font-family:Consolas,monospace;color:#1d4ed8;font-size:16px;background:#eff6ff;padding:6px 4px;vertical-align:middle;">${Math.round(g.support)} mm</td>
        <td colspan="2" style="padding:0;vertical-align:top;border-right:1.5px solid #64748b;">
          <table style="width:100%;border-collapse:collapse;margin:0;">
            <tbody>
              ${g.piecesInfo.map((p, pIdx) => `
                <tr style="${pIdx > 0 ? 'border-top:1.5px solid #cbd5e1;' : ''}">
                  <td style="width:210px;font-family:Consolas,monospace;font-size:13px;padding:6px 8px;border:none;border-right:1.5px solid #cbd5e1;vertical-align:middle;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <strong style="font-size:14px;color:#0f172a;background:#e0f2fe;padding:3px 8px;border-radius:4px;border:1px solid #bae6fd;">${p.repere}</strong>
                      ${p.cmdTag ? `<span style="font-size:11px;background:#e2e8f0;color:#334155;padding:2px 6px;border-radius:4px;font-weight:bold;">[Cmd ${p.cmdTag}]</span>` : ''}
                    </div>
                  </td>
                  <td style="font-family:Consolas,monospace;font-weight:900;font-size:16px;color:#0f172a;padding:6px 8px;border:none;vertical-align:middle;text-align:center;">
                    <strong style="font-size:16px;color:#0f172a;font-family:Consolas,monospace;">${p.longueur}</strong>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </td>
        <td style="text-align:center;font-weight:900;font-family:Consolas,monospace;font-size:16px;color:#1e293b;padding:6px 4px;vertical-align:middle;">${Math.round(g.reste)} mm</td>
        <td style="font-size:12px;color:#94a3b8;font-family:Consolas,monospace;padding:6px 4px;vertical-align:middle;">................................</td>
      </tr>`).join('');

    return `
    <div class="section-container" style="page-break-inside:avoid;margin-bottom:18px;">
      <div style="background:#f1f5f9;border:2px solid #0f172a;padding:6px 12px;font-weight:900;font-size:14px;text-transform:uppercase;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span>${sec.titre}</span>
        ${conditionsHtml ? `<span style="font-size:12px;color:#334155;font-weight:bold;">${conditionsHtml}</span>` : ''}
      </div>
      ${sec.groupesBarresNeuves.length > 0 ? `
      <div style="font-size:13px;font-weight:900;margin:6px 0;border-left:4px solid #047857;padding-left:8px;text-transform:uppercase;color:#065f46;">
        COUPES SUR BARRES NEUVES (${sec.resultat.total_barres_neuves} barre(s) — Rendement : ${sec.resultat.taux_rendement}%)
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead><tr style="background:#f8fafc;">
          <th style="width:50px;text-align:center;font-size:13px;">Qté</th>
          <th style="width:190px;font-size:13px;">Repère(s) &amp; N° Cmd</th>
          <th style="font-size:13px;">Longueur(s) de Coupe</th>
          <th style="width:85px;text-align:center;font-size:13px;">Reste</th>
          <th style="width:95px;text-align:center;font-size:13px;">Statut</th>
          <th style="width:140px;font-size:13px;">Nouvelle Chute</th>
        </tr></thead>
        <tbody>${barresHTML}</tbody>
      </table>` : ''}
      ${sec.groupesChutesRecup.length > 0 ? `
      <div style="font-size:13px;font-weight:900;margin:6px 0;border-left:4px solid #1d4ed8;padding-left:8px;text-transform:uppercase;color:#1e40af;">
        COUPES SUR CHUTES DU STOCK (${sec.resultat.total_chutes_recyclees} chute(s))
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead><tr style="background:#eff6ff;">
          <th style="width:50px;text-align:center;font-size:13px;">Qté</th>
          <th style="width:100px;text-align:center;font-size:13px;">Chute Prévue</th>
          <th style="width:190px;font-size:13px;">Repère(s) &amp; N° Cmd</th>
          <th style="font-size:13px;">Longueur(s) de Coupe</th>
          <th style="width:85px;text-align:center;font-size:13px;">Reste</th>
          <th style="width:140px;font-size:13px;">Nouvelle Chute</th>
        </tr></thead>
        <tbody>${chutesHTML}</tbody>
      </table>` : ''}
    </div>`;
  };

  const handleDownloadHTML = () => {
    // 1. Tableau Matière Première
    const matieresNeuvesHTML = syntheseMatieres.map(m => `
      <tr>
        <td style="font-weight:900;color:#1e3a8a;font-size:13px;padding:6px 8px;">${m.famille}</td>
        <td style="font-size:13px;font-weight:bold;padding:6px 8px;">${m.designation}</td>
        <td style="text-align:center;font-family:Consolas,monospace;font-size:15px;font-weight:900;padding:6px 6px;">${m.longueurBarre} mm</td>
        <td style="text-align:center;font-weight:900;color:#047857;font-size:17px;background:#f0fdf4;padding:6px 6px;">${m.nbBarresNeuves} barre(s)</td>
        <td style="text-align:center;font-weight:900;font-size:15px;font-family:Consolas,monospace;padding:6px 6px;">${m.metrageBarresM.toFixed(1)} m</td>
        <td style="text-align:center;font-weight:bold;color:#64748b;font-size:13px;padding:6px 6px;">[ &nbsp; ] Prélevé</td>
      </tr>`).join('');

    const chutesADestoquer = syntheseMatieres.flatMap(m => m.chutes.map(c => ({ ...c, codeArt: m.codeArt, designation: m.designation, famille: m.famille })));
    const chutesDestoquerHTML = chutesADestoquer.length > 0 ? chutesADestoquer.map(c => `
      <tr>
        <td style="font-weight:900;color:#1e3a8a;font-size:13px;padding:6px 8px;">${c.famille}</td>
        <td style="font-size:13px;font-weight:bold;padding:6px 8px;">${c.designation}</td>
        <td style="text-align:center;font-family:Consolas,monospace;font-weight:900;color:#1d4ed8;font-size:16px;background:#eff6ff;padding:6px 6px;">${c.longueurDepart} mm</td>
        <td style="text-align:center;font-weight:900;font-size:16px;padding:6px 6px;">×${c.quantite}</td>
        <td style="text-align:center;font-family:Consolas,monospace;font-size:15px;font-weight:900;padding:6px 6px;">${c.restePrevu} mm (${c.statutReste})</td>
        <td style="text-align:center;font-weight:bold;color:#64748b;font-size:13px;padding:6px 6px;">[ &nbsp; ] Déstocké</td>
      </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:#64748b;font-style:italic;padding:12px;font-size:13px;">Aucune chute du stock à prélever (100% barres neuves).</td></tr>`;

    // 2. Sections par familles
    const caissonsHTML = sectionsParFamille.caissons.map(sec => buildSectionHTML(sec)).join('');
    const tabliersHTML = sectionsParFamille.tabliers.map(sec => buildSectionHTML(sec)).join('');
    const precadresHTML = sectionsParFamille.precadres.map(sec => buildSectionHTML(sec)).join('');
    const mstqHTML = sectionsParFamille.moustiquaires.map(sec => buildSectionHTML(sec)).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Ordre de Fabrication — ${cmdAffichee} — ${clientAffiche}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 8mm 8mm 8mm; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 6px; color: #000; background: #fff; font-size: 13px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; border-bottom:2.5px solid #000; padding-bottom:6px; }
    .header-left h1 { font-size:18px; font-weight:900; margin:0 0 4px 0; text-transform:uppercase; color:#0f172a; }
    .header-left .meta { font-size:13px; color:#111; }
    .logo-m { font-size:24px; font-weight:900; color:#1e3a8a; }
    .logo-text { font-size:10px; font-weight:bold; letter-spacing:1px; color:#333; }
    .client-info-bar { display:flex; justify-content:space-between; background:#f1f5f9; padding:8px 12px; border:1.5px solid #94a3b8; font-size:13px; margin-bottom:12px; font-weight:bold; }
    .page-break { page-break-before: always; break-before: page; margin-top: 15px; }
    .famille-header { background: #0f172a; color: #fff; padding: 8px 14px; font-size: 15px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    table { width:100%; border-collapse:collapse; margin-bottom:12px; }
    th, td { border:1.5px solid #64748b; padding:6px 8px; text-align:left; vertical-align:middle; font-size: 13px; }
    th { background:#f1f5f9; font-weight:900; font-size:13px; text-transform:uppercase; color:#0f172a; }
    .global-footer-box { border:2.5px solid #000; padding:8px 14px; display:flex; justify-content:space-around; font-size:13px; font-weight:900; margin-top:12px; background:#f8fafc; page-break-inside:avoid; }
  </style>
</head>
<body>
  <!-- PAGE 1 : PRÉPARATION MATIÈRE PREMIÈRE & DÉSTOCKAGE CHUTES -->
  <div class="header">
    <div class="header-left">
      <h1>Ordre de Fabrication — Fiche de Préparation Magasin &amp; Débit</h1>
      <div class="meta">Dossier / Commandes : <strong>${cmdAffichee}</strong> | Client : <strong>${clientAffiche}</strong> | Date : ${dateAffichee}</div>
    </div>
    <div style="text-align:right;">
      <div class="logo-m">TROIS M</div>
      <div class="logo-text">ALUMINIUM</div>
    </div>
  </div>

  <div class="client-info-bar">
    <div>DONNEUR D'ORDRE : <span style="color:#1e40af;font-weight:900;">${agenceInfo.nom}</span></div>
    <div>CLIENT FINAL : <span style="font-weight:900;">${clientAffiche}</span></div>
    <div>DATE : ${dateAffichee}</div>
  </div>

  <div style="background:#e0f2fe;border:2px solid #0284c7;padding:8px 12px;font-weight:900;font-size:14px;text-transform:uppercase;margin-bottom:10px;">
    📋 1. PRÉPARATION ATELIER : BARRES NEUVES &amp; CHUTES À DÉSTOCKER
  </div>

  <div style="font-weight:900;font-size:13px;margin:6px 0;text-transform:uppercase;color:#047857;">A. Barres Neuves à sortir du Magasin :</div>
  <table>
    <thead><tr>
      <th style="width:105px;">Famille</th>
      <th>Désignation Profilé</th>
      <th style="width:100px;text-align:center;">Longueur</th>
      <th style="width:115px;text-align:center;">Qté Barres</th>
      <th style="width:100px;text-align:center;">Métrage (m)</th>
      <th style="width:100px;text-align:center;">Pointage</th>
    </tr></thead>
    <tbody>${matieresNeuvesHTML}</tbody>
  </table>

  <div style="font-weight:900;font-size:13px;margin:10px 0 6px 0;text-transform:uppercase;color:#1d4ed8;">B. Chutes Récupérées à Déstocker des Casiers :</div>
  <table>
    <thead><tr>
      <th style="width:105px;">Famille</th>
      <th>Désignation Profilé</th>
      <th style="width:120px;text-align:center;">Chute à Sortir</th>
      <th style="width:65px;text-align:center;">Qté</th>
      <th style="width:150px;text-align:center;">Reste Estimé</th>
      <th style="width:100px;text-align:center;">Pointage</th>
    </tr></thead>
    <tbody>${chutesDestoquerHTML}</tbody>
  </table>

  <div class="global-footer-box">
    <div>BARRES NEUVES : <span style="color:#047857;font-size:16px;">${totalBarresNeuvesToutesSections} barre(s)</span></div>
    <div>CHUTES RÉCUPÉRÉES : <span style="color:#1d4ed8;font-size:16px;">${totalChutesRecycleesToutesSections} chute(s)</span></div>
    <div>CHUTES À RE-STOCKER : <span style="color:#047857;font-size:16px;">${totalStockableMm} mm</span></div>
    <div>DÉCHETS ESTIMÉS : <span style="color:#b91c1c;font-size:16px;">${totalDechetMm} mm</span></div>
  </div>

  <!-- PAGES SUIVANTES PAR FAMILLE -->
  ${sectionsParFamille.caissons.length > 0 ? `
  <div class="page-break">
    <div class="famille-header">
      <span>📦 FAMILLE 1 : CAISSONS TUNNEL &amp; SOUS-FACES ALU</span>
      <span style="font-size:13px;font-family:Consolas,monospace;">
        ${numCommandeCaisson ? `N° Cmd: ${numCommandeCaisson}` : ''}
      </span>
    </div>
    ${caissonsHTML}
  </div>` : ''}

  ${sectionsParFamille.tabliers.length > 0 ? `
  <div class="page-break">
    <div class="famille-header">
      <span>🚪 FAMILLE 2 : VOLETS &amp; TABLIERS</span>
      <span style="font-size:13px;font-family:Consolas,monospace;">${numCommandeTablier ? `Cmd: ${numCommandeTablier}` : ''}</span>
    </div>
    ${tabliersHTML}
  </div>` : ''}

  ${sectionsParFamille.precadres.length > 0 ? `
  <div class="page-break">
    <div class="famille-header">
      <span>🔲 FAMILLE 3 : PRÉCADRES ALUMINIUM</span>
      <span style="font-size:13px;font-family:Consolas,monospace;">${numCommandePrecadre ? `Cmd: ${numCommandePrecadre}` : ''}</span>
    </div>
    ${precadresHTML}
  </div>` : ''}

  ${sectionsParFamille.moustiquaires.length > 0 ? `
  <div class="page-break">
    <div class="famille-header">
      <span>🖼️ FAMILLE 4 : MOUSTIQUAIRES</span>
      <span style="font-size:13px;font-family:Consolas,monospace;">${numCommandeMoustiquaire ? `Cmd: ${numCommandeMoustiquaire}` : ''}</span>
    </div>
    ${mstqHTML}
  </div>` : ''}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OF_${cmdAffichee.replace(/[^a-zA-Z0-9-_]/g, '_')}_${clientAffiche.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmettreOF = async () => {
    if (ofEmis) return;
    setIsEmitting(true);

    const lignesRetour: LigneRetourOF[] = [];
    let lineId = 1;

    listeSections.forEach(sec => {
      sec.groupesBarresNeuves.forEach(g => {
        const piecesStr = g.piecesInfo.map(p => `${p.repere} (${p.longueur}mm)`).join(' + ');
        const resteCalc = Math.round(g.chute);
        const rMin = sec.article?.refus_min ?? 300;
        const initialAction = resteCalc >= rMin ? 'A_STOCKER' : 'DECHET';

        for (let i = 0; i < g.quantite; i++) {
          lignesRetour.push({
            id: `lr-${Date.now()}-${lineId++}`,
            repere: g.piecesInfo.map(p => p.repere).join(', '),
            typeSupport: 'BARRE_NEUVE',
            articleCode: sec.article?.code_art,
            longueurPrevue: g.longueurBarre,
            restePrevuMm: resteCalc,
            resteReelMesureMm: resteCalc,
            sourceReelle: 'CONFORME',
            actionReste: initialAction,
            piecesInfoStr: piecesStr,
            saisieOperateur: ''
          });
        }
      });
      sec.groupesChutesRecup.forEach(g => {
        const piecesStr = g.piecesInfo.map(p => `${p.repere} (${p.longueur}mm)`).join(' + ');
        const resteCalc = Math.round(g.reste);
        const rMin = sec.article?.refus_min ?? 300;
        const initialAction = resteCalc >= rMin ? 'A_STOCKER' : 'DECHET';

        for (let i = 0; i < g.quantite; i++) {
          lignesRetour.push({
            id: `lr-${Date.now()}-${lineId++}`,
            repere: g.piecesInfo.map(p => p.repere).join(', '),
            typeSupport: 'CHUTE_BARRE',
            articleCode: sec.article?.code_art,
            longueurPrevue: Math.round(g.support),
            restePrevuMm: resteCalc,
            resteReelMesureMm: resteCalc,
            sourceReelle: 'CONFORME',
            actionReste: initialAction,
            piecesInfoStr: piecesStr,
            saisieOperateur: ''
          });
        }
      });
    });

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const validFamille: FamilleProduit =
      famille === 'TABLIER' || famille === 'MOUSTIQUAIRE' || famille === 'CAISSON' || famille === 'PRECADRE'
        ? famille
        : 'CAISSON';

    const suivi: SuiviOF = {
      id: `of-${Date.now()}`,
      numCommande: refCommande || 'CMD',
      nomClient: nomClient || 'CLIENT',
      donneurOrdre: donneurOrdre || '',
      famille: validFamille,
      titreSection: titreProduit || 'Fiche de Coupe',
      statut: 'EMIS',
      dateEmission: dateStr,
      lignesRetour,
      totalBarresNeuvesPrevu: totalBarresNeuvesToutesSections,
      totalChutesUtiliseesPrevu: totalChutesRecycleesToutesSections
    };

    try {
      await StorageService.upsertSuiviOF(suivi);
      setOfEmis(true);
      if (onOFEmis) {
        onOFEmis();
      }
    } catch (error: any) {
      alert(`Impossible d'émettre l'OF : ${error.message}`);
    } finally {
      setIsEmitting(false);
    }
  };

  /** Rendu des tables de coupes pour une section */
  const renderSectionCuttingTables = (sec: SectionTraitee, sIdx: number) => {
    const conditionsParts: string[] = [];
    const isCaissonHeader = sec.titre.toUpperCase().includes('CAISSON');
    if (isCaissonHeader) {
      if (sec.avecPeinture) conditionsParts.push('AVEC PEINTURE');
      else conditionsParts.push('SANS PEINTURE');
      if (sec.avecSousFace) {
        conditionsParts.push(sec.montageSousFace === 'MONTEE_ATELIER' ? 'AVEC MONTAGE' : 'SANS MONTAGE');
      }
    }

    return (
      <div key={sIdx} className="space-y-3 of-avoid-break pt-2">
        {/* Titre du profilé */}
        <div className="flex items-center justify-between gap-2 bg-slate-100 border-2 border-slate-900 py-2 px-3.5 rounded flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
            <span className="font-black text-sm sm:text-base text-slate-950 uppercase tracking-tight">{sec.titre}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {conditionsParts.map((c, i) => (
              <span
                key={i}
                className={`text-xs font-black px-2.5 py-0.5 rounded border ${
                  c.includes('AVEC PEINTURE')
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : c.includes('AVEC MONTAGE')
                    ? 'bg-sky-100 text-sky-900 border-sky-300'
                    : c.includes('SANS MONTAGE')
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Coupes sur Barres Neuves */}
        {sec.groupesBarresNeuves.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black uppercase text-slate-900 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-4 bg-emerald-700 rounded-xs"></div>
                <span className="text-emerald-900 font-black">COUPES SUR BARRES NEUVES ({sec.resultat.total_barres_neuves} barre(s))</span>
              </div>
              <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Rendement : {sec.resultat.taux_rendement}%
              </span>
            </div>
            <div className="border-2 border-slate-400 overflow-hidden rounded">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-400 text-xs sm:text-sm">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-12 border-r border-slate-300">Qté</th>
                    <th className="py-1.5 px-3 border-r border-slate-300 w-52">Repère(s) &amp; N° Cmd</th>
                    <th className="py-1.5 px-3 border-r border-slate-300">Longueur(s) de Coupe</th>
                    <th className="py-1.5 px-2 text-center w-24 border-r border-slate-300">Reste</th>
                    <th className="py-1.5 px-2 text-center w-28 border-r border-slate-300">Statut</th>
                    <th className="py-1.5 px-3">Nouvelle Chute</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {sec.groupesBarresNeuves.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-2 text-center font-black text-base sm:text-lg text-emerald-800 border-r border-slate-300 font-mono bg-emerald-50/50">
                        {g.quantite}
                      </td>
                      <td colSpan={2} className="p-0 border-r border-slate-300">
                        <table className="w-full border-collapse">
                          <tbody className="divide-y divide-slate-200">
                            {g.piecesInfo.map((p, pIdx) => (
                              <tr key={pIdx}>
                                <td className="py-2 px-3 w-52 border-r border-slate-300 font-mono">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-xs sm:text-sm text-slate-950 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                                      {p.repere}
                                    </span>
                                    {p.cmdTag && (
                                      <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300 font-bold">
                                        Cmd {p.cmdTag}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono text-center">
                                  <span className="font-mono font-black text-sm sm:text-base text-slate-950 bg-slate-100 px-3 py-1 rounded border border-slate-300 inline-block shadow-xs">
                                    {p.longueur}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-black text-sm sm:text-base text-slate-900 border-r border-slate-300">
                        {Math.round(g.chute)} mm
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-xs sm:text-sm border-r border-slate-300">
                        <span className={`px-2 py-0.5 rounded font-black ${g.statut === 'STOCK' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {g.statut === 'STOCK' ? '📦 À STOCKER' : '🗑️ DÉCHET'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs sm:text-sm text-slate-400 italic font-mono">................................</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coupes sur Chutes du Stock */}
        {sec.groupesChutesRecup.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-slate-900 px-1">
              <div className="w-2 h-4 bg-sky-700 rounded-xs"></div>
              <span className="text-sky-900 font-black">COUPES SUR CHUTES DU STOCK ({sec.resultat.total_chutes_recyclees} chute(s))</span>
            </div>
            <div className="border-2 border-slate-400 overflow-hidden rounded">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-sky-50 text-slate-900 font-black border-b-2 border-slate-400 text-xs sm:text-sm">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-12 border-r border-slate-300">Qté</th>
                    <th className="py-1.5 px-2 text-center w-28 border-r border-slate-300 bg-sky-100 text-sky-950">Chute Prévue</th>
                    <th className="py-1.5 px-3 border-r border-slate-300 w-52">Repère(s) &amp; N° Cmd</th>
                    <th className="py-1.5 px-3 border-r border-slate-300">Longueur(s) de Coupe</th>
                    <th className="py-1.5 px-2 text-center w-24 border-r border-slate-300">Reste</th>
                    <th className="py-1.5 px-3">Nouvelle Chute</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {sec.groupesChutesRecup.map((g, i) => (
                    <tr key={i} className="hover:bg-sky-50/30">
                      <td className="py-2 px-2 text-center font-black text-base sm:text-lg text-sky-800 border-r border-slate-300 font-mono bg-sky-50/50">
                        {g.quantite}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-black text-sm sm:text-base text-sky-950 border-r border-slate-300 bg-sky-100/50">
                        {Math.round(g.support)} mm
                      </td>
                      <td colSpan={2} className="p-0 border-r border-slate-300">
                        <table className="w-full border-collapse">
                          <tbody className="divide-y divide-slate-200">
                            {g.piecesInfo.map((p, pIdx) => (
                              <tr key={pIdx}>
                                <td className="py-2 px-3 w-52 border-r border-slate-300 font-mono">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-xs sm:text-sm text-sky-950 bg-sky-100 px-2.5 py-0.5 rounded border border-sky-300">
                                      {p.repere}
                                    </span>
                                    {p.cmdTag && (
                                      <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300 font-bold">
                                        Cmd {p.cmdTag}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono text-center">
                                  <span className="font-mono font-black text-sm sm:text-base text-slate-950 bg-sky-50 px-3 py-1 rounded border border-sky-300 inline-block shadow-xs">
                                    {p.longueur}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-black text-sm sm:text-base text-slate-900 border-r border-slate-300">
                        {Math.round(g.reste)} mm
                      </td>
                      <td className="py-2 px-3 text-xs sm:text-sm text-slate-400 italic font-mono">................................</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="ordre-fabrication-modal-overlay" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none">
      {/* Print Specific CSS Injector */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          html, body {
            height: auto !important;
            min-height: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 13px !important;
          }
          /* Hide non-print UI */
          body > * {
            visibility: hidden;
          }
          #ordre-fabrication-modal-overlay,
          #ordre-fabrication-modal-overlay * {
            visibility: visible;
          }
          #ordre-fabrication-modal-overlay {
            position: static !important;
            display: block !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #ordre-fabrication-card {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .of-page-break {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 15px !important;
            padding-top: 10px !important;
          }
          .of-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            page-break-inside: auto;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border-color: #475569 !important;
          }
        }
      `}</style>

      <div id="ordre-fabrication-card" className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden print:bg-white print:text-black print:max-w-none print:max-h-none print:rounded-none">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs">3M</div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Ordre de Fabrication Multi-Familles Classé</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${agenceInfo.badgeBg} ${agenceInfo.badgeColor}`}>{agenceInfo.nom}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Cmds : <span className="text-amber-400 font-mono font-bold">{cmdAffichee}</span> | Client : <strong className="text-slate-200">{clientAffiche}</strong> | {listeSections.length} profilé(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadHTML} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer">
              <Download className="w-3.5 h-3.5 text-emerald-400" /><span>Exporter HTML</span>
            </button>
            <button onClick={handlePrint} className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer">
              <Printer className="w-4 h-4" /><span>Imprimer OF (Toutes Pages)</span>
            </button>
            <button
              onClick={handleEmettreOF}
              disabled={ofEmis || isEmitting}
              className={`px-4 py-1.5 text-xs font-black rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer border ${
                ofEmis
                  ? 'bg-emerald-900/50 border-emerald-600/50 text-emerald-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white border-sky-500/40'
              }`}
              title={ofEmis ? 'OF déjà émis' : 'Émettre l\'OF'}
            >
              {ofEmis ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>{ofEmis ? 'OF Émis ✓' : 'Émettre l\'OF'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Content */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-950/70 font-sans print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white text-slate-900 p-5 sm:p-8 rounded-xl shadow-xl border border-slate-300 max-w-4xl mx-auto space-y-6 print:p-0 print:border-none print:shadow-none print:max-w-none">

            {/* ========================================================================= */}
            {/* PAGE 1 : PRÉPARATION ATELIER & MATIÈRES PREMIÈRES À DÉSTOCKER            */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              {/* En-tête Général */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2">
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                    Ordre de Fabrication — Fiche de Préparation Magasin &amp; Débit
                  </h1>
                  <div className="text-sm font-bold text-slate-800 mt-1 font-mono">
                    Commande(s) : <strong className="text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">{cmdAffichee}</strong> • Client : <strong className="text-slate-950">{clientAffiche}</strong> • Date : {dateAffichee}
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div className="w-9 h-9 bg-slate-900 rounded flex items-center justify-center text-amber-400 font-black text-base">3M</div>
                  <div>
                    <div className="font-black text-sm tracking-wider text-slate-900">TROIS M</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">ALUMINIUM</div>
                  </div>
                </div>
              </div>

              {/* Barre Donneur d'Ordre & Client */}
              <div className="grid grid-cols-3 gap-2 bg-slate-100 border-2 border-slate-300 p-2.5 rounded text-sm">
                <div>
                  <div className="text-[10px] text-slate-600 uppercase font-black">Donneur d'Ordre</div>
                  <div className="font-black text-blue-900 text-sm sm:text-base">{agenceInfo.nom}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600 uppercase font-black">Client Final</div>
                  <div className="font-black text-slate-950 text-sm sm:text-base">{clientAffiche}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600 uppercase font-black">Date Émission</div>
                  <div className="font-black text-slate-900 text-sm sm:text-base">{dateAffichee}</div>
                </div>
              </div>

              {/* Titre Bloc Préparation Magasin */}
              <div className="flex items-center gap-2.5 bg-sky-50 border-2 border-sky-800 py-2 px-3.5 rounded">
                <PackageCheck className="w-5 h-5 text-sky-800 shrink-0" />
                <span className="font-black text-sm sm:text-base text-sky-950 uppercase tracking-tight">
                  1. PRÉPARATION ATELIER : BARRES NEUVES &amp; CHUTES À DÉSTOCKER
                </span>
              </div>

              {/* TABLEAU A : BARRES NEUVES DU MAGASIN */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-emerald-900">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>A. Barres Neuves à prélever du Stock Magasin</span>
                </div>
                <div className="border-2 border-slate-400 overflow-hidden rounded">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-400 text-xs sm:text-sm">
                      <tr>
                        <th className="py-1.5 px-3 border-r border-slate-300 w-28">Famille</th>
                        <th className="py-1.5 px-3 border-r border-slate-300">Désignation Profilé</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-300 w-28">Longueur</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-300 w-32 bg-emerald-100 text-emerald-950 font-black">Qté Barres</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-300 w-28">Métrage (m)</th>
                        <th className="py-1.5 px-2 text-center w-28">Pointage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 bg-white font-mono text-sm">
                      {syntheseMatieres.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-black text-slate-900 border-r border-slate-300">
                            <span className={`px-2 py-0.5 rounded text-xs font-black ${
                              m.famille === 'CAISSON' ? 'bg-emerald-100 text-emerald-900' :
                              m.famille === 'TABLIER' ? 'bg-sky-100 text-sky-900' :
                              m.famille === 'PRECADRE' ? 'bg-indigo-100 text-indigo-900' :
                              'bg-amber-100 text-amber-900'
                            }`}>
                              {m.famille}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans font-bold text-slate-900 border-r border-slate-300 text-xs sm:text-sm">{m.designation}</td>
                          <td className="py-2 px-2 text-center font-black text-slate-900 border-r border-slate-300 text-sm sm:text-base">{m.longueurBarre} mm</td>
                          <td className="py-2 px-2 text-center font-black text-emerald-900 text-base sm:text-lg border-r border-slate-300 bg-emerald-50">
                            {m.nbBarresNeuves} b
                          </td>
                          <td className="py-2 px-2 text-center font-black text-slate-900 border-r border-slate-300 text-sm sm:text-base">{m.metrageBarresM.toFixed(1)} m</td>
                          <td className="py-2 px-2 text-center font-sans font-bold text-slate-400 text-xs sm:text-sm">[ &nbsp; ] Prélevé</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLEAU B : CHUTES DU STOCK À DÉSTOCKER */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-sky-900">
                  <Recycle className="w-4 h-4 text-sky-700" />
                  <span>B. Chutes Récupérées à Déstocker des Casiers</span>
                </div>
                {(() => {
                  const chutesADestoquer = syntheseMatieres.flatMap(m =>
                    m.chutes.map(c => ({ ...c, codeArt: m.codeArt, designation: m.designation, famille: m.famille }))
                  );

                  if (chutesADestoquer.length === 0) {
                    return (
                      <div className="p-4 rounded border-2 border-slate-300 bg-slate-50 text-slate-600 italic text-sm text-center font-medium">
                        Aucune chute du stock à prélever (fabrication 100% sur barres neuves).
                      </div>
                    );
                  }

                  return (
                    <div className="border-2 border-slate-400 overflow-hidden rounded">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-sky-50 text-slate-900 font-black border-b-2 border-slate-400 text-xs sm:text-sm">
                          <tr>
                            <th className="py-1.5 px-3 border-r border-slate-300 w-28">Famille</th>
                            <th className="py-1.5 px-3 border-r border-slate-300">Désignation Profilé</th>
                            <th className="py-1.5 px-2 text-center border-r border-slate-300 w-32 bg-sky-100 text-sky-950 font-black">Chute à Sortir</th>
                            <th className="py-1.5 px-2 text-center border-r border-slate-300 w-16">Qté</th>
                            <th className="py-1.5 px-2 text-center border-r border-slate-300 w-40">Reste Estimé</th>
                            <th className="py-1.5 px-2 text-center w-28">Pointage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 bg-white font-mono text-sm">
                          {chutesADestoquer.map((c, idx) => (
                            <tr key={idx} className="hover:bg-sky-50/40">
                              <td className="py-2 px-3 font-sans font-black text-slate-900 border-r border-slate-300">
                                <span className="px-2 py-0.5 rounded text-xs font-black bg-sky-100 text-sky-900">
                                  {c.famille}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-sans font-bold text-slate-900 border-r border-slate-300 text-xs sm:text-sm">{c.designation}</td>
                              <td className="py-2 px-2 text-center font-black text-sky-950 border-r border-slate-300 bg-sky-100/60 text-base sm:text-lg">
                                {c.longueurDepart} mm
                              </td>
                              <td className="py-2 px-2 text-center font-black text-slate-950 border-r border-slate-300 text-base sm:text-lg">×{c.quantite}</td>
                              <td className="py-2 px-2 text-center font-black border-r border-slate-300 text-slate-800 text-sm sm:text-base">
                                {c.restePrevu} mm ({c.statutReste})
                              </td>
                              <td className="py-2 px-2 text-center font-sans font-bold text-slate-400 text-xs sm:text-sm">[ &nbsp; ] Déstocké</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Bilan Synthétique Préparation */}
              <div className="border-2 border-slate-900 py-3 px-4 flex flex-wrap justify-between items-center font-black text-xs sm:text-sm uppercase bg-slate-50 gap-3 rounded">
                <div>BARRES NEUVES : <span className="text-emerald-800 font-mono text-base sm:text-lg">{totalBarresNeuvesToutesSections}</span></div>
                <div>CHUTES RÉCUPÉRÉES : <span className="text-sky-800 font-mono text-base sm:text-lg">{totalChutesRecycleesToutesSections}</span></div>
                <div>CHUTES À RE-STOCKER : <span className="text-emerald-700 font-mono text-base sm:text-lg">{totalStockableMm} mm</span></div>
                <div>DÉCHETS ESTIMÉS : <span className="text-rose-700 font-mono text-base sm:text-lg">{totalDechetMm} mm</span></div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAGE SUIVANTE : FAMILLE 1 — CAISSONS TUNNEL & SOUS-FACES ALU              */}
            {/* ========================================================================= */}
            {sectionsParFamille.caissons.length > 0 && (
              <div className="of-page-break space-y-4 pt-4 border-t-2 border-slate-900">
                <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📦</span>
                    <span className="font-black text-sm sm:text-base uppercase tracking-wide">
                      FAMILLE 1 : CAISSONS TUNNEL &amp; SOUS-FACES ALU
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold">
                    {numCommandeCaisson && (
                      <span className="bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded border border-emerald-600/50">
                        N° Cmd : {numCommandeCaisson}
                      </span>
                    )}
                  </div>
                </div>

                {sectionsParFamille.caissons.map((sec, idx) => renderSectionCuttingTables(sec, idx))}
              </div>
            )}

            {/* ========================================================================= */}
            {/* PAGE SUIVANTE : FAMILLE 2 — VOLETS & TABLIERS                             */}
            {/* ========================================================================= */}
            {sectionsParFamille.tabliers.length > 0 && (
              <div className="of-page-break space-y-4 pt-4 border-t-2 border-slate-900">
                <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🚪</span>
                    <span className="font-black text-sm sm:text-base uppercase tracking-wide">
                      FAMILLE 2 : VOLETS &amp; TABLIERS (Lames, Lame Finale, Coulisses)
                    </span>
                  </div>
                  {numCommandeTablier && (
                    <span className="bg-sky-950 text-sky-300 px-2.5 py-1 rounded border border-sky-600/50 font-mono text-xs sm:text-sm font-bold">
                      N° Cmd Tablier : {numCommandeTablier}
                    </span>
                  )}
                </div>

                {sectionsParFamille.tabliers.map((sec, idx) => renderSectionCuttingTables(sec, idx))}
              </div>
            )}

            {/* ========================================================================= */}
            {/* PAGE SUIVANTE : FAMILLE 3 — PRÉCADRES ALUMINIUM                          */}
            {/* ========================================================================= */}
            {sectionsParFamille.precadres.length > 0 && (
              <div className="of-page-break space-y-4 pt-4 border-t-2 border-slate-900">
                <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🔲</span>
                    <span className="font-black text-sm sm:text-base uppercase tracking-wide">
                      FAMILLE 3 : PRÉCADRES ALUMINIUM (Profilés, Renforts, Montants)
                    </span>
                  </div>
                  {numCommandePrecadre && (
                    <span className="bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded border border-indigo-600/50 font-mono text-xs sm:text-sm font-bold">
                      N° Cmd Précadre : {numCommandePrecadre}
                    </span>
                  )}
                </div>

                {sectionsParFamille.precadres.map((sec, idx) => renderSectionCuttingTables(sec, idx))}
              </div>
            )}

            {/* ========================================================================= */}
            {/* PAGE SUIVANTE : FAMILLE 4 — MOUSTIQUAIRES                                */}
            {/* ========================================================================= */}
            {(sectionsParFamille.moustiquaires.length > 0 || (lignesMoustiquaires && lignesMoustiquaires.filter(m => m.typeFabrication !== 'PROFILES_SEULS').length > 0)) && (
              <div className="of-page-break space-y-4 pt-4 border-t-2 border-slate-900">
                <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🖼️</span>
                    <span className="font-black text-sm sm:text-base uppercase tracking-wide">
                      FAMILLE 4 : MOUSTIQUAIRES (Toile Plissée &amp; Profilés Cadre/Coulisse)
                    </span>
                  </div>
                  {numCommandeMoustiquaire && (
                    <span className="bg-amber-950 text-amber-300 px-2.5 py-1 rounded border border-amber-600/50 font-mono text-xs sm:text-sm font-bold">
                      N° Cmd Moustiquaire : {numCommandeMoustiquaire}
                    </span>
                  )}
                </div>

                {/* Débit Toile Plissée / Maille MSTQ si applicable */}
                {lignesMoustiquaires && lignesMoustiquaires.filter(m => m.typeFabrication !== 'PROFILES_SEULS').length > 0 && (
                  <div className="space-y-2 of-avoid-break">
                    <div className="flex items-center gap-2 bg-amber-50 border-2 border-amber-800 py-1.5 px-3 rounded">
                      <span className="font-black text-xs sm:text-sm text-amber-950 uppercase">🕸️ DÉBIT &amp; FAÇONNAGE MAILLE MSTQ (TOILE PLISSÉE)</span>
                    </div>
                    <div className="border-2 border-slate-400 overflow-hidden rounded">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-400 text-xs sm:text-sm">
                          <tr>
                            <th className="py-1.5 px-2 text-center w-20 border-r border-slate-300">Repère</th>
                            <th className="py-1.5 px-3 border-r border-slate-300">Dim. Finie (L × H)</th>
                            <th className="py-1.5 px-3 border-r border-slate-300">Type Ouverture</th>
                            <th className="py-1.5 px-2 text-center border-r border-slate-300">Coupe Fixe Maille</th>
                            <th className="py-1.5 px-2 text-center border-r border-slate-300">Nb Plis (+2)</th>
                            <th className="py-1.5 px-3 border-r border-slate-300">Guidage &amp; Cordelettes</th>
                            <th className="py-1.5 px-2 text-center border-r border-slate-300">Surface</th>
                            <th className="py-1.5 px-3">Article Maille MSTQ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 font-mono text-sm bg-white">
                          {lignesMoustiquaires.filter(m => m.typeFabrication !== 'PROFILES_SEULS').map((m, idx) => {
                            const c = calculerBesoinMaille(m);
                            return (
                              <tr key={m.id || idx} className="hover:bg-slate-50">
                                <td className="py-2 px-2 text-center font-black text-amber-900 border-r border-slate-300 text-sm sm:text-base">{m.repere}</td>
                                <td className="py-2 px-3 font-black text-slate-950 border-r border-slate-300 text-sm sm:text-base">{m.largeur} × {m.hauteur} mm (×{m.quantite})</td>
                                <td className="py-2 px-3 font-sans text-xs sm:text-sm font-bold border-r border-slate-300 text-slate-800">
                                  {m.typeOuverture === 'PORTE_FENETRE' ? 'Porte-Fenêtre' : m.typeOuverture === 'DOUBLE_VANTAUX' ? 'Baie 2 Vtx' : m.typeOuverture === 'CENTRALE' ? 'Centrale' : m.typeOuverture === 'FIXE' ? 'Fixe' : 'Fenêtre'}
                                </td>
                                <td className="py-2 px-2 text-center font-black text-amber-800 border-r border-slate-300 text-sm sm:text-base bg-amber-50">
                                  {c.dimension_fixe_requise} mm <span className="text-xs font-normal text-slate-600">({c.dimension_fixe_est === 'H' ? 'H' : 'L'})</span>
                                </td>
                                <td className="py-2 px-2 text-center font-black text-emerald-800 border-r border-slate-300 text-sm sm:text-base">{c.nb_plis_requis} plis</td>
                                <td className="py-2 px-3 text-xs sm:text-sm border-r border-slate-300 font-sans">
                                  <div><strong className="text-slate-900 font-mono">{c.nb_fils_guidage} fils</strong> (~{c.distance_cordes}mm)</div>
                                  <div className="text-purple-800 font-bold font-mono">Corde : {c.longueur_corde_totale_m}m ({c.longueur_corde_unitaire_m}m/fil)</div>
                                </td>
                                <td className="py-2 px-2 text-center font-black text-slate-900 border-r border-slate-300 text-sm sm:text-base">{c.superficie_m2} m²</td>
                                <td className="py-2 px-3 font-sans text-xs font-semibold text-slate-700">{m.articleDesignationMaille || 'MSTQ MAILLE PLISSÉE 20mm'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Profilés Moustiquaire */}
                {sectionsParFamille.moustiquaires.map((sec, idx) => renderSectionCuttingTables(sec, idx))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
