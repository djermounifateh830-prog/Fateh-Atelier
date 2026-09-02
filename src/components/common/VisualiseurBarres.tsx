import React, { useState } from 'react';
import { ResultatOptimisation, ResultatBarre, ResultatChute } from '../../types';
import { CheckCircle, AlertCircle, AlertTriangle, Recycle, Layers, Sparkles, Printer, Info, ShieldCheck, HelpCircle } from 'lucide-react';

interface VisualiseurBarresProps {
  resultat: ResultatOptimisation;
  articleDesignation?: string;
  onOpenOF?: () => void;
}

// Palette de couleurs pour différencier les différentes cotes
const PIECE_COLORS = [
  'bg-amber-500 text-slate-950 border-amber-400',
  'bg-sky-500 text-slate-950 border-sky-400',
  'bg-emerald-500 text-slate-950 border-emerald-400',
  'bg-indigo-500 text-white border-indigo-400',
  'bg-rose-500 text-white border-rose-400',
  'bg-teal-500 text-slate-950 border-teal-400',
  'bg-violet-500 text-white border-violet-400',
  'bg-orange-500 text-slate-950 border-orange-400'
];

export const VisualiseurBarres: React.FC<VisualiseurBarresProps> = ({
  resultat,
  articleDesignation,
  onOpenOF
}) => {
  const [filterType, setFilterType] = useState<'all' | 'neuves' | 'chutes'>('all');
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);

  if (!resultat) return null;

  const barresNeuves = Array.isArray(resultat.barres_neuves) ? resultat.barres_neuves : [];
  const chutesUtilisees = Array.isArray(resultat.chutes_utilisees) ? resultat.chutes_utilisees : [];
  const piecesNonPlacees = Array.isArray(resultat.pieces_non_placees) ? resultat.pieces_non_placees : [];

  // Générer une map stable longueur -> classe de couleur
  const distinctLengths = Array.from(
    new Set([
      ...barresNeuves.flatMap(b => (b.pieces || []).map(p => Math.round(p.longueur))),
      ...chutesUtilisees.flatMap(c => (c.pieces || []).map(p => Math.round(p.longueur)))
    ])
  ).sort((a, b) => b - a);

  const lengthColorMap = new Map<number, string>();
  distinctLengths.forEach((lg, idx) => {
    lengthColorMap.set(lg, PIECE_COLORS[idx % PIECE_COLORS.length]);
  });

  const totalPiecesCoupees =
    barresNeuves.reduce((s, b) => s + (b.pieces?.length || 0), 0) +
    chutesUtilisees.reduce((s, c) => s + (c.pieces?.length || 0), 0);

  const sommeMatiereUtileMm =
    barresNeuves.reduce((s, b) => s + (b.pieces || []).reduce((sp, p) => sp + p.longueur, 0), 0) +
    chutesUtilisees.reduce((s, c) => s + (c.pieces || []).reduce((sp, p) => sp + p.longueur, 0), 0);

  const longueurBarreStandard = barresNeuves[0]?.longueur_barre || 6000;
  const minimumTheoriqueBarres = Math.ceil(sommeMatiereUtileMm / (longueurBarreStandard || 6000));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-slate-100 space-y-5">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 font-medium block">Barres Neuves</span>
          <div className="text-xl font-bold text-amber-400 mt-0.5 flex items-center gap-1.5">
            <span>{resultat.total_barres_neuves || 0}</span>
            {(resultat.isOptimumAbsolu || (resultat.total_barres_neuves <= minimumTheoriqueBarres)) && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold" title="Minimum mathématique absolu atteint (0 barre superflue)">
                ✓ OPTIMUM
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">
            {totalPiecesCoupees} coupes ({resultat.borneTheoriqueBarres ? `Min: ${resultat.borneTheoriqueBarres}b` : 'Min calculé'})
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 font-medium block">Chutes Recyclées</span>
          <div className="text-xl font-bold text-sky-400 mt-0.5 flex items-center gap-1">
            <Recycle className="w-4 h-4 text-sky-400" />
            {resultat.total_chutes_recyclees || 0}
          </div>
          <span className="text-[10px] text-slate-500">
            {chutesUtilisees.reduce((s, c) => s + (c.pieces?.length || 0), 0)} pièces sur chutes
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 font-medium block">Taux Rendement</span>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">
            {resultat.taux_rendement || 0}%
          </div>
          <span className="text-[10px] text-emerald-500/80 font-medium">Matière utile débitée</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 font-medium block">Paquets de Coupe</span>
          <div className="text-xl font-bold text-purple-400 mt-0.5 flex items-center gap-1">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>{resultat.nombrePaquetsCoupe || (barresNeuves.filter(b => (b.motifRepete || 1) > 1).length > 0 ? 'Oui' : 0)}</span>
          </div>
          <span className="text-[10px] text-purple-300/80">Barres jumelles groupées</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 font-medium block">Réglages Butée</span>
          <div className="text-xl font-bold text-sky-300 mt-0.5 flex items-center gap-1">
            <span>{resultat.reglagesButeeTotal || totalPiecesCoupees}</span>
            {resultat.reglagesButeeEconomises && resultat.reglagesButeeEconomises > 0 ? (
              <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1 py-0.5 rounded font-mono font-bold" title={`${resultat.reglagesButeeEconomises} changements de butée économisés en atelier`}>
                -{resultat.reglagesButeeEconomises}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] text-slate-400">
            {resultat.gainTempsPourcent ? `+${resultat.gainTempsPourcent}% productivité` : `${totalPiecesCoupees} coupes`}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[11px] text-slate-400 font-medium block">Chutes Stock</span>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">
            {((resultat.total_chute_mm || 0) / 1000).toFixed(2)} m
          </div>
          <span className="text-[10px] text-slate-400">Pertes: {((resultat.total_dechet_mm || 0) / 1000).toFixed(2)}m</span>
        </div>
      </div>

      {/* Explication & Audit Mathématique de l'Optimisation */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Audit Mathématique & Diagnostic de Performance 1D
            </h4>
          </div>
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="text-xs text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
          >
            {showAnalysis ? 'Masquer le diagnostic' : 'Afficher le diagnostic complet'}
          </button>
        </div>

        {showAnalysis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-800/80">
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-bold block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Borne Inférieure & Optimum Absolu
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Matière nette requise : <strong>{(sommeMatiereUtileMm / 1000).toFixed(2)} m</strong>.
                <br />
                Borne théorique minimale : <strong>{resultat.borneTheoriqueBarres || minimumTheoriqueBarres} barres</strong> de {longueurBarreStandard} mm.
                <br />
                <span className="text-emerald-400 font-semibold">
                  {resultat.total_barres_neuves <= (resultat.borneTheoriqueBarres || minimumTheoriqueBarres)
                    ? '✓ Optimum mathématique absolu atteint : 0 barre gaspillée.'
                    : `Solution quasi-optimale (${resultat.total_barres_neuves} barres neuves consommées).`}
                </span>
              </p>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-bold block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                Productivité Scie & Débit en Paquet
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {resultat.reglagesButeeEconomises && resultat.reglagesButeeEconomises > 0 ? (
                  <>
                    L'algorithme a épargné <strong>{resultat.reglagesButeeEconomises} déplacements de butée</strong> machine grâce aux groupements de cotes identiques.
                  </>
                ) : (
                  <>Découpe cadencée avec tri par cote décroissante pour ergonomie maximale.</>
                )}
                <br />
                Temps estimé de coupe en atelier : <strong>~{resultat.tempsEstimeMinutes || 5} minutes</strong>.
              </p>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-bold block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                Valorisation des Chutes (Stock)
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Toutes les chutes $\ge$ Refus Max (1200 mm) sont classées <strong>STOCK</strong> ({((resultat.total_chute_mm || 0) / 1000).toFixed(2)} m) pour réutilisation immédiate. Pertes résiduelles limitées à {((resultat.total_dechet_mm || 0) / 1000).toFixed(2)} m.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Non-placed pieces warning */}
      {piecesNonPlacees.length > 0 && (
        <div className="bg-rose-950/60 border border-rose-800/80 p-3.5 rounded-lg flex items-start gap-3 text-rose-200 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-rose-300">
              Attention : {piecesNonPlacees.length} pièce(s) non placée(s) !
            </span>
            <p className="mt-1 text-rose-300/80">
              Ces pièces dépassent la longueur maximale de barre ({barresNeuves[0]?.longueur_barre || 6000} mm).
              Détails : {piecesNonPlacees.map(p => `${p.longueur}mm (${p.label})`).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded font-medium transition ${
              filterType === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous ({barresNeuves.length + chutesUtilisees.length})
          </button>
          <button
            onClick={() => setFilterType('chutes')}
            className={`px-3 py-1 rounded font-medium transition ${
              filterType === 'chutes' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chutes recyclées ({chutesUtilisees.length})
          </button>
          <button
            onClick={() => setFilterType('neuves')}
            className={`px-3 py-1 rounded font-medium transition ${
              filterType === 'neuves' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Barres neuves ({barresNeuves.length})
          </button>
        </div>

        {onOpenOF && (
          <button
            onClick={onOpenOF}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-md transition"
          >
            <Printer className="w-4 h-4 text-slate-950" />
            <span>Imprimer l'Ordre de Fabrication (OF)</span>
          </button>
        )}
      </div>

      {/* Visual Cutting Bars List */}
      <div className="space-y-4">
        {/* Section Chutes Recyclées */}
        {(filterType === 'all' || filterType === 'chutes') && chutesUtilisees.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Recycle className="w-3.5 h-3.5" />
              1. Découpes sur Chutes du Stock ({chutesUtilisees.length})
            </h4>

            {chutesUtilisees.map((chute, idx) => (
              <BarreItem
                key={chute.id || idx}
                type="chute"
                index={idx + 1}
                longueurTotale={chute.longueur_chute_depart}
                utilise={chute.utilise}
                reste={chute.reste}
                pieces={chute.pieces || []}
                statut={chute.reste >= 1200 ? 'STOCK' : 'Dechet'}
                nombreReglagesButee={chute.nombreReglagesButee}
                lengthColorMap={lengthColorMap}
              />
            ))}
          </div>
        )}

        {/* Section Barres Neuves */}
        {(filterType === 'all' || filterType === 'neuves') && barresNeuves.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              2. Découpes sur Barres Neuves ({barresNeuves.length})
            </h4>

            {barresNeuves.map((barre, idx) => (
              <BarreItem
                key={barre.id || idx}
                type="neuve"
                index={idx + 1}
                longueurTotale={barre.longueur_barre}
                utilise={barre.utilise}
                reste={barre.chute}
                pieces={barre.pieces || []}
                statut={barre.statut}
                motifRepete={barre.motifRepete}
                nombreReglagesButee={barre.nombreReglagesButee}
                eboutage={barre.eboutage}
                lengthColorMap={lengthColorMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface BarreItemProps {
  type: 'neuve' | 'chute';
  index: number;
  longueurTotale: number;
  utilise: number;
  reste: number;
  pieces: ResultatBarre['pieces'];
  statut: 'Dechet' | 'STOCK' | 'SACRIFICE';
  motifRepete?: number;
  nombreReglagesButee?: number;
  eboutage?: number;
  lengthColorMap: Map<number, string>;
}

const BarreItem: React.FC<BarreItemProps> = ({
  type,
  index,
  longueurTotale,
  utilise,
  reste,
  pieces,
  statut,
  motifRepete,
  nombreReglagesButee,
  eboutage,
  lengthColorMap
}) => {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 hover:border-slate-700 transition">
      {/* En-tête de la barre */}
      <div className="flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
              type === 'chute'
                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            {type === 'chute' ? `Chute #${index}` : `Barre #${index}`}
          </span>

          {/* Badge Paquet de coupe / Barres jumelles */}
          {motifRepete && motifRepete > 1 && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 shadow-sm"
              title={`${motifRepete} barres identiques avec exactement les mêmes cotes. Possibilité de couper les barres en paquet ou avec les mêmes réglages de butée.`}
            >
              <span>⚡ PAQUET : ×{motifRepete} Barres Identiques</span>
            </span>
          )}

          <span className="text-slate-300 font-medium">
            Capacité : <strong>{longueurTotale} mm</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            Utilisé : <span className="text-slate-200 font-semibold">{Math.round(utilise)} mm</span> (
            {Math.round((utilise / longueurTotale) * 100)}%)
          </span>
          {nombreReglagesButee !== undefined && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-[11px] text-sky-300/80 font-mono">
                {nombreReglagesButee} réglage{nombreReglagesButee > 1 ? 's' : ''} butée
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">
            Reste : <strong>{Math.round(reste)} mm</strong>
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              statut === 'STOCK'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : statut === 'Dechet'
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {statut === 'STOCK' ? '📦 Vers Chute Stock' : statut === 'Dechet' ? '🗑️ Déchet (< Refus Min)' : '⚠️ Sacrifice (Zone Refus)'}
          </span>
        </div>
      </div>

      {/* Barre visuelle proportionnelle */}
      <div className="h-9 w-full bg-slate-900 rounded-md overflow-hidden flex border border-slate-800 shadow-inner">
        {eboutage && eboutage > 0 ? (
          <div
            style={{ width: `${Math.max(0.5, (eboutage / longueurTotale) * 100)}%` }}
            title={`Éboutage / Affranchissement tête: ${eboutage} mm`}
            className="h-full bg-slate-800/80 border-r border-slate-700 flex items-center justify-center text-[8px] font-mono text-slate-400"
          >
            ✂️
          </div>
        ) : null}

        {pieces.map((p, pIdx) => {
          const widthPct = (p.longueur / longueurTotale) * 100;
          const colorClass = lengthColorMap.get(Math.round(p.longueur)) || 'bg-amber-500 text-slate-950';

          return (
            <div
              key={p.id || pIdx}
              style={{ width: `${Math.max(1, widthPct)}%` }}
              title={`Pièce ${pIdx + 1}: ${p.longueur} mm - ${p.label}`}
              className={`h-full border-r border-slate-900 flex flex-col justify-center items-center px-1 font-mono text-[10px] font-bold overflow-hidden transition hover:brightness-110 cursor-help ${colorClass}`}
            >
              <span className="truncate w-full text-center leading-none">{Math.round(p.longueur)}</span>
              {widthPct > 8 && <span className="truncate w-full text-center text-[8px] opacity-80">{p.label}</span>}
            </div>
          );
        })}

        {/* Chute / Reste restant sur le profilé */}
        {reste > 0 && (
          <div
            style={{ width: `${(reste / longueurTotale) * 100}%` }}
            title={`Reste libre: ${Math.round(reste)} mm (${statut})`}
            className={`h-full flex items-center justify-center text-[10px] font-mono font-medium px-1 ${
              statut === 'STOCK'
                ? 'bg-emerald-950/60 text-emerald-400 border-l border-dashed border-emerald-700/60'
                : statut === 'Dechet'
                ? 'bg-slate-800/60 text-slate-500 border-l border-dashed border-slate-700'
                : 'bg-rose-950/60 text-rose-400 border-l border-dashed border-rose-700'
            }`}
          >
            <span className="truncate text-center">{Math.round(reste)} mm</span>
          </div>
        )}
      </div>

      {/* Détail textuel des pièces coupées */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
        <span className="text-slate-500">Détail des coupes :</span>
        {pieces.map((p, idx) => (
          <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-200">
            {p.longueur} mm <span className="text-slate-500 text-[10px]">({p.label})</span>
          </span>
        ))}
      </div>
    </div>
  );
};
