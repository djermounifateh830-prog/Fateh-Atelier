import React, { useState, useMemo } from 'react';
import { Article, ChuteItem, MappingChutes, ResultatOptimisation, CommandeTablier } from '../../types';
import { SelecteurArticle } from '../common/SelecteurArticle';
import { SelecteurMode } from '../common/SelecteurMode';
import { VisualiseurBarres } from '../common/VisualiseurBarres';
import { OrdreFabricationModal } from '../common/OrdreFabricationModal';
import { calculerTablier, fusionnerCommandesTablier } from '../../services/moteurTablier';
import { OptimiseurCoupe1D } from '../../services/optimiseur1d';
import { detecterAgence, getTodayDateString } from '../../services/codificationService';
import {
  Plus,
  Trash2,
  Play,
  Scissors,
  Edit2,
  Check,
  X,
  Copy,
  Layers,
  Building,
  User,
  Calendar,
  Palette,
  Sparkles,
  Tag
} from 'lucide-react';

interface TablierTabProps {
  articles: Article[];
  chutesBarres: Record<string, ChuteItem[]>;
  mapping: MappingChutes;
  onStockUpdated?: () => void;
}

export const TablierTab: React.FC<TablierTabProps> = ({
  articles = [],
  chutesBarres = {},
  mapping = {},
  onStockUpdated
}) => {
  const safeArticles = Array.isArray(articles) ? articles : [];

  const initialArticle = useMemo(() => {
    return (
      safeArticles.find(a => a?.designation && a.designation.toUpperCase().includes('TAB 55')) ||
      safeArticles.find(a => a?.designation && a.designation.toUpperCase().includes('TBL 43')) ||
      safeArticles.find(a => a?.designation && a.designation.toUpperCase().includes('LAME')) ||
      safeArticles[0] ||
      null
    );
  }, [safeArticles]);

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(initialArticle);
  const [mode, setMode] = useState<'matiere' | 'temps'>('matiere');
  const [poidsTemps, setPoidsTemps] = useState<number>(5.0);

  // En-tête Dossier / Commande en cours
  const [refCommandeDefaut, setRefCommandeDefaut] = useState<string>('S-A26736');
  const [nomClientDefaut, setNomClientDefaut] = useState<string>('SARL MCB ALUMINIUM');
  const [dateCommandeDefaut, setDateCommandeDefaut] = useState<string>('09/08/2026');
  const [colorisDefaut, setColorisDefaut] = useState<string>('G7024');

  // Détection agence
  const agenceInfo = useMemo(() => detecterAgence(refCommandeDefaut), [refCommandeDefaut]);

  // Commandes de tabliers ajoutées (Pré-remplies avec l'exemple réel de SARL MCB ALUMINIUM)
  const [tabliers, setTabliers] = useState<CommandeTablier[]>([
    {
      id: 't1',
      refCommande: 'S-A26736',
      nomClient: 'SARL MCB ALUMINIUM',
      dateCommande: '09/08/2026',
      largeur: 2130,
      hauteur: 2250,
      hauteur_lame_tablier: 55,
      quantite: 1,
      repere: 'SA-1',
      nb_lame: Math.ceil(2250 / 55),
      typeFabrication: 'VOLET_COMPLET',
      avecLameFinale: true
    },
    {
      id: 't2',
      refCommande: 'S-A26736',
      nomClient: 'SARL MCB ALUMINIUM',
      dateCommande: '09/08/2026',
      largeur: 1828,
      hauteur: 2100,
      hauteur_lame_tablier: 55,
      quantite: 1,
      repere: 'SA-2',
      nb_lame: Math.ceil(2100 / 55),
      typeFabrication: 'VOLET_COMPLET',
      avecLameFinale: true
    },
    {
      id: 't3',
      refCommande: 'S-A26736',
      nomClient: 'SARL MCB ALUMINIUM',
      dateCommande: '09/08/2026',
      largeur: 2322,
      hauteur: 2100,
      hauteur_lame_tablier: 55,
      quantite: 1,
      repere: 'SA-3',
      nb_lame: Math.ceil(2100 / 55),
      typeFabrication: 'VOLET_COMPLET',
      avecLameFinale: true
    },
    {
      id: 't4',
      refCommande: 'S-A26736',
      nomClient: 'SARL MCB ALUMINIUM',
      dateCommande: '09/08/2026',
      largeur: 1642,
      hauteur: 2100,
      hauteur_lame_tablier: 55,
      quantite: 1,
      repere: 'SA-4',
      nb_lame: Math.ceil(2100 / 55),
      typeFabrication: 'VOLET_COMPLET',
      avecLameFinale: true
    },
    {
      id: 't5',
      refCommande: 'S-A26736',
      nomClient: 'SARL MCB ALUMINIUM',
      dateCommande: '09/08/2026',
      largeur: 1334,
      hauteur: 2250,
      hauteur_lame_tablier: 55,
      quantite: 1,
      repere: 'SB-1',
      nb_lame: Math.ceil(2250 / 55),
      typeFabrication: 'VOLET_COMPLET',
      avecLameFinale: true
    },
    {
      id: 't6',
      refCommande: 'S-A26736',
      nomClient: 'SARL MCB ALUMINIUM',
      dateCommande: '09/08/2026',
      largeur: 2317,
      hauteur: 2100,
      hauteur_lame_tablier: 55,
      quantite: 1,
      repere: 'SB-2',
      nb_lame: Math.ceil(2100 / 55),
      typeFabrication: 'VOLET_COMPLET',
      avecLameFinale: true
    }
  ]);

  // Formulaire de saisie d'un nouveau tablier
  const [saisieTypeFabrication, setSaisieTypeFabrication] = useState<'TABLIER_SEUL' | 'VOLET_COMPLET'>('VOLET_COMPLET');
  const [saisieAvecLameFinale, setSaisieAvecLameFinale] = useState<boolean>(true);
  const [saisieRefCommande, setSaisieRefCommande] = useState<string>('');
  const [saisieNomClient, setSaisieNomClient] = useState<string>('');
  const [saisieDate, setSaisieDate] = useState<string>('');
  const [saisieLargeur, setSaisieLargeur] = useState<string>('');
  const [saisieHauteur, setSaisieHauteur] = useState<string>('');
  const [saisieHauteurLame, setSaisieHauteurLame] = useState<number>(55);
  const [saisieQte, setSaisieQte] = useState<string>('1');
  const [saisieRepere, setSaisieRepere] = useState<string>('SB-3');

  // État d'édition en ligne
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CommandeTablier | null>(null);

  // Résultat d'optimisation
  const [resultat, setResultat] = useState<ResultatOptimisation | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isOFOpen, setIsOFOpen] = useState<boolean>(false);

  const mappedSheetName = selectedArticle ? mapping[selectedArticle.code_art] || null : null;
  const availableChutes = mappedSheetName ? chutesBarres[mappedSheetName] || [] : [];

  const handleAjouterTablier = () => {
    const l = parseFloat(saisieLargeur);
    const h = parseFloat(saisieHauteur);
    const qte = parseInt(saisieQte, 10);
    const hLame = Number(saisieHauteurLame) || 55;

    if (isNaN(l) || l <= 0 || isNaN(h) || h <= 0 || isNaN(qte) || qte <= 0) {
      alert('Veuillez saisir une largeur, une hauteur et une quantité valides positives.');
      return;
    }

    const nbLame = Math.ceil(h / hLame);
    const ref = (saisieRefCommande.trim() || refCommandeDefaut.trim() || 'CMD-01');
    const client = (saisieNomClient.trim() || nomClientDefaut.trim() || 'CLIENT');
    const dateCmd = (saisieDate.trim() || dateCommandeDefaut.trim() || getTodayDateString());
    const autoRepere = saisieRepere.trim() || `T-${tabliers.length + 1}`;

    const newTablier: CommandeTablier = {
      id: String(Date.now()),
      refCommande: ref,
      nomClient: client,
      dateCommande: dateCmd,
      largeur: l,
      hauteur: h,
      hauteur_lame_tablier: hLame,
      quantite: qte,
      repere: autoRepere,
      nb_lame: nbLame,
      typeFabrication: saisieTypeFabrication,
      avecLameFinale: saisieAvecLameFinale
    };

    setTabliers([...tabliers, newTablier]);
    setSaisieLargeur('');
    setSaisieHauteur('');
    
    // Auto-génération intelligente du prochain repère (ex: SB-3 -> SB-4)
    if (autoRepere.includes('-')) {
      const parts = autoRepere.split('-');
      const prefix = parts[0];
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        setSaisieRepere(`${prefix}-${num + 1}`);
      } else {
        setSaisieRepere(`T-${tabliers.length + 2}`);
      }
    } else {
      setSaisieRepere(`T-${tabliers.length + 2}`);
    }
  };

  const handleSupprimerTablier = (id: string) => {
    setTabliers(tabliers.filter(t => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleDupliquerTablier = (t: CommandeTablier) => {
    const newTablier: CommandeTablier = {
      ...t,
      id: String(Date.now()),
      repere: `${t.repere}-copie`
    };
    setTabliers([...tabliers, newTablier]);
  };

  const handleStartEdit = (t: CommandeTablier) => {
    setEditingId(t.id);
    setEditForm({ ...t });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    if (editForm.largeur <= 0 || editForm.hauteur <= 0 || editForm.quantite <= 0) {
      alert('Veuillez renseigner des dimensions et quantités strictement positives.');
      return;
    }

    const nbLame = Math.ceil(editForm.hauteur / editForm.hauteur_lame_tablier);
    const updated: CommandeTablier = {
      ...editForm,
      nb_lame: nbLame,
      repere: editForm.repere.trim() || 'Tablier'
    };

    setTabliers(tabliers.map(t => (t.id === updated.id ? updated : t)));
    setEditingId(null);
    setEditForm(null);
  };

  const handleCalculerOptimisation = () => {
    if (!selectedArticle) {
      alert('Veuillez d\'abord sélectionner l\'article de lame de tablier.');
      return;
    }

    if (tabliers.length === 0) {
      alert('Veuillez ajouter au moins un tablier à la commande.');
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      try {
        const poolLames = fusionnerCommandesTablier(tabliers.map(t => calculerTablier(t)));

        const optimiseur = new OptimiseurCoupe1D({
          longueurBarre: selectedArticle.longeur,
          epaisseurScie: selectedArticle.lame,
          refusMin: selectedArticle.refus_min,
          refusMax: selectedArticle.refus_max,
          mode,
          poidsTemps
        });

        const piecesAvecDebord = poolLames.map(p => ({
          longueur: p.longueur,
          quantite: p.quantite,
          label: p.label,
          repere: p.repere,
          refCommande: p.refCommande
        }));

        const res = optimiseur.optimiser(piecesAvecDebord, availableChutes);
        res.articleCode = selectedArticle.code_art;
        res.articleDesignation = selectedArticle.designation;
        res.refCommande = refCommandeDefaut;
        res.nomClient = nomClientDefaut;
        res.dateCommande = dateCommandeDefaut;        setResultat(res);
      } catch (err: any) {
        alert('Erreur lors du calcul: ' + err.message);
      } finally {
        setIsCalculating(false);
      }
    }, 100);
  };

  const totalLamesTotal = tabliers.reduce(
    (sum, t) => sum + (t.nb_lame || Math.ceil(t.hauteur / t.hauteur_lame_tablier)) * t.quantite,
    0
  );

  return (
    <div className="space-y-6">
      {/* En-tête Donneur d'ordre & Client */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100">
                  Tabliers Roulants — Traçabilité Client & Atelier
                </h3>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${agenceInfo.badgeBg} ${agenceInfo.badgeColor}`}>
                  {agenceInfo.nom}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {agenceInfo.description}
              </p>
            </div>
          </div>

          {/* Quick presets for realistic testing */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Exemples réels :</span>
            <button
              type="button"
              onClick={() => {
                setRefCommandeDefaut('S-A26736');
                setNomClientDefaut('SARL MCB ALUMINIUM');
                setDateCommandeDefaut('09/08/2026');
                setColorisDefaut('G7024');
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sky-300 font-mono text-[11px] transition"
            >
              Somadal Alger (MCB)
            </button>
            <button
              type="button"
              onClick={() => {
                setRefCommandeDefaut('AO261543');
                setNomClientDefaut('HAMEL NABIL');
                setDateCommandeDefaut('05/08/2026');
                setColorisDefaut('BL');
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-mono text-[11px] transition"
            >
              Atelier Alger (Hamel)
            </button>
          </div>
        </div>

        {/* Global Context Bar for default order values */}
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
              placeholder="ex: S-A26736"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nom Client Final / Menuiserie</span>
            </label>
            <input
              type="text"
              value={nomClientDefaut}
              onChange={e => setNomClientDefaut(e.target.value)}
              placeholder="ex: SARL MCB ALUMINIUM"
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

        {/* Formulaire ajout rapide tablier */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Repère (ex: SA-1) *
            </label>
            <input
              type="text"
              value={saisieRepere}
              onChange={e => setSaisieRepere(e.target.value)}
              placeholder="ex: SA-1"
              onKeyDown={e => e.key === 'Enter' && handleAjouterTablier()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Largeur (Coupe Lame mm) *
            </label>
            <input
              type="number"
              value={saisieLargeur}
              onChange={e => setSaisieLargeur(e.target.value)}
              placeholder="ex: 2130"
              onKeyDown={e => e.key === 'Enter' && handleAjouterTablier()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Hauteur Tablier (mm) *
            </label>
            <input
              type="number"
              value={saisieHauteur}
              onChange={e => setSaisieHauteur(e.target.value)}
              placeholder="ex: 2250"
              onKeyDown={e => e.key === 'Enter' && handleAjouterTablier()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Modèle Lame *
            </label>
            <select
              value={saisieHauteurLame}
              onChange={e => setSaisieHauteurLame(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value={55}>55 mm (TAB 55)</option>
              <option value={43}>43 mm (TBL 43)</option>
              <option value={39}>39 mm</option>
              <option value={50}>50 mm</option>
            </select>
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
              onKeyDown={e => e.key === 'Enter' && handleAjouterTablier()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-100 font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-1">
            <button
              onClick={handleAjouterTablier}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition shadow-sm"
              title="Ajouter ce tablier"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tableau interactif avec Inline Edit */}
        {tabliers.length > 0 ? (
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Cmd</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Repère</th>
                  <th className="py-2.5 px-3">Largeur (Coupe)</th>
                  <th className="py-2.5 px-3">Hauteur</th>
                  <th className="py-2.5 px-3 text-center">Modèle</th>
                  <th className="py-2.5 px-3 text-center">Nb Lames / Tablier</th>
                  <th className="py-2.5 px-3 text-center">Qté</th>
                  <th className="py-2.5 px-3 text-center">Total Lames</th>
                  <th className="py-2.5 px-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {tabliers.map((t, idx) => {
                  const isEditing = editingId === t.id && editForm !== null;
                  const nbLameUnitaire = isEditing
                    ? Math.ceil(editForm.hauteur / editForm.hauteur_lame_tablier)
                    : t.nb_lame || Math.ceil(t.hauteur / t.hauteur_lame_tablier);
                  const totalLames = isEditing
                    ? nbLameUnitaire * editForm.quantite
                    : nbLameUnitaire * t.quantite;

                  if (isEditing) {
                    return (
                      <tr key={t.id} className="bg-amber-950/20 border-2 border-amber-500/40">
                        <td className="py-2 px-2 text-center text-amber-400 font-bold">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={editForm.refCommande || ''}
                            onChange={e => setEditForm({ ...editForm, refCommande: e.target.value })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-amber-300 font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={editForm.nomClient || ''}
                            onChange={e => setEditForm({ ...editForm, nomClient: e.target.value })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-slate-100 font-sans"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={editForm.repere}
                            onChange={e => setEditForm({ ...editForm, repere: e.target.value })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-amber-300 font-bold"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={editForm.largeur}
                            onChange={e => setEditForm({ ...editForm, largeur: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-slate-100 font-mono font-bold"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={editForm.hauteur}
                            onChange={e => setEditForm({ ...editForm, hauteur: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-slate-100 font-mono"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <select
                            value={editForm.hauteur_lame_tablier}
                            onChange={e => setEditForm({ ...editForm, hauteur_lame_tablier: Number(e.target.value) })}
                            className="bg-slate-950 border border-amber-500 rounded px-1 py-1 text-xs text-amber-300 font-bold"
                          >
                            <option value={55}>55 mm</option>
                            <option value={43}>43 mm</option>
                            <option value={39}>39 mm</option>
                            <option value={50}>50 mm</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center text-sky-400 font-bold">
                          {nbLameUnitaire}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={editForm.quantite}
                            onChange={e => setEditForm({ ...editForm, quantite: parseInt(e.target.value, 10) || 1 })}
                            className="w-14 bg-slate-950 border border-amber-500 rounded px-1 py-1 text-xs text-slate-100 font-bold text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center text-emerald-400 font-bold">
                          {totalLames}
                        </td>
                        <td className="py-2 px-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition shadow"
                              title="Enregistrer les modifications"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition"
                              title="Annuler"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {t.refCommande || refCommandeDefaut}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans text-xs max-w-[140px] truncate">
                        {t.nomClient || nomClientDefaut}
                      </td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold font-sans">
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          {t.repere}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-amber-400 font-bold text-sm">{t.largeur} mm</td>
                      <td className="py-2.5 px-3 text-slate-200">{t.hauteur} mm</td>
                      <td className="py-2.5 px-3 text-center text-slate-300">{t.hauteur_lame_tablier} mm</td>
                      <td className="py-2.5 px-3 text-center text-sky-400 font-bold">
                        {nbLameUnitaire} lames
                        <span className="text-[10px] text-slate-500 font-sans block">
                          ({t.hauteur}/{t.hauteur_lame_tablier})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-200 font-bold">{t.quantite}</td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold text-sm">
                        {totalLames}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleStartEdit(t)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                            title="Modifier cette ligne directement"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDupliquerTablier(t)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition"
                            title="Dupliquer la ligne"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSupprimerTablier(t.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-950/80 border-t border-slate-800 text-xs font-semibold">
                <tr>
                  <td colSpan={8} className="py-2.5 px-3 text-right text-slate-400">
                    TOTAL LAMES TOUTES COMMANDES CONFONDUES :
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300 font-bold">
                    {tabliers.reduce((s, t) => s + t.quantite, 0)} tabliers
                  </td>
                  <td className="py-2.5 px-3 text-center text-amber-400 font-bold font-mono text-sm">
                    {totalLamesTotal} lames
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950/40 rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs">
            Aucun tablier saisi. Remplissez le formulaire ci-dessus pour calculer les lames.
          </div>
        )}
      </div>

      {/* Paramètres d'optimisation 1D pour les lames */}
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

      {/* Action Button: Calcul de l'optimisation */}
      <div className="flex justify-end">
        <button
          onClick={handleCalculerOptimisation}
          disabled={isCalculating || tabliers.length === 0 || !selectedArticle}
          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className={`w-4 h-4 text-slate-950 ${isCalculating ? 'animate-spin' : ''}`} />
          <span>
            {isCalculating
              ? 'Optimisation des lames en cours...'
              : `Optimiser la Découpe de toutes les Lames (${totalLamesTotal} lames)`}
          </span>
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

      {/* Ordre de fabrication Modal */}
      {resultat && (
        <OrdreFabricationModal
          isOpen={isOFOpen}
          onClose={() => setIsOFOpen(false)}
          titreProduit={selectedArticle?.designation || 'TABLIER ROULANT / LAMES'}
          refCommande={refCommandeDefaut}
          nomClient={nomClientDefaut}
          dateCommande={dateCommandeDefaut}
          coloris={colorisDefaut}
          article={selectedArticle}
          resultat={resultat}
          famille="TABLIER"
          onOFEmis={onStockUpdated}
        />
      )}
    </div>
  );
};
