import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Calendar,
  User,
  FileText,
  Trash2,
  Copy,
  Edit3,
  Printer,
  CheckCircle,
  Clock,
  Layers,
  Scissors,
  Sliders,
  Building2,
  FolderOpen,
  Filter
} from 'lucide-react';
import { DossierCommandeGlobal } from '../../types';
import { StorageService } from '../../services/storage';

interface HistoriqueTabProps {
  dossiers?: DossierCommandeGlobal[];
  onLoadDossierInEcosysteme: (dossier: DossierCommandeGlobal) => void;
  onRefreshData?: () => void;
}

export const HistoriqueTab: React.FC<HistoriqueTabProps> = ({
  dossiers = [],
  onLoadDossierInEcosysteme,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('TOUS');

  // OF Modal State
  const [selectedOFDossier, setSelectedOFDossier] = useState<DossierCommandeGlobal | null>(null);
  const [isOFModalOpen, setIsOFModalOpen] = useState<boolean>(false);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        d.refCommande.toLowerCase().includes(term) ||
        d.nomClientFinal.toLowerCase().includes(term) ||
        d.donneurOrdre.toLowerCase().includes(term) ||
        (d.notes && d.notes.toLowerCase().includes(term));

      const matchStatus = statusFilter === 'TOUS' || d.statut === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [dossiers, searchTerm, statusFilter]);

  const handleSupprimerDossier = async (id: string, ref: string) => {
    if (confirm(`Voulez-vous vraiment supprimer définitivement le dossier ${ref} de l'historique ?`)) {
      const updated = dossiers.filter(d => d.id !== id);
      await StorageService.saveDossiers(updated);
      if (onRefreshData) onRefreshData();
    }
  };

  const handleDupliquerDossier = async (d: DossierCommandeGlobal) => {
    const newRef = `${d.refCommande}-COPIE`;
    const newDossier: DossierCommandeGlobal = {
      ...d,
      id: 'd-' + Date.now(),
      refCommande: newRef,
      dateCommande: new Date().toLocaleDateString('fr-FR'),
      notes: `Dupliqué depuis ${d.refCommande}. ${d.notes || ''}`.trim()
    };
    const updated = [newDossier, ...dossiers];
    await StorageService.saveDossiers(updated);
    if (onRefreshData) onRefreshData();
  };

  const handleOpenOFModal = (dossier: DossierCommandeGlobal) => {
    setSelectedOFDossier(dossier);
    setIsOFModalOpen(true);
  };

  const stats = useMemo(() => {
    let nbCaissons = 0;
    let nbTabliers = 0;
    let nbMoustiquaires = 0;
    let nbPrecadres = 0;

    dossiers.forEach(d => {
      nbCaissons += (d.articlesCaissons || []).length;
      nbTabliers += (d.articlesTabliers || []).length;
      nbMoustiquaires += (d.articlesMoustiquaires || []).length;
      nbPrecadres += (d.articlesPrecadres || []).length;
    });

    return {
      totalDossiers: dossiers.length,
      nbCaissons,
      nbTabliers,
      nbMoustiquaires,
      nbPrecadres
    };
  }, [dossiers]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Historique Global des Commandes &amp; Dossiers</span>
              <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 font-mono">
                {dossiers.length} dossier(s)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Recherchez, consultez, réouvrez ou réimprimez n'importe quelle commande enregistrée dans l'atelier.
            </p>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-lg bg-slate-950 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>{stats.nbCaissons} Caissons</span>
          </span>
          <span className="px-3 py-1 rounded-lg bg-slate-950 border border-sky-500/30 text-sky-300 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5" />
            <span>{stats.nbTabliers} Tabliers</span>
          </span>
          <span className="px-3 py-1 rounded-lg bg-slate-950 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>{stats.nbMoustiquaires} Mstq</span>
          </span>
          <span className="px-3 py-1 rounded-lg bg-slate-950 border border-purple-500/30 text-purple-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{stats.nbPrecadres} Précadres</span>
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher par N° commande, Nom client, Donneur d'ordre..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-purple-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-purple-300 font-bold focus:outline-none"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="EN_COURS">En cours de fabrication</option>
            <option value="CLOTURE">Clôturé / Prêt livraison</option>
            <option value="LIVRE">Livré (Fiche de Transfert)</option>
            <option value="TERMINE">Terminé</option>
          </select>
        </div>
      </div>

      {/* Dossiers Grid */}
      {filteredDossiers.length === 0 ? (
        <div className="bg-slate-900/50 p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <FolderOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Aucun dossier de commande trouvé</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'TOUS'
              ? "Aucun résultat ne correspond à vos critères de recherche. Essayez de réinitialiser les filtres."
              : "Aucune commande n'est encore enregistrée dans l'historique de l'atelier."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDossiers.map(dossier => {
            const nbCaisson = (dossier.articlesCaissons || []).length;
            const nbTablier = (dossier.articlesTabliers || []).length;
            const nbMstq = (dossier.articlesMoustiquaires || []).length;
            const nbPrecadre = (dossier.articlesPrecadres || []).length;
            const totalArticles = nbCaisson + nbTablier + nbMstq + nbPrecadre;

            return (
              <div
                key={dossier.id}
                className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 hover:border-purple-500/40 transition shadow-lg space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Top Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-500/30">
                        {dossier.refCommande}
                      </span>
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {dossier.dateCommande}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        dossier.statut === 'LIVRE'
                          ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                          : dossier.statut === 'CLOTURE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : dossier.statut === 'FABRIQUE' || (dossier.statut as string) === 'TERMINE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : dossier.statut === 'EN_COURS'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {dossier.statut === 'LIVRE' ? '🚚 LIVRÉ' : dossier.statut || 'EN_ATTENTE'}
                    </span>
                  </div>

                  {/* Client Info */}
                  <div className="text-xs space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Client Final :
                      </span>
                      <strong className="text-slate-100 font-bold">{dossier.nomClientFinal}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Donneur d'Ordre :</span>
                      <span className="text-sky-300 font-semibold">{dossier.donneurOrdre}</span>
                    </div>

                    {/* Liste des N° de commandes incluses dans ce dossier */}
                    {(() => {
                      const distinctRefs = Array.from(new Set([
                        dossier.refCommande,
                        dossier.numCommandeCaisson,
                        dossier.numCommandeSousFace,
                        dossier.numCommandeTablier,
                        dossier.numCommandeMoustiquaire,
                        dossier.numCommandePrecadre,
                        ...(dossier.articlesCaissons || []).flatMap(c => [c.refCommande, c.sfRefCommande]),
                        ...(dossier.articlesTabliers || []).map(t => t.refCommande),
                        ...(dossier.articlesMoustiquaires || []).map(m => m.refCommande),
                        ...(dossier.articlesPrecadres || []).map(p => p.refCommande)
                      ].filter(Boolean)));

                      if (distinctRefs.length <= 1) return null;
                      return (
                        <div className="pt-1 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-amber-400 font-bold">Commandes du dossier :</span>
                          {distinctRefs.map(ref => (
                            <span key={ref} className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                              N° {ref}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Products breakdown */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {nbCaisson > 0 && (
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                        {nbCaisson} caisson(s)
                      </span>
                    )}
                    {nbTablier > 0 && (
                      <span className="bg-sky-950/80 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded">
                        {nbTablier} tablier(s)
                      </span>
                    )}
                    {nbMstq > 0 && (
                      <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                        {nbMstq} moustiquaire(s)
                      </span>
                    )}
                    {nbPrecadre > 0 && (
                      <span className="bg-purple-950/80 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                        {nbPrecadre} précadre(s)
                      </span>
                    )}
                    {totalArticles === 0 && (
                      <span className="text-slate-500 italic">Dossier vide</span>
                    )}
                  </div>

                  {dossier.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/50 p-2 rounded border border-slate-850">
                      "{dossier.notes}"
                    </p>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onLoadDossierInEcosysteme(dossier)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Charger / Modifier</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenOFModal(dossier)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition cursor-pointer"
                      title="Imprimer Ordre de Fabrication (OF)"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDupliquerDossier(dossier)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition cursor-pointer"
                      title="Dupliquer le dossier"
                    >
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSupprimerDossier(dossier.id, dossier.refCommande)}
                      className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-lg text-xs transition cursor-pointer"
                      title="Supprimer du dossier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OF Modal — depuis l'Historique, il faut recharger le dossier dans l'Ecosystème pour imprimer l'OF complet */}
      {selectedOFDossier && isOFModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-black text-xs">3M</div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">Ordre de Fabrication</h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedOFDossier.refCommande} • {selectedOFDossier.nomClientFinal}</p>
                </div>
              </div>
              <button
                onClick={() => { setIsOFModalOpen(false); setSelectedOFDossier(null); }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3">
              <span className="text-amber-400 text-lg shrink-0">ℹ️</span>
              <div className="text-xs text-amber-200 space-y-2">
                <p className="font-bold text-sm text-amber-300">Impression OF depuis l'Historique</p>
                <p>
                  Pour imprimer ou télécharger l'Ordre de Fabrication (OF) de ce dossier,
                  <strong className="text-white"> chargez d'abord le dossier dans l'Écosystème Commandes</strong>,
                  puis relancez l'optimisation. Les coupes calculées seront alors disponibles dans l'OF imprimable.
                </p>
                <p className="text-amber-400/70">
                  Les données d'un OF déjà émis peuvent être consultées dans l'onglet <strong className="text-white">Suivi OF</strong>.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Dossier N° :</span>
                <span className="text-amber-300 font-bold">{selectedOFDossier.refCommande}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Client :</span>
                <span className="text-slate-200 font-bold">{selectedOFDossier.nomClientFinal}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Donneur d'ordre :</span>
                <span className="text-sky-300">{selectedOFDossier.donneurOrdre}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Date :</span>
                <span className="text-slate-300">{selectedOFDossier.dateCommande}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Articles (total) :</span>
                <span className="text-emerald-300 font-bold">
                  {(selectedOFDossier.articlesCaissons || []).length +
                   (selectedOFDossier.articlesTabliers || []).length +
                   (selectedOFDossier.articlesMoustiquaires || []).length +
                   (selectedOFDossier.articlesPrecadres || []).length} lignes
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onLoadDossierInEcosysteme(selectedOFDossier);
                setIsOFModalOpen(false);
                setSelectedOFDossier(null);
              }}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Charger dans l'Écosystème → Multi-Optimiser → Imprimer l'OF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
