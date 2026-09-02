import React, { useState, useMemo } from 'react';
import {
  SuiviOF,
  LigneRetourOF,
  MouvementStock,
  Article,
  ChuteItem,
  MappingChutes
} from '../../types';
import { StorageService } from '../../services/storage';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  RefreshCw,
  Info,
  Edit2,
  Check,
  Sparkles,
  PackagePlus,
  Scissors,
  Layers,
  Trash2,
  ArrowRight,
  Filter,
  CheckCheck,
  Archive,
  RotateCcw,
  Sliders,
  Plus,
  Minus
} from 'lucide-react';

interface RetourOFModalProps {
  isOpen: boolean;
  suivi: SuiviOF;
  articles?: Article[];
  chutesBarres?: Record<string, ChuteItem[]>;
  mapping?: MappingChutes;
  onClose: () => void;
  onCloture: () => void;
}

export const RetourOFModal: React.FC<RetourOFModalProps> = ({
  isOpen,
  suivi,
  articles = [],
  chutesBarres = {},
  mapping = {},
  onClose,
  onCloture
}) => {
  // Initialisation des lignes avec valeurs par défaut riches
  const [lignes, setLignes] = useState<LigneRetourOF[]>(() => {
    return suivi.lignesRetour.map(l => {
      const initReste = l.resteReelMesureMm ?? (l.restePrevuMm > 0 ? l.restePrevuMm : 0);
      const article = articles.find(a => a.code_art === l.articleCode);
      const refusMin = article?.refus_min ?? 300;
      const initAction = l.actionReste ?? (initReste >= refusMin ? 'A_STOCKER' : 'DECHET');
      const initSource = l.sourceReelle ?? (l.saisieOperateur?.toUpperCase().startsWith('BAR') ? 'BARRE_NEUVE' : 'CONFORME');

      return {
        ...l,
        sourceReelle: initSource,
        longueurSourceReelle: l.longueurSourceReelle || l.longueurPrevue,
        resteReelMesureMm: initReste,
        actionReste: initAction
      };
    });
  });

  const [filtreLignes, setFiltreLignes] = useState<'TOUTES' | 'A_STOCKER' | 'MODIFIEES' | 'SUBSTITUTIONS'>('TOUTES');
  const [numCommandeEdit, setNumCommandeEdit] = useState<string>(suivi.numCommande || '');
  const [isEditingNumCmd, setIsEditingNumCmd] = useState<boolean>(false);
  const [remarqueGlobale, setRemarqueGlobale] = useState<string>(suivi.remarqueGlobale || '');
  const [dateRetour, setDateRetour] = useState<string>(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const [editingNonInventorieIdx, setEditingNonInventorieIdx] = useState<number | null>(null);
  const [nonInventorieTempLg, setNonInventorieTempLg] = useState<string>('');

  if (!isOpen) return null;

  // Mise à jour unitaire d'une ligne
  const updateLigne = (idx: number, patch: Partial<LigneRetourOF>) => {
    setLignes(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  // Ajustement rapide de la dimension mesurée (+/- mm)
  const adjustMesure = (idx: number, delta: number) => {
    const current = lignes[idx].resteReelMesureMm ?? lignes[idx].restePrevuMm;
    const newVal = Math.max(0, current + delta);
    const article = articles.find(a => a.code_art === lignes[idx].articleCode);
    const refusMin = article?.refus_min ?? 300;

    updateLigne(idx, {
      resteReelMesureMm: newVal,
      actionReste: newVal >= refusMin ? 'A_STOCKER' : 'DECHET',
      saisieOperateur: newVal !== lignes[idx].restePrevuMm ? `${newVal}mm` : ''
    });
  };

  // Rétablir la valeur théorique conforme
  const resetToTheorique = (idx: number) => {
    const l = lignes[idx];
    const article = articles.find(a => a.code_art === l.articleCode);
    const refusMin = article?.refus_min ?? 300;

    updateLigne(idx, {
      sourceReelle: 'CONFORME',
      longueurSourceReelle: l.longueurPrevue,
      resteReelMesureMm: l.restePrevuMm,
      actionReste: l.restePrevuMm >= refusMin ? 'A_STOCKER' : 'DECHET',
      saisieOperateur: ''
    });
  };

  // Déclarer une substitution par barre neuve
  const setSubstitutionBarreNeuve = (idx: number, longueurBarre: number = 6000) => {
    const l = lignes[idx];
    const longueurPieces = Math.max(0, l.longueurPrevue - l.restePrevuMm);
    const estimatedReste = Math.max(0, longueurBarre - longueurPieces);
    const article = articles.find(a => a.code_art === l.articleCode);
    const refusMin = article?.refus_min ?? 300;

    updateLigne(idx, {
      sourceReelle: 'BARRE_NEUVE',
      longueurSourceReelle: longueurBarre,
      resteReelMesureMm: estimatedReste,
      actionReste: estimatedReste >= refusMin ? 'A_STOCKER' : 'DECHET',
      saisieOperateur: `BARRE NEUVE ${longueurBarre}mm`
    });
  };

  // Déclarer une substitution par une chute CONNUE du stock
  const setSubstitutionChuteConnue = (idx: number, longueurChute: number) => {
    const l = lignes[idx];
    const longueurPieces = Math.max(0, l.longueurPrevue - l.restePrevuMm);
    const estimatedReste = Math.max(0, longueurChute - longueurPieces);
    const article = articles.find(a => a.code_art === l.articleCode);
    const refusMin = article?.refus_min ?? 300;

    updateLigne(idx, {
      sourceReelle: 'AUTRE_CHUTE',
      longueurSourceReelle: longueurChute,
      resteReelMesureMm: estimatedReste,
      actionReste: estimatedReste >= refusMin ? 'A_STOCKER' : 'DECHET',
      saisieOperateur: `CHUTE STOCK ${longueurChute}mm`
    });
  };

  // Déclarer une substitution par une chute NON INVENTORIÉE (nouvelle / trouvée en atelier)
  const setSubstitutionChuteNonInventoriee = (idx: number, longueurChute: number) => {
    const l = lignes[idx];
    const longueurPieces = Math.max(0, l.longueurPrevue - l.restePrevuMm);
    const estimatedReste = Math.max(0, longueurChute - longueurPieces);
    const article = articles.find(a => a.code_art === l.articleCode);
    const refusMin = article?.refus_min ?? 300;

    updateLigne(idx, {
      sourceReelle: 'CHUTE_NON_INVENTORIEE',
      longueurSourceReelle: longueurChute,
      resteReelMesureMm: estimatedReste,
      actionReste: estimatedReste >= refusMin ? 'A_STOCKER' : 'DECHET',
      saisieOperateur: `CHUTE NON INVENTORIÉE ${longueurChute}mm`
    });
  };

  // Tout pré-remplir conforme en 1 clic
  const handleToutConforme = () => {
    setLignes(prev =>
      prev.map(l => {
        const article = articles.find(a => a.code_art === l.articleCode);
        const refusMin = article?.refus_min ?? 300;
        return {
          ...l,
          sourceReelle: 'CONFORME',
          longueurSourceReelle: l.longueurPrevue,
          resteReelMesureMm: l.restePrevuMm,
          actionReste: l.restePrevuMm >= refusMin ? 'A_STOCKER' : 'DECHET',
          saisieOperateur: ''
        };
      })
    );
  };

  // Trouver les chutes disponibles en stock pour l'article de cette ligne
  const getChutesDisponiblesPourArticle = (articleCode?: string): ChuteItem[] => {
    if (!articleCode) return [];
    const sheetName = mapping[articleCode];
    if (!sheetName || !chutesBarres[sheetName]) return [];
    return chutesBarres[sheetName].filter(c => c.quantite > 0);
  };

  // Statistiques en direct
  const stats = useMemo(() => {
    let barresNeuvesConsommees = 0;
    let chutesStockConsommees = 0;
    let chutesAStockerCount = 0;
    let chutesAStockerMetrageMm = 0;
    let dechetsCount = 0;
    let nbModifiees = 0;
    let nbSubstitutions = 0;

    lignes.forEach(l => {
      const isBarre = l.sourceReelle === 'BARRE_NEUVE' || (l.sourceReelle === 'CONFORME' && l.typeSupport === 'BARRE_NEUVE');
      if (isBarre) {
        barresNeuvesConsommees++;
      } else {
        chutesStockConsommees++;
      }

      if (l.sourceReelle !== 'CONFORME') {
        nbSubstitutions++;
      }

      const mesuredReste = l.resteReelMesureMm ?? l.restePrevuMm;
      if (mesuredReste !== l.restePrevuMm || l.sourceReelle !== 'CONFORME') {
        nbModifiees++;
      }

      if (l.actionReste === 'A_STOCKER' && mesuredReste > 0) {
        chutesAStockerCount++;
        chutesAStockerMetrageMm += mesuredReste;
      } else {
        dechetsCount++;
      }
    });

    return {
      barresNeuvesConsommees,
      chutesStockConsommees,
      chutesAStockerCount,
      chutesAStockerMetrageMm,
      dechetsCount,
      nbModifiees,
      nbSubstitutions
    };
  }, [lignes]);

  // Filtrage des lignes pour l'affichage
  const filteredLignes = useMemo(() => {
    return lignes.map((ligne, originalIdx) => ({ ligne, originalIdx })).filter(({ ligne }) => {
      const mesuredReste = ligne.resteReelMesureMm ?? ligne.restePrevuMm;
      if (filtreLignes === 'A_STOCKER') {
        return ligne.actionReste === 'A_STOCKER' && mesuredReste > 0;
      }
      if (filtreLignes === 'MODIFIEES') {
        return mesuredReste !== ligne.restePrevuMm || ligne.sourceReelle !== 'CONFORME';
      }
      if (filtreLignes === 'SUBSTITUTIONS') {
        return ligne.sourceReelle !== 'CONFORME';
      }
      return true;
    });
  }, [lignes, filtreLignes]);

  // Confirmation du retour et clôture
  const handleConfirmerRetour = async () => {
    setIsConfirming(true);
    const now = new Date();
    const dateTimeStr = `${dateRetour} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const mouvements: MouvementStock[] = [];
    let mvtIdx = 0;
    const finalNumCmd = numCommandeEdit.trim() || suivi.numCommande;
    const makeId = () => `mvt-${Date.now()}-${mvtIdx++}`;

    lignes.forEach((ligne, idx) => {
      const source = ligne.sourceReelle || 'CONFORME';
      const isBarreNeuve = source === 'BARRE_NEUVE' || (source === 'CONFORME' && ligne.typeSupport === 'BARRE_NEUVE');
      const realSupportLg = ligne.longueurSourceReelle || ligne.longueurPrevue;
      const realResteMm = Math.round(ligne.resteReelMesureMm ?? ligne.restePrevuMm);
      const repereTxt = ligne.repere || `Ligne #${idx + 1}`;
      const piecesTxt = ligne.piecesInfoStr ? `[Pièces: ${ligne.piecesInfoStr}]` : '';

      // 1. Sortie de matière première réelle consommée
      if (isBarreNeuve) {
        // Décompte de la barre neuve
        mouvements.push({
          id: makeId(),
          date: dateTimeStr,
          type: 'SORTIE_BARRE_NEUVE',
          articleCode: ligne.articleCode,
          ofId: suivi.id,
          numCommande: finalNumCmd,
          nomClient: suivi.nomClient,
          longueurMm: realSupportLg,
          quantite: 1,
          remarque: `Barre neuve consommée (${realSupportLg}mm) — Repère(s): ${repereTxt} ${piecesTxt}`
        });
      } else if (source === 'CHUTE_NON_INVENTORIEE') {
        // Chute non inventoriée : pas de sortie du stock existant (elle n'y figurait pas)
      } else {
        // Sortie de la chute de stock réellement débitée (conforme ou autre chute connue du stock)
        mouvements.push({
          id: makeId(),
          date: dateTimeStr,
          type: 'SORTIE_CHUTE',
          articleCode: ligne.articleCode,
          ofId: suivi.id,
          numCommande: finalNumCmd,
          nomClient: suivi.nomClient,
          longueurMm: realSupportLg,
          quantite: 1,
          remarque: `Chute stock débitée (${realSupportLg}mm) — Repère(s): ${repereTxt} ${piecesTxt}`
        });
      }

      // 2. Entrée de la NOUVELLE CHUTE RÉELLEMENT MESURÉE (si statut À Stocker et dimension > 0)
      if (ligne.actionReste === 'A_STOCKER' && realResteMm > 0) {
        mouvements.push({
          id: makeId(),
          date: dateTimeStr,
          type: 'ENTREE_CHUTE',
          articleCode: ligne.articleCode,
          ofId: suivi.id,
          numCommande: finalNumCmd,
          nomClient: suivi.nomClient,
          longueurMm: realResteMm,
          quantite: 1,
          remarque: `Chute mesurée après coupe (${realResteMm}mm) — Repère(s): ${repereTxt} — OF ${finalNumCmd}${source === 'CHUTE_NON_INVENTORIEE' ? ' (issue de chute non inventoriée)' : ''}`
        });
      }
    });

    try {
      await StorageService.closeOF({
        ...suivi,
        numCommande: finalNumCmd,
        statut: 'CLOTURE',
        dateRetour,
        lignesRetour: lignes,
        remarqueGlobale
      }, mouvements);
    } catch (error: any) {
      setIsConfirming(false);
      alert(`Impossible de clôturer l'OF : ${error.message}`);
      return;
    }

    setIsConfirming(false);
    onCloture();
    onClose();
  };

  // Découpage des numéros de commande pour affichage des badges
  const commandBadges = (numCommandeEdit || suivi.numCommande || '')
    .split(/[\s,+/]+/)
    .map(c => c.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black">
              <ClipboardCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-100">
                  Retour Atelier &amp; Correction des Chutes Mesurées
                </h2>
                {isEditingNumCmd ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={numCommandeEdit}
                      onChange={e => setNumCommandeEdit(e.target.value)}
                      placeholder="ex: 26148, 26149"
                      className="bg-slate-800 border border-amber-400 rounded px-2 py-0.5 text-xs text-amber-300 font-mono font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingNumCmd(false)}
                      className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
                      title="Valider la modification"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {commandBadges.map((cmd, cIdx) => (
                      <span key={cIdx} className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                        {cmd}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsEditingNumCmd(true)}
                      className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition"
                      title="Modifier les N° de commande de cet OF"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Client : <strong className="text-slate-200">{suivi.nomClient}</strong> {suivi.donneurOrdre && `(${suivi.donneurOrdre})`} • {suivi.titreSection} • Émis le {suivi.dateEmission}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Bandeau d'explication & Actions Rapides Globales ── */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400" />
              <span>Règle d'Atelier :</span>
            </span>
            <span className="text-slate-300 text-[11px]">
              Mesurez le reste physique restant après toutes les coupes de chaque support et ajustez la cote réelle ci-dessous.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToutConforme}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Pré-remplir toutes les lignes aux cotes théoriques d'origine"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>⚡ Tout Pré-remplir Conforme</span>
            </button>
          </div>
        </div>

        {/* ── Barre d'onglets de filtrage rapide ── */}
        <div className="px-5 pt-3 pb-1 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFiltreLignes('TOUTES')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filtreLignes === 'TOUTES'
                  ? 'bg-slate-800 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Toutes ({lignes.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltreLignes('A_STOCKER')}
              className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                filtreLignes === 'A_STOCKER'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 shadow'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>À Stocker ({stats.chutesAStockerCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltreLignes('MODIFIEES')}
              className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                filtreLignes === 'MODIFIEES'
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50 shadow'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Corrigées ({stats.nbModifiees})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltreLignes('SUBSTITUTIONS')}
              className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                filtreLignes === 'SUBSTITUTIONS'
                  ? 'bg-sky-900/60 text-sky-300 border border-sky-700/50 shadow'
                  : 'text-slate-400 hover:text-sky-300'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Substitutions ({stats.nbSubstitutions})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            {filteredLignes.length} support(s) affiché(s)
          </div>
        </div>

        {/* ── Liste des supports & coupes ── */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {filteredLignes.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400">
              Aucune ligne ne correspond au filtre sélectionné.
            </div>
          ) : (
            filteredLignes.map(({ ligne, originalIdx }) => {
              const source = ligne.sourceReelle || 'CONFORME';
              const isBarreNeuve = source === 'BARRE_NEUVE' || (source === 'CONFORME' && ligne.typeSupport === 'BARRE_NEUVE');
              const realSupportLg = ligne.longueurSourceReelle || ligne.longueurPrevue;
              const mesuredReste = ligne.resteReelMesureMm ?? ligne.restePrevuMm;
              const delta = mesuredReste - ligne.restePrevuMm;
              const isModified = delta !== 0 || source !== 'CONFORME';
              const article = articles.find(a => a.code_art === ligne.articleCode);
              const refusMin = article?.refus_min ?? 300;
              const chutesDispos = getChutesDisponiblesPourArticle(ligne.articleCode);

              return (
                <div
                  key={ligne.id || originalIdx}
                  className={`p-4 rounded-2xl border transition shadow-sm ${
                    source === 'BARRE_NEUVE'
                      ? 'bg-sky-950/20 border-sky-800/60 ring-1 ring-sky-500/20'
                      : isModified
                      ? 'bg-amber-950/20 border-amber-800/60 ring-1 ring-amber-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                    {/* COLONNE 1 : INFOS DU SUPPORT & COUPE(S) EN CASCADE (4 COLS) */}
                    <div className="lg:col-span-4 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-800 pb-3 lg:pb-0 lg:pr-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                          isBarreNeuve
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                            : 'bg-blue-950 text-blue-300 border-blue-700/60'
                        }`}>
                          {isBarreNeuve ? '🪵 Barre Neuve' : '📦 Chute Stock'} #{originalIdx + 1}
                        </span>

                        <span className="text-xs text-slate-400 font-mono">
                          Support : <strong className="text-slate-100">{realSupportLg} mm</strong>
                        </span>
                      </div>

                      {/* Repères & Pièces découpées sur ce support */}
                      <div className="space-y-1">
                        <div className="text-[11px] text-slate-400 font-semibold">
                          Coupes réalisées sur ce support :
                        </div>
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1">
                          <div className="text-amber-300 font-mono font-bold text-xs flex items-center gap-1.5 flex-wrap">
                            <Scissors className="w-3.5 h-3.5 text-amber-400" />
                            <span>{ligne.repere}</span>
                          </div>
                          {ligne.piecesInfoStr && (
                            <div className="text-[11px] text-slate-300 font-mono bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                              {ligne.piecesInfoStr}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 flex justify-between pt-0.5">
                            <span>Reste théorique prévu : <strong className="text-slate-300 font-mono">{ligne.restePrevuMm} mm</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* COLONNE 2 : SÉLECTEUR DE SOURCE RÉELLE (3.5 COLS) */}
                    <div className="lg:col-span-4 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-800 pb-3 lg:pb-0 lg:pr-4">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                        <span>Source Réelle Utilisée :</span>
                        {source !== 'CONFORME' && (
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                            {source === 'BARRE_NEUVE' && 'Barre Neuve'}
                            {source === 'AUTRE_CHUTE' && 'Chute Stock'}
                            {source === 'CHUTE_NON_INVENTORIEE' && 'Chute Non Inventoriée'}
                          </span>
                        )}
                      </label>

                      <div className="space-y-1.5">
                        {/* Option A : Conforme */}
                        <button
                          type="button"
                          onClick={() => {
                            resetToTheorique(originalIdx);
                            if (editingNonInventorieIdx === originalIdx) setEditingNonInventorieIdx(null);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between border transition cursor-pointer ${
                            source === 'CONFORME'
                              ? 'bg-slate-800 text-slate-100 border-slate-600 shadow-sm'
                              : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate">✅ Conforme ({ligne.longueurPrevue} mm)</span>
                        </button>

                        {/* Option B : Barre Neuve */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSubstitutionBarreNeuve(originalIdx, 6000);
                              if (editingNonInventorieIdx === originalIdx) setEditingNonInventorieIdx(null);
                            }}
                            className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between border transition cursor-pointer ${
                              source === 'BARRE_NEUVE' && realSupportLg === 6000
                                ? 'bg-sky-900/60 text-sky-200 border-sky-500 shadow-sm'
                                : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-sky-800'
                            }`}
                          >
                            <span>🔄 Barre Neuve</span>
                            <span className="font-mono text-[11px]">6.0m</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubstitutionBarreNeuve(originalIdx, 6500);
                              if (editingNonInventorieIdx === originalIdx) setEditingNonInventorieIdx(null);
                            }}
                            className={`px-2 py-1.5 rounded-lg text-xs font-semibold font-mono border transition cursor-pointer ${
                              source === 'BARRE_NEUVE' && realSupportLg === 6500
                                ? 'bg-sky-900/60 text-sky-200 border-sky-500 shadow-sm'
                                : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-sky-800'
                            }`}
                            title="Barre neuve 6500mm (6.5m)"
                          >
                            6.5m
                          </button>
                        </div>

                        {/* Option C1 : Autre Chute Connue en Stock */}
                        <div className="space-y-1">
                          <select
                            value={source === 'AUTRE_CHUTE' ? realSupportLg : ''}
                            onChange={e => {
                              const val = Number(e.target.value);
                              if (val > 0) {
                                setSubstitutionChuteConnue(originalIdx, val);
                                if (editingNonInventorieIdx === originalIdx) setEditingNonInventorieIdx(null);
                              }
                            }}
                            className={`w-full bg-slate-950 border rounded-lg px-2 py-1.5 text-xs font-mono transition cursor-pointer ${
                              source === 'AUTRE_CHUTE'
                                ? 'border-purple-500 text-purple-200 bg-purple-950/30'
                                : 'border-slate-800 text-slate-400 hover:border-purple-800'
                            }`}
                          >
                            <option value="">
                              {chutesDispos.length > 0
                                ? '📦 Remplacer par chute du stock...'
                                : '📦 Aucune chute en stock'}
                            </option>
                            {chutesDispos.map((c, cIdx) => (
                              <option key={c.id || cIdx} value={c.longueur}>
                                Chute Stock {c.longueur} mm (Dispo: {c.quantite})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Option C2 : Chute Non Inventoriée (Trouvée en atelier) */}
                        <div>
                          {editingNonInventorieIdx === originalIdx ? (
                            <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-2 space-y-1.5 shadow-inner">
                              <div className="text-[10px] font-bold text-amber-300 flex items-center justify-between">
                                <span>🆕 Dimension Chute Non Inventoriée :</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={nonInventorieTempLg}
                                  onChange={e => setNonInventorieTempLg(e.target.value)}
                                  placeholder="ex: 2500"
                                  autoFocus
                                  className="w-full bg-slate-950 border border-amber-400 rounded-lg px-2 py-1 font-mono text-xs text-amber-200 font-bold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = parseInt(nonInventorieTempLg, 10);
                                    if (val > 0) {
                                      setSubstitutionChuteNonInventoriee(originalIdx, val);
                                      setEditingNonInventorieIdx(null);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNonInventorieIdx(null)}
                                  className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded-lg hover:bg-slate-700"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="flex gap-1 flex-wrap pt-0.5">
                                {[1500, 2000, 2500, 3000, 4000].map(quickLg => (
                                  <button
                                    key={quickLg}
                                    type="button"
                                    onClick={() => {
                                      setSubstitutionChuteNonInventoriee(originalIdx, quickLg);
                                      setEditingNonInventorieIdx(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-300/80 font-mono text-[10px] rounded border border-slate-700"
                                  >
                                    {quickLg}mm
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNonInventorieIdx(originalIdx);
                                setNonInventorieTempLg(source === 'CHUTE_NON_INVENTORIEE' ? String(realSupportLg) : '');
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between border transition cursor-pointer ${
                                source === 'CHUTE_NON_INVENTORIEE'
                                  ? 'bg-amber-950/60 text-amber-200 border-amber-500 shadow-sm'
                                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-amber-800'
                              }`}
                            >
                              <span>🆕 Chute Non Inventoriée</span>
                              {source === 'CHUTE_NON_INVENTORIEE' ? (
                                <span className="font-mono font-bold text-amber-300">{realSupportLg} mm</span>
                              ) : (
                                <span className="text-[10px] text-slate-500">Saisir mm</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* COLONNE 3 : CORRECTION DU RESTE RÉEL MESURÉ & DESTINATION AUTOMATIQUE (4.5 COLS) */}
                    <div className="lg:col-span-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                          <PackagePlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reste Réel Mesuré Après Coupe :</span>
                        </label>

                        {/* Badge statut écart */}
                        <div>
                          {delta === 0 ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                              ✅ Conforme ({ligne.restePrevuMm}mm)
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${
                              delta > 0
                                ? 'text-sky-300 bg-sky-950/80 border-sky-800'
                                : 'text-amber-300 bg-amber-950/80 border-amber-800'
                            }`}>
                              ✂️ Écart : {delta > 0 ? `+${delta}` : delta} mm
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Champ de saisie numérique avec boutons rapides +/- mm */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustMesure(originalIdx, -10)}
                          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 transition cursor-pointer"
                          title="Retirer 10 mm"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustMesure(originalIdx, -5)}
                          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 transition cursor-pointer"
                          title="Retirer 5 mm"
                        >
                          -5
                        </button>

                        {/* Input de la cote réelle mesurée */}
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={mesuredReste === 0 && ligne.actionReste === 'DECHET' ? '' : mesuredReste}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              const refusMin = article?.refus_min ?? 300;
                              updateLigne(originalIdx, {
                                resteReelMesureMm: val,
                                actionReste: val >= refusMin && val > 0 ? 'A_STOCKER' : 'DECHET',
                                saisieOperateur: val !== ligne.restePrevuMm ? `${val}mm` : ''
                              });
                            }}
                            placeholder="0"
                            className="w-full bg-slate-950 border-2 border-amber-500/70 focus:border-amber-400 rounded-xl px-3 py-1.5 text-center font-mono font-black text-base text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40 shadow-inner"
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono font-bold pointer-events-none">
                            mm
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => adjustMesure(originalIdx, 5)}
                          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 transition cursor-pointer"
                          title="Ajouter 5 mm"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustMesure(originalIdx, 10)}
                          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 transition cursor-pointer"
                          title="Ajouter 10 mm"
                        >
                          +10
                        </button>
                      </div>

                      {/* Décision automatique & Seuil de conformité */}
                      <div className="space-y-1 pt-1">
                        {ligne.actionReste === 'A_STOCKER' && mesuredReste > 0 ? (
                          <div className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-950/70 border border-emerald-500/80 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <Archive className="w-3.5 h-3.5 text-emerald-400" />
                              <span>📦 Reste Conforme ➔ Enregistré en Stock</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateLigne(originalIdx, { actionReste: 'DECHET' })}
                              className="text-[10px] text-slate-400 hover:text-rose-300 underline cursor-pointer"
                              title="Forcer en déchet si pièce inutilisable / abîmée"
                            >
                              Jeter au déchet
                            </button>
                          </div>
                        ) : (
                          <div className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-medium flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>🗑️ Inférieur au seuil ({refusMin}mm) ➔ Déchet</span>
                            </div>
                            {mesuredReste > 0 && (
                              <button
                                type="button"
                                onClick={() => updateLigne(originalIdx, { actionReste: 'A_STOCKER' })}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                                title="Forcer en stock"
                              >
                                Forcer stocker
                              </button>
                            )}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
                          <span>Seuil de réutilisation : <strong>≥ {refusMin} mm</strong></span>
                          <span>{mesuredReste >= refusMin ? 'Reste réutilisable' : 'Non réutilisable'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Remarque globale et Date de retour */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Remarque générale de l'opérateur / Magasin :</span>
              </label>
              <textarea
                value={remarqueGlobale}
                onChange={e => setRemarqueGlobale(e.target.value)}
                placeholder="ex: Chutes réelles mesurées au mètre ruban après coupes en cascade. Barres neuves débitées conformes."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Date effective de clôture</label>
              <input
                type="text"
                value={dateRetour}
                onChange={e => setDateRetour(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-slate-200 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        {/* ── Footer & Synthèse des Mouvements de Stock ── */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          {/* Synthèse des impacts stock */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Barres neuves à déduire :</span>
              <strong className="text-emerald-400 font-mono">{stats.barresNeuvesConsommees} barre(s)</strong>
            </div>

            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Chutes stock à déduire :</span>
              <strong className="text-blue-400 font-mono">{stats.chutesStockConsommees} chute(s)</strong>
            </div>

            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Nouvelles chutes créées :</span>
              <strong className="text-amber-400 font-mono">
                +{stats.chutesAStockerCount} chute(s) ({stats.chutesAStockerMetrageMm} mm)
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmerRetour}
              disabled={isConfirming}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-black rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {isConfirming ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Valider les Mesures &amp; Clôturer l'OF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
