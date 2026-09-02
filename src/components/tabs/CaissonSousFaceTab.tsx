import React, { useState, useMemo, useEffect } from 'react';
import { Article, ChuteItem, MappingChutes, ResultatOptimisation, PieceACouper } from '../../types';
import { SelecteurArticle } from '../common/SelecteurArticle';
import { SelecteurMode } from '../common/SelecteurMode';
import { VisualiseurBarres } from '../common/VisualiseurBarres';
import { OrdreFabricationModal } from '../common/OrdreFabricationModal';
import { OptimiseurCoupe1D } from '../../services/optimiseur1d';
import { detecterAgence, getTodayDateString } from '../../services/codificationService';
import { StorageService } from '../../services/storage';
import {
  Plus,
  Trash2,
  Play,
  Layers,
  Edit2,
  Check,
  X,
  Copy,
  Building,
  User,
  Calendar,
  Palette,
  Scissors,
  Package
} from 'lucide-react';

interface CaissonSousFaceTabProps {
  articles: Article[];
  chutesBarres: Record<string, ChuteItem[]>;
  mapping: MappingChutes;
  onStockUpdated?: () => void;
}

export const CaissonSousFaceTab: React.FC<CaissonSousFaceTabProps> = ({
  articles = [],
  chutesBarres = {},
  mapping = {},
  onStockUpdated
}) => {
  const safeArticles = Array.isArray(articles) ? articles : [];

  // STRICTEMENT Caissons Tunnel CT et Sous-Faces SF (Exclut Précadres, Lames Tabliers, Coulisses)
  const articlesAtelier = useMemo(() => {
    return safeArticles.filter(a => {
      if (!a || !a.designation) return false;
      const d = a.designation.toUpperCase().trim();
      const isSF = d.startsWith('SF') || d.includes('SOUS-FACE') || d.includes('SOUS FACE') || d.includes('CH SF');
      const isCT = d.startsWith('CT') || d.startsWith('CAISSON TUNNEL') || (d.includes('CAISSON') && !isSF);
      const isOther = d.includes('PRECADRE') || d.includes('TUBULAIRE') || d.includes('TBL') || d.includes('LAME') || d.includes('COULIS');
      return (isCT || isSF) && !isOther;
    });
  }, [safeArticles]);

  const [familleFiltre, setFamilleFiltre] = useState<'CT' | 'SF'>('CT');

  const articlesFiltres = useMemo(() => {
    if (familleFiltre === 'CT') {
      return articlesAtelier.filter(a => a.designation.toUpperCase().startsWith('CT') || a.designation.toUpperCase().includes('CAISSON'));
    }
    return articlesAtelier.filter(a => a.designation.toUpperCase().startsWith('SF') || a.designation.toUpperCase().includes('SOUS-FACE'));
  }, [articlesAtelier, familleFiltre]);

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(() => {
    return articlesAtelier.find(a => a.designation.toUpperCase().startsWith('CT')) || articlesAtelier[0] || null;
  });

  // Maintenir l'article sélectionné synchronisé lorsque articles change
  useEffect(() => {
    if (!selectedArticle && articlesFiltres.length > 0) {
      setSelectedArticle(articlesFiltres[0]);
    }
  }, [articlesFiltres, selectedArticle]);

  // Quand on change d'onglet famille (CT ou SF), présélectionner le premier article correspondant
  const handleChangeFamille = (f: 'CT' | 'SF') => {
    setFamilleFiltre(f);
    const target = articlesAtelier.find(a => {
      const d = a.designation.toUpperCase();
      return f === 'CT' ? (d.startsWith('CT') || d.includes('CAISSON')) : (d.startsWith('SF') || d.includes('SOUS-FACE'));
    });
    if (target) setSelectedArticle(target);
  };

  const [mode, setMode] = useState<'matiere' | 'temps'>('matiere');
  const [poidsTemps, setPoidsTemps] = useState<number>(5.0);

  const [refCommandeDefaut, setRefCommandeDefaut] = useState<string>('');
  const [nomClientDefaut, setNomClientDefaut] = useState<string>('');
  const [dateCommandeDefaut, setDateCommandeDefaut] = useState<string>(() => getTodayDateString());
  const [colorisDefaut, setColorisDefaut] = useState<string>('BRUT');

  const agenceInfo = useMemo(() => detecterAgence(refCommandeDefaut), [refCommandeDefaut]);

  const [pieces, setPieces] = useState<PieceACouper[]>([]);

  // Formulaire d'ajout rapide
  const [saisieRefCommande, setSaisieRefCommande] = useState<string>('');
  const [saisieNomClient, setSaisieNomClient] = useState<string>('');
  const [saisieLongueur, setSaisieLongueur] = useState<string>('');
  const [saisieQte, setSaisieQte] = useState<string>('1');
  const [saisieLabel, setSaisieLabel] = useState<string>(`C-${pieces.length + 1}`);

  // État d'édition en ligne
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PieceACouper | null>(null);

  // Résultat d'optimisation
  const [resultat, setResultat] = useState<ResultatOptimisation | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isOFOpen, setIsOFOpen] = useState<boolean>(false);

  const mappedSheetName = selectedArticle ? mapping[selectedArticle.code_art] || null : null;
  const availableChutes = mappedSheetName ? chutesBarres[mappedSheetName] || [] : [];

  const handleAjouterPiece = () => {
    const lg = parseFloat(saisieLongueur);
    const qte = parseInt(saisieQte, 10);
    if (isNaN(lg) || lg <= 0 || isNaN(qte) || qte <= 0) {
      alert('Veuillez saisir une longueur et une quantité valides positives.');
      return;
    }

    const debord = selectedArticle?.debordement || 0;
    const ref = (saisieRefCommande.trim() || refCommandeDefaut.trim() || 'CMD-01');
    const client = (saisieNomClient.trim() || nomClientDefaut.trim() || 'CLIENT');
    const rep = saisieLabel.trim() || `C-${pieces.length + 1}`;

    const newPiece: PieceACouper = {
      id: String(Date.now()),
      refCommande: ref,
      nomClient: client,
      dateCommande: dateCommandeDefaut,
      longueur: lg,
      longueurAvecDebord: lg + debord,
      quantite: qte,
      label: rep,
      repere: rep
    };

    setPieces([...pieces, newPiece]);
    setSaisieLongueur('');
    setSaisieQte('1');
    setSaisieLabel(`C-${pieces.length + 2}`);
  };

  const handleSupprimerPiece = (id: string) => {
    setPieces(pieces.filter(p => p.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleDupliquerPiece = (p: PieceACouper) => {
    setPieces([
      ...pieces,
      {
        ...p,
        id: String(Date.now()),
        label: `${p.label}-copie`,
        repere: `${p.repere}-copie`
      }
    ]);
  };

  const handleStartEdit = (p: PieceACouper) => {
    setEditingId(p.id);
    setEditForm({ ...p });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    if (editForm.longueur <= 0 || editForm.quantite <= 0) {
      alert('Veuillez renseigner une longueur et quantité valides.');
      return;
    }

    const debord = selectedArticle?.debordement || 0;
    const updated: PieceACouper = {
      ...editForm,
      longueurAvecDebord: editForm.longueur + debord,
      label: editForm.label?.trim() || 'Coupe',
      repere: editForm.repere?.trim() || editForm.label?.trim() || 'Coupe'
    };

    setPieces(pieces.map(p => (p.id === updated.id ? updated : p)));
    setEditingId(null);
    setEditForm(null);
  };

  const [resultatSections, setResultatSections] = useState<Array<{
    type: 'CT' | 'SF';
    articleDesignation: string;
    article: Article;
    resultat: ResultatOptimisation;
  }>>([]);

  const handleCalculerOptimisation = () => {
    if (!selectedArticle) {
      alert('Veuillez d\'abord sélectionner un article.');
      return;
    }
    if (pieces.length === 0) {
      alert('Veuillez ajouter au moins une mesure à couper.');
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      try {
        const sectionsList: Array<{
          type: 'CT' | 'SF';
          articleDesignation: string;
          article: Article;
          resultat: ResultatOptimisation;
        }> = [];

        // 1. Découpe de l'article principal (ex: Caisson CT)
        const optimiseur = new OptimiseurCoupe1D({
          longueurBarre: selectedArticle.longeur,
          epaisseurScie: selectedArticle.lame,
          refusMin: selectedArticle.refus_min,
          refusMax: selectedArticle.refus_max,
          mode,
          poidsTemps
        });

        const piecesAvecDebord = pieces.map(p => ({
          longueur: p.longueur + selectedArticle.debordement,
          quantite: p.quantite,
          label: p.label,
          repere: p.repere || p.label,
          refCommande: p.refCommande
        }));

        const resCT = optimiseur.optimiser(piecesAvecDebord, availableChutes);
        resCT.articleCode = selectedArticle.code_art;
        resCT.articleDesignation = selectedArticle.designation;
        resCT.refCommande = refCommandeDefaut;
        resCT.nomClient = nomClientDefaut;
        resCT.dateCommande = dateCommandeDefaut;
        resCT.coloris = colorisDefaut;

        const isCT = selectedArticle.designation.toUpperCase().startsWith('CT') || selectedArticle.designation.toUpperCase().includes('CAISSON');
        sectionsList.push({
          type: isCT ? 'CT' : 'SF',
          articleDesignation: selectedArticle.designation,
          article: selectedArticle,
          resultat: resCT
        });

        // 2. Si c'est un Caisson CT, générer également la Sous-Face SF associée (si disponible dans les articles)
        if (isCT) {
          const articlesSousFaceList = articles.filter(a => a.designation.toUpperCase().startsWith('SF') || a.designation.toUpperCase().includes('SOUS-FACE') || a.designation.toUpperCase().includes('SOUS FACE'));
          const sfMatchingCode = (selectedArticle as any).sous_face_associee;
          const sfArticle = articlesSousFaceList.find(a => a.code_art === sfMatchingCode) || articlesSousFaceList[0];
          if (sfArticle) {
            const mappedSheetNameSF = mapping[sfArticle.code_art] || null;
            const availableChutesSF = mappedSheetNameSF ? chutesBarres[mappedSheetNameSF] || [] : [];
            const optSF = new OptimiseurCoupe1D({
              longueurBarre: sfArticle.longeur || 6000,
              epaisseurScie: sfArticle.lame || 4.5,
              refusMin: sfArticle.refus_min ?? 300,
              refusMax: sfArticle.refus_max ?? 1200,
              mode,
              poidsTemps
            });

            const piecesSF = pieces.map((p, i) => {
              const numPart = (p.repere || p.label || '').replace(/^[^\d]*/, '') || String(i + 1);
              const repSF = `SF-${numPart}`;
              return {
                longueur: p.longueur + (sfArticle.debordement || 0),
                quantite: p.quantite,
                label: `${repSF} (${sfArticle.designation})`,
                repere: repSF,
                refCommande: p.refCommande
              };
            });

            const resSF = optSF.optimiser(piecesSF, availableChutesSF);
            resSF.articleCode = sfArticle.code_art;
            resSF.articleDesignation = sfArticle.designation;
            resSF.refCommande = refCommandeDefaut;
            resSF.nomClient = nomClientDefaut;
            resSF.dateCommande = dateCommandeDefaut;
            resSF.coloris = 'BL';

            sectionsList.push({
              type: 'SF',
              articleDesignation: sfArticle.designation,
              article: sfArticle,
              resultat: resSF
            });
          }
        }

        setResultat(resCT);
        setResultatSections(sectionsList);
      } catch (err: any) {
        alert('Erreur lors du calcul: ' + err.message);
      } finally {
        setIsCalculating(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Saisie des pièces de la commande */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100">
                  Mesures Caisson & Sous-face (Tunnel / Extérieur)
                </h3>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${agenceInfo.badgeBg} ${agenceInfo.badgeColor}`}>
                  {agenceInfo.nom}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Débordement profilé configuré : {selectedArticle ? `${selectedArticle.debordement} mm` : '0 mm'}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Exemple :</span>
            <button
              type="button"
              onClick={() => {
                setRefCommandeDefaut('A260498');
                setNomClientDefaut('MAZARI PROM KOUBA');
                setDateCommandeDefaut('30/07/2026');
                setColorisDefaut('BL');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-mono text-[11px] transition"
            >
              A260498 — Mazari Prom
            </button>
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
              placeholder="ex: A260498"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nom Client / Chantier</span>
            </label>
            <input
              type="text"
              value={nomClientDefaut}
              onChange={e => setNomClientDefaut(e.target.value)}
              placeholder="ex: MAZARI PROM KOUBA"
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
              placeholder="30/07/2026"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Palette className="w-3.5 h-3.5 text-rose-400" />            </label>          </div>
        </div>

        {/* Formulaire d'ajout rapide */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Repère (ex: SF-1) *
            </label>
            <input
              type="text"
              value={saisieLabel}
              onChange={e => setSaisieLabel(e.target.value)}
              placeholder="ex: SF-1"
              onKeyDown={e => e.key === 'Enter' && handleAjouterPiece()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Longueur de coupe (mm) *
            </label>
            <input
              type="number"
              value={saisieLongueur}
              onChange={e => setSaisieLongueur(e.target.value)}
              placeholder="ex: 2000"
              onKeyDown={e => e.key === 'Enter' && handleAjouterPiece()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Quantité *
            </label>
            <input
              type="number"
              min="1"
              value={saisieQte}
              onChange={e => setSaisieQte(e.target.value)}
              placeholder="1"
              onKeyDown={e => e.key === 'Enter' && handleAjouterPiece()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-100 font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              onClick={handleAjouterPiece}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-2 rounded-lg text-sm flex items-center justify-center gap-1 transition shadow-sm"
              title="Ajouter"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        {/* Tableau des pièces ajoutées avec inline edit */}
        {pieces.length > 0 ? (
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Cmd</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Repère</th>
                  <th className="py-2.5 px-3">Longueur brute</th>
                  <th className="py-2.5 px-3">Longueur Finale (+débord)</th>
                  <th className="py-2.5 px-3 text-center">Quantité</th>
                  <th className="py-2.5 px-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {pieces.map((p, idx) => {
                  const isEditing = editingId === p.id && editForm !== null;
                  const debord = selectedArticle?.debordement || 0;

                  if (isEditing) {
                    return (
                      <tr key={p.id} className="bg-amber-950/20 border-2 border-amber-500/40">
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
                            value={editForm.label || ''}
                            onChange={e => setEditForm({ ...editForm, label: e.target.value, repere: e.target.value })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-amber-300 font-bold"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={editForm.longueur}
                            onChange={e => setEditForm({ ...editForm, longueur: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-1.5 py-1 text-xs text-slate-100 font-mono font-bold"
                          />
                        </td>
                        <td className="py-2 px-2 text-amber-400 font-bold">
                          {editForm.longueur + debord} mm
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
                        <td className="py-2 px-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition"
                              title="Enregistrer"
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

                  const lgFinale = p.longueur + debord;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {p.refCommande || refCommandeDefaut}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans text-xs max-w-[130px] truncate">
                        {p.nomClient || nomClientDefaut}
                      </td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold font-sans">
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          {p.repere || p.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-bold">{p.longueur} mm</td>
                      <td className="py-2.5 px-3 text-amber-400 font-semibold">
                        {lgFinale} mm
                        {debord !== 0 && (
                          <span className="text-[10px] text-slate-500 ml-1 font-sans">
                            ({debord > 0 ? `+${debord}` : debord})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-100">{p.quantite}</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDupliquerPiece(p)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition"
                            title="Dupliquer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSupprimerPiece(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
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
            Aucune mesure saisie.
          </div>
        )}
      </div>

      {/* Top Grid: Article Selector & Mode Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-2">
          {/* Toggle Débit Caisson CT vs Débit Sous-Face SF */}
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleChangeFamille('CT')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                familleFiltre === 'CT'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>📦 Caissons Tunnel (CT 6.5m)</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeFamille('SF')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                familleFiltre === 'SF'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>📐 Sous-Faces Profilées (SF 6.0m)</span>
            </button>
          </div>

          <SelecteurArticle
            articles={articlesFiltres}
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

      {/* Bouton de calcul */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleCalculerOptimisation}
          disabled={isCalculating || pieces.length === 0 || !selectedArticle}
          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className={`w-4 h-4 text-slate-950 ${isCalculating ? 'animate-spin' : ''}`} />
          <span>{isCalculating ? 'Optimisation en cours...' : 'Calculer l\'Optimisation de Découpe'}</span>
        </button>
      </div>

      {/* Résultat d'optimisation visuel unifié CT & SF */}
      {resultatSections.length > 0 && (
        <div className="space-y-6">
          {resultatSections.map((sec, idx) => {
            const isCT = sec.type === 'CT';
            return (
              <div
                key={idx}
                className={`space-y-3 p-4 rounded-xl border ${
                  isCT ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-sky-950/30 border-sky-500/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded font-black flex items-center justify-center text-xs shadow ${
                      isCT ? 'bg-emerald-500 text-slate-950' : 'bg-sky-500 text-slate-950'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                        <span>{isCT ? '📦 CAISSON TUNNEL (CT 6.5m)' : '📐 SOUS-FACE ALUMINIUM (SF 6.0m)'}</span>
                        <span className={`text-xs ${isCT ? 'text-emerald-300 font-mono font-bold' : 'text-sky-300 font-mono font-bold'}`}>
                          — {sec.articleDesignation}
                        </span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                      isCT
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-sky-950 text-sky-300 border-sky-500/40'
                    }`}>
                      {sec.resultat.total_barres_neuves} Barre(s) neuve(s) • Rendement {sec.resultat.taux_rendement}%
                    </span>
                  </div>
                </div>

                <VisualiseurBarres
                  resultat={sec.resultat}
                  articleDesignation={sec.articleDesignation}
                  onOpenOF={() => setIsOFOpen(true)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Ordre de fabrication Modal */}
      {resultatSections.length > 0 && (
        <OrdreFabricationModal
          isOpen={isOFOpen}
          onClose={() => setIsOFOpen(false)}
          titreProduit={selectedArticle?.designation || 'CAISSON / SOUS-FACE'}
          refCommande={refCommandeDefaut}
          nomClient={nomClientDefaut}
          dateCommande={dateCommandeDefaut}
          coloris={colorisDefaut}
          sections={resultatSections.map((sec, idx) => ({
            titreSection: `${sec.type === 'CT' ? '📦' : '📐'} SECTION ${idx + 1} : ${sec.articleDesignation} (${sec.type === 'CT' ? 'Caisson 6.5m' : 'Sous-Face 6.0m'})`,
            article: sec.article,
            resultat: sec.resultat,
            coloris: sec.type === 'CT' ? 'BRUT' : 'BL',
            badge: sec.type === 'CT' ? 'CAISSON TUNNEL' : 'SOUS-FACE'
          }))}
          famille="CAISSON"
          onOFEmis={onStockUpdated}
        />
      )}
    </div>
  );
};
