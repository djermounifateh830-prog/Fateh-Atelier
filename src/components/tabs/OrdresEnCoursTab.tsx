import React, { useState, useMemo, useEffect } from 'react';
import {
  SuiviOF,
  LigneRetourOF,
  Article,
  FamilleProduit,
  ChuteItem,
  MappingChutes,
  DossierCommandeGlobal,
  ClientCodification,
  FicheTransfert
} from '../../types';
import { StorageService } from '../../services/storage';
import { RetourOFModal } from '../common/RetourOFModal';
import { FicheTransfertModal } from '../common/FicheTransfertModal';
import {
  ClipboardCheck,
  Search,
  Filter,
  RefreshCw,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  FileSpreadsheet,
  Building2,
  Calendar,
  Layers,
  Scissors,
  CheckCircle,
  X,
  Printer,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpDown,
  Edit2,
  Save,
  Tag,
  Truck,
  FileCheck
} from 'lucide-react';

interface OrdresEnCoursTabProps {
  suivisOF: SuiviOF[];
  onRefreshData: () => void;
  dossiers?: DossierCommandeGlobal[];
  clientCodifications?: ClientCodification[];
  fichesTransfert?: FicheTransfert[];
  articles?: Article[];
  chutesBarres?: Record<string, ChuteItem[]>;
  mapping?: MappingChutes;
}

export const OrdresEnCoursTab: React.FC<OrdresEnCoursTabProps> = ({
  suivisOF = [],
  onRefreshData,
  dossiers = [],
  clientCodifications = [],
  fichesTransfert = [],
  articles = [],
  chutesBarres = {},
  mapping = {}
}) => {
  const [recherche, setRecherche] = useState<string>('');
  const [filtreStatut, setFiltreStatut] = useState<'TOUS' | 'EMIS' | 'RETOUR_EN_ATTENTE' | 'CLOTURE' | 'LIVRE'>('TOUS');
  const [filtreFamille, setFiltreFamille] = useState<string>('TOUTES');

  // Modal Fiche de Transfert
  const [isFicheTransfertModalOpen, setIsFicheTransfertModalOpen] = useState<boolean>(false);
  const [selectedFicheToView, setSelectedFicheToView] = useState<FicheTransfert | null>(null);

  // Actualisation automatique à l'ouverture de l'onglet
  useEffect(() => {
    if (onRefreshData) {
      onRefreshData();
    }
  }, [onRefreshData]);

  // Modal Saisie Retour OF
  const [selectedSuiviForRetour, setSelectedSuiviForRetour] = useState<SuiviOF | null>(null);
  const [isRetourModalOpen, setIsRetourModalOpen] = useState<boolean>(false);

  // Modal Détails OF (Visualisation des coupes & lignes)
  const [selectedSuiviForDetails, setSelectedSuiviForDetails] = useState<SuiviOF | null>(null);

  // Modal / Dialogue Modification Rapide Référence OF
  const [editingOF, setEditingOF] = useState<SuiviOF | null>(null);
  const [editFormNumCmd, setEditFormNumCmd] = useState<string>('');
  const [editFormClient, setEditFormClient] = useState<string>('');
  const [editFormDonneur, setEditFormDonneur] = useState<string>('');
  const [editFormTitre, setEditFormTitre] = useState<string>('');

  const handleOpenEditOF = (of: SuiviOF) => {
    setEditingOF(of);
    setEditFormNumCmd(of.numCommande || '');
    setEditFormClient(of.nomClient || '');
    setEditFormDonneur(of.donneurOrdre || '');
    setEditFormTitre(of.titreSection || '');
  };

  const handleSaveEditOF = async () => {
    if (!editingOF) return;
    const updated: SuiviOF = {
      ...editingOF,
      numCommande: editFormNumCmd.trim() || editingOF.numCommande,
      nomClient: editFormClient.trim() || editingOF.nomClient,
      donneurOrdre: editFormDonneur.trim(),
      titreSection: editFormTitre.trim() || editingOF.titreSection
    };
    await StorageService.upsertSuiviOF(updated);
    setEditingOF(null);
    onRefreshData();
  };

  // Tri de la table
  type SortKey = 'dateEmission' | 'numCommande' | 'nomClient' | 'statut' | 'famille';
  const [sortKey, setSortKey] = useState<SortKey>('dateEmission');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Filtrage et Tri
  const filteredAndSortedOFs = useMemo(() => {
    return suivisOF
      .filter(of => {
        // Filtre Statut
        if (filtreStatut !== 'TOUS' && of.statut !== filtreStatut) return false;
        // Filtre Famille
        if (filtreFamille !== 'TOUTES' && of.famille !== filtreFamille) return false;
        // Filtre Recherche texte
        if (recherche.trim()) {
          const q = recherche.toLowerCase().trim();
          const matchNum = (of.numCommande || '').toLowerCase().includes(q);
          const matchClient = (of.nomClient || '').toLowerCase().includes(q);
          const matchTitre = (of.titreSection || '').toLowerCase().includes(q);
          const matchDonneur = (of.donneurOrdre || '').toLowerCase().includes(q);
          const matchFamille = (of.famille || '').toLowerCase().includes(q);
          if (!matchNum && !matchClient && !matchTitre && !matchDonneur && !matchFamille) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const va = (a as any)[sortKey] || '';
        const vb = (b as any)[sortKey] || '';
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
  }, [suivisOF, filtreStatut, filtreFamille, recherche, sortKey, sortDir]);

  // Statistiques globales
  const stats = useMemo(() => {
    const total = suivisOF.length;
    const emis = suivisOF.filter(o => o.statut === 'EMIS').length;
    const retourEnAttente = suivisOF.filter(o => o.statut === 'RETOUR_EN_ATTENTE').length;
    const clotures = suivisOF.filter(o => o.statut === 'CLOTURE').length;
    const totalBarresNeuves = suivisOF.reduce((acc, o) => acc + (o.totalBarresNeuvesPrevu || 0), 0);
    const totalChutesRecyclees = suivisOF.reduce((acc, o) => acc + (o.totalChutesUtiliseesPrevu || 0), 0);

    return { total, emis, retourEnAttente, clotures, totalBarresNeuves, totalChutesRecyclees };
  }, [suivisOF]);

  const handleMarquerRetourRecu = async (of: SuiviOF) => {
    const updated: SuiviOF = { ...of, statut: 'RETOUR_EN_ATTENTE' };
    await StorageService.upsertSuiviOF(updated);
    onRefreshData();
  };

  const handleSupprimerOF = async (of: SuiviOF) => {
    if (confirm(`Voulez-vous vraiment supprimer le suivi de l'OF N° "${of.numCommande}" (${of.nomClient}) ?`)) {
      await StorageService.deleteSuiviOF(of.id);
      onRefreshData();
    }
  };

  const SortHeader = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`py-3 px-3.5 text-left text-xs font-semibold text-slate-300 cursor-pointer select-none transition hover:bg-slate-800 hover:text-amber-300 ${
        sortKey === col ? 'text-amber-300 bg-slate-800/60' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        <ArrowUpDown className={`w-3.5 h-3.5 ${sortKey === col ? 'text-amber-400 opacity-100' : 'opacity-40'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* ── Entête & Titre ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-100">
                Ordres de Fabrication en Cours (Suivi OF)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300 text-xs font-mono font-bold">
                {stats.emis + stats.retourEnAttente} en cours
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Suivi en temps réel des ordres de fabrication émis, saisie des retours atelier et réintégration des chutes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton Créer Fiche de Transfert */}
          <button
            onClick={() => {
              setSelectedFicheToView(null);
              setIsFicheTransfertModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Créer Fiche de Transfert</span>
          </button>

          <button
            onClick={onRefreshData}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* ── KPIs & Compteurs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          onClick={() => setFiltreStatut('TOUS')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filtreStatut === 'TOUS'
              ? 'bg-slate-800/90 border-slate-600 shadow-md ring-1 ring-slate-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Ordres (OF)</span>
            <ClipboardCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Toutes fiches confondues</div>
        </div>

        <div
          onClick={() => setFiltreStatut('EMIS')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filtreStatut === 'EMIS'
              ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500'
              : 'bg-slate-900 border-slate-800 hover:border-blue-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
            <span>📤 Émis (Atelier)</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono mt-1">{stats.emis}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">En cours de découpe</div>
        </div>

        <div
          onClick={() => setFiltreStatut('RETOUR_EN_ATTENTE')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filtreStatut === 'RETOUR_EN_ATTENTE'
              ? 'bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-500'
              : 'bg-slate-900 border-slate-800 hover:border-amber-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>📋 Retour Reçu</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{stats.retourEnAttente}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">À corriger &amp; clôturer</div>
        </div>

        <div
          onClick={() => setFiltreStatut('CLOTURE')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filtreStatut === 'CLOTURE'
              ? 'bg-emerald-950/70 border-emerald-500 shadow-md ring-1 ring-emerald-500'
              : 'bg-slate-900 border-slate-800 hover:border-emerald-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>✅ Clôturés</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{stats.clotures}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Prêts pour transfert</div>
        </div>

        <div
          onClick={() => {
            setSelectedFicheToView(null);
            setIsFicheTransfertModalOpen(true);
          }}
          className="p-4 rounded-xl border bg-amber-950/40 border-amber-500/40 hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
            <span>🚚 Fiches Transfert</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono mt-1">{fichesTransfert.length}</div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">Bons de livraison client</div>
        </div>
      </div>

      {/* ── Filtres & Barre de Recherche ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher par N° Commande, Client, Titre, Donneur d'ordre..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-medium"
            />
            {recherche && (
              <button
                onClick={() => setRecherche('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre Famille */}
          <select
            value={filtreFamille}
            onChange={e => setFiltreFamille(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="TOUTES">Toutes les Familles</option>
            <option value="TABLIER">Tablier (Lames)</option>
            <option value="CAISSON">Caisson (Coffre &amp; Sous-Face)</option>
            <option value="MOUSTIQUAIRE">Moustiquaire (Toile &amp; Profilés)</option>
            <option value="PRECADRE">Précadre</option>
          </select>
        </div>

        {/* Boutons rapides Statut */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['TOUS', 'EMIS', 'RETOUR_EN_ATTENTE', 'CLOTURE'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFiltreStatut(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition border cursor-pointer ${
                filtreStatut === st
                  ? st === 'EMIS'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : st === 'RETOUR_EN_ATTENTE'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : st === 'CLOTURE'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-700 text-white border-slate-600'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {st === 'TOUS' ? 'Tous' : st === 'EMIS' ? '📤 Émis' : st === 'RETOUR_EN_ATTENTE' ? '📋 Retour reçu' : '✅ Clôturés'}
              <span className="ml-1 text-[10px] font-mono">
                ({suivisOF.filter(o => st === 'TOUS' || o.statut === st).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Principale des Ordres de Fabrication ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <SortHeader col="numCommande" label="N° Commande" className="w-36" />
                <SortHeader col="nomClient" label="Client / Donneur d'Ordre" />
                <SortHeader col="famille" label="Famille & Section" />
                <SortHeader col="dateEmission" label="Date Émission" className="w-32" />
                <th className="py-3 px-3.5 text-center w-36">Barres &amp; Chutes</th>
                <SortHeader col="statut" label="Statut" className="w-36 text-center" />
                <th className="py-3 px-3.5 text-center w-52">Actions Atelier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredAndSortedOFs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans italic text-sm">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-25 text-blue-400" />
                    <p className="font-bold text-slate-400">Aucun Ordre de Fabrication correspondant</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Les OF apparaissent automatiquement ici dès que vous cliquez sur "Émettre l'OF" dans l'Écosystème Commandes.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedOFs.map(of => {
                  const isEmis = of.statut === 'EMIS';
                  const isAttente = of.statut === 'RETOUR_EN_ATTENTE';
                  const isCloture = of.statut === 'CLOTURE';

                  return (
                    <tr
                      key={of.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isEmis
                          ? 'bg-slate-900/40'
                          : isAttente
                          ? 'bg-amber-950/20'
                          : 'bg-slate-900/20'
                      }`}
                    >
                      {/* N° Commande */}
                      <td className="py-3 px-3.5 font-mono font-bold text-amber-300">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {of.numCommande
                            .split(/[\s,+/]+/)
                            .map(c => c.trim())
                            .filter(Boolean)
                            .map((cmd, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold"
                              >
                                {cmd}
                              </span>
                            ))}
                          <button
                            type="button"
                            onClick={() => handleOpenEditOF(of)}
                            className="p-1 text-slate-500 hover:text-amber-300 hover:bg-slate-800 rounded transition"
                            title="Modifier les N° de commande / Référence de cet OF"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Client / Donneur d'ordre */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-200">{of.nomClient || '—'}</div>
                        {of.donneurOrdre && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span>{of.donneurOrdre}</span>
                          </div>
                        )}
                      </td>

                      {/* Famille & Section */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            of.famille === 'TABLIER' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            of.famille === 'CAISSON' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                            of.famille === 'MOUSTIQUAIRE' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {of.famille}
                          </span>
                          <span className="font-semibold text-slate-300 text-xs truncate max-w-[200px]" title={of.titreSection}>
                            {of.titreSection}
                          </span>
                        </div>
                      </td>

                      {/* Date Émission & Retour */}
                      <td className="py-3 px-3.5 font-mono text-slate-400 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{of.dateEmission}</span>
                        </div>
                        {of.dateRetour && (
                          <div className="text-[10px] text-emerald-400 mt-0.5">
                            Retour : {of.dateRetour}
                          </div>
                        )}
                      </td>

                      {/* Barres & Chutes */}
                      <td className="py-3 px-3.5 text-center font-mono">
                        <div className="text-xs font-bold text-slate-200">
                          <span className="text-sky-400">{of.totalBarresNeuvesPrevu}</span> barres
                          <span className="text-slate-500 mx-1">•</span>
                          <span className="text-emerald-400">{of.totalChutesUtiliseesPrevu}</span> chutes
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {of.lignesRetour.length} ligne(s) débit
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isEmis
                            ? 'bg-blue-950 text-blue-300 border-blue-700/60'
                            : isAttente
                            ? 'bg-amber-950 text-amber-300 border-amber-700/60 animate-pulse'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                        }`}>
                          {isEmis && <Clock className="w-3 h-3" />}
                          {isAttente && <AlertCircle className="w-3 h-3" />}
                          {isCloture && <CheckCircle2 className="w-3 h-3" />}
                          <span>
                            {isEmis ? 'Émis' : isAttente ? 'Retour Reçu' : 'Clôturé'}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Bouton Marquer Retour Reçu si EMIS */}
                          {isEmis && (
                            <button
                              onClick={() => handleMarquerRetourRecu(of)}
                              title="Marquer comme retour reçu de l'atelier"
                              className="px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/50 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5 inline mr-1" />
                              <span>Reçu</span>
                            </button>
                          )}

                          {/* Bouton Saisir Corrections & Clôturer si non clôturé */}
                          {!isCloture ? (
                            <button
                              onClick={() => {
                                setSelectedSuiviForRetour(of);
                                setIsRetourModalOpen(true);
                              }}
                              title="Saisir les annotations réelles de l'opérateur et ajuster le stock"
                              className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-sm transition cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Clôturer</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedSuiviForDetails(of);
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Voir les détails de l'OF clôturé"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Détails</span>
                            </button>
                          )}

                          {/* Bouton Supprimer */}
                          <button
                            onClick={() => handleSupprimerOF(of)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Supprimer cet OF"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Saisie Corrections & Clôture Retour OF ── */}
      {selectedSuiviForRetour && (
        <RetourOFModal
          isOpen={isRetourModalOpen}
          suivi={selectedSuiviForRetour}
          articles={articles}
          chutesBarres={chutesBarres}
          mapping={mapping}
          onClose={() => {
            setIsRetourModalOpen(false);
            setSelectedSuiviForRetour(null);
          }}
          onCloture={() => {
            onRefreshData();
            setIsRetourModalOpen(false);
            setSelectedSuiviForRetour(null);
          }}
        />
      )}

      {/* ── Modal Consultation Détails OF Clôturé ── */}
      {selectedSuiviForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>OF N° {selectedSuiviForDetails.numCommande}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Clôturé
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Client : <strong>{selectedSuiviForDetails.nomClient}</strong> — Émis le {selectedSuiviForDetails.dateEmission}
                    {selectedSuiviForDetails.dateRetour && ` • Clôturé le ${selectedSuiviForDetails.dateRetour}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSuiviForDetails(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Lignes Débit, Mesures Réelles &amp; Annotations :</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {selectedSuiviForDetails.lignesRetour.length} support(s)
                </span>
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Repère &amp; Pièces</th>
                      <th className="p-2.5">Support Réel</th>
                      <th className="p-2.5 text-center">Reste Prévu</th>
                      <th className="p-2.5 text-center bg-slate-900/60 text-amber-300">Reste Réel Mesuré</th>
                      <th className="p-2.5 text-center">Destination</th>
                      <th className="p-2.5">Remarque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-sans">
                    {selectedSuiviForDetails.lignesRetour.map((ligne, i) => {
                      const realReste = ligne.resteReelMesureMm ?? ligne.restePrevuMm;
                      const isBarre = ligne.sourceReelle === 'BARRE_NEUVE' || (ligne.sourceReelle !== 'AUTRE_CHUTE' && ligne.typeSupport === 'BARRE_NEUVE');
                      const delta = realReste - ligne.restePrevuMm;

                      return (
                        <tr key={ligne.id || i} className="hover:bg-slate-800/30">
                          <td className="p-2.5">
                            <div className="font-bold text-amber-300 font-mono text-[11px]">{ligne.repere}</div>
                            {ligne.piecesInfoStr && (
                              <div className="text-[10px] text-slate-400 font-mono">{ligne.piecesInfoStr}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-300">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isBarre
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-blue-950 text-blue-300 border-blue-800'
                            }`}>
                              {isBarre ? '🪵 Barre Neuve' : '📦 Chute Stock'} ({ligne.longueurSourceReelle || ligne.longueurPrevue}mm)
                            </span>
                          </td>
                          <td className="p-2.5 text-center text-slate-400 font-mono">{ligne.restePrevuMm} mm</td>
                          <td className="p-2.5 text-center font-mono font-bold bg-slate-900/30">
                            <span className="text-amber-300 text-xs">{realReste} mm</span>
                            {delta !== 0 && (
                              <span className={`text-[10px] ml-1 font-normal ${delta > 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                                ({delta > 0 ? `+${delta}` : delta}mm)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {ligne.actionReste === 'A_STOCKER' && realReste > 0 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                                📦 En Stock ({realReste}mm)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700">
                                🗑️ Déchet
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-400 text-[11px]">
                            {ligne.remarque || ligne.saisieOperateur || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedSuiviForDetails.remarqueGlobale && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-bold block mb-1">Remarque Générale :</span>
                  <p className="text-slate-300">{selectedSuiviForDetails.remarqueGlobale}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedSuiviForDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Modification Rapide Référence & Commandes OF ── */}
      {editingOF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Modifier l'Ordre de Fabrication</h3>
                  <p className="text-[11px] text-slate-400">Corrigez les N° de commandes ou le client</p>
                </div>
              </div>
              <button
                onClick={() => setEditingOF(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>N° de Commande(s) incluses dans cet OF :</span>
                </label>
                <input
                  type="text"
                  value={editFormNumCmd}
                  onChange={e => setEditFormNumCmd(e.target.value)}
                  placeholder="ex: 26148, 26149, 26130 ou 26148 + 26149 + 26130"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-500">
                  Séparez plusieurs commandes par des virgules ou des '+'. Chaque commande sera affichée comme un badge.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Nom du Client :</label>
                  <input
                    type="text"
                    value={editFormClient}
                    onChange={e => setEditFormClient(e.target.value)}
                    placeholder="Nom client"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Donneur d'Ordre :</label>
                  <input
                    type="text"
                    value={editFormDonneur}
                    onChange={e => setEditFormDonneur(e.target.value)}
                    placeholder="ex: SOMADAL"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Titre / Description Section :</label>
                <input
                  type="text"
                  value={editFormTitre}
                  onChange={e => setEditFormTitre(e.target.value)}
                  placeholder="Titre de la section"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingOF(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveEditOF}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg flex items-center gap-1.5 shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer Modifications</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Fiche de Transfert ── */}
      <FicheTransfertModal
        isOpen={isFicheTransfertModalOpen}
        onClose={() => {
          setIsFicheTransfertModalOpen(false);
          setSelectedFicheToView(null);
        }}
        dossiers={dossiers}
        suivisOF={suivisOF}
        clientCodifications={clientCodifications}
        onSaved={onRefreshData}
        ficheToView={selectedFicheToView}
      />
    </div>
  );
};
