import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { EcosystemeCommandesTab } from './components/tabs/EcosystemeCommandesTab';
import { CaissonSousFaceTab } from './components/tabs/CaissonSousFaceTab';
import { TablierTab } from './components/tabs/TablierTab';
import { PrecadreTab } from './components/tabs/PrecadreTab';
import { MoustiquaireTab } from './components/tabs/MoustiquaireTab';
import { GestionStockTab } from './components/tabs/GestionStockTab';
import { DevisTab } from './components/tabs/DevisTab';
import { DocumentationTab } from './components/tabs/DocumentationTab';
import { HistoriqueTab } from './components/tabs/HistoriqueTab';
import { OrdresEnCoursTab } from './components/tabs/OrdresEnCoursTab';
import { StorageService } from './services/storage';
import { Article, ChuteItem, ChuteMaille, MappingChutes, DossierCommandeGlobal, SuiviOF, MouvementStock } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('ecosysteme');
  const [selectedDossierToLoad, setSelectedDossierToLoad] = useState<DossierCommandeGlobal | null>(null);

  // Application Data States (Pure SQLite — Source Unique de Vérité)
  const [articles, setArticles] = useState<Article[]>([]);
  const [chutesBarres, setChutesBarres] = useState<Record<string, ChuteItem[]>>({});
  const [chutesMaille, setChutesMaille] = useState<ChuteMaille[]>([]);
  const [mapping, setMapping] = useState<MappingChutes>({});
  const [dossiers, setDossiers] = useState<DossierCommandeGlobal[]>([]);
  const [suivisOF, setSuivisOF] = useState<SuiviOF[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Chargement direct depuis SQLite
  const loadData = useCallback(async () => {
    try {
      const data = await StorageService.initSqlite();
      setArticles(data.articles);
      setChutesBarres(data.chutesBarres);
      setChutesMaille(data.chutesMaille);
      setMapping(data.mapping);
      setDossiers(data.dossiers);
      setSuivisOF(data.suivisOF);
      setMouvements(data.mouvements);
    } catch (err) {
      console.error('Erreur chargement SQLite:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-lg font-bold">3M ATELIER — OPTIMISATION DE DÉCOUPE</div>
        <p className="text-xs text-slate-500 mt-1">Connexion à la base de données SQLite 3m_atelier.db...</p>
      </div>
    );
  }

  const chutesSheetsCount = Object.keys(chutesBarres).length + (chutesMaille.length > 0 ? 1 : 0);

  const handleLoadDossierFromHistorique = (dossier: DossierCommandeGlobal) => {
    setSelectedDossierToLoad(dossier);
    setActiveTab('ecosysteme');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        articles={articles}
        chutesBarres={chutesBarres}
        chutesMaille={chutesMaille}
        suivisOF={suivisOF}
        articlesCount={articles.length}
        chutesSheetsCount={chutesSheetsCount}
        onRefreshData={loadData}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'ecosysteme' && (
          <EcosystemeCommandesTab
            articles={articles}
            chutesBarres={chutesBarres}
            chutesMaille={chutesMaille}
            mapping={mapping}
            dossiers={dossiers}
            onDossiersUpdated={loadData}
            onNavigateToTab={(tabId) => setActiveTab(tabId)}
            selectedDossierToLoad={selectedDossierToLoad}
          />
        )}

        {activeTab === 'encours' && (
          <OrdresEnCoursTab
            suivisOF={suivisOF}
            onRefreshData={loadData}
            articles={articles}
            chutesBarres={chutesBarres}
            mapping={mapping}
          />
        )}

        {activeTab === 'tablier' && (
          <TablierTab
            articles={articles}
            chutesBarres={chutesBarres}
            mapping={mapping}
            onStockUpdated={loadData}
          />
        )}

        {activeTab === 'moustiquaire' && (
          <MoustiquaireTab
            articles={articles}
            chutesBarres={chutesBarres}
            chutesMaille={chutesMaille}
            mapping={mapping}
            onStockUpdated={loadData}
          />
        )}

        {activeTab === 'caisson' && (
          <CaissonSousFaceTab
            articles={articles}
            chutesBarres={chutesBarres}
            mapping={mapping}
            onStockUpdated={loadData}
          />
        )}

        {activeTab === 'precadre' && (
          <PrecadreTab
            articles={articles}
            chutesBarres={chutesBarres}
            mapping={mapping}
            onStockUpdated={loadData}
          />
        )}

        {activeTab === 'historique' && (
          <HistoriqueTab
            dossiers={dossiers}
            onLoadDossierInEcosysteme={handleLoadDossierFromHistorique}
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'stock' && (
          <GestionStockTab
            articles={articles}
            chutesBarres={chutesBarres}
            chutesMaille={chutesMaille}
            mapping={mapping}
            suivisOF={suivisOF}
            mouvements={mouvements}
            onStockUpdated={loadData}
          />
        )}

        {activeTab === 'devis' && <DevisTab articles={articles} />}

        {activeTab === 'documentation' && <DocumentationTab />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-2">
          <span>3M Atelier — Système d'Optimisation de Découpe & Gestion de Stock (SQLite 3m_atelier.db)</span>
        </div>
      </footer>
    </div>
  );
}
