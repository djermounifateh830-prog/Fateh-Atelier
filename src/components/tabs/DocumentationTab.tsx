import React from 'react';
import { BookOpen, CheckCircle, AlertTriangle, XCircle, FileText, Cpu, Layers, HelpCircle, ArrowRight } from 'lucide-react';

export const DocumentationTab: React.FC = () => {
  return (
    <div className="space-y-6 text-slate-100 max-w-5xl mx-auto">
      {/* Introduction Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              SYNTHÈSE PROJET & RÈGLES MÉTIER — 3M ATELIER
            </h2>
            <p className="text-xs text-slate-400">
              Menuiserie Aluminium — Version 2 (Refonte Complète & Moteur 1D)
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 3 Colonnes État des Décisions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Validé Atelier */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CheckCircle className="w-4 h-4" />
            <span>Validé par l'Atelier (§9)</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Moteur 1D à <strong>recombinaison globale</strong> (toutes longueurs simultanées).</li>
            <li>Double mode : <strong>Matière</strong> (chute min) vs <strong>Temps</strong> (compromis avec dosage réglable).</li>
            <li>Tablier : <strong>nb_lame = Arrondi supérieur</strong> (Hauteur / Hauteur Lame) sans marge.</li>
            <li>Moustiquaire : stockage dimension unique + nombre de plis.</li>
            <li>4 onglets dédiés par produit + gestion de stock.</li>
          </ul>
        </div>

        {/* Proposé / En Cours */}
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Spécifications Intégrées</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Contrôle de dimension fixe sur les chutes de toile moustiquaire.</li>
            <li>Précadre : assemblage 45° ou 90° avec jeu de maçonnerie paramétrable.</li>
            <li>Formule de guidage fils cascade (2 à 7 fils, ratio 250-370mm).</li>
            <li>Mémorisation automatique de l'association Article ↔ Onglet Chutes.</li>
          </ul>
        </div>

        {/* Écarté */}
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <XCircle className="w-4 h-4" />
            <span>Écarté & Corrigé</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>❌ Consommation de stock lors de la simple prévisualisation.</li>
            <li>❌ Moteur longueur-par-longueur isolant des chutes de 3000mm.</li>
            <li>❌ Ressaisie manuelle des paramètres article (lame, longueur, refus).</li>
            <li>❌ Fichiers de sortie HTML écrasés à chaque impression.</li>
          </ul>
        </div>
      </div>

      {/* Glossaire & Vocabulaire Système */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Glossaire & Distinctions Vocabulaire Atelier
        </h3>

        <div className="border border-slate-800 rounded-lg overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Terme Atelier</th>
                <th className="py-2.5 px-3">Signification dans le Système</th>
                <th className="py-2.5 px-3">À ne pas confondre avec</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-2 px-3 font-bold text-slate-200">Lame (scie)</td>
                <td className="py-2 px-3 text-slate-300">Épaisseur du trait de scie (4.0 à 8.0 mm) déduit entre chaque coupe.</td>
                <td className="py-2 px-3 text-amber-400 font-medium">Lame de tablier</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-200">Lame (tablier)</td>
                <td className="py-2 px-3 text-slate-300">Latte physique du tablier roulant (ex: 43mm ou 55mm de haut).</td>
                <td className="py-2 px-3 text-amber-400 font-medium">Lame de scie (trait)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-200">Pli (Toile)</td>
                <td className="py-2 px-3 text-slate-300">Unité de mesure de la toile moustiquaire (25 mm / pli).</td>
                <td className="py-2 px-3 text-slate-400">Longueur en millimètres</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-200">Zone de Refus</td>
                <td className="py-2 px-3 text-slate-300">Intervalle interdit ]refus_min, refus_max[ : ni déchet minime, ni chute stockable.</td>
                <td className="py-2 px-3 text-slate-400">Déchet simple</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-200">Débordement</td>
                <td className="py-2 px-3 text-slate-300">Marge ajoutée aux coupes (souvent négative pour profilés moustiquaire).</td>
                <td className="py-2 px-3 text-slate-400">Marge de sécurité plis</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Algorithmes et Moteur 1D */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          Fonctionnement du Moteur d'Optimisation 1D
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h4 className="font-bold text-amber-400 text-sm">Mode "Matière" (Chute Minimale)</h4>
            <p className="leading-relaxed">
              Objectif unique : <strong>minimiser la somme des chutes générées</strong>. Le moteur recycle d'abord les chutes disponibles par recherche combinatoire sur l'ensemble des pièces de la commande, puis applique des permutations heuristiques sur barres neuves.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h4 className="font-bold text-sky-400 text-sm">Mode "Temps" (Compromis Machine)</h4>
            <p className="leading-relaxed">
              Objectif : <strong>réduire les réglages de butée machine</strong>. Formule de score :
              <br />
              <code className="text-sky-300 font-mono block mt-1 bg-slate-900 p-1.5 rounded">
                Score = Chute + (Nb_Cotes_Distinctes - 1) × Poids_Temps
              </code>
              Le poids est ajustable par l'opérateur selon l'urgence de la commande.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
