import React from 'react';
import { SlidersHorizontal, Zap, Clock } from 'lucide-react';

interface SelecteurModeProps {
  mode: 'matiere' | 'temps';
  setMode: (mode: 'matiere' | 'temps') => void;
  poidsTemps: number;
  setPoidsTemps: (poids: number) => void;
}

export const SelecteurMode: React.FC<SelecteurModeProps> = ({
  mode,
  setMode,
  poidsTemps,
  setPoidsTemps
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm text-slate-100">
      <div className="flex items-center justify-between gap-2 mb-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          Stratégie d'Optimisation
        </label>
        <span className="text-[11px] text-slate-400">
          {mode === 'matiere' ? 'Minimisation stricte des chutes' : 'Compromis temps / réglages machine'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setMode('matiere')}
          className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
            mode === 'matiere'
              ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40 text-amber-200'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          <Zap className={`w-4 h-4 mt-0.5 shrink-0 ${mode === 'matiere' ? 'text-amber-400' : 'text-slate-500'}`} />
          <div>
            <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
              Mode Matière (ALNS & Zéro Gaspillage)
              {mode === 'matiere' && <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 rounded font-bold">Actif</span>}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Minimise le nombre absolu de barres, élimine les chutes en zone de refus [300-1200mm] et maximise le rendement matière brut.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode('temps')}
          className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
            mode === 'temps'
              ? 'bg-sky-500/10 border-sky-500/60 ring-1 ring-sky-500/40 text-sky-200'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${mode === 'temps' ? 'text-sky-400' : 'text-slate-500'}`} />
          <div>
            <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
              Mode Temps (Paquets & Réduction Butée)
              {mode === 'temps' && <span className="text-[10px] bg-sky-400/20 text-sky-300 px-1.5 rounded font-bold">Actif</span>}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Regroupe les cotes identiques, génère des barres jumelles à couper en paquet et réduit jusqu'à 60% les changements de butée machine.
            </p>
          </div>
        </button>
      </div>

      {mode === 'temps' && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 bg-slate-950/60 p-3 rounded-lg border">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-300">
              Dosage de la pénalité de changement de cote :
            </span>
            <span className="font-bold font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
              {poidsTemps.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="50"
            step="0.5"
            value={poidsTemps}
            onChange={e => setPoidsTemps(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0.5 (Priorité Matière)</span>
            <span>25 (Équilibré)</span>
            <span>50 (Priorité Vitesse Machine)</span>
          </div>
        </div>
      )}
    </div>
  );
};
