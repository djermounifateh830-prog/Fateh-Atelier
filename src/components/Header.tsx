import React, { useRef, useState } from 'react';
import {
  Scissors,
  Layers,
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Building2,
  FileText,
  HelpCircle,
  Calculator,
  Boxes,
  History,
  Terminal,
  ClipboardCheck
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SystemLogsModal } from './common/SystemLogsModal';
import { Article, ChuteItem, ChuteMaille, SuiviOF } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  articles?: Article[];
  chutesBarres?: Record<string, ChuteItem[]>;
  chutesMaille?: ChuteMaille[];
  suivisOF?: SuiviOF[];
  articlesCount: number;
  chutesSheetsCount: number;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  articles = [],
  chutesBarres = {},
  chutesMaille = [],
  suivisOF = [],
  articlesCount,
  chutesSheetsCount,
  onRefreshData
}) => {
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const articlesFileInputRef = useRef<HTMLInputElement>(null);
  const chutesFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportArticles = () => {
    StorageService.exportArticlesExcel(articles);
  };

  const handleExportChutes = () => {
    StorageService.exportChutesExcel(chutesBarres, chutesMaille);
  };

  const handleImportArticles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await StorageService.importArticlesFromExcelFile(file);
      alert('Articles importés avec succès et enregistrés dans la base SQLite !');
      onRefreshData();
    } catch (err: any) {
      alert('Erreur lors de l\'import des articles: ' + err.message);
    }
    e.target.value = '';
  };

  const handleImportChutes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await StorageService.importChutesFromExcelFile(file);
      alert('Stock de chutes importé avec succès et enregistré dans la base SQLite !');
      onRefreshData();
    } catch (err: any) {
      alert('Erreur lors de l\'import des chutes: ' + err.message);
    }
    e.target.value = '';
  };

  const handleResetFactory = async () => {
    if (confirm('Voulez-vous vraiment réinitialiser toutes les données d\'origine de 3M Atelier dans SQLite ?')) {
      await StorageService.resetAllToFactory();
      onRefreshData();
      alert('Base SQLite réinitialisée aux valeurs initiales d\'usine.');
    }
  };

  const activeOfCount = suivisOF.filter(o => o.statut === 'EMIS' || o.statut === 'RETOUR_EN_ATTENTE').length;

  const tabs = [
    { id: 'ecosysteme', label: '📁 Écosystème & Commandes', icon: Boxes },
    {
      id: 'encours',
      label: '📋 Ordres en Cours (OF)',
      icon: ClipboardCheck,
      badge: activeOfCount > 0 ? activeOfCount : undefined,
      badgeBg: 'bg-blue-600 text-white'
    },
    { id: 'historique', label: '📜 Historique Commandes', icon: History },
    { id: 'stock', label: '📦 Gestion Stock & Chutes', icon: FileSpreadsheet },
    { id: 'devis', label: '💰 Devis & Coûts', icon: Calculator },
    { id: 'documentation', label: '📘 Règles Métier', icon: HelpCircle }
  ];

  return (
    <header className="bg-slate-900 text-white shadow-xl border-b border-slate-800">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-md font-black text-slate-950 text-xl tracking-wider">
            3M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-50">
                3M ATELIER — OPTIMISATION DE DÉCOUPE
              </h1>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs px-2 py-0.5 rounded-full font-semibold">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="text-emerald-400 font-medium">
                {articlesCount} Articles actifs
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-sky-400 font-medium">
                {chutesSheetsCount} Familles de chutes
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setIsLogsModalOpen(true)}
            title="Ouvrir le journal des logs et la traçabilité système"
            className="px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 rounded-lg transition border border-amber-500/40 flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>📜 Logs &amp; Traçabilité</span>
          </button>
        </div>
      </div>

      {/* System Logs Modal */}
      <SystemLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        extraSystemInfo={{
          activeTab,
          articlesActifs: articlesCount,
          famillesChutes: chutesSheetsCount,
          totalArticlesCharges: articles.length,
          chutesFamilles: Object.keys(chutesBarres),
          chutesMailleCount: chutesMaille.length
        }}
      />

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-blue-600 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
