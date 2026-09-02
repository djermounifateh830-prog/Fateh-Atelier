import React, { useState, useMemo } from 'react';
import { Article, ChuteItem, MappingChutes, ResultatOptimisation, PieceACouper, FigurePrecadre, ModeDebordementPrecadre } from '../../types';
import { SelecteurArticle } from '../common/SelecteurArticle';
import { SelecteurMode } from '../common/SelecteurMode';
import { VisualiseurBarres } from '../common/VisualiseurBarres';
import { OrdreFabricationModal } from '../common/OrdreFabricationModal';
import { OptimiseurCoupe1D } from '../../services/optimiseur1d';
import { detecterAgence, getTodayDateString } from '../../services/codificationService';
import { getDimensionsPrecadrePiece } from '../../utils/precadreCalculs';
import {
  Building2,
  Building,
  User,
  Calendar,
  Palette,
  Info,
  Plus,
  Trash2,
  Play,
  Edit2,
  Check,
  X,
  Copy,
  Layers
} from 'lucide-react';

interface PrecadreTabProps {
  articles: Article[];
  chutesBarres: Record<string, ChuteItem[]>;
  mapping: MappingChutes;
  onStockUpdated?: () => void;
}

interface CadreItem {
  id: string;
  refCommande?: string;
  nomClient?: string;
  largeur: number;
  hauteur: number;
  quantite: number;
  repere: string;
  figure: FigurePrecadre;
  modeDebordement: ModeDebordementPrecadre;
  debordementSuperieur?: number;
  debordementInferieur?: number;
}

export const PrecadreTab: React.FC<PrecadreTabProps> = ({
  articles = [],
  chutesBarres = {},
  mapping = {},
  onStockUpdated
}) => {
  const safeArticles = Array.isArray(articles) ? articles : [];

  const initialArticle = useMemo(() => {
    return (
      safeArticles.find(a => a?.designation && a.designation.toUpperCase().includes('PRECADRE')) ||
      safeArticles[0] ||
      null
    );
  }, [safeArticles]);

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(initialArticle);
  const [mode, setMode] = useState<'matiere' | 'temps'>('matiere');
  const [poidsTemps, setPoidsTemps] = useState<number>(5.0);

  // En-tête Dossier / Commande par défaut
  const [refCommandeDefaut, setRefCommandeDefaut] = useState<string>('S-A26698');
  const [nomClientDefaut, setNomClientDefaut] = useState<string>('SOMADAL ALGER PROMO');
  const [dateCommandeDefaut, setDateCommandeDefaut] = useState<string>('09/08/2026');
  const [colorisDefaut, setColorisDefaut] = useState<string>('G7024');

  const agenceInfo = useMemo(() => detecterAgence(refCommandeDefaut), [refCommandeDefaut]);

  // Paramètres dormants / précadres
  const [saisieFigure, setSaisieFigure] = useState<FigurePrecadre>('VIDE');
  const [saisieModeDebordement, setSaisieModeDebordement] = useState<ModeDebordementPrecadre>('SUPERIEUR_INFERIEUR');
  const [typeCoupe, setTypeCoupe] = useState<'45' | '90'>('45');
  const [jeuMaconnerie, setJeuMaconnerie] = useState<number>(5); // Jeu mm

  // Cadres saisis
  const [cadres, setCadres] = useState<CadreItem[]>([]);

  const [saisieRefCommande, setSaisieRefCommande] = useState<string>('');
  const [saisieNomClient, setSaisieNomClient] = useState<string>('');
  const [saisieL, setSaisieL] = useState<string>('');
  const [saisieH, setSaisieH] = useState<string>('');
  const [saisieQte, setSaisieQte] = useState<string>('1');
  const [saisieRepere, setSaisieRepere] = useState<string>('A1');

  // État d'édition en ligne
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CadreItem | null>(null);

  // Résultat d'optimisation
  const [resultat, setResultat] = useState<ResultatOptimisation | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isOFOpen, setIsOFOpen] = useState<boolean>(false);

  const mappedSheetName = selectedArticle ? mapping[selectedArticle.code_art] || null : null;
  const availableChutes = mappedSheetName ? chutesBarres[mappedSheetName] || [] : [];

  const handleAjouterCadre = () => {
    const l = parseFloat(saisieL);
    const h = parseFloat(saisieH);
    const qte = parseInt(saisieQte, 10);

    if (isNaN(l) || l <= 0 || isNaN(h) || h <= 0 || isNaN(qte) || qte <= 0) {
      alert('Veuillez saisir des dimensions et une quantité valides.');
      return;
    }

    const ref = (saisieRefCommande.trim() || refCommandeDefaut.trim() || 'CMD-01');
    const client = (saisieNomClient.trim() || nomClientDefaut.trim() || 'CLIENT');
    const autoRepere = saisieRepere.trim() || `1R${cadres.length + 1}`;

    setCadres([
      ...cadres,
      {
        id: String(Date.now()),
        refCommande: ref,
        nomClient: client,
        largeur: l,
        hauteur: h,
        quantite: qte,
        repere: autoRepere,
        figure: saisieFigure,
        modeDebordement: saisieModeDebordement,
        debordementSuperieur: 100,
        debordementInferieur: 300
      }
    ]);

    setSaisieL('');
    setSaisieH('');
    setSaisieRepere(`A${cadres.length + 2}`);
  };

  const handleSupprimerCadre = (id: string) => {
    setCadres(cadres.filter(c => c.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleDupliquerCadre = (c: CadreItem) => {
    setCadres([
      ...cadres,
      {
        ...c,
        id: String(Date.now()),
        repere: `${c.repere}-copie`
      }
    ]);
  };

  const handleStartEdit = (c: CadreItem) => {
    setEditingId(c.id);
    setEditForm({ ...c });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    if (editForm.largeur <= 0 || editForm.hauteur <= 0 || editForm.quantite <= 0) {
      alert('Veuillez renseigner des dimensions valides.');
      return;
    }

    setCadres(cadres.map(c => (c.id === editForm.id ? editForm : c)));
    setEditingId(null);
    setEditForm(null);
  };

  const handleCalculerOptimisation = () => {
    if (!selectedArticle) {
      alert('Veuillez sélectionner un article de profilé pour le précadre.');
      return;
    }

    if (cadres.length === 0) {
      alert('Veuillez saisir au moins un cadre.');
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      try {
        const piecesPool: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[] = [];

        cadres.forEach(c => {
          const debSup = c.debordementSuperieur !== undefined ? c.debordementSuperieur : 100;
          const debInf = c.debordementInferieur !== undefined ? c.debordementInferieur : 300;

          const { hMontant, lTraverse, lRenfortSeul, lDemiRenfortCroise, hRenfort, typeAssemblage } = getDimensionsPrecadrePiece(
            c.largeur,
            c.hauteur,
            c.modeDebordement,
            debSup,
            debInf
          );

          // 1. Montant Vertical Ha (1er montant, Q par cadre)
          piecesPool.push({
            longueur: hMontant,
            quantite: 1 * c.quantite,
            label: `Ha-${c.repere} (Montant A — H=${hMontant}mm [${typeAssemblage === 'EQUERRE' ? 'Équerre 90°' : 'Bouchons 90°'}])`,
            repere: `Ha-${c.repere}`,
            refCommande: c.refCommande
          });

          // 2. Montant Vertical Hb (2ème montant, Q par cadre)
          piecesPool.push({
            longueur: hMontant,
            quantite: 1 * c.quantite,
            label: `Hb-${c.repere} (Montant B — H=${hMontant}mm [${typeAssemblage === 'EQUERRE' ? 'Équerre 90°' : 'Bouchons 90°'}])`,
            repere: `Hb-${c.repere}`,
            refCommande: c.refCommande
          });

          // 3. Traverse Haute La
          piecesPool.push({
            longueur: lTraverse,
            quantite: 1 * c.quantite,
            label: `La-${c.repere} (Traverse Haute — L=${lTraverse}mm)`,
            repere: `La-${c.repere}`,
            refCommande: c.refCommande
          });

          // 4. Traverse Basse Lb
          piecesPool.push({
            longueur: lTraverse,
            quantite: 1 * c.quantite,
            label: `Lb-${c.repere} (Traverse Basse — L=${lTraverse}mm)`,
            repere: `Lb-${c.repere}`,
            refCommande: c.refCommande
          });

          // 5. Renfort Horizontal Central L1 (Seul)
          if (c.figure === 'RENFORT_L1') {
            piecesPool.push({
              longueur: lRenfortSeul,
              quantite: 1 * c.quantite,
              label: `L1-${c.repere} (Renfort Horizontal — L1=${lRenfortSeul}mm)`,
              repere: `L1-${c.repere}`,
              refCommande: c.refCommande
            });
          } else if (c.figure === 'RENFORT_CROISE') {
            // Demi-renfort horizontal 1 (L1)
            piecesPool.push({
              longueur: lDemiRenfortCroise,
              quantite: 1 * c.quantite,
              label: `L1-${c.repere} (Demi-Renfort Horizontal 1 — L1=${lDemiRenfortCroise}mm)`,
              repere: `L1-${c.repere}`,
              refCommande: c.refCommande
            });
            // Demi-renfort horizontal 2 (L2)
            piecesPool.push({
              longueur: lDemiRenfortCroise,
              quantite: 1 * c.quantite,
              label: `L2-${c.repere} (Demi-Renfort Horizontal 2 — L2=${lDemiRenfortCroise}mm)`,
              repere: `L2-${c.repere}`,
              refCommande: c.refCommande
            });
          }

          // 6. Renfort Vertical Central H1 (si RENFORT_H1 ou RENFORT_CROISE)
          if (c.figure === 'RENFORT_H1' || c.figure === 'RENFORT_CROISE') {
            piecesPool.push({
              longueur: hRenfort,
              quantite: 1 * c.quantite,
              label: `H1-${c.repere} (Renfort Vertical — H1=${hRenfort}mm)`,
              repere: `H1-${c.repere}`,
              refCommande: c.refCommande
            });
          }
        });

        const optimiseur = new OptimiseurCoupe1D({
          longueurBarre: selectedArticle.longeur,
          epaisseurScie: selectedArticle.lame,
          refusMin: selectedArticle.refus_min,
          refusMax: selectedArticle.refus_max,
          mode,
          poidsTemps
        });

        const res = optimiseur.optimiser(piecesPool, availableChutes);
        res.articleCode = selectedArticle.code_art;
        res.articleDesignation = selectedArticle.designation;
        res.refCommande = refCommandeDefaut;
        res.nomClient = nomClientDefaut;
        res.dateCommande = dateCommandeDefaut;
                setResultat(res);
      } catch (err: any) {
        alert('Erreur de calcul: ' + err.message);
      } finally {
        setIsCalculating(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Saisie des précadres */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100">
                  Dimensions des Précadres / Dormants
                </h3>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${agenceInfo.badgeBg} ${agenceInfo.badgeColor}`}>
                  {agenceInfo.nom}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Saisie multi-commandes avec repères et édition instantanée.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Coupe d'assemblage :</span>
              <select
                value={typeCoupe}
                onChange={e => setTypeCoupe(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-amber-300 font-bold focus:outline-none"
              >
                <option value="45">Onglet 45°</option>
                <option value="90">Coupe Droite 90°</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Context Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-xs">
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span>Réf. Commande / BL</span>
            </label>
            <input
              type="text"
              value={refCommandeDefaut}
              onChange={e => setRefCommandeDefaut(e.target.value)}
              placeholder="ex: S-A26698"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nom Client / Promoteur</span>
            </label>
            <input
              type="text"
              value={nomClientDefaut}
              onChange={e => setNomClientDefaut(e.target.value)}
              placeholder="ex: SOMADAL ALGER PROMO"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Date Commande</span>
            </label>
            <input
              type="text"
              value={dateCommandeDefaut}
              onChange={e => setDateCommandeDefaut(e.target.value)}
              placeholder="09/08/2026"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Palette className="w-3.5 h-3.5 text-rose-400" />            </label>          </div>
        </div>

        {/* Sélection Figure (1 à 4) & Mode Débordement (A à D) */}
        <div className="space-y-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center justify-between">
              <span>1. Figure de Précadre (Renforts Intérieurs)</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                {saisieFigure === 'VIDE' && '2 Montants + 1 TRH + 1 TRB — Aucun renfort'}
                {saisieFigure === 'RENFORT_L1' && '+ 1 Renfort Horizontal L1 (traverse centrale)'}
                {saisieFigure === 'RENFORT_H1' && '+ 1 Renfort Vertical H1 (montant central)'}
                {saisieFigure === 'RENFORT_CROISE' && '+ 1 L1 Horizontal + 1 H1 Vertical (croisé)'}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setSaisieFigure('VIDE')}
                className={`py-2.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                  saisieFigure === 'VIDE'
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <svg width="36" height="28" viewBox="0 0 36 28">
                  <rect x="1" y="1" width="34" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" rx="1"/>
                </svg>
                <span>1. Vide</span>
              </button>
              <button
                type="button"
                onClick={() => setSaisieFigure('RENFORT_L1')}
                className={`py-2.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                  saisieFigure === 'RENFORT_L1'
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <svg width="36" height="28" viewBox="0 0 36 28">
                  <rect x="1" y="1" width="34" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" rx="1"/>
                  <line x1="1" y1="14" x2="35" y2="14" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>2. + Renfort L1</span>
              </button>
              <button
                type="button"
                onClick={() => setSaisieFigure('RENFORT_H1')}
                className={`py-2.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                  saisieFigure === 'RENFORT_H1'
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <svg width="36" height="28" viewBox="0 0 36 28">
                  <rect x="1" y="1" width="34" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" rx="1"/>
                  <line x1="18" y1="1" x2="18" y2="27" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>3. + Renfort H1</span>
              </button>
              <button
                type="button"
                onClick={() => setSaisieFigure('RENFORT_CROISE')}
                className={`py-2.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                  saisieFigure === 'RENFORT_CROISE'
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <svg width="36" height="28" viewBox="0 0 36 28">
                  <rect x="1" y="1" width="34" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" rx="1"/>
                  <line x1="1" y1="14" x2="35" y2="14" stroke="currentColor" strokeWidth="2"/>
                  <line x1="18" y1="1" x2="18" y2="27" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>4. Croisé L1+H1</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center justify-between">
              <span>2. Mode de Débordement des Montants</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                {saisieModeDebordement === 'SUPERIEUR_INFERIEUR' && 'Haut (+100mm) & Bas (+300mm)'}
                {saisieModeDebordement === 'SUPERIEUR_SEUL' && 'Haut (+100mm) uniquement'}
                {saisieModeDebordement === 'INFERIEUR_SEUL' && 'Bas (+300mm) uniquement'}
                {saisieModeDebordement === 'SANS_DEBORDEMENT' && 'Cadre Fermé (0mm / 0mm)'}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setSaisieModeDebordement('SUPERIEUR_INFERIEUR')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  saisieModeDebordement === 'SUPERIEUR_INFERIEUR'
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>⬆️⬇️ A. Haut (+100) &amp; Bas (+300)</span>
              </button>
              <button
                type="button"
                onClick={() => setSaisieModeDebordement('SUPERIEUR_SEUL')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  saisieModeDebordement === 'SUPERIEUR_SEUL'
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>⬆️ B. Haut (+100) Seul</span>
              </button>
              <button
                type="button"
                onClick={() => setSaisieModeDebordement('INFERIEUR_SEUL')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  saisieModeDebordement === 'INFERIEUR_SEUL'
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <span>⬇️ C. Bas (+300) Seul</span>
              </button>
              <button
                type="button"
                onClick={() => setSaisieModeDebordement('SANS_DEBORDEMENT')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  saisieModeDebordement === 'SANS_DEBORDEMENT'
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <span>⏹️ D. Cadre Fermé (0/0)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire ajout rapide */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Repère *
            </label>
            <input
              type="text"
              value={saisieRepere}
              onChange={e => setSaisieRepere(e.target.value)}
              placeholder="ex: A1"
              onKeyDown={e => e.key === 'Enter' && handleAjouterCadre()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Largeur Tableau (mm) *
            </label>
            <input
              type="number"
              value={saisieL}
              onChange={e => setSaisieL(e.target.value)}
              placeholder="ex: 1350"
              onKeyDown={e => e.key === 'Enter' && handleAjouterCadre()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Hauteur Tableau (mm) *
            </label>
            <input
              type="number"
              value={saisieH}
              onChange={e => setSaisieH(e.target.value)}
              placeholder="ex: 1750"
              onKeyDown={e => e.key === 'Enter' && handleAjouterCadre()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Qté *
            </label>
            <input
              type="number"
              min="1"
              value={saisieQte}
              onChange={e => setSaisieQte(e.target.value)}
              placeholder="1"
              onKeyDown={e => e.key === 'Enter' && handleAjouterCadre()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-100 font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-1">
            <button
              onClick={handleAjouterCadre}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
              title="Ajouter ce précadre"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tableau des cadres avec modification en ligne */}
        {cadres.length > 0 ? (
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Cmd / Client</th>
                  <th className="py-2.5 px-3">Repère</th>
                  <th className="py-2.5 px-3">Dimensions</th>
                  <th className="py-2.5 px-3 text-center">Qté</th>
                  <th className="py-2.5 px-3">Modèle &amp; Débordement</th>
                  <th className="py-2.5 px-3">Détail Débit Généré</th>
                  <th className="py-2.5 px-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {cadres.map((c, idx) => {
                  const isEditing = editingId === c.id && editForm !== null;

                  if (isEditing) {
                    return (
                      <tr key={c.id} className="bg-purple-950/20 border-2 border-purple-500/40">
                        <td className="py-2 px-2 text-center text-amber-400 font-bold">{idx + 1}</td>
                        <td className="py-2 px-2 space-y-1">
                          <input
                            type="text"
                            value={editForm.refCommande || ''}
                            onChange={e => setEditForm({ ...editForm, refCommande: e.target.value })}
                            className="w-full bg-slate-950 border border-purple-500 rounded px-1.5 py-1 text-xs text-amber-300 font-mono"
                          />
                          <input
                            type="text"
                            value={editForm.nomClient || ''}
                            onChange={e => setEditForm({ ...editForm, nomClient: e.target.value })}
                            className="w-full bg-slate-950 border border-purple-500 rounded px-1.5 py-1 text-xs text-slate-100 font-sans"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={editForm.repere}
                            onChange={e => setEditForm({ ...editForm, repere: e.target.value })}
                            className="w-full bg-slate-950 border border-purple-500 rounded px-1.5 py-1 text-xs text-amber-300 font-bold"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editForm.largeur}
                              onChange={e => setEditForm({ ...editForm, largeur: parseFloat(e.target.value) || 0 })}
                              className="w-16 bg-slate-950 border border-purple-500 rounded px-1 py-1 text-xs text-slate-100 font-mono font-bold"
                              placeholder="L"
                            />
                            <span className="text-slate-500 text-xs">×</span>
                            <input
                              type="number"
                              value={editForm.hauteur}
                              onChange={e => setEditForm({ ...editForm, hauteur: parseFloat(e.target.value) || 0 })}
                              className="w-16 bg-slate-950 border border-purple-500 rounded px-1 py-1 text-xs text-slate-100 font-mono"
                              placeholder="H"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={editForm.quantite}
                            onChange={e => setEditForm({ ...editForm, quantite: parseInt(e.target.value, 10) || 1 })}
                            className="w-12 bg-slate-950 border border-purple-500 rounded px-1 py-1 text-xs text-slate-100 font-bold text-center"
                          />
                        </td>
                        <td className="py-2 px-2 font-sans text-[10px] space-y-1">
                          <select
                            value={editForm.figure}
                            onChange={e => setEditForm({ ...editForm, figure: e.target.value as any })}
                            className="w-full bg-slate-900 border border-purple-500/50 rounded px-1 py-0.5 text-[10px] text-purple-200"
                          >
                            <option value="VIDE">1. Vide (aucun renfort)</option>
                            <option value="RENFORT_L1">2. + Renfort Horizontal L1</option>
                            <option value="RENFORT_H1">3. + Renfort Vertical H1</option>
                            <option value="RENFORT_CROISE">4. Croisé L1 + H1</option>
                          </select>
                          <select
                            value={editForm.modeDebordement}
                            onChange={e => setEditForm({ ...editForm, modeDebordement: e.target.value as any })}
                            className="w-full bg-slate-900 border border-purple-500/50 rounded px-1 py-0.5 text-[10px] text-purple-200"
                          >
                            <option value="SUPERIEUR_INFERIEUR">⬆️⬇️ A. Haut (+100) &amp; Bas (+300)</option>
                            <option value="SUPERIEUR_SEUL">⬆️ B. Haut (+100) Seul</option>
                            <option value="INFERIEUR_SEUL">⬇️ C. Bas (+300) Seul</option>
                            <option value="SANS_DEBORDEMENT">⏹️ D. Cadre Fermé (0/0)</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-slate-400 font-sans text-xs italic">
                          Édition en cours…
                        </td>
                        <td className="py-2 px-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-purple-600 hover:bg-purple-500 text-white rounded transition cursor-pointer"
                              title="Enregistrer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition cursor-pointer"
                              title="Annuler"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const figureLabel = c.figure === 'VIDE' ? '⬜ Vide'
                    : c.figure === 'RENFORT_L1' ? '— + L1 Horiz.'
                    : c.figure === 'RENFORT_H1' ? '| + H1 Vert.'
                    : '+ Croisé L1+H1';

                  const debLabel = c.modeDebordement === 'SUPERIEUR_INFERIEUR' ? '⬆️⬇️ Haut(+100)&Bas(+300)'
                    : c.modeDebordement === 'SUPERIEUR_SEUL' ? '⬆️ Haut(+100) seul'
                    : c.modeDebordement === 'INFERIEUR_SEUL' ? '⬇️ Bas(+300) seul'
                    : '⏹️ Cadre Fermé (0/0)';

                  const debSup = c.debordementSuperieur !== undefined ? c.debordementSuperieur : 100;
                  const debInf = c.debordementInferieur !== undefined ? c.debordementInferieur : 300;

                  const { hMontant, lTraverse, lRenfortSeul, lDemiRenfortCroise, hRenfort, typeAssemblage } = getDimensionsPrecadrePiece(
                    c.largeur,
                    c.hauteur,
                    c.modeDebordement,
                    debSup,
                    debInf
                  );

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-sans text-xs">
                        <div className="font-mono text-amber-300 font-bold">{c.refCommande || refCommandeDefaut}</div>
                        <div className="text-slate-400 text-[10px] truncate max-w-[120px]">{c.nomClient || nomClientDefaut}</div>
                      </td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold font-sans">
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          {c.repere}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-100 font-bold font-mono">{c.largeur} × {c.hauteur} mm</td>
                      <td className="py-2.5 px-3 text-center text-slate-100 font-bold font-mono">{c.quantite}</td>
                      <td className="py-2.5 px-3 font-sans text-[11px]">
                        <div className="space-y-0.5">
                          <div className="text-purple-300 font-bold">{figureLabel}</div>
                          <div className="text-slate-400 text-[10px]">{debLabel}</div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-[10px] text-purple-200">
                        <div className="space-y-0.5 font-mono">
                          <div>2 × Montants H = <strong className="text-amber-300">{hMontant}</strong> mm</div>
                          <div>1 × TRH + 1 × TRB L = <strong className="text-sky-300">{lTraverse}</strong> mm</div>
                          {c.figure === 'RENFORT_L1' && (
                            <div className="text-sky-300 font-bold">+ 1 × Renfort L1 = {lRenfortSeul} mm</div>
                          )}
                          {c.figure === 'RENFORT_CROISE' && (
                            <div className="text-sky-300 font-bold">
                              + 2 × Demi-Renforts (L1 &amp; L2) = {lDemiRenfortCroise} mm <span className="text-slate-400 font-normal">[(L-19)/2]</span>
                            </div>
                          )}
                          {(c.figure === 'RENFORT_H1' || c.figure === 'RENFORT_CROISE') && (
                            <div className="text-emerald-300 font-bold">
                              + 1 × Renfort H1 = {hRenfort} mm <span className="text-slate-400 font-normal">[(H-38mm: 2 trav. 19mm)]</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleStartEdit(c)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Modifier la ligne"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDupliquerCadre(c)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Dupliquer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSupprimerCadre(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950/40 rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs">
            Aucun précadre saisi.
          </div>
        )}
      </div>

      {/* Sélecteurs Machine & Article */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <SelecteurArticle
            articles={articles}
            selectedArticle={selectedArticle}
            onSelectArticle={setSelectedArticle}
            mappedSheetName={mappedSheetName}
            chutesAvailableCount={availableChutes.reduce((s, c) => s + c.quantite, 0)}
          />
        </div>

        <div className="lg:col-span-5">
          <SelecteurMode
            mode={mode}
            setMode={setMode}
            poidsTemps={poidsTemps}
            setPoidsTemps={setPoidsTemps}
          />
        </div>
      </div>

      {/* Bouton calcul */}
      <div className="flex justify-end">
        <button
          onClick={handleCalculerOptimisation}
          disabled={isCalculating || cadres.length === 0 || !selectedArticle}
          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
        >
          <Play className={`w-4 h-4 text-slate-950 ${isCalculating ? 'animate-spin' : ''}`} />
          <span>Optimiser la Découpe du Précadre</span>
        </button>
      </div>

      {/* Résultat visuel 1D */}
      {resultat && (
        <VisualiseurBarres
          resultat={resultat}
          articleDesignation={selectedArticle?.designation}
          onOpenOF={() => setIsOFOpen(true)}
        />
      )}

      {/* Modal OF */}
      {resultat && (
        <OrdreFabricationModal
          isOpen={isOFOpen}
          onClose={() => setIsOFOpen(false)}
          titreProduit={`PRÉCADRE DORMANT : ${selectedArticle?.designation || 'PRÉCADRE ALUMINIUM'}`}
          refCommande={refCommandeDefaut}
          nomClient={nomClientDefaut}
          dateCommande={dateCommandeDefaut}
          coloris={colorisDefaut}
          article={selectedArticle}
          resultat={resultat}
          famille="PRECADRE"
          onOFEmis={onStockUpdated}
        />
      )}
    </div>
  );
};

