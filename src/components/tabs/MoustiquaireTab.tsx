import React, { useState, useMemo } from 'react';
import {
  Article,
  ChuteItem,
  ChuteMaille,
  MappingChutes,
  BesoinMoustiquaire,
  ResultatMoustiquaire,
  ResultatOptimisation
} from '../../types';
import {
  calculerMoustiquaire,
  normalizeTypeOuverture
} from '../../services/moteurMoustiquaire';
import { StorageService } from '../../services/storage';
import { SelecteurArticle } from '../common/SelecteurArticle';
import { SelecteurMode } from '../common/SelecteurMode';
import { VisualiseurBarres } from '../common/VisualiseurBarres';
import { OrdreFabricationModal } from '../common/OrdreFabricationModal';
import { OptimiseurCoupe1D } from '../../services/optimiseur1d';
import { detecterAgence, getTodayDateString } from '../../services/codificationService';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Scissors,
  Layers,
  ArrowRight,
  RotateCcw,
  Play,
  PackageCheck,
  Building,
  User,
  Calendar,
  Palette,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy
} from 'lucide-react';

interface MoustiquaireTabProps {
  articles: Article[];
  chutesBarres: Record<string, ChuteItem[]>;
  chutesMaille: ChuteMaille[];
  mapping: MappingChutes;
  onStockUpdated: () => void;
}

export const MoustiquaireTab: React.FC<MoustiquaireTabProps> = ({
  articles = [],
  chutesBarres = {},
  chutesMaille = [],
  mapping = {},
  onStockUpdated
}) => {
  const safeArticles = Array.isArray(articles) ? articles : [];

  // En-tête Dossier / Commande en cours
  const [refCommandeDefaut, setRefCommandeDefaut] = useState<string>('AO261456');
  const [nomClientDefaut, setNomClientDefaut] = useState<string>('MANSOUR ALULUX');
  const [dateCommandeDefaut, setDateCommandeDefaut] = useState<string>('01/07/2026');
  const [colorisDefaut, setColorisDefaut] = useState<string>('G7024');

  const agenceInfo = useMemo(() => detecterAgence(refCommandeDefaut), [refCommandeDefaut]);

  // Liste des moustiquaires commandées (Exemples issus des BL réels)
  const [moustiquaires, setMoustiquaires] = useState<BesoinMoustiquaire[]>([
    {
      id: 'm1',
      refCommande: 'AO261456',
      nomClient: 'MANSOUR ALULUX',
      dateCommande: '01/07/2026',
      modele: 'MSTQ 20mm',
      typeFabrication: 'COMPLET',
      avecBarreInferieure: false,
      largeur: 1385,
      hauteur: 1010,
      quantite: 1,
      repere: 'M1',
      typeOuverture: 'PORTE_FENETRE'
    },
    {
      id: 'm2',
      refCommande: 'AO261456',
      nomClient: 'MANSOUR ALULUX',
      dateCommande: '01/07/2026',
      modele: 'MSTQ 20mm',
      typeFabrication: 'COMPLET',
      avecBarreInferieure: false,
      largeur: 370,
      hauteur: 795,
      quantite: 1,
      repere: 'M2',
      typeOuverture: 'FIXE'
    },
    {
      id: 'm3',
      refCommande: 'AO261458',
      nomClient: 'BENDELLA ABDELKRIM',
      dateCommande: '02/07/2026',
      modele: 'MSTQ 20mm',
      typeFabrication: 'COMPLET',
      avecBarreInferieure: false,
      largeur: 1960,
      hauteur: 2250,
      quantite: 1,
      repere: 'B1',
      typeOuverture: 'DOUBLE_VANTAUX'
    }
  ]);

  // Formulaire d'ajout rapide
  const [selectedModele, setSelectedModele] = useState<string>('MSTQ 20mm');
  const [typeFabrication, setTypeFabrication] = useState<'COMPLET' | 'SEMI_FINI_MAILLE' | 'PROFILES_SEULS'>('COMPLET');
  const [avecBarreInferieure, setAvecBarreInferieure] = useState<boolean>(false);
  const [largeur, setLargeur] = useState<string>('');
  const [hauteur, setHauteur] = useState<string>('');
  const [quantite, setQuantite] = useState<string>('1');
  const [repere, setRepere] = useState<string>('M3');
  const [typeOuverture, setTypeOuverture] = useState<string>('PORTE_FENETRE');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BesoinMoustiquaire | null>(null);

  // Profilé sélectionné pour cadre/coulisse si fabrication complète
  const defaultProfile = useMemo(() => {
    return (
      safeArticles.find(a => a?.designation && a.designation.toUpperCase().includes('CADRE MSTQ')) ||
      safeArticles.find(a => a?.designation && a.designation.toUpperCase().includes('COULISSE')) ||
      safeArticles[0] ||
      null
    );
  }, [safeArticles]);

  const [selectedProfileArticle, setSelectedProfileArticle] = useState<Article | null>(defaultProfile);
  const [mode, setMode] = useState<'matiere' | 'temps'>('matiere');
  const [poidsTemps, setPoidsTemps] = useState<number>(5.0);

  // Résultat 1D pour profilés
  const [resultat1D, setResultat1D] = useState<ResultatOptimisation | null>(null);
  const [isCalculating1D, setIsCalculating1D] = useState<boolean>(false);
  const [isOFOpen, setIsOFOpen] = useState<boolean>(false);

  const mappedSheetName = selectedProfileArticle ? mapping[selectedProfileArticle.code_art] || null : null;
  const availableChutesBarres = mappedSheetName ? chutesBarres[mappedSheetName] || [] : [];

  // Calculs détaillés pour chaque moustiquaire de la liste
  const calculsDetailles = useMemo(() => {
    return moustiquaires.map(item => {
      const res = calculerMoustiquaire(item, chutesMaille);
      return {
        item,
        res
      };
    });
  }, [moustiquaires, chutesMaille]);

  const handleAjouterMoustiquaire = () => {
    const l = parseFloat(largeur);
    const h = parseFloat(hauteur);
    const qte = parseInt(quantite, 10);

    if (isNaN(l) || l <= 0 || isNaN(h) || h <= 0 || isNaN(qte) || qte <= 0) {
      alert('Veuillez saisir des dimensions et une quantité valides.');
      return;
    }

    const autoRepere = repere.trim() || `H${moustiquaires.length + 1}`;

    const newMstq: BesoinMoustiquaire = {
      id: String(Date.now()),
      refCommande: refCommandeDefaut,
      nomClient: nomClientDefaut,
      dateCommande: dateCommandeDefaut,
      modele: 'MSTQ 20mm',
      typeOuverture: typeOuverture || 'PORTE_FENETRE',
      typeFabrication,
      avecBarreInferieure,
      largeur: l,
      hauteur: h,
      quantite: qte,
      repere: autoRepere
    };

    setMoustiquaires([...moustiquaires, newMstq]);
    setLargeur('');
    setHauteur('');
    setRepere(`H${moustiquaires.length + 2}`);
  };

  const handleSupprimerMoustiquaire = (id: string) => {
    setMoustiquaires(moustiquaires.filter(m => m.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleDupliquerMoustiquaire = (m: BesoinMoustiquaire) => {
    setMoustiquaires([
      ...moustiquaires,
      {
        ...m,
        id: String(Date.now()),
        repere: `${m.repere}-copie`
      }
    ]);
  };

  const handleStartEdit = (m: BesoinMoustiquaire) => {
    setEditingId(m.id || null);
    setEditForm({ ...m });
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

    setMoustiquaires(moustiquaires.map(m => (m.id === editForm.id ? editForm : m)));
    setEditingId(null);
    setEditForm(null);
  };

  // Consommation et débit profilé
  const handleOptimiserProfils = () => {
    if (!selectedProfileArticle) {
      alert('Veuillez sélectionner un article de profilé pour le cadre.');
      return;
    }

    // Récupérer toutes les coupes de profilés nécessaires pour les ouvrages complets
    const poolPieces: { longueur: number; quantite: number; label: string; repere: string; refCommande?: string }[] = [];

    calculsDetailles.forEach(({ item, res }) => {
      if (item.typeFabrication === 'COMPLET' || item.typeFabrication === 'PROFILES_SEULS') {
        res.pieces_cadre_coulisse.forEach(p => {
          poolPieces.push({
            longueur: p.longueur,
            quantite: p.quantite,
            label: p.label,
            repere: p.repere || `${item.repere}-PR`,
            refCommande: item.refCommande || refCommandeDefaut
          });
        });
      }
    });

    if (poolPieces.length === 0) {
      alert('Aucun profilé cadre ou coulisse à débiter. Vérifiez que la prestation est positionnée sur "Produit Complet" ou "Profilés Seuls".');
      return;
    }

    setIsCalculating1D(true);

    setTimeout(() => {
      try {
        const optimiseur = new OptimiseurCoupe1D({
          longueurBarre: selectedProfileArticle.longeur,
          epaisseurScie: selectedProfileArticle.lame,
          refusMin: selectedProfileArticle.refus_min,
          refusMax: selectedProfileArticle.refus_max,
          mode,
          poidsTemps
        });

        const res = optimiseur.optimiser(poolPieces, availableChutesBarres);
        res.articleCode = selectedProfileArticle.code_art;
        res.articleDesignation = selectedProfileArticle.designation;
        res.refCommande = refCommandeDefaut;
        res.nomClient = nomClientDefaut;
        res.dateCommande = dateCommandeDefaut;        setResultat1D(res);
      } catch (err: any) {
        alert('Erreur: ' + err.message);
      } finally {
        setIsCalculating1D(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* En-tête Dossier / Commande */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100">
                  Moustiquaires Plissées — Débit Maille, Cordes & Profilés
                </h3>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${agenceInfo.badgeBg} ${agenceInfo.badgeColor}`}>
                  {agenceInfo.nom}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestion des commandes finies ou semi-finies (maille seule, profilés seuls ou produit complet).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Exemple Bordereau BL :</span>
            <button
              type="button"
              onClick={() => {
                setRefCommandeDefaut('AO261456');
                setNomClientDefaut('MANSOUR ALULUX');
                setDateCommandeDefaut('01/07/2026');
                setColorisDefaut('G7024');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-mono text-[11px] transition"
            >
              AO261456 — Mansour Alulux
            </button>
          </div>
        </div>

        {/* Global Context Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-xs">
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span>Réf. Commande / Devis</span>
            </label>
            <input
              type="text"
              value={refCommandeDefaut}
              onChange={e => setRefCommandeDefaut(e.target.value)}
              placeholder="ex: AO261456"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nom Client / Demandeur</span>
            </label>
            <input
              type="text"
              value={nomClientDefaut}
              onChange={e => setNomClientDefaut(e.target.value)}
              placeholder="ex: MANSOUR ALULUX"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Date Commande / BL</span>
            </label>
            <input
              type="text"
              value={dateCommandeDefaut}
              onChange={e => setDateCommandeDefaut(e.target.value)}
              placeholder="01/07/2026"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Palette className="w-3.5 h-3.5 text-rose-400" />            </label>          </div>
        </div>

        {/* Formulaire ajout rapide moustiquaire */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Repère (ex: M1) *
              </label>
              <input
                type="text"
                value={repere}
                onChange={e => setRepere(e.target.value)}
                placeholder="ex: M1"
                onKeyDown={e => e.key === 'Enter' && handleAjouterMoustiquaire()}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Largeur (mm) *
              </label>
              <input
                type="number"
                value={largeur}
                onChange={e => setLargeur(e.target.value)}
                placeholder="ex: 1385"
                onKeyDown={e => e.key === 'Enter' && handleAjouterMoustiquaire()}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Hauteur (mm) *
              </label>
              <input
                type="number"
                value={hauteur}
                onChange={e => setHauteur(e.target.value)}
                placeholder="ex: 1010"
                onKeyDown={e => e.key === 'Enter' && handleAjouterMoustiquaire()}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Type Ouvrage / Forme *
              </label>
              <select
                value={typeOuverture}
                onChange={e => setTypeOuverture(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-amber-300 font-bold focus:outline-none"
              >
                <option value="PORTE_FENETRE">🚪 Porte-Fenêtre (Ouverture Latérale 1 Vantail)</option>
                <option value="DOUBLE_VANTAUX">🚪🚪 Baie 2 Vantaux (Ouverture Latérale Double)</option>
                <option value="CENTRALE">↔️ Porte-Fenêtre Centrale (1 Vantail)</option>
                <option value="FENETRE">🪟 Fenêtre Standard (Ouverture Verticale)</option>
                <option value="FIXE">🔒 Moustiquaire Fixe (Sans Coulisse de tirage)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Prestation *
              </label>
              <select
                value={typeFabrication}
                onChange={e => setTypeFabrication(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-sky-300 font-bold focus:outline-none"
              >
                <option value="COMPLET">Produit Complet (Cadre + Coulisses + Toile)</option>
                <option value="SEMI_FINI_MAILLE">Semi-Fini (Maille Seule)</option>
                <option value="PROFILES_SEULS">Profilés Alu Seuls (Sans Toile)</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <button
                onClick={handleAjouterMoustiquaire}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                title="Ajouter à la commande"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Option d'esthétique : Barre inférieure fine */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-xs">
            <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer hover:text-amber-300 transition">
              <input
                type="checkbox"
                checked={avecBarreInferieure}
                onChange={e => setAvecBarreInferieure(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-slate-900"
              />
              <span>Remplacer la traverse inférieure du cadre par une <strong>Barre Inférieure fine & esthétique</strong></span>
            </label>
          </div>
        </div>

        {/* Tableau des moustiquaires */}
        {moustiquaires.length > 0 ? (
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Cmd</th>
                  <th className="py-2.5 px-3">Repère</th>
                  <th className="py-2.5 px-3">Dimensions (L × H)</th>
                  <th className="py-2.5 px-3">Superficie</th>
                  <th className="py-2.5 px-3">Type Ouvrage</th>
                  <th className="py-2.5 px-3 text-center">Toile (Plis)</th>
                  <th className="py-2.5 px-3 text-center">Cordes (Guidage)</th>
                  <th className="py-2.5 px-3 text-center">Métrage Corde</th>
                  <th className="py-2.5 px-3 text-center">Prestation</th>
                  <th className="py-2.5 px-3 text-center">Qté</th>
                  <th className="py-2.5 px-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {calculsDetailles.map(({ item, res }, idx) => {
                  const isEditing = editingId === item.id && editForm !== null;
                  const typeLabel = normalizeTypeOuverture(item.typeOuverture);

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-amber-950/20 border-2 border-amber-500/40">
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
                            value={editForm.repere}
                            onChange={e => setEditForm({ ...editForm, repere: e.target.value })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-amber-300 font-bold"
                          />
                        </td>
                        <td className="py-2 px-2 flex items-center gap-1">
                          <input
                            type="number"
                            value={editForm.largeur}
                            onChange={e => setEditForm({ ...editForm, largeur: parseFloat(e.target.value) || 0 })}
                            className="w-16 bg-slate-950 border border-amber-500 rounded px-1 py-1 text-xs text-slate-100 font-mono font-bold"
                          />
                          <span>×</span>
                          <input
                            type="number"
                            value={editForm.hauteur}
                            onChange={e => setEditForm({ ...editForm, hauteur: parseFloat(e.target.value) || 0 })}
                            className="w-16 bg-slate-950 border border-amber-500 rounded px-1 py-1 text-xs text-slate-100 font-mono font-bold"
                          />
                        </td>
                        <td className="py-2 px-2 text-slate-400 font-sans text-xs">
                          {res.superficie_m2} m²
                        </td>
                        <td className="py-2 px-2 font-sans">
                          <select
                            value={editForm.typeOuverture}
                            onChange={e => setEditForm({ ...editForm, typeOuverture: e.target.value })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-slate-100"
                          >
                            <option value="PORTE_FENETRE">Porte-Fenêtre</option>
                            <option value="DOUBLE_VANTAUX">Baie 2 Vantaux</option>
                            <option value="CENTRALE">Centrale</option>
                            <option value="FENETRE">Fenêtre</option>
                            <option value="FIXE">Fixe</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center text-amber-400 font-bold">
                          {res.nb_plis_requis} plis
                        </td>
                        <td className="py-2 px-2 text-center text-sky-400 font-bold">
                          {res.nb_fils_guidage} cordes ({res.distance_cordes}mm)
                        </td>
                        <td className="py-2 px-2 text-center text-emerald-400 font-bold">
                          {res.longueur_corde_totale_m} m
                        </td>
                        <td className="py-2 px-2 text-center font-sans">
                          <select
                            value={editForm.typeFabrication}
                            onChange={e => setEditForm({ ...editForm, typeFabrication: e.target.value as any })}
                            className="bg-slate-950 border border-amber-500 rounded px-1 py-1 text-[11px] text-amber-300 font-bold"
                          >
                            <option value="COMPLET">Complet</option>
                            <option value="SEMI_FINI_MAILLE">Maille Seule</option>
                            <option value="PROFILES_SEULS">Profilés Seuls</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={editForm.quantite}
                            onChange={e => setEditForm({ ...editForm, quantite: parseInt(e.target.value, 10) || 1 })}
                            className="w-12 bg-slate-950 border border-amber-500 rounded px-1 py-1 text-xs text-slate-100 font-bold text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition cursor-pointer"
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

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {item.refCommande || refCommandeDefaut}
                      </td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold font-sans">
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          {item.repere}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-100 font-bold">
                        {item.largeur} × {item.hauteur} mm
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-xs">
                        {res.superficie_m2} m²
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">
                        <span className="font-bold text-slate-200">
                          {typeLabel === 'PORTE_FENETRE' ? '🚪 Porte-Fenêtre' :
                           typeLabel === 'DOUBLE_VANTAUX' ? '🚪🚪 Baie 2 Vantaux' :
                           typeLabel === 'CENTRALE' ? '↔️ Centrale' :
                           typeLabel === 'FIXE' ? '🔒 Fixe' : '🪟 Fenêtre'}
                        </span>
                        {item.avecBarreInferieure && (
                          <span className="block text-[10px] text-amber-400 font-bold">
                            + Barre Inférieure Fine
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-amber-400 font-bold text-sm">
                        {res.nb_plis_requis} plis
                        <span className="text-[10px] text-slate-500 block font-sans">
                          (Fixe {res.dimension_fixe_est} : {res.dimension_fixe_requise} mm)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-sky-400 font-bold">
                        {res.nb_fils_guidage} cordes
                        <span className="text-[10px] text-slate-500 block font-sans">
                          (Écart {res.distance_cordes} mm)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                        {res.longueur_corde_totale_m} m
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {item.typeFabrication === 'SEMI_FINI_MAILLE' ? (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold">
                            Maille Seule
                          </span>
                        ) : item.typeFabrication === 'PROFILES_SEULS' ? (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[10px] font-bold">
                            Profilés Seuls
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-[10px] font-bold">
                            Produit Complet
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-100">{item.quantite}</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDupliquerMoustiquaire(item)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Dupliquer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSupprimerMoustiquaire(item.id || '')}
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
            Aucune moustiquaire dans la commande.
          </div>
        )}
      </div>

      {/* Option débit profilés cadre/coulisses */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Débit 1D des Profilés Aluminium (Cadres & Coulisses Moustiquaire)
              </h3>
              <p className="text-xs text-slate-400">
                Génération automatique du débit des montants et traverses pour l'ensemble des cadres saisis.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <SelecteurArticle
              articles={articles}
              selectedArticle={selectedProfileArticle}
              onSelectArticle={setSelectedProfileArticle}
              mappedSheetName={mappedSheetName}
              chutesAvailableCount={availableChutesBarres.reduce((s, c) => s + c.quantite, 0)}
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

        <div className="flex justify-end pt-2">
          <button
            onClick={handleOptimiserProfils}
            disabled={isCalculating1D || moustiquaires.length === 0 || !selectedProfileArticle}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            <Play className={`w-4 h-4 text-slate-950 ${isCalculating1D ? 'animate-spin' : ''}`} />
            <span>Optimiser le Découpage des Profilés Moustiquaire</span>
          </button>
        </div>
      </div>

      {/* Résultat 1D si calculé */}
      {resultat1D && (
        <VisualiseurBarres
          resultat={resultat1D}
          articleDesignation={selectedProfileArticle?.designation}
          onOpenOF={() => setIsOFOpen(true)}
        />
      )}

      {/* Modal OF */}
      {resultat1D && (
        <OrdreFabricationModal
          isOpen={isOFOpen}
          onClose={() => setIsOFOpen(false)}
          titreProduit={selectedProfileArticle?.designation || 'PROFILÉS MOUSTIQUAIRE PLISSÉE'}
          refCommande={refCommandeDefaut}
          nomClient={nomClientDefaut}
          dateCommande={dateCommandeDefaut}
          coloris={colorisDefaut}
          article={selectedProfileArticle}
          resultat={resultat1D}
          lignesMoustiquaires={moustiquaires}
          famille="MOUSTIQUAIRE"
          onOFEmis={onStockUpdated}
        />
      )}
    </div>
  );
};
