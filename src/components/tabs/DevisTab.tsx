import React, { useState } from 'react';
import { Article } from '../../types';
import { Calculator, Plus, Trash2, Printer, Download, DollarSign, Layers } from 'lucide-react';

interface DevisTabProps {
  articles: Article[];
}

interface LigneDevis {
  id: string;
  articleCode: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export const DevisTab: React.FC<DevisTabProps> = ({ articles = [] }) => {
  const safeArticles = Array.isArray(articles) ? articles : [];
  const [clientNom, setClientNom] = useState<string>('Client Particulier Alger');
  const [projetRef, setProjetRef] = useState<string>('DEVIS-2026-001');
  const [tauxMarge, setTauxMarge] = useState<number>(20); // 20%
  const [mainOeuvre, setMainOeuvre] = useState<number>(15000); // 15 000 DZD

  const [lignes, setLignes] = useState<LigneDevis[]>([]);

  const [selectedArtCode, setSelectedArtCode] = useState<string>(safeArticles[0]?.code_art || '');
  const [saisieQte, setSaisieQte] = useState<string>('1');

  const handleAjouterLigne = () => {
    const art = safeArticles.find(a => a.code_art === selectedArtCode);
    const qte = parseInt(saisieQte, 10);
    if (!art || isNaN(qte) || qte <= 0) return;

    const total = qte * (art.prix_unitaire || 0);
    const newLine: LigneDevis = {
      id: String(Date.now()),
      articleCode: art.code_art,
      designation: art.designation,
      quantite: qte,
      prixUnitaire: art.prix_unitaire || 0,
      total
    };

    setLignes([...lignes, newLine]);
    setSaisieQte('1');
  };

  const handleSupprimerLigne = (id: string) => {
    setLignes(lignes.filter(l => l.id !== id));
  };

  const sousTotalMatiere = lignes.reduce((s, l) => s + l.total, 0);
  const totalAvecMarge = sousTotalMatiere * (1 + tauxMarge / 100);
  const totalGeneral = totalAvecMarge + (mainOeuvre || 0);

  return (
    <div className="space-y-6 text-slate-100">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-100">Devis & Estimation Coût Matière</h3>
              <p className="text-xs text-slate-400">
                Calcul automatique basé sur les prix unitaires réels de <code>articles_stock.xlsx</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={clientNom}
              onChange={e => setClientNom(e.target.value)}
              placeholder="Nom du client..."
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-medium"
            />
            <input
              type="text"
              value={projetRef}
              onChange={e => setProjetRef(e.target.value)}
              placeholder="Réf. devis..."
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-mono font-bold"
            />
          </div>
        </div>

        {/* Formulaire ajout ligne devis */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-7">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Article en stock (avec prix unitaire) :
            </label>
            <select
              value={selectedArtCode}
              onChange={e => setSelectedArtCode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none"
            >
              {articles.map(a => (
                <option key={a.code_art} value={a.code_art}>
                  {a.designation} — {a.prix_unitaire} DZD / barre
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Quantité (Barres) :
            </label>
            <input
              type="number"
              min="1"
              value={saisieQte}
              onChange={e => setSaisieQte(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              onClick={handleAjouterLigne}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        {/* Tableau devis */}
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3">Article & Désignation</th>
                <th className="py-2.5 px-3 text-center">Quantité</th>
                <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                <th className="py-2.5 px-3 text-right">Total Ligne (DZD)</th>
                <th className="py-2.5 px-3 w-14 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {lignes.map((l, idx) => (
                <tr key={l.id} className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-center text-slate-500 font-sans">{idx + 1}</td>
                  <td className="py-2 px-3 font-sans">
                    <strong className="text-slate-200">{l.designation}</strong>
                    <span className="text-[10px] text-slate-400 ml-2 font-mono">({l.articleCode})</span>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-amber-400">{l.quantite}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{l.prixUnitaire.toLocaleString()} DZD</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">{l.total.toLocaleString()} DZD</td>
                  <td className="py-2 px-3 text-center font-sans">
                    <button
                      onClick={() => handleSupprimerLigne(l.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paramètres financiers et Récapitulatif */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-4 border-t border-slate-800 items-start">
          <div className="sm:col-span-6 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <h4 className="font-bold text-slate-200">Paramètres de Marge & Main d'Œuvre</h4>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Taux de Marge Commerciale (%) :</span>
              <input
                type="number"
                value={tauxMarge}
                onChange={e => setTauxMarge(parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-bold font-mono text-right"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Main d'Œuvre / Pose (DZD) :</span>
              <input
                type="number"
                value={mainOeuvre}
                onChange={e => setMainOeuvre(parseFloat(e.target.value) || 0)}
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-bold font-mono text-right"
              />
            </div>
          </div>

          <div className="sm:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Sous-total Matière Première :</span>
              <span className="font-mono font-semibold text-slate-200">{sousTotalMatiere.toLocaleString()} DZD</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Marge ({tauxMarge}%) :</span>
              <span className="font-mono font-semibold text-amber-400">
                {(totalAvecMarge - sousTotalMatiere).toLocaleString()} DZD
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Main d'œuvre :</span>
              <span className="font-mono font-semibold text-slate-200">{mainOeuvre.toLocaleString()} DZD</span>
            </div>
            <div className="flex justify-between text-base font-bold text-emerald-400 pt-2 border-t border-slate-800">
              <span>TOTAL DEVIS CLIENT :</span>
              <span className="font-mono text-lg">{Math.round(totalGeneral).toLocaleString()} DZD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
