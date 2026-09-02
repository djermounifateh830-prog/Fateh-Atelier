import React, { useState } from 'react';
import { Article } from '../../types';
import { StorageService } from '../../services/storage';
import {
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  Plus,
  Edit2
} from 'lucide-react';

interface ImportArticlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  articlesExistants: Article[];
  onImportComplete: () => void;
}

export type StrategieImportArticle = 'SMART_MERGE' | 'ADD_ONLY' | 'UPDATE_ONLY' | 'REPLACE_ALL';

interface ArticleAnalyse {
  article: Article;
  statutComparaison: 'NOUVEAU' | 'MODIFIE' | 'IDENTIQUE';
  selected: boolean;
  differences?: string[];
}

export const ImportArticlesModal: React.FC<ImportArticlesModalProps> = ({
  isOpen,
  onClose,
  articlesExistants,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [strategie, setStrategie] = useState<StrategieImportArticle>('SMART_MERGE');
  const [articlesAnalyses, setArticlesAnalyses] = useState<ArticleAnalyse[]>([]);
  const [filterType, setFilterType] = useState<'TOUS' | 'NOUVEAU' | 'MODIFIE' | 'IDENTIQUE'>('TOUS');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsAnalyzing(true);

    try {
      const parsedArticles = await StorageService.parseArticlesExcelFile(selectedFile);
      const mapExistants = new Map<string, Article>(
        articlesExistants.map(a => [a.code_art.toUpperCase(), a])
      );

      const analyses: ArticleAnalyse[] = parsedArticles.map(artImport => {
        const codeKey = artImport.code_art.toUpperCase();
        const exist = mapExistants.get(codeKey);

        if (!exist) {
          return {
            article: artImport,
            statutComparaison: 'NOUVEAU',
            selected: true
          };
        }

        // Comparer les champs clés
        const diffs: string[] = [];
        if (exist.designation !== artImport.designation) diffs.push(`Désig: "${exist.designation}" ➔ "${artImport.designation}"`);
        if (exist.longeur !== artImport.longeur) diffs.push(`Long: ${exist.longeur} ➔ ${artImport.longeur}mm`);
        if (exist.stock_physique !== artImport.stock_physique) diffs.push(`Stock: ${exist.stock_physique} ➔ ${artImport.stock_physique}`);
        if (exist.prix_unitaire !== artImport.prix_unitaire) diffs.push(`Prix: ${exist.prix_unitaire} ➔ ${artImport.prix_unitaire} DZD`);

        if (diffs.length > 0) {
          return {
            article: artImport,
            statutComparaison: 'MODIFIE',
            selected: true,
            differences: diffs
          };
        }

        return {
          article: artImport,
          statutComparaison: 'IDENTIQUE',
          selected: false // Pas besoin de réimporter les identiques par défaut
        };
      });

      setArticlesAnalyses(analyses);
    } catch (err: any) {
      alert('Erreur lors de la lecture du fichier Excel: ' + err.message);
      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setArticlesAnalyses(prev => prev.map(a => ({ ...a, selected: checked })));
  };

  const handleToggleItem = (code: string) => {
    setArticlesAnalyses(prev =>
      prev.map(a => (a.article.code_art === code ? { ...a, selected: !a.selected } : a))
    );
  };

  const handleApplyImport = async () => {
    const selectedArticles = articlesAnalyses
      .filter(a => {
        if (!a.selected) return false;
        if (strategie === 'ADD_ONLY') return a.statutComparaison === 'NOUVEAU';
        if (strategie === 'UPDATE_ONLY') return a.statutComparaison === 'MODIFIE';
        return true; // SMART_MERGE & REPLACE_ALL
      })
      .map(a => a.article);

    if (selectedArticles.length === 0 && strategie !== 'REPLACE_ALL') {
      alert('Aucun article sélectionné à importer.');
      return;
    }

    setIsApplying(true);

    let finalArticles: Article[] = [];

    if (strategie === 'REPLACE_ALL') {
      if (!confirm(`⚠️ ATTENTION : Vous avez choisi "Remplacement Total". Tous les articles existants (${articlesExistants.length}) seront supprimés et remplacés par les ${selectedArticles.length} articles sélectionnés. Continuer ?`)) {
        setIsApplying(false);
        return;
      }
      finalArticles = selectedArticles;
    } else {
      const mapFinal = new Map<string, Article>(
        articlesExistants.map(a => [a.code_art.toUpperCase(), a])
      );

      selectedArticles.forEach(art => {
        const key = art.code_art.toUpperCase();
        if (strategie === 'ADD_ONLY') {
          if (!mapFinal.has(key)) mapFinal.set(key, art);
        } else if (strategie === 'UPDATE_ONLY') {
          if (mapFinal.has(key)) mapFinal.set(key, art);
        } else {
          // SMART_MERGE : upsert
          mapFinal.set(key, art);
        }
      });

      finalArticles = Array.from(mapFinal.values());
    }

    await StorageService.saveArticles(finalArticles);
    setIsApplying(false);
    onImportComplete();
    onClose();
    alert(`Import terminé avec succès ! ${finalArticles.length} articles sont désormais disponibles.`);
  };

  const countNouveaux = articlesAnalyses.filter(a => a.statutComparaison === 'NOUVEAU').length;
  const countModifies = articlesAnalyses.filter(a => a.statutComparaison === 'MODIFIE').length;
  const countIdentiques = articlesAnalyses.filter(a => a.statutComparaison === 'IDENTIQUE').length;
  const countSelectionnes = articlesAnalyses.filter(a => a.selected).length;

  const filteredArticles = articlesAnalyses.filter(a => {
    if (filterType === 'TOUS') return true;
    return a.statutComparaison === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Import Intelligent d'Articles (Excel)
              </h2>
              <p className="text-[11px] text-slate-400">
                Prévisualisez, choisissez votre stratégie de fusion et sélectionnez les articles à importer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Étape 1 : Sélection Fichier */}
          {!file && (
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center hover:border-amber-500/50 transition bg-slate-950/40">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-amber-400/60" />
              <h3 className="text-sm font-bold text-slate-200 mb-1">
                Sélectionnez votre fichier Excel d'articles (<code>articles_stock.xlsx</code>)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Le système analysera automatiquement les colonnes (code_art, designation, longueur, stock, prix, etc.).
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition">
                <Upload className="w-4 h-4" />
                <span>Parcourir le fichier Excel</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {isAnalyzing && (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-400" />
              <p className="text-xs font-bold">Analyse et comparaison des articles en cours...</p>
            </div>
          )}

          {/* Étape 2 : Prévisualisation & Stratégie */}
          {file && !isAnalyzing && (
            <div className="space-y-4">
              {/* Info Fichier & Récapitulatif */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200 font-mono">{file.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {articlesAnalyses.length} article(s) détecté(s) dans le fichier
                    </div>
                  </div>
                </div>

                {/* Badges de comparaison */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setFilterType('TOUS')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      filterType === 'TOUS' ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Tous ({articlesAnalyses.length})
                  </button>
                  <button
                    onClick={() => setFilterType('NOUVEAU')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      filterType === 'NOUVEAU' ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                    }`}
                  >
                    ✨ Nouveaux ({countNouveaux})
                  </button>
                  <button
                    onClick={() => setFilterType('MODIFIE')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      filterType === 'MODIFIE' ? 'bg-amber-900/60 text-amber-300 border-amber-500' : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                    }`}
                  >
                    🔄 Modifiés ({countModifies})
                  </button>
                  <button
                    onClick={() => setFilterType('IDENTIQUE')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      filterType === 'IDENTIQUE' ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-slate-900/50 text-slate-500 border-slate-800'
                    }`}
                  >
                    Identiques ({countIdentiques})
                  </button>
                </div>
              </div>

              {/* Stratégie d'import */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mode de Fusion / Stratégie d'Import :</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 text-xs transition ${
                    strategie === 'SMART_MERGE' ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="strategie"
                      checked={strategie === 'SMART_MERGE'}
                      onChange={() => setStrategie('SMART_MERGE')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-emerald-400">🟢 Fusion Intelligente</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ajoute les nouveaux + met à jour les existants modifiés (Recommandé).</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 text-xs transition ${
                    strategie === 'ADD_ONLY' ? 'bg-sky-950/50 border-sky-500 text-sky-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="strategie"
                      checked={strategie === 'ADD_ONLY'}
                      onChange={() => setStrategie('ADD_ONLY')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-sky-400">🔵 Ajout uniquement</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">N'ajoute que les nouveaux codes, ne touche pas aux existants.</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 text-xs transition ${
                    strategie === 'UPDATE_ONLY' ? 'bg-amber-950/50 border-amber-500 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="strategie"
                      checked={strategie === 'UPDATE_ONLY'}
                      onChange={() => setStrategie('UPDATE_ONLY')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-amber-400">🟡 Mise à jour seule</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ne met à jour que les articles existants trouvés dans le fichier.</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 text-xs transition ${
                    strategie === 'REPLACE_ALL' ? 'bg-rose-950/50 border-rose-500 text-rose-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="strategie"
                      checked={strategie === 'REPLACE_ALL'}
                      onChange={() => setStrategie('REPLACE_ALL')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-rose-400">🔴 Remplacement Total</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Écrase toute la base et la remplace par le fichier.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Barre de sélection rapide */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-amber-400 hover:underline font-semibold"
                  >
                    Tout sélectionner
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-slate-400 hover:underline"
                  >
                    Tout désélectionner
                  </button>
                </div>
                <div>
                  <span className="font-bold text-amber-300">{countSelectionnes}</span> article(s) coché(s) pour l'import
                </div>
              </div>

              {/* Table de prévisualisation */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={countSelectionnes === articlesAnalyses.length && articlesAnalyses.length > 0}
                          onChange={e => handleToggleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="py-2 px-3 text-left w-24">Statut</th>
                      <th className="py-2 px-3 text-left w-28">Code</th>
                      <th className="py-2 px-3 text-left">Désignation</th>
                      <th className="py-2 px-3 text-center w-20">Longueur</th>
                      <th className="py-2 px-3 text-center w-20">Stock</th>
                      <th className="py-2 px-3 text-left">Changements détectés</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredArticles.map(item => (
                      <tr
                        key={item.article.code_art}
                        onClick={() => handleToggleItem(item.article.code_art)}
                        className={`cursor-pointer transition ${
                          item.selected ? 'bg-slate-800/40 hover:bg-slate-800/60' : 'bg-slate-950/20 hover:bg-slate-900 text-slate-500'
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => {}} // Géré par tr onClick
                          />
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-sans ${
                            item.statutComparaison === 'NOUVEAU'
                              ? 'bg-emerald-900/50 text-emerald-300 border-emerald-600/40'
                              : item.statutComparaison === 'MODIFIE'
                              ? 'bg-amber-900/50 text-amber-300 border-amber-600/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {item.statutComparaison === 'NOUVEAU' ? '✨ Nouveau' : item.statutComparaison === 'MODIFIE' ? '🔄 Modifié' : 'Identique'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-amber-300">{item.article.code_art}</td>
                        <td className="py-2 px-3 font-sans text-slate-200 font-medium">{item.article.designation}</td>
                        <td className="py-2 px-3 text-center text-slate-300">{item.article.longeur} mm</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-400">{item.article.stock_physique}</td>
                        <td className="py-2 px-3 font-sans text-[11px] text-amber-200/80">
                          {item.differences && item.differences.length > 0 ? (
                            <span>{item.differences.join(' • ')}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div>
            {file && (
              <button
                type="button"
                onClick={() => { setFile(null); setArticlesAnalyses([]); }}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Changer de fichier
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Annuler
            </button>
            {file && (
              <button
                type="button"
                onClick={handleApplyImport}
                disabled={isApplying || countSelectionnes === 0}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1.5 transition shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirmer l'Import ({countSelectionnes} articles)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
