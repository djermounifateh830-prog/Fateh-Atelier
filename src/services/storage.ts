import * as XLSX from 'xlsx';
import {
  Article,
  ChuteItem,
  ChuteMaille,
  MappingChutes,
  DossierCommandeGlobal,
  SuiviOF,
  MouvementStock,
  ClientCodification
} from '../types';
import {
  INITIAL_ARTICLES,
  INITIAL_CHUTES_STOCK,
  INITIAL_MAILLE_CHUTES,
  INITIAL_MAPPING
} from '../data/initialData';
import { INITIAL_CLIENT_CODIFICATIONS } from '../data/initialCodifications';
import { logger } from './logger';


// =========================================================================
// SQLite est l'unique source de vérité.
// Traçabilité complète de toutes les opérations via SystemLogger.
// =========================================================================

export class StorageService {
  private static async request(url: string, init?: RequestInit): Promise<Response> {
    const startTime = performance.now();
    try {
      const response = await fetch(url, init);
      const elapsedMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        let message = `Erreur HTTP ${response.status}`;
        let details: any = null;
        try {
          const body = await response.json();
          if (body?.error) message = body.error;
          details = body;
        } catch {
          // Non JSON
        }
        logger.error('SQLite', `Échec requête [${init?.method || 'GET'}] ${url} (${response.status}) en ${elapsedMs}ms`, {
          status: response.status,
          message,
          details
        });
        throw new Error(message);
      }
      return response;
    } catch (err: any) {
      const elapsedMs = Math.round(performance.now() - startTime);
      if (!err.message?.startsWith('Erreur HTTP')) {
        logger.error('Network', `Erreur réseau ou timeout sur [${init?.method || 'GET'}] ${url} en ${elapsedMs}ms`, {
          error: err.message || String(err)
        });
      }
      throw err;
    }
  }

  // =========================================================================
  // INITIALISATION : Charge TOUT depuis SQLite
  // =========================================================================

  static async initSqlite(): Promise<{
    articles: Article[];
    chutesBarres: Record<string, ChuteItem[]>;
    chutesMaille: ChuteMaille[];
    mapping: MappingChutes;
    dossiers: DossierCommandeGlobal[];
    suivisOF: SuiviOF[];
    mouvements: MouvementStock[];
    clientCodifications: ClientCodification[];
  }> {
    try {
      const startTime = performance.now();
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const elapsedMs = Math.round(performance.now() - startTime);
          console.log('📦 [SQLite] Connecté — Source unique de vérité.');
          logger.sqlite('Init DB', `Connecté en ${elapsedMs}ms — ${d.articles?.length || 0} articles, ${Object.keys(d.chutesBarres || {}).length} familles de chutes, ${d.dossiers?.length || 0} dossiers, ${d.suivisOF?.length || 0} suivis OF, ${d.clientCodifications?.length || 0} codifications clients.`, {
            articlesCount: d.articles?.length || 0,
            chutesFamiliesCount: Object.keys(d.chutesBarres || {}).length,
            dossiersCount: d.dossiers?.length || 0,
            suivisOFCount: d.suivisOF?.length || 0,
            mouvementsCount: d.mouvements?.length || 0,
            codificationsCount: d.clientCodifications?.length || 0
          });

          return {
            articles: Array.isArray(d.articles) ? d.articles : [],
            chutesBarres: (d.chutesBarres && typeof d.chutesBarres === 'object') ? d.chutesBarres : {},
            chutesMaille: Array.isArray(d.chutesMaille) ? d.chutesMaille : [],
            mapping: (d.mapping && typeof d.mapping === 'object') ? d.mapping : {},
            dossiers: Array.isArray(d.dossiers) ? d.dossiers : [],
            suivisOF: Array.isArray(d.suivisOF) ? d.suivisOF : [],
            mouvements: Array.isArray(d.mouvements) ? d.mouvements : [],
            clientCodifications: Array.isArray(d.clientCodifications) && d.clientCodifications.length > 0 ? d.clientCodifications : INITIAL_CLIENT_CODIFICATIONS
          };
        }
      }
    } catch (err: any) {
      console.error('[StorageService] Erreur connexion SQLite:', err);
      logger.warn('Init DB', 'Serveur SQLite non joignable ou en attente d\'initialisation.', { error: err.message });
    }
    return {
      articles: INITIAL_ARTICLES,
      chutesBarres: INITIAL_CHUTES_STOCK,
      chutesMaille: INITIAL_MAILLE_CHUTES,
      mapping: INITIAL_MAPPING,
      dossiers: [],
      suivisOF: [],
      mouvements: [],
      clientCodifications: INITIAL_CLIENT_CODIFICATIONS
    };
  }


  static downloadSqliteDb(): void {
    logger.action('SQLite', 'Téléchargement de la base SQLite 3m_atelier.db demandé par l\'utilisateur.');
    window.open('/api/db/download', '_blank');
  }

  // =========================================================================
  // DOSSIERS
  // =========================================================================

  static async saveDossiers(dossiers: DossierCommandeGlobal[]): Promise<void> {
    try {
      await this.request('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dossiers)
      });
      logger.sqlite('Dossiers', `${dossiers.length} dossier(s) sauvegardé(s) en SQLite.`, {
        count: dossiers.length,
        dossierRefs: dossiers.slice(0, 5).map(d => d.refCommande)
      });
    } catch (e: any) {
      console.error('Erreur sauvegarde dossiers:', e);
      logger.error('Dossiers', 'Erreur lors de la sauvegarde globale des dossiers en SQLite.', { error: e.message });
      throw e;
    }
  }

  // =========================================================================
  // ARTICLES
  // =========================================================================

  static async saveArticles(articles: Article[]): Promise<void> {
    try {
      await this.request('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articles)
      });
      logger.sqlite('Articles', `${articles.length} article(s) sauvegardé(s) en SQLite.`, {
        count: articles.length
      });
    } catch (e: any) {
      console.error('Erreur sauvegarde articles:', e);
      logger.error('Articles', 'Erreur lors de la sauvegarde des articles en SQLite.', { error: e.message });
      throw e;
    }
  }

  // =========================================================================
  // CHUTES BARRES
  // =========================================================================

  static async saveChutesBarres(chutes: Record<string, ChuteItem[]>): Promise<void> {
    try {
      await this.request('/api/chutes/barres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chutes)
      });
      const totalPieces = Object.values(chutes).reduce((acc, list) => acc + list.reduce((s, c) => s + (c.quantite || 0), 0), 0);
      logger.sqlite('Chutes Barres', `${Object.keys(chutes).length} familles de chutes sauvegardées (${totalPieces} pièces au total).`, {
        famillesCount: Object.keys(chutes).length,
        totalPieces
      });
    } catch (e: any) {
      console.error('Erreur sauvegarde chutes barres:', e);
      logger.error('Chutes Barres', 'Erreur lors de la sauvegarde des chutes barres.', { error: e.message });
      throw e;
    }
  }

  static async saveChutesMaille(chutes: ChuteMaille[]): Promise<void> {
    try {
      await this.request('/api/chutes/maille', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chutes)
      });
      const totalPlis = chutes.reduce((acc, c) => acc + (c.plis || 0), 0);
      logger.sqlite('Chutes Maille', `${chutes.length} références de chutes maille sauvegardées (${totalPlis} plis).`, {
        count: chutes.length,
        totalPlis
      });
    } catch (e: any) {
      console.error('Erreur sauvegarde chutes maille:', e);
      logger.error('Chutes Maille', 'Erreur lors de la sauvegarde des chutes maille.', { error: e.message });
      throw e;
    }
  }

  // =========================================================================
  // MAPPING
  // =========================================================================

  static async saveMapping(mapping: MappingChutes): Promise<void> {
    try {
      await this.request('/api/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping)
      });
      logger.sqlite('Mapping', `Mapping articles/chutes mis à jour (${Object.keys(mapping).length} correspondances).`);
    } catch (e: any) {
      console.error('Erreur sauvegarde mapping:', e);
      logger.error('Mapping', 'Erreur lors de la sauvegarde du mapping articles/chutes.', { error: e.message });
      throw e;
    }
  }

  static async clearAllMappings(): Promise<void> {
    try {
      await this.request('/api/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      logger.sqlite('Mapping', 'Tous les mappings articles/chutes ont été déliés.');
    } catch (e: any) {
      console.error('Erreur clear mapping:', e);
      logger.error('Mapping', 'Erreur lors de la suppression des mappings.', { error: e.message });
      throw e;
    }
  }

  // =========================================================================
  // CRÉER / RENOMMER / SUPPRIMER UNE FAMILLE DE CHUTES
  // =========================================================================

  static async createChuteFamily(
    name: string,
    currentChutesBarres: Record<string, ChuteItem[]>
  ): Promise<Record<string, ChuteItem[]> | null> {
    const clean = name.trim();
    if (!clean) return null;
    if (currentChutesBarres[clean] !== undefined) return null;

    const newChutesBarres = { ...currentChutesBarres, [clean]: [] };

    try {
      await this.request('/api/chutes/create-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean })
      });
      logger.sqlite('Chutes', `Nouvelle famille de chutes créée : "${clean}".`);
    } catch (e: any) {
      console.error('Erreur create chute family:', e);
      logger.error('Chutes', `Erreur création famille de chutes "${clean}".`, { error: e.message });
      throw e;
    }
    return newChutesBarres;
  }

  static async wipeDatabase(): Promise<void> {
    try {
      await this.request('/api/db/wipe', { method: 'POST' });
      logger.warn('Wipe DB', 'Base SQLite 3m_atelier.db complètement purgée.');
    } catch (e: any) {
      console.error('Erreur API wipe:', e);
      logger.error('Wipe DB', 'Erreur lors du vidage de la base SQLite.', { error: e.message });
      throw e;
    }
  }

  static async resetAllToFactory(): Promise<void> {
    try {
      await this.request('/api/sync/initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: INITIAL_ARTICLES,
          chutesBarres: INITIAL_CHUTES_STOCK,
          chutesMaille: INITIAL_MAILLE_CHUTES,
          mapping: INITIAL_MAPPING,
          dossiers: [],
          suivisOF: [],
          mouvements: []
        })
      });
      logger.sqlite('Réinit. Usine', "Base SQLite réinitialisée avec les paramètres d'usine complets.");
    } catch (e: any) {
      console.error('Erreur resetAllToFactory:', e);
      logger.error('Réinit. Usine', "Erreur lors de la réinitialisation usine.", { error: e.message });
      throw e;
    }
  }

  // =========================================================================
  // RENOMMER / SUPPRIMER UN ONGLET DE CHUTES
  // =========================================================================

  static async renameChuteSheet(
    oldName: string,
    newName: string,
    currentChutesBarres: Record<string, ChuteItem[]>,
    currentMapping: MappingChutes
  ): Promise<{ chutesBarres: Record<string, ChuteItem[]>; mapping: MappingChutes } | null> {
    const cleanNew = newName.trim();
    if (!cleanNew || cleanNew === oldName) return null;
    if (currentChutesBarres[cleanNew]) return null;
    if (currentChutesBarres[oldName] === undefined) return null;

    const newChutesBarres = { ...currentChutesBarres };
    newChutesBarres[cleanNew] = newChutesBarres[oldName];
    delete newChutesBarres[oldName];

    const newMapping = { ...currentMapping };
    Object.keys(newMapping).forEach(code => {
      if (newMapping[code] === oldName) newMapping[code] = cleanNew;
    });

    try {
      await this.request('/api/chutes/rename-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: cleanNew })
      });
      logger.sqlite('Chutes', `Onglet de chutes renommé : "${oldName}" ➔ "${cleanNew}".`);
    } catch (e: any) {
      console.error('Erreur rename sheet:', e);
      logger.error('Chutes', `Erreur renommage onglet de chutes "${oldName}".`, { error: e.message });
      throw e;
    }
    return { chutesBarres: newChutesBarres, mapping: newMapping };
  }

  static async deleteChuteSheet(
    sheetName: string,
    currentChutesBarres: Record<string, ChuteItem[]>,
    currentMapping: MappingChutes
  ): Promise<{ chutesBarres: Record<string, ChuteItem[]>; mapping: MappingChutes } | null> {
    if (sheetName === 'MAILLE MSTQ') return null;
    if (currentChutesBarres[sheetName] === undefined) return null;

    const newChutesBarres = { ...currentChutesBarres };
    delete newChutesBarres[sheetName];

    const newMapping = { ...currentMapping };
    Object.keys(newMapping).forEach(code => {
      if (newMapping[code] === sheetName) delete newMapping[code];
    });

    try {
      await this.request(`/api/chutes/sheet/${encodeURIComponent(sheetName)}`, { method: 'DELETE' });
      logger.sqlite('Chutes', `Onglet de chutes "${sheetName}" supprimé de SQLite.`);
    } catch (e: any) {
      console.error('Erreur delete sheet:', e);
      logger.error('Chutes', `Erreur suppression onglet de chutes "${sheetName}".`, { error: e.message });
      throw e;
    }
    return { chutesBarres: newChutesBarres, mapping: newMapping };
  }

  // =========================================================================
  // EXPORT TO EXCEL
  // =========================================================================

  static exportArticlesExcel(articles: Article[]): void {
    logger.action('Export Excel', `Export du catalogue de ${articles.length} articles vers Excel.`);
    const ws = XLSX.utils.json_to_sheet(articles);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Articles');
    XLSX.writeFile(wb, 'articles_stock.xlsx');
  }

  static exportChutesExcel(chutesBarres: Record<string, ChuteItem[]>, chutesMaille: ChuteMaille[]): void {
    logger.action('Export Excel', `Export des chutes (${Object.keys(chutesBarres).length} familles barres + maille) vers Excel.`);
    const wb = XLSX.utils.book_new();
    const wsMaille = XLSX.utils.json_to_sheet(chutesMaille);
    XLSX.utils.book_append_sheet(wb, wsMaille, 'MAILLE MSTQ');
    for (const [sheetName, items] of Object.entries(chutesBarres)) {
      if (sheetName === 'MAILLE MSTQ') continue;
      const rows = items.map(c => ({ Longueur: c.longueur, Quantite: c.quantite }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    XLSX.writeFile(wb, 'stok_chutes.xlsx');
  }

  // =========================================================================
  // IMPORT FROM EXCEL
  // =========================================================================

  static async parseArticlesExcelFile(file: File): Promise<Article[]> {
    logger.action('Import Excel', `Lecture du fichier Excel articles : "${file.name}" (${file.size} octets).`);
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<any>(ws);

    const articles: Article[] = [];
    for (const row of rawRows) {
      const code = String(row.code_art || row.Code_Art || row.CODE_ART || row.Code || row.CODE || '').trim();
      if (!code) continue;
      articles.push({
        code_art: code,
        designation: String(row.designation || row.Designation || row.DESIGNATION || row.Libelle || code).trim(),
        statut: String(row.statut || row.Statut || 'NORMAL').trim(),
        hauteur: Number(row.hauteur || 0),
        longeur: Number(row.longeur || row.longueur || row.Longueur || 6000),
        lame: Number(row.lame || 4.5),
        debordement: Number(row.debordement || 0),
        refus_min: Number(row.refus_min || 300),
        refus_max: Number(row.refus_max || 1200),
        stock_physique: Number(row.stock_physique || row.Stock || 0),
        quantite_reservee: Number(row.quantite_reservee || 0),
        prix_unitaire: Number(row.prix_unitaire || row.Prix || 0),
        stock_min: Number(row.stock_min || 5)
      });
    }
    logger.info('Import Excel', `${articles.length} articles extraits avec succès du fichier "${file.name}".`);
    return articles;
  }

  static async importArticlesFromExcelFile(file: File): Promise<Article[]> {
    const articles = await this.parseArticlesExcelFile(file);
    if (articles.length > 0) await this.saveArticles(articles);
    return articles;
  }

  static async parseChutesExcelFile(file: File): Promise<{
    chutesBarres: Record<string, ChuteItem[]>;
    chutesMaille: ChuteMaille[];
    sheetNames: string[];
  }> {
    logger.action('Import Excel', `Lecture du fichier Excel chutes : "${file.name}" (${file.size} octets).`);
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const chutesBarres: Record<string, ChuteItem[]> = {};
    let chutesMaille: ChuteMaille[] = [];

    const extractNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return NaN;
      if (typeof val === 'number') return val;
      const str = String(val).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
      return parseFloat(str);
    };

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rowsAsObjects = XLSX.utils.sheet_to_json<any>(ws, { defval: null });
      const rowsRaw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

      if (sheetName.toUpperCase() === 'MAILLE MSTQ') {
        const mailleList: ChuteMaille[] = [];
        let idCounter = 1;
        for (const row of rowsAsObjects) {
          const vals = Object.values(row).map(v => extractNumber(v)).filter(n => !isNaN(n) && n > 0);
          if (vals.length >= 2) mailleList.push({ id: `m-imp-${idCounter++}`, dimension_fixe: vals[0], plis: Math.round(vals[1]) });
          else if (vals.length === 1) mailleList.push({ id: `m-imp-${idCounter++}`, dimension_fixe: vals[0], plis: 1 });
        }
        if (mailleList.length === 0) {
          for (const row of rowsRaw.slice(1)) {
            if (!row || !Array.isArray(row)) continue;
            const numbers = row.map(extractNumber).filter(n => !isNaN(n) && n > 0);
            if (numbers.length >= 2) mailleList.push({ id: `m-imp-${idCounter++}`, dimension_fixe: numbers[0], plis: Math.round(numbers[1]) });
          }
        }
        chutesMaille = mailleList;
      } else {
        const itemsList: ChuteItem[] = [];
        let idCounter = 1;
        for (const row of rowsAsObjects) {
          const vals = Object.values(row).map(v => extractNumber(v)).filter(n => !isNaN(n) && n > 0);
          if (vals.length >= 2) {
            const sorted = [...vals].sort((a, b) => b - a);
            if (sorted[0] > 0 && sorted[sorted.length - 1] > 0)
              itemsList.push({ id: `c-imp-${idCounter++}`, longueur: sorted[0], quantite: Math.round(sorted[sorted.length - 1]) });
          } else if (vals.length === 1 && vals[0] > 0) {
            itemsList.push({ id: `c-imp-${idCounter++}`, longueur: vals[0], quantite: 1 });
          }
        }
        if (itemsList.length === 0) {
          for (const row of rowsRaw.slice(1)) {
            if (!row || !Array.isArray(row)) continue;
            const numbers = row.map(extractNumber).filter(n => !isNaN(n) && n > 0);
            if (numbers.length >= 2) {
              const sorted = [...numbers].sort((a, b) => b - a);
              itemsList.push({ id: `c-imp-${idCounter++}`, longueur: sorted[0], quantite: Math.round(sorted[sorted.length - 1]) });
            } else if (numbers.length === 1) {
              itemsList.push({ id: `c-imp-${idCounter++}`, longueur: numbers[0], quantite: 1 });
            }
          }
        }
        chutesBarres[sheetName] = itemsList;
      }
    }
    logger.info('Import Excel', `Extraction terminée : ${Object.keys(chutesBarres).length} feuilles barres, ${chutesMaille.length} chutes maille.`);
    return { chutesBarres, chutesMaille, sheetNames: wb.SheetNames };
  }

  static async importChutesFromExcelFile(file: File): Promise<{
    chutesBarres: Record<string, ChuteItem[]>;
    chutesMaille: ChuteMaille[];
  }> {
    const res = await this.parseChutesExcelFile(file);
    if (Object.keys(res.chutesBarres).length > 0) await this.saveChutesBarres(res.chutesBarres);
    if (res.chutesMaille.length > 0) await this.saveChutesMaille(res.chutesMaille);
    return { chutesBarres: res.chutesBarres, chutesMaille: res.chutesMaille };
  }

  // =========================================================================
  // SUIVIS OF
  // =========================================================================

  static async upsertSuiviOF(suivi: SuiviOF): Promise<void> {
    try {
      await this.request('/api/of', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suivi)
      });
      logger.sqlite('Suivi OF', `Ordre de Fabrication N° ${suivi.numCommande} (${suivi.titreSection}) mis à jour (Statut: ${suivi.statut}).`, {
        numCommande: suivi.numCommande,
        statut: suivi.statut,
        famille: suivi.famille,
        titreSection: suivi.titreSection
      });
    } catch (e: any) {
      console.error('Erreur upsert suivi OF:', e);
      logger.error('Suivi OF', `Erreur mise à jour OF ${suivi.numCommande}.`, { error: e.message });
      throw e;
    }
  }

  static async closeOF(suivi: SuiviOF, mouvements: MouvementStock[]): Promise<void> {
    try {
      await this.request('/api/of/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suivi, mouvements })
      });
      logger.sqlite('Clôture OF', `OF N° ${suivi.numCommande} clôturé avec succès (${mouvements.length} mouvements de stock confirmés).`, {
        numCommande: suivi.numCommande,
        mouvementsCount: mouvements.length
      });
    } catch (e: any) {
      console.error('Erreur clôture OF:', e);
      logger.error('Clôture OF', `Erreur clôture OF N° ${suivi.numCommande}.`, { error: e.message });
      throw e;
    }
  }

  static async deleteSuiviOF(id: string): Promise<void> {
    try {
      await this.request(`/api/of/${encodeURIComponent(id)}`, { method: 'DELETE' });
      logger.sqlite('Suivi OF', `OF ID ${id} supprimé de SQLite.`);
    } catch (e: any) {
      console.error('Erreur suppression suivi OF:', e);
      logger.error('Suivi OF', `Erreur suppression OF ID ${id}.`, { error: e.message });
      throw e;
    }
  }

  // =========================================================================
  // MOUVEMENTS DE STOCK
  // =========================================================================

  static async addMouvement(mvt: MouvementStock): Promise<void> {
    try {
      await this.request('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mvt)
      });
      logger.sqlite('Mouvement Stock', `Mouvement ${mvt.type} sur ${mvt.articleCode || mvt.designation || 'Article'} (${mvt.quantite || 1} u / ${mvt.longueurMm || 0}mm).`);
    } catch (e: any) {
      console.error('Erreur ajout mouvement:', e);
      logger.error('Mouvement Stock', `Erreur enregistrement mouvement sur ${mvt.articleCode || 'Article'}.`, { error: e.message });
      throw e;
    }
  }

  static async addMouvements(mvts: MouvementStock[]): Promise<void> {
    try {
      await this.request('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mvts)
      });
      logger.sqlite('Mouvements Stock', `${mvts.length} mouvement(s) de stock enregistrés en lot.`);
    } catch (e: any) {
      console.error('Erreur ajout mouvements:', e);
      logger.error('Mouvements Stock', `Erreur enregistrement mouvements de stock.`, { error: e.message });
      throw e;
    }
  }

  // =========================================================================
  // CODIFICATIONS CLIENTS & PRÉFIXES
  // =========================================================================

  static async getClientCodifications(): Promise<ClientCodification[]> {
    try {
      const res = await this.request('/api/codifications');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    } catch (e: any) {
      console.error('Erreur chargement codifications clients:', e);
    }
    return INITIAL_CLIENT_CODIFICATIONS;
  }

  static async saveClientCodifications(codifs: ClientCodification[]): Promise<void> {
    try {
      await this.request('/api/codifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codifs)
      });
      logger.sqlite('Codification Clients', `${codifs.length} codifications clients enregistrées dans SQLite.`);
    } catch (e: any) {
      console.error('Erreur sauvegarde codifications clients:', e);
      logger.error('Codification Clients', `Erreur sauvegarde codifications clients.`, { error: e.message });
      throw e;
    }
  }

  static async upsertClientCodification(codif: ClientCodification): Promise<void> {
    try {
      await this.request('/api/codifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codif)
      });
      logger.sqlite('Codification Clients', `Codification "${codif.nom}" (${codif.prefixeCommande}) mise à jour.`);
    } catch (e: any) {
      console.error('Erreur upsert codification client:', e);
      logger.error('Codification Clients', `Erreur mise à jour codification "${codif.nom}".`, { error: e.message });
      throw e;
    }
  }

  static async deleteClientCodification(id: string): Promise<void> {
    try {
      await this.request(`/api/codifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
      logger.sqlite('Codification Clients', `Codification ID ${id} supprimée de SQLite.`);
    } catch (e: any) {
      console.error('Erreur suppression codification client:', e);
      logger.error('Codification Clients', `Erreur suppression codification ID ${id}.`, { error: e.message });
      throw e;
    }
  }
}

