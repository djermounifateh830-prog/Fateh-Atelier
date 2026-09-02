import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Hash,
  Tag,
  FileText
} from 'lucide-react';
import { ClientCodification } from '../../types';
import { INITIAL_CLIENT_CODIFICATIONS } from '../../data/initialCodifications';
import { genererRepereCaissonSousFace } from '../../services/codificationService';

interface ClientCodificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  codifications: ClientCodification[];
  onSaveCodifications: (updated: ClientCodification[]) => Promise<void>;
  onUpsertCodification: (codif: ClientCodification) => Promise<void>;
  onDeleteCodification: (id: string) => Promise<void>;
}

export const ClientCodificationModal: React.FC<ClientCodificationModalProps> = ({
  isOpen,
  onClose,
  codifications,
  onSaveCodifications,
  onUpsertCodification,
  onDeleteCodification
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClientCodification>>({});
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newForm, setNewForm] = useState<Partial<ClientCodification>>({
    nom: '',
    code: '',
    prefixeCommande: '',
    prefixeRepereSpecial: '',
    type: 'AUTRE',
    description: '',
    actif: true
  });

  // Simulateur de repère en direct
  const [testClientNom, setTestClientNom] = useState<string>('FARID ALUMINIUM');
  const [testAgence, setTestAgence] = useState<string>(codifications[0]?.nom || 'SOMODAL Alger');

  if (!isOpen) return null;

  const handleStartEdit = (c: ClientCodification) => {
    setEditingId(c.id);
    setEditForm({ ...c });
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.nom || !editForm.prefixeCommande) {
      alert('Veuillez renseigner le nom et le préfixe de commande.');
      return;
    }
    const codifToSave: ClientCodification = {
      id: editingId,
      code: editForm.code || editForm.nom.toUpperCase().replace(/\s+/g, '-'),
      nom: editForm.nom,
      prefixeCommande: editForm.prefixeCommande.trim().toUpperCase(),
      prefixeRepereSpecial: (editForm.prefixeRepereSpecial || '').trim().toUpperCase(),
      type: editForm.type || 'AUTRE',
      badgeColor: editForm.badgeColor || 'text-sky-300',
      badgeBg: editForm.badgeBg || 'bg-sky-500/20 border-sky-500/30',
      description: editForm.description || '',
      actif: editForm.actif ?? true,
      ordre: editForm.ordre || 0
    };

    await onUpsertCodification(codifToSave);
    setEditingId(null);
    setEditForm({});
  };

  const handleAddNew = async () => {
    if (!newForm.nom || !newForm.prefixeCommande) {
      alert('Veuillez renseigner le nom et le préfixe de commande.');
      return;
    }
    const id = 'codif-' + Date.now();
    const newCodif: ClientCodification = {
      id,
      code: newForm.code || newForm.nom.toUpperCase().replace(/\s+/g, '-'),
      nom: newForm.nom,
      prefixeCommande: newForm.prefixeCommande.trim().toUpperCase(),
      prefixeRepereSpecial: (newForm.prefixeRepereSpecial || '').trim().toUpperCase(),
      type: newForm.type || 'AUTRE',
      badgeColor: newForm.type === 'CRISTAL' ? 'text-purple-300' : newForm.type === 'SOMADAL' ? 'text-sky-300' : 'text-amber-300',
      badgeBg: newForm.type === 'CRISTAL' ? 'bg-purple-500/20 border-purple-500/30' : newForm.type === 'SOMADAL' ? 'bg-sky-500/20 border-sky-500/30' : 'bg-amber-500/20 border-amber-500/30',
      description: newForm.description || '',
      actif: true,
      ordre: codifications.length + 1
    };

    await onUpsertCodification(newCodif);
    setIsAddingNew(false);
    setNewForm({
      nom: '',
      code: '',
      prefixeCommande: '',
      prefixeRepereSpecial: '',
      type: 'AUTRE',
      description: '',
      actif: true
    });
  };

  const handleDelete = async (id: string, nom: string) => {
    if (confirm(`Confirmez-vous la suppression de la codification pour "${nom}" ?`)) {
      await onDeleteCodification(id);
    }
  };

  const handleResetFactory = async () => {
    if (confirm('Voulez-vous réinitialiser les codifications avec la configuration standard d\'usine ?')) {
      await onSaveCodifications(INITIAL_CLIENT_CODIFICATIONS);
    }
  };

  const simulatedRepere = genererRepereCaissonSousFace({
    donneurOrdreNom: testAgence,
    nomClientFinal: testClientNom,
    indexLigne: 1,
    codifications
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                ⚙️ Table de Codification des Clients &amp; Préfixes
                <span className="text-xs bg-slate-800 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  {codifications.length} agences / donneurs
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gérez les préfixes de commande (N°) et les règles de génération automatique des repères Caissons &amp; Sous-Faces.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFactory}
              title="Restaurer les valeurs standard d'usine"
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Défauts usine</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Banner: Explications claires des règles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Hash className="w-4 h-4" />
                <span>1. Préfixe Numéro de Commande</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Inséré automatiquement lors de la sélection du Donneur d&apos;Ordre pour alléger la saisie.
                <br />
                Ex: <code className="text-amber-300 font-mono">O-</code> (CRISTAL Oran), <code className="text-sky-300 font-mono">SA-</code> (SOMODAL Alger), <code className="text-amber-300 font-mono">AO-</code> (ATELIER Oran).
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                <span>2. Repères Caisson &amp; Sous-Face Automatiques</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Reprend le préfixe + 1ère lettre du nom du client (ex: <code className="text-emerald-300 font-mono">SAF1</code> pour Somodal Alger + FARID).
                En cas de doublon/collision dans la semaine, ajoute la 2ème lettre (<code className="text-emerald-300 font-mono">SAFA1</code>).
                <br />
                Règles spéciales : CRISTAL Alger = <code className="text-purple-300 font-mono">C</code>, CRISTAL Constantine = <code className="text-purple-300 font-mono">D</code>.
              </p>
            </div>
          </div>

          {/* Testeur / Simulateur en temps réel */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-4 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">Simulateur de Repère en Temps Réel</div>
                <div className="text-[11px] text-slate-400">Vérifiez le calcul automatique du repère selon le client saisi</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Agence</label>
                <select
                  value={testAgence}
                  onChange={(e) => setTestAgence(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  {codifications.map(c => (
                    <option key={c.id} value={c.nom}>{c.nom} ({c.prefixeCommande})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Nom du Client Final</label>
                <input
                  type="text"
                  value={testClientNom}
                  onChange={(e) => setTestClientNom(e.target.value)}
                  placeholder="ex: FARID, MCB..."
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:border-amber-500 focus:outline-none w-36"
                />
              </div>

              <div className="bg-slate-950 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-center">
                <div className="text-[9px] text-slate-400 uppercase font-semibold">Repère Généré</div>
                <div className="text-sm font-mono font-black text-emerald-400 tracking-wider">
                  {simulatedRepere}
                </div>
              </div>
            </div>
          </div>

          {/* Tableau CRUD des Agences et Codifications */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Liste des Agences &amp; Règles de Codification
              </span>
              {!isAddingNew && (
                <button
                  onClick={() => {
                    setIsAddingNew(true);
                    setEditingId(null);
                  }}
                  className="px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une Agence</span>
                </button>
              )}
            </div>

            {/* Formulaire d'ajout d'une nouvelle agence */}
            {isAddingNew && (
              <div className="p-4 bg-slate-900/90 border-b border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Nouvelle Codification Client / Agence</span>
                  </div>
                  <button
                    onClick={() => setIsAddingNew(false)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Annuler
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nom de l&apos;Agence / Donneur *</label>
                    <input
                      type="text"
                      placeholder="ex: SOMODAL Annaba"
                      value={newForm.nom || ''}
                      onChange={(e) => setNewForm({ ...newForm, nom: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Préfixe N° Commande *</label>
                    <input
                      type="text"
                      placeholder="ex: SANN-, SA-, O-"
                      value={newForm.prefixeCommande || ''}
                      onChange={(e) => setNewForm({ ...newForm, prefixeCommande: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono uppercase focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Préfixe Spécial Repère (Optionnel)</label>
                    <input
                      type="text"
                      placeholder="ex: C, D (laisser vide pour auto)"
                      value={newForm.prefixeRepereSpecial || ''}
                      onChange={(e) => setNewForm({ ...newForm, prefixeRepereSpecial: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono uppercase focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Type de Réseau</label>
                    <select
                      value={newForm.type || 'AUTRE'}
                      onChange={(e) => setNewForm({ ...newForm, type: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="SOMADAL">SOMODAL (Menuisiers / Pro)</option>
                      <option value="CRISTAL">CRISTAL (Showroom Particuliers)</option>
                      <option value="ATELIER">ATELIER (Sous-traitance)</option>
                      <option value="AUTRE">AUTRE (Client Direct)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsAddingNew(false)}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddNew}
                    className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition flex items-center gap-1.5 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enregistrer la Nouvelle Agence</span>
                  </button>
                </div>
              </div>
            )}

            {/* Table list */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold">
                    <th className="px-4 py-3">Agence / Donneur d&apos;Ordre</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-center">Préfixe Commande</th>
                    <th className="px-4 py-3 text-center">Préfixe Repère</th>
                    <th className="px-4 py-3 text-center">Exemple Repère (Client F)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {codifications.map((c) => {
                    const isEditing = editingId === c.id;

                    const exRepere = genererRepereCaissonSousFace({
                      donneurOrdreNom: c.nom,
                      nomClientFinal: 'FARID',
                      indexLigne: 1,
                      codifications
                    });

                    if (isEditing) {
                      return (
                        <tr key={c.id} className="bg-amber-950/20 border-l-2 border-amber-500">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.nom || ''}
                              onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editForm.type || 'AUTRE'}
                              onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                            >
                              <option value="SOMADAL">SOMODAL</option>
                              <option value="CRISTAL">CRISTAL</option>
                              <option value="ATELIER">ATELIER</option>
                              <option value="AUTRE">AUTRE</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="text"
                              value={editForm.prefixeCommande || ''}
                              onChange={(e) => setEditForm({ ...editForm, prefixeCommande: e.target.value })}
                              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono text-center uppercase"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="text"
                              placeholder="Auto"
                              value={editForm.prefixeRepereSpecial || ''}
                              onChange={(e) => setEditForm({ ...editForm, prefixeRepereSpecial: e.target.value })}
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono text-center uppercase"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-mono text-slate-400">En cours...</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={handleSaveEdit}
                                title="Valider les modifications"
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                title="Annuler"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={c.id} className="hover:bg-slate-900/60 transition">
                        <td className="px-4 py-3 font-medium text-slate-100">
                          <div className="flex items-center gap-2">
                            <span>{c.nom}</span>
                            {c.description && (
                              <span className="text-[10px] text-slate-400 hidden sm:inline">({c.description})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            c.type === 'CRISTAL' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                            c.type === 'SOMADAL' ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' :
                            c.type === 'ATELIER' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {c.prefixeCommande}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-mono text-slate-300">
                            {c.prefixeRepereSpecial ? (
                              <span className="text-purple-300 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/30">
                                {c.prefixeRepereSpecial}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Auto ({c.prefixeCommande.replace(/[^A-Z0-9]/gi, '')})</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                            {exRepere}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEdit(c)}
                              title="Modifier cette règle"
                              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.nom)}
                              title="Supprimer"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Toutes les modifications sont enregistrées directement dans SQLite (3m_atelier.db)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition shadow"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
