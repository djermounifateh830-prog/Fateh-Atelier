import React, { useState } from 'react';
import { ChuteItem, ChuteMaille } from '../../types';
import { StorageService } from '../../services/storage';
import {
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Info
} from 'lucide-react';

interface ImportChutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chutesBarresExistantes: Record<string, ChuteItem[]>;
  chutesMailleExistantes: ChuteMaille[];
  onImportComplete: () => void;
}

export type StrategieImportChute = 'REPLACE_SELECTED' | 'MERGE_ADD' | 'REPLACE_ALL';

interface SheetInfo {
  name: string;
  count: number;
  isMaille: boolean;
  selected: boolean;
  alreadyExists: boolean;
  existingCount: number;
}

export const ImportChutesModal: React.FC<ImportChutesModalProps> = ({
  isOpen,
  onClose,
  chutesBarresExistantes,
  chutesMailleExistantes,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [strategie, setStrategie] = useState<StrategieImportChute>('REPLACE_SELECTED');
  const [sheetsDetected, setSheetsDetected] = useState<SheetInfo[]>([]);
  const [parsedData, setParsedData] = useState<{
    chutesBarres: Record<string, ChuteItem[]>;
    chutesMaille: ChuteMaille[];
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsAnalyzing(true);

    try {
      const res = await StorageService.parseChutesExcelFile(selectedFile);
      setParsedData({
        chutesBarres: res.chutesBarres,
        chutesMaille: res.chutesMaille
      });

      const sheetsInfo: SheetInfo[] = res.sheetNames.map(sheetName => {
        const isMaille = sheetName.toUpperCase() === 'MAILLE MSTQ';
        let count = 0;
        let alreadyExists = false;
        let existingCount = 0;

        if (isMaille) {
          count = res.chutesMaille.length;
          alreadyExists = chutesMailleExistantes.length > 0;
          existingCount = chutesMailleExistantes.length;
        } else {
          count = (res.chutesBarres[sheetName] || []).length;
          alreadyExists = chutesBarresExistantes[sheetName] !== undefined;
          existingCount = (chutesBarresExistantes[sheetName] || []).length;
        }

        return {
          name: sheetName,
          count,
          isMaille,
          selected: true, // Sélectionné par défaut
          alreadyExists,
          existingCount
        };
      });

      setSheetsDetected(sheetsInfo);
    } catch (err: any) {
      alert('Erreur lors de la lecture du fichier Excel de chutes: ' + err.message);
      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleSheet = (sheetName: string) => {
    setSheetsDetected(prev =>
      prev.map(s => (s.name === sheetName ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setSheetsDetected(prev => prev.map(s => ({ ...s, selected: checked })));
  };

  const handleApplyImport = async () => {
    if (!parsedData) return;

    const selectedSheets = sheetsDetected.filter(s => s.selected);
    if (selectedSheets.length === 0) {
      alert('Veuillez cocher au moins un onglet à importer.');
      return;
    }

    setIsApplying(true);

    try {
      if (strategie === 'REPLACE_ALL') {
        if (!confirm(`⚠️ ATTENTION : Vous avez choisi "Remplacement Complet du Classeur". Tous les onglets existants seront supprimés et remplacés par ceux du fichier Excel (${selectedSheets.length} onglets). Continuer ?`)) {
          setIsApplying(false);
          return;
        }

        const newChutesBarres: Record<string, ChuteItem[]> = {};
        let newChutesMaille: ChuteMaille[] = [];

        selectedSheets.forEach(s => {
          if (s.isMaille) {
            newChutesMaille = parsedData.chutesMaille;
          } else {
            newChutesBarres[s.name] = parsedData.chutesBarres[s.name] || [];
          }
        });

        await StorageService.saveChutesBarres(newChutesBarres);
        await StorageService.saveChutesMaille(newChutesMaille);
      } else if (strategie === 'REPLACE_SELECTED') {
        // Conserver les onglets existants non sélectionnés, et remplacer ceux sélectionnés
        const updatedBarres: Record<string, ChuteItem[]> = { ...chutesBarresExistantes };
        let updatedMaille: ChuteMaille[] = [...chutesMailleExistantes];

        selectedSheets.forEach(s => {
          if (s.isMaille) {
            updatedMaille = parsedData.chutesMaille;
          } else {
            updatedBarres[s.name] = parsedData.chutesBarres[s.name] || [];
          }
        });

        await StorageService.saveChutesBarres(updatedBarres);
        await StorageService.saveChutesMaille(updatedMaille);
      } else if (strategie === 'MERGE_ADD') {
        // Cumuler les chutes dans les onglets sélectionnés
        const updatedBarres: Record<string, ChuteItem[]> = { ...chutesBarresExistantes };
        let updatedMaille: ChuteMaille[] = [...chutesMailleExistantes];

        selectedSheets.forEach(s => {
          if (s.isMaille) {
            updatedMaille = [...updatedMaille, ...parsedData.chutesMaille];
          } else {
            const currentItems = updatedBarres[s.name] || [];
            const importedItems = parsedData.chutesBarres[s.name] || [];
            updatedBarres[s.name] = [...currentItems, ...importedItems];
          }
        });

        await StorageService.saveChutesBarres(updatedBarres);
        await StorageService.saveChutesMaille(updatedMaille);
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'import des chutes:', err);
      alert('Erreur lors de l\'import : ' + err.message);
    } finally {
      setIsApplying(false);
    }

    // Fermer la modal et rafraîchir APRÈS que les sauvegardes soient terminées
    onClose();
    onImportComplete();
    alert(`Import de chutes terminé avec succès ! (${selectedSheets.length} onglet(s) mis à jour)`);
  };

  const countSelectionnes = sheetsDetected.filter(s => s.selected).length;
  const totalChutesSelectionnees = sheetsDetected
    .filter(s => s.selected)
    .reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[96vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-slate-950 font-black text-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Import Intelligent de Chutes (Excel)
              </h2>
              <p className="text-[11px] text-slate-400">
                Sélectionnez quels onglets / familles importer sans risquer d'écraser le reste.
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
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center hover:border-sky-500/50 transition bg-slate-950/40">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-sky-400/60" />
              <h3 className="text-sm font-bold text-slate-200 mb-1">
                Sélectionnez votre classeur de chutes (<code>stok_chutes.xlsx</code>)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Tous les onglets du fichier seront analysés et vous pourrez choisir exactement quoi importer.
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-sky-500/20 transition">
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
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-400" />
              <p className="text-xs font-bold">Lecture des onglets et inventaire des chutes en cours...</p>
            </div>
          )}

          {/* Étape 2 : Onglets détectés & Options */}
          {file && !isAnalyzing && (
            <div className="space-y-4">
              {/* Info Fichier */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200 font-mono">{file.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {sheetsDetected.length} onglet(s) trouvé(s) • Total : {sheetsDetected.reduce((a, s) => a + s.count, 0)} chute(s)
                    </div>
                  </div>
                </div>
              </div>

              {/* Stratégie d'import */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mode d'Import pour les Chutes :</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 text-xs transition ${
                    strategie === 'REPLACE_SELECTED' ? 'bg-sky-950/50 border-sky-500 text-sky-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="strategie_chute"
                      checked={strategie === 'REPLACE_SELECTED'}
                      onChange={() => setStrategie('REPLACE_SELECTED')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-sky-400">🟢 Remplacer les onglets cochés</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Remplace uniquement les onglets sélectionnés, conserve tous les autres intacts.</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 text-xs transition ${
                    strategie === 'MERGE_ADD' ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="strategie_chute"
                      checked={strategie === 'MERGE_ADD'}
                      onChange={() => setStrategie('MERGE_ADD')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-emerald-400">🔵 Cumuler / Ajouter au stock</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ajoute les chutes importées à celles déjà présentes dans ces onglets.</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 text-xs transition ${
                    strategie === 'REPLACE_ALL' ? 'bg-rose-950/50 border-rose-500 text-rose-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="strategie_chute"
                      checked={strategie === 'REPLACE_ALL'}
                      onChange={() => setStrategie('REPLACE_ALL')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-rose-400">🔴 Remplacement Total Classeur</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Écrase l'intégralité du stock de chutes existant.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sélection des onglets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(true)}
                      className="text-sky-400 hover:underline font-semibold"
                    >
                      Tout cocher
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(false)}
                      className="text-slate-400 hover:underline"
                    >
                      Tout décocher
                    </button>
                  </div>
                  <div>
                    <span className="font-bold text-sky-300">{countSelectionnes}</span> onglet(s) sélectionné(s) ({totalChutesSelectionnees} chutes)
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {sheetsDetected.map(sheet => (
                    <div
                      key={sheet.name}
                      onClick={() => handleToggleSheet(sheet.name)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        sheet.selected
                          ? 'bg-slate-800/70 border-sky-500/60 shadow-sm'
                          : 'bg-slate-950/30 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={sheet.selected}
                          onChange={() => {}}
                          className="rounded text-sky-500 focus:ring-sky-400"
                        />
                        <div>
                          <div className="font-mono font-bold text-xs text-slate-100 flex items-center gap-1.5">
                            <span>{sheet.name}</span>
                            {sheet.isMaille && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Toile
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] mt-0.5">
                            Fichier : <span className={`font-bold font-mono ${sheet.count > 0 ? 'text-sky-300' : 'text-rose-400'}`}>{sheet.count}</span> chutes
                            {sheet.count === 0 && (
                              <span className="text-rose-400 ml-1">⚠ Format non reconnu</span>
                            )}
                            {sheet.alreadyExists && sheet.count > 0 && (
                              <span className="text-slate-500 ml-1.5">
                                (En stock : {sheet.existingCount})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          sheet.count === 0
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : sheet.alreadyExists
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {sheet.count === 0 ? '0 chute' : sheet.alreadyExists ? 'Existant' : 'Nouveau'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {sheetsDetected.length > 0 && sheetsDetected.every(s => s.count === 0) && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
                    <span className="text-lg leading-none">⚠️</span>
                    <div>
                      <div className="font-bold mb-1">Aucune chute n'a pu être lue depuis ce fichier Excel.</div>
                      <div className="text-[11px] text-rose-400/80">
                        Le parseur n'a pas reconnu le format de vos données. Vérifiez dans la console du navigateur (F12 → Console) 
                        les lignes <code className="bg-rose-900/40 px-1 rounded">[Import Chutes]</code> pour voir la structure exacte de votre fichier.
                        <br/>Format attendu : <strong>Colonne A = Longueur (mm)</strong>, <strong>Colonne B = Quantité</strong>.
                      </div>
                    </div>
                  </div>
                )}
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
                onClick={() => { setFile(null); setSheetsDetected([]); }}
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
                className="px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs rounded-lg flex items-center gap-1.5 transition shadow-md shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirmer l'Import ({countSelectionnes} onglets)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
