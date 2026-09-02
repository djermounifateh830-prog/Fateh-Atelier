import React, { useState, useMemo } from 'react';
import {
  FicheTransfert,
  LigneFicheTransfert,
  DossierCommandeGlobal,
  SuiviOF,
  ClientCodification
} from '../../types';
import { StorageService } from '../../services/storage';
import {
  Truck,
  Printer,
  CheckCircle2,
  X,
  Calendar,
  User,
  Building2,
  Package,
  FileText,
  Trash2,
  Plus,
  AlertCircle,
  FileCheck,
  Check
} from 'lucide-react';

interface FicheTransfertModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossiers: DossierCommandeGlobal[];
  suivisOF: SuiviOF[];
  clientCodifications: ClientCodification[];
  onFicheCreated?: () => void;
  onSaved?: () => void;
  ficheToView?: FicheTransfert | null;
}

export const FicheTransfertModal: React.FC<FicheTransfertModalProps> = ({
  isOpen,
  onClose,
  dossiers = [],
  suivisOF = [],
  clientCodifications = [],
  onFicheCreated,
  onSaved,
  ficheToView = null
}) => {
  // Liste des agences / donneurs d'ordre disponibles
  const agencesDisponibles = useMemo(() => {
    const list = clientCodifications.map(c => c.nom);
    const set = new Set(list);
    // Ajouter les donneurs d'ordre trouvés dans les dossiers
    dossiers.forEach(d => {
      if (d.donneurOrdre) set.add(d.donneurOrdre);
    });
    return Array.from(set);
  }, [clientCodifications, dossiers]);

  // Form State
  const [monClient, setMonClient] = useState<string>(() => {
    return agencesDisponibles[0] || 'SOMODAL Oran';
  });
  const [nomChauffeur, setNomChauffeur] = useState<string>('');
  const [dateLivraison, setDateLivraison] = useState<string>(() => {
    return new Date().toLocaleDateString('fr-FR');
  });
  const [remarquesFiche, setRemarquesFiche] = useState<string>('');

  // Commandes / Dossiers prêts (Clôturés / Fabriqués)
  // Une commande est prête si son dossier a statut === 'FABRIQUE' ou des OF clôturés
  const dossiersEligibles = useMemo(() => {
    return dossiers.filter(d => {
      const matchClient = !monClient || d.donneurOrdre.toLowerCase().trim() === monClient.toLowerCase().trim();
      const isPret = d.statut === 'FABRIQUE' || d.statut === 'OPTIMISE' || (d.statut as string) === 'TERMINE';
      const nonLivre = d.statut !== 'LIVRE';
      return matchClient && (isPret || nonLivre);
    });
  }, [dossiers, monClient]);

  // OFs éligibles clôturés
  const ofsEligibles = useMemo(() => {
    return suivisOF.filter(of => {
      const matchClient = !monClient || (of.donneurOrdre && of.donneurOrdre.toLowerCase().trim() === monClient.toLowerCase().trim());
      return of.statut === 'CLOTURE' && matchClient;
    });
  }, [suivisOF, monClient]);

  // Lignes de transfert en cours de construction
  const [lignes, setLignes] = useState<LigneFicheTransfert[]>([]);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [currentFiche, setCurrentFiche] = useState<FicheTransfert | null>(null);

  // Initialisation si on consulte une fiche déjà créée
  React.useEffect(() => {
    if (ficheToView) {
      setCurrentFiche(ficheToView);
      setMonClient(ficheToView.monClient);
      setNomChauffeur(ficheToView.nomChauffeurPrincipal || '');
      setDateLivraison(ficheToView.dateLivraison);
      setLignes(ficheToView.lignes || []);
      setIsGenerated(true);
    } else {
      setCurrentFiche(null);
      setIsGenerated(false);
      // Auto-remplissage des lignes avec les commandes clôturées du client
      const initialLignes: LigneFicheTransfert[] = [];

      // 1. Depuis les dossiers prêts
      dossiersEligibles.forEach(d => {
        const nbPrecadre = (d.articlesPrecadres || []).length;
        const nbMstq = (d.articlesMoustiquaires || []).length;
        const nbCaisson = (d.articlesCaissons || []).length;
        const nbTablier = (d.articlesTabliers || []).length;

        if (nbPrecadre > 0) {
          initialLignes.push({
            id: `l-${d.id}-prc`,
            dossierId: d.id,
            nomChauffeur: nomChauffeur,
            numCommande: d.numCommandePrecadre || d.refCommande,
            clientDeMonClient: d.nomClientFinal,
            familleProduit: 'PRÉCADRE',
            quantiteArticles: nbPrecadre,
            designationDetail: `${nbPrecadre} Précadre(s)`
          });
        }
        if (nbMstq > 0) {
          initialLignes.push({
            id: `l-${d.id}-mstq`,
            dossierId: d.id,
            nomChauffeur: nomChauffeur,
            numCommande: d.numCommandeMoustiquaire || d.refCommande,
            clientDeMonClient: d.nomClientFinal,
            familleProduit: 'MOUSTIQUAIRE',
            quantiteArticles: nbMstq,
            designationDetail: `${nbMstq} Moustiquaire(s) plissée(s)`
          });
        }
        if (nbCaisson > 0) {
          initialLignes.push({
            id: `l-${d.id}-csn`,
            dossierId: d.id,
            nomChauffeur: nomChauffeur,
            numCommande: d.numCommandeCaisson || d.refCommande,
            clientDeMonClient: d.nomClientFinal,
            familleProduit: 'CAISSON',
            quantiteArticles: nbCaisson,
            designationDetail: `${nbCaisson} Caisson(s) tunnel`
          });
        }
        if (nbTablier > 0) {
          initialLignes.push({
            id: `l-${d.id}-tbl`,
            dossierId: d.id,
            nomChauffeur: nomChauffeur,
            numCommande: d.numCommandeTablier || d.refCommande,
            clientDeMonClient: d.nomClientFinal,
            familleProduit: 'TABLIER',
            quantiteArticles: nbTablier,
            designationDetail: `${nbTablier} Tablier(s) volet`
          });
        }
      });

      // 2. Si aucun dossier n'a été éclaté, inspecter les OFs clôturés
      if (initialLignes.length === 0) {
        ofsEligibles.forEach(of => {
          initialLignes.push({
            id: `l-of-${of.id}`,
            ofId: of.id,
            nomChauffeur: nomChauffeur,
            numCommande: of.numCommande,
            clientDeMonClient: of.nomClient,
            familleProduit: of.famille,
            quantiteArticles: of.lignesRetour?.length || 1,
            designationDetail: of.titreSection
          });
        });
      }

      setLignes(initialLignes);
    }
  }, [ficheToView, monClient, dossiersEligibles, ofsEligibles]);

  // Ajouter une ligne manuelle
  const handleAjouterLigne = () => {
    const nouvelleLigne: LigneFicheTransfert = {
      id: `l-manuelle-${Date.now()}`,
      nomChauffeur: nomChauffeur,
      numCommande: '',
      clientDeMonClient: '',
      familleProduit: 'PRÉCADRE',
      quantiteArticles: 1,
      designationDetail: ''
    };
    setLignes(prev => [...prev, nouvelleLigne]);
  };

  // Modifier une ligne
  const handleModifierLigne = (id: string, field: keyof LigneFicheTransfert, value: any) => {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // Supprimer une ligne
  const handleSupprimerLigne = (id: string) => {
    setLignes(prev => prev.filter(l => l.id !== id));
  };

  // Validation & Enregistrement dans SQLite
  const handleValiderEtLivrer = async () => {
    if (!monClient) {
      alert('Veuillez sélectionner le nom de votre client.');
      return;
    }
    if (!nomChauffeur.trim()) {
      alert('Veuillez renseigner le nom du chauffeur transporteur.');
      return;
    }
    if (lignes.length === 0) {
      alert('Veuillez ajouter au moins une commande dans le tableau de la fiche de transfert.');
      return;
    }

    // Mettre à jour le nom du chauffeur dans chaque ligne
    const lignesCompletes = lignes.map(l => ({
      ...l,
      nomChauffeur: l.nomChauffeur || nomChauffeur
    }));

    const dateStr = dateLivraison.replace(/[\/\s]/g, '-');
    const numeroFiche = `FT-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

    const nouvelleFiche: FicheTransfert = {
      id: `ft-${Date.now()}`,
      numeroFiche,
      monClient,
      nomChauffeurPrincipal: nomChauffeur,
      dateLivraison,
      lignes: lignesCompletes,
      visaChauffeur: `Visa Chauffeur (${nomChauffeur})`,
      visaAtelier: 'Visa Atelier 3M',
      statut: 'VALIDEE',
      notes: remarquesFiche,
      createdAt: new Date().toISOString()
    };

    try {
      await StorageService.upsertFicheTransfert(nouvelleFiche);
      setCurrentFiche(nouvelleFiche);
      setIsGenerated(true);
      if (onFicheCreated) onFicheCreated();
      if (onSaved) onSaved();
    } catch (err: any) {
      alert('Erreur lors de la validation de la fiche de transfert: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl text-slate-100 flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* ── Modal Header (Masqué à l'impression) ── */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 print:hidden bg-slate-950/60 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Fiche de Transfert &amp; Bon de Remise Transporteur</span>
                {currentFiche && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono">
                    {currentFiche.numeroFiche} • LIVRÉE
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Génération officielle du bordereau de remise des commandes clôturées au transporteur du client.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGenerated && (
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer la Fiche</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Formulaire d'En-tête (Masqué si fiche déjà validée et prête à imprimer) ── */}
        {!isGenerated && (
          <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 space-y-4 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Nom de mon client */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nom de mon client (Donneur d'ordre) *</span>
                </label>
                <select
                  value={monClient}
                  onChange={e => setMonClient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                >
                  {agencesDisponibles.map(nom => (
                    <option key={nom} value={nom}>{nom}</option>
                  ))}
                </select>
              </div>

              {/* Date de livraison */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Date de livraison *</span>
                </label>
                <input
                  type="text"
                  value={dateLivraison}
                  onChange={e => setDateLivraison(e.target.value)}
                  placeholder="JJ/MM/AAAA"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Nom du chauffeur */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nom du Chauffeur Transporteur *</span>
                </label>
                <input
                  type="text"
                  value={nomChauffeur}
                  onChange={e => setNomChauffeur(e.target.value)}
                  placeholder="Ex: Mohamed B. / Transporteur Express"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="font-semibold text-slate-300">Commandes éligibles trouvées :</span>
                <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                  {lignes.length} ligne(s)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAjouterLigne}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une commande manuellement</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Document Officiel de la Fiche de Transfert (Visualisation & Impression) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 print:p-0 print:overflow-visible print:text-black">
          
          {/* Document Container Format A4 / Standard Paper */}
          <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-300 print:shadow-none print:border-none print:p-0 print:rounded-none">
            
            {/* Header Document */}
            <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 text-amber-400 font-black text-xl rounded-lg flex items-center justify-center border border-slate-800">
                  3M
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    FICHE DE TRANSFERT DE MARCHANDISE
                  </h1>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    ATELIER 3M — BON DE REMISE TRANSPORTEUR
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-bold text-slate-700">
                  N° {currentFiche?.numeroFiche || `FT-${dateLivraison.replace(/[\/\s]/g, '-')}-PROV`}
                </div>
                <div className="text-xs text-slate-600 font-bold mt-0.5">
                  Date : <span className="font-mono">{dateLivraison}</span>
                </div>
              </div>
            </div>

            {/* En-tête : Nom de mon client & Date de livraison */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-300 p-4 rounded-lg mb-6 text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Nom de mon Client :</span>
                <strong className="text-sm font-black text-slate-900">{monClient}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Date de Livraison :</span>
                <strong className="text-sm font-mono font-black text-slate-900">{dateLivraison}</strong>
                {nomChauffeur && (
                  <div className="text-slate-700 mt-1 font-semibold">
                    Chauffeur : <span className="font-bold text-slate-900">{nomChauffeur}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tableau Officiel avec les colonnes demandées :
                - NOM DE CHAUFFEUR
                - NUMERO DE COMMANDE
                - LE CLIENT DE MON CLIENT
                - FAMILLE DE PRODUIT
                - QUANTITE (NBR DE PRECADRE OU DE MOUSTIQUAIRE OU DE CAISSON OU DE TABLIER)
            */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-36">Nom de Chauffeur</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-36">Numéro de Commande</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Le Client de Mon Client</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-36">Famille de Produit</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-40">
                      Quantité (Nbre Pièces)
                    </th>
                    {!isGenerated && <th className="py-2.5 px-2 text-center w-12 print:hidden">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-slate-900">
                  {lignes.length === 0 ? (
                    <tr>
                      <td colSpan={isGenerated ? 5 : 6} className="py-8 text-center text-slate-400 italic font-medium">
                        Aucune commande n'est encore sélectionnée. Veuillez ajouter des commandes clôturées.
                      </td>
                    </tr>
                  ) : (
                    lignes.map((ligne, idx) => {
                      return (
                        <tr key={ligne.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          {/* 1. NOM DE CHAUFFEUR */}
                          <td className="py-2 px-3 border-r border-slate-300 font-medium">
                            {!isGenerated ? (
                              <input
                                type="text"
                                value={ligne.nomChauffeur || nomChauffeur}
                                onChange={e => handleModifierLigne(ligne.id, 'nomChauffeur', e.target.value)}
                                placeholder="Nom chauffeur"
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:bg-white"
                              />
                            ) : (
                              <span>{ligne.nomChauffeur || nomChauffeur || '—'}</span>
                            )}
                          </td>

                          {/* 2. NUMERO DE COMMANDE */}
                          <td className="py-2 px-3 border-r border-slate-300 font-mono font-bold text-slate-950">
                            {!isGenerated ? (
                              <input
                                type="text"
                                value={ligne.numCommande}
                                onChange={e => handleModifierLigne(ligne.id, 'numCommande', e.target.value)}
                                placeholder="Ex: S-A26736"
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none focus:bg-white"
                              />
                            ) : (
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                {ligne.numCommande || '—'}
                              </span>
                            )}
                          </td>

                          {/* 3. LE CLIENT DE MON CLIENT */}
                          <td className="py-2 px-3 border-r border-slate-300 font-bold">
                            {!isGenerated ? (
                              <input
                                type="text"
                                value={ligne.clientDeMonClient}
                                onChange={e => handleModifierLigne(ligne.id, 'clientDeMonClient', e.target.value)}
                                placeholder="Client final"
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:outline-none focus:bg-white"
                              />
                            ) : (
                              <span>{ligne.clientDeMonClient || '—'}</span>
                            )}
                          </td>

                          {/* 4. FAMILLE DE PRODUIT */}
                          <td className="py-2 px-3 border-r border-slate-300">
                            {!isGenerated ? (
                              <select
                                value={ligne.familleProduit}
                                onChange={e => handleModifierLigne(ligne.id, 'familleProduit', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:outline-none focus:bg-white"
                              >
                                <option value="PRÉCADRE">PRÉCADRE</option>
                                <option value="MOUSTIQUAIRE">MOUSTIQUAIRE</option>
                                <option value="CAISSON">CAISSON</option>
                                <option value="TABLIER">TABLIER</option>
                              </select>
                            ) : (
                              <span className="font-bold uppercase text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                                {ligne.familleProduit}
                              </span>
                            )}
                          </td>

                          {/* 5. QUANTITE (NBR DE PRECADRE OU DE MOUSTIQUAIRE OU DE CAISSON OU DE TABLIER) */}
                          <td className="py-2 px-3 border-r border-slate-300 text-center font-mono font-bold">
                            {!isGenerated ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={ligne.quantiteArticles}
                                  onChange={e => handleModifierLigne(ligne.id, 'quantiteArticles', Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-16 text-center bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-mono font-bold focus:outline-none focus:bg-white"
                                />
                                <span className="text-[10px] text-slate-500">
                                  {ligne.familleProduit === 'PRECADRE' || ligne.familleProduit === 'PRÉCADRE' ? 'précadre(s)' :
                                   ligne.familleProduit === 'MOUSTIQUAIRE' ? 'mstq(s)' :
                                   ligne.familleProduit === 'CAISSON' ? 'caisson(s)' : 'tablier(s)'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-sm font-black text-slate-900">{ligne.quantiteArticles}</span>
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {ligne.familleProduit === 'PRECADRE' || ligne.familleProduit === 'PRÉCADRE' ? 'Précadre(s)' :
                                   ligne.familleProduit === 'MOUSTIQUAIRE' ? 'Moustiquaire(s)' :
                                   ligne.familleProduit === 'CAISSON' ? 'Caisson(s)' : 'Tablier(s)'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Action Suppression (Mode Écriture) */}
                          {!isGenerated && (
                            <td className="py-2 px-2 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => handleSupprimerLigne(ligne.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Retirer cette ligne"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Total Summary Row */}
                {lignes.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-700">
                        Total Pièces Prêtes à la Livraison :
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-950 text-sm">
                        {lignes.reduce((sum, l) => sum + (l.quantiteArticles || 0), 0)} Pièces
                      </td>
                      {!isGenerated && <td className="print:hidden"></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ── Bas de Page : VISA CHAUFFEUR & VISA ATELIER ── */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-900 mt-8 text-xs">
              <div className="border border-slate-300 rounded-lg p-4 h-32 flex flex-col justify-between bg-slate-50/50">
                <div className="font-bold text-slate-900 uppercase flex items-center justify-between">
                  <span>VISA CHAUFFEUR</span>
                  <span className="text-[10px] text-slate-500 font-normal">Nom &amp; Signature</span>
                </div>
                <div className="text-[11px] text-slate-600 italic">
                  {nomChauffeur ? `Chauffeur : ${nomChauffeur}` : 'Signature précédée de la mention "Reçu conforme"'}
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4 h-32 flex flex-col justify-between bg-slate-50/50">
                <div className="font-bold text-slate-900 uppercase flex items-center justify-between">
                  <span>VISA ATELIER</span>
                  <span className="text-[10px] text-slate-500 font-normal">Responsable Expédition</span>
                </div>
                <div className="text-[11px] text-slate-600 italic">
                  Pour l'Atelier 3M — Contrôlé &amp; Remis le {dateLivraison}
                </div>
              </div>
            </div>

            {/* Mention légale de clôture */}
            <div className="text-center text-[10px] text-slate-500 mt-6 pt-3 border-t border-slate-200">
              Document officiel généré par le Système 3M Atelier — La signature de ce bordereau valide le transfert physique et clôture la responsabilité atelier.
            </div>

          </div>
        </div>

        {/* ── Footer Actions (Masqué à l'impression) ── */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 print:hidden rounded-b-2xl">
          <div className="text-xs text-slate-400">
            {!isGenerated ? (
              <span>⚠️ La validation enregistre la fiche et met à jour les commandes en statut <strong>LIVREE</strong>.</span>
            ) : (
              <span className="text-emerald-400 font-semibold">✓ Fiche validée et enregistrée avec succès dans la base SQLite.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isGenerated ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleValiderEtLivrer}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider la Fiche &amp; Marquer LIVRÉE</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la Fiche</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
