import React, { useState, useMemo } from 'react';
import { Article } from '../../types';
import { Package, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';

interface SelecteurArticleProps {
  articles: Article[];
  selectedArticle: Article | null;
  onSelectArticle: (article: Article) => void;
  mappedSheetName?: string | null;
  chutesAvailableCount?: number;
}

type ArticleCategory = 'TOUS' | 'CT_CAISSON' | 'SF_SOUSFACE' | 'LAMES_COULISSES' | 'AUTRES';

export const SelecteurArticle: React.FC<SelecteurArticleProps> = ({
  articles = [],
  selectedArticle,
  onSelectArticle,
  mappedSheetName,
  chutesAvailableCount = 0
}) => {
  const safeArticles = Array.isArray(articles) ? articles : [];
  const [activeCategory, setActiveCategory] = useState<ArticleCategory>('TOUS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredArticles = useMemo(() => {
    return safeArticles.filter(art => {
      if (!art || !art.designation) return false;
      // 1. Filtrage catégorie
      const desig = (art.designation || '').toUpperCase();
      let matchCat = true;
      if (activeCategory === 'CT_CAISSON') {
        matchCat = desig.startsWith('CT') || desig.includes('CAISSON') || desig.includes('SOMO');
      } else if (activeCategory === 'SF_SOUSFACE') {
        matchCat = desig.startsWith('SF') || desig.includes('SOUS-FACE') || desig.includes('CH SF');
      } else if (activeCategory === 'LAMES_COULISSES') {
        matchCat = desig.includes('LAME') || desig.includes('COULISSE') || desig.includes('TABLIER') || desig.includes('GL');
      } else if (activeCategory === 'AUTRES') {
        matchCat = !desig.startsWith('CT') && !desig.startsWith('SF') && !desig.includes('CAISSON') && !desig.includes('SOUS-FACE');
      }

      if (!matchCat) return false;

      // 2. Filtrage recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (art.designation || '').toLowerCase().includes(q) ||
          (art.code_art || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => (a.designation || '').localeCompare(b.designation || ''));
  }, [safeArticles, activeCategory, searchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const found = safeArticles.find(a => a.code_art === code);
    if (found) {
      onSelectArticle(found);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm text-slate-100 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-4 h-4 text-amber-400" />
          Sélection de l'Article / Profilé
        </label>
        {selectedArticle && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
              selectedArticle.stock_physique <= selectedArticle.stock_min
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {selectedArticle.stock_physique <= selectedArticle.stock_min ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            Stock physique : {selectedArticle.stock_physique} barres
          </span>
        )}
      </div>

      {/* Badges de filtrage par famille */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setActiveCategory('TOUS')}
          className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
            activeCategory === 'TOUS'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Tous ({articles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('CT_CAISSON')}
          className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
            activeCategory === 'CT_CAISSON'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-950 text-emerald-400/80 hover:text-emerald-300 border border-emerald-500/30'
          }`}
        >
          📦 Caissons Tunnel CT
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('SF_SOUSFACE')}
          className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
            activeCategory === 'SF_SOUSFACE'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : 'bg-slate-950 text-sky-400/80 hover:text-sky-300 border border-sky-500/30'
          }`}
        >
          📐 Sous-Faces SF
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('LAMES_COULISSES')}
          className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
            activeCategory === 'LAMES_COULISSES'
              ? 'bg-indigo-500 text-slate-950 shadow-sm'
              : 'bg-slate-950 text-indigo-400/80 hover:text-indigo-300 border border-slate-800'
          }`}
        >
          ⚙️ Lames & Coulisses
        </button>
      </div>

      {/* Selecteur principal avec recherche intégrée */}
      <div className="space-y-2">
        <select
          value={selectedArticle?.code_art || ''}
          onChange={handleChange}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
        >
          <option value="" disabled>
            -- Choisissez un article ({filteredArticles.length} disponibles) --
          </option>
          {filteredArticles.map(art => (
            <option key={art.code_art} value={art.code_art}>
              {art.designation} ({art.code_art}) — Barre {art.longeur} mm
            </option>
          ))}
        </select>
      </div>

      {selectedArticle ? (
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Barre neuve</span>
            <span className="font-bold text-amber-400 text-sm">
              {selectedArticle.longeur} mm
            </span>
          </div>

          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Lame scie</span>
            <span className="font-semibold text-slate-200">
              {selectedArticle.lame} mm
            </span>
          </div>

          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Débordement</span>
            <span
              className={`font-semibold ${
                selectedArticle.debordement < 0
                  ? 'text-rose-400'
                  : selectedArticle.debordement > 0
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              {selectedArticle.debordement > 0 ? `+${selectedArticle.debordement}` : selectedArticle.debordement} mm
            </span>
          </div>

          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Zone Refus</span>
            <span className="font-semibold text-slate-300">
              {selectedArticle.refus_min} - {selectedArticle.refus_max} mm
            </span>
          </div>

          <div className="col-span-2 sm:col-span-4 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              Onglet chutes associé :{' '}
              <strong className="text-sky-300 font-mono">
                {mappedSheetName || 'Aucun (calcul barres neuves seules)'}
              </strong>
            </span>
            <span className="text-emerald-400 font-medium">
              {chutesAvailableCount} chute(s) disponible(s)
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400 italic">
          Sélectionnez un article pour charger automatiquement ses cotes de barre, lame de coupe et seuils de refus.
        </p>
      )}
    </div>
  );
};

