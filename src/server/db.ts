import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
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


// Chemin du fichier de base de données physique à la racine du projet
const DB_PATH = path.resolve(process.cwd(), '3m_atelier.db');

class AtelierDatabase {
  private db: DatabaseSync;

  constructor() {
    // Initialisation de la connexion SQLite
    this.db = new DatabaseSync(DB_PATH);
    // Activer le mode WAL (Write-Ahead Logging) pour des performances et une concurrence optimales
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.initTables();
    this.cleanCorruptedDesignations();
    this.seedIfEmpty();
  }

  private cleanCorruptedDesignations() {
    try {
      const cleanups: [string, string][] = [
        ['SF 200 (SOUS-FACE 200MM)', 'SF 200'],
        ['SF 250 (SOUS-FACE 250MM)', 'SF 250'],
        ['SF 300 (SOUS-FACE 300MM)', 'SF 300'],
        ['SF 200 7024 (SOUS-FACE 200MM GRIS)', 'SF 200 7024'],
        ['SF 250 7024 (SOUS-FACE 250MM GRIS)', 'SF 250 7024'],
        ['SF 300 7024 (SOUS-FACE 300MM GRIS)', 'SF 300 7024'],
        ['SF 200 (SOUS-FACE 200MM BLANC)', 'SF 200'],
        ['SF 250 (SOUS-FACE 250MM BLANC)', 'SF 250'],
        ['SF 300 (SOUS-FACE 300MM BLANC)', 'SF 300'],
        ['TBL 43 BL (LAME TABLIER 43MM)', 'TBL 43 BL'],
        ['TAB 55 7024 (LAME TABLIER 55MM GRIS)', 'TAB 55 7024'],
        ['LAME FINALE 43 (LAME DE SEUIL 43MM)', 'LAME FINALE 43'],
        ['LAME FINALE 55 ALU 7024 (LAME DE SEUIL 55MM GRIS)', 'LAME FINALE 55 ALU 7024'],
        ['COULISSE 43 9007 (GRIS METAL)', 'COULISSE 43 9007'],
        ['MSTQ MAILLE PLISSÉE 20mm (TOILE MOUSTIQUAIRE)', 'MSTQ MAILLE PLISSÉE 20mm'],
        ['CADRE MSTQ 7024 (PROFILÉ CADRE MOUSTIQUAIRE)', 'CADRE MSTQ 7024'],
        ['BARRE COULISSE MSTQ 7024 (COULISSE DE TIRAGE MOUSTIQUAIRE)', 'BARRE COULISSE MSTQ 7024'],
        ['BARRE INFERIEURE MSTQ 7024 (BARRE INFÉRIEURE MOUSTIQUAIRE)', 'BARRE INFERIEURE MSTQ 7024'],
        ['PRÉCADRE PRC 43 (PROFILÉ DORMANT 43MM)', 'PRÉCADRE PRC 43'],
        ['PRÉCADRE PRC 55 (PROFILÉ DORMANT 55MM)', 'PRÉCADRE PRC 55'],
        ['BOUCHON PRECADRE 43 (Bouchon 90° Plastique)', 'BOUCHON PRECADRE 43'],
        ['BOUCHON PRECADRE 55 (Bouchon 90° Plastique)', 'BOUCHON PRECADRE 55']
      ];

      this.db.exec('BEGIN TRANSACTION');
      for (const [oldName, newName] of cleanups) {
        this.db.prepare('UPDATE OR IGNORE chute_families SET name = ? WHERE name = ?').run(newName, oldName);
        this.db.prepare('DELETE FROM chute_families WHERE name = ?').run(oldName);
        this.db.prepare('UPDATE chutes_barres SET sheet_name = ? WHERE sheet_name = ?').run(newName, oldName);
        this.db.prepare('UPDATE mapping_chutes SET sheet_name = ? WHERE sheet_name = ?').run(newName, oldName);
        this.db.prepare('UPDATE articles SET designation = ? WHERE designation = ?').run(newName, oldName);
      }
      this.db.exec('COMMIT');
    } catch (e) {
      try { this.db.exec('ROLLBACK'); } catch {}
      console.warn('Designations cleanup warning:', e);
    }
  }

  private initTables() {
    this.db.exec(`
      -- Table Articles
      CREATE TABLE IF NOT EXISTS articles (
        code_art TEXT PRIMARY KEY,
        designation TEXT NOT NULL,
        statut TEXT DEFAULT 'NORMAL',
        hauteur REAL DEFAULT 0,
        longeur REAL DEFAULT 6000,
        lame REAL DEFAULT 4.5,
        debordement REAL DEFAULT 0,
        refus_min REAL DEFAULT 300,
        refus_max REAL DEFAULT 1200,
        stock_physique REAL DEFAULT 0,
        quantite_reservee REAL DEFAULT 0,
        prix_unitaire REAL DEFAULT 0,
        stock_min REAL DEFAULT 5
      );

      -- Table Chutes Barres
      CREATE TABLE IF NOT EXISTS chutes_barres (
        id TEXT PRIMARY KEY,
        sheet_name TEXT NOT NULL,
        longueur REAL NOT NULL,
        quantite INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chutes_sheet ON chutes_barres(sheet_name);

      -- Table Familles de Chutes (pour préserver les familles même avec 0 chutes)
      CREATE TABLE IF NOT EXISTS chute_families (
        name TEXT PRIMARY KEY
      );

      -- Table Chutes Maille
      CREATE TABLE IF NOT EXISTS chutes_maille (
        id TEXT PRIMARY KEY,
        dimension_fixe REAL NOT NULL,
        plis INTEGER NOT NULL
      );

      -- Table Mapping Chutes
      CREATE TABLE IF NOT EXISTS mapping_chutes (
        code_art TEXT PRIMARY KEY,
        sheet_name TEXT NOT NULL
      );

      -- Table Dossiers de Commande
      CREATE TABLE IF NOT EXISTS dossiers (
        id TEXT PRIMARY KEY,
        donneur_ordre TEXT,
        nom_client_final TEXT,
        date_commande TEXT,
        ref_commande TEXT,
        statut TEXT,
        json_data TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Table Suivis Ordres de Fabrication
      CREATE TABLE IF NOT EXISTS suivis_of (
        id TEXT PRIMARY KEY,
        num_commande TEXT NOT NULL,
        nom_client TEXT,
        donneur_ordre TEXT,
        famille TEXT,
        titre_section TEXT,
        statut TEXT NOT NULL,
        date_emission TEXT,
        date_retour TEXT,
        json_data TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Table Mouvements de Stock
      CREATE TABLE IF NOT EXISTS mouvements_stock (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        of_id TEXT,
        num_commande TEXT,
        nom_client TEXT,
        article_code TEXT,
        designation TEXT,
        longueur_mm REAL,
        quantite INTEGER,
        remarque TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_mvt_date ON mouvements_stock(date);

      -- Table Codification Clients & Agences (Préfixes automatiques et Repères)
      CREATE TABLE IF NOT EXISTS client_codifications (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        nom TEXT NOT NULL,
        prefixe_commande TEXT NOT NULL,
        prefixe_repere_special TEXT,
        type TEXT NOT NULL,
        badge_color TEXT,
        badge_bg TEXT,
        description TEXT,
        actif INTEGER NOT NULL DEFAULT 1,
        ordre INTEGER DEFAULT 0
      );

      -- Table Métadonnées Système
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  private seedIfEmpty() {
    // Vérifier si la table des codifications est vide, même si app_meta existe déjà (migration douce)
    const countCodif = (this.db.prepare("SELECT count(*) as c FROM client_codifications").get() as any)?.c || 0;
    if (countCodif === 0) {
      console.log('📦 [SQLite] Ensemencement des codifications clients...');
      this.saveClientCodifications(INITIAL_CLIENT_CODIFICATIONS);
    }

    // Vérifier si la base a déjà été initialisée
    const isInit = (this.db.prepare("SELECT value FROM app_meta WHERE key = 'db_initialized'").get() as any)?.value;
    if (isInit) {
      return; // Ne jamais ré-écraser les choix de l'utilisateur une fois initialisé
    }

    // Première initialisation seulement :
    console.log('📦 [SQLite] Ensemencement initial de la base de données...');
    this.saveArticles(INITIAL_ARTICLES);
    this.saveChutesBarres(INITIAL_CHUTES_STOCK);
    this.saveChutesMaille(INITIAL_MAILLE_CHUTES);
    this.saveMapping(INITIAL_MAPPING);

    this.db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('db_initialized', 'true')").run();
  }


  // ==========================================
  // ARTICLES
  // ==========================================
  getArticles(): Article[] {
    const rows = this.db.prepare('SELECT * FROM articles ORDER BY code_art ASC').all() as any[];
    return rows.map(r => ({
      code_art: r.code_art,
      designation: r.designation,
      statut: r.statut,
      hauteur: Number(r.hauteur),
      longeur: Number(r.longeur),
      lame: Number(r.lame),
      debordement: Number(r.debordement),
      refus_min: Number(r.refus_min),
      refus_max: Number(r.refus_max),
      stock_physique: Number(r.stock_physique),
      quantite_reservee: Number(r.quantite_reservee),
      prix_unitaire: Number(r.prix_unitaire),
      stock_min: Number(r.stock_min)
    }));
  }

  saveArticles(articles: Article[]) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM articles');
      const stmt = this.db.prepare(`
        INSERT INTO articles (
          code_art, designation, statut, hauteur, longeur, lame,
          debordement, refus_min, refus_max, stock_physique,
          quantite_reservee, prix_unitaire, stock_min
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const a of articles) {
        stmt.run(
          a.code_art, a.designation, a.statut || 'NORMAL', a.hauteur || 0,
          a.longeur ?? 6000, a.lame ?? 4.5, a.debordement ?? 0,
          a.refus_min ?? 300, a.refus_max ?? 1200, a.stock_physique ?? 0,
          a.quantite_reservee ?? 0, a.prix_unitaire ?? 0, a.stock_min ?? 5
        );
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  upsertArticle(art: Article) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO articles (
        code_art, designation, statut, hauteur, longeur, lame,
        debordement, refus_min, refus_max, stock_physique,
        quantite_reservee, prix_unitaire, stock_min
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      art.code_art, art.designation, art.statut || 'NORMAL', art.hauteur ?? 0,
      art.longeur ?? 6000, art.lame ?? 4.5, art.debordement ?? 0,
      art.refus_min ?? 300, art.refus_max ?? 1200, art.stock_physique ?? 0,
      art.quantite_reservee ?? 0, art.prix_unitaire ?? 0, art.stock_min ?? 5
    );
  }

  deleteArticle(code: string) {
    this.db.prepare('DELETE FROM articles WHERE code_art = ?').run(code);
  }

  // ==========================================
  // CHUTES BARRES & FAMILLES
  // ==========================================
  getChutesBarres(): Record<string, ChuteItem[]> {
    // 1. Récupérer d'abord toutes les familles enregistrées
    const famRows = this.db.prepare('SELECT name FROM chute_families ORDER BY name ASC').all() as any[];
    const map: Record<string, ChuteItem[]> = {};
    for (const f of famRows) {
      if (f.name) map[f.name] = [];
    }

    // 2. Charger les chutes physiques existantes
    const rows = this.db.prepare('SELECT * FROM chutes_barres ORDER BY longueur DESC').all() as any[];
    for (const r of rows) {
      if (!map[r.sheet_name]) map[r.sheet_name] = [];
      map[r.sheet_name].push({
        id: r.id,
        longueur: Number(r.longueur),
        quantite: Number(r.quantite)
      });
    }
    return map;
  }

  saveChutesBarres(chutesMap: Record<string, ChuteItem[]>) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM chutes_barres');
      
      const insertFam = this.db.prepare('INSERT OR IGNORE INTO chute_families (name) VALUES (?)');
      const stmt = this.db.prepare(`
        INSERT INTO chutes_barres (id, sheet_name, longueur, quantite)
        VALUES (?, ?, ?, ?)
      `);

      let counter = 1;
      for (const [sheetName, items] of Object.entries(chutesMap)) {
        if (!sheetName || sheetName.trim() === '') continue;
        insertFam.run(sheetName.trim());
        for (const item of items) {
          stmt.run(
            item.id || `c-${sheetName}-${counter++}-${item.longueur}`,
            sheetName,
            item.longueur,
            item.quantite
          );
        }
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  createChuteFamily(name: string) {
    const clean = name.trim();
    if (!clean) throw new Error('Nom de famille requis');
    this.db.prepare('INSERT OR IGNORE INTO chute_families (name) VALUES (?)').run(clean);
  }

  renameChuteSheet(oldName: string, newName: string) {
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (!cleanOld || !cleanNew) throw new Error('Ancien et nouveau nom requis');
    
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.prepare('INSERT OR IGNORE INTO chute_families (name) VALUES (?)').run(cleanNew);
      this.db.prepare('UPDATE chutes_barres SET sheet_name = ? WHERE sheet_name = ?').run(cleanNew, cleanOld);
      this.db.prepare('UPDATE mapping_chutes SET sheet_name = ? WHERE sheet_name = ?').run(cleanNew, cleanOld);
      this.db.prepare('DELETE FROM chute_families WHERE name = ?').run(cleanOld);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  deleteChuteSheet(sheetName: string) {
    const clean = sheetName.trim();
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.prepare('DELETE FROM chute_families WHERE name = ?').run(clean);
      this.db.prepare('DELETE FROM chutes_barres WHERE sheet_name = ?').run(clean);
      this.db.prepare('DELETE FROM mapping_chutes WHERE sheet_name = ?').run(clean);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  // ==========================================
  // CHUTES MAILLE
  // ==========================================
  getChutesMaille(): ChuteMaille[] {
    const rows = this.db.prepare('SELECT * FROM chutes_maille ORDER BY dimension_fixe DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      dimension_fixe: Number(r.dimension_fixe),
      plis: Number(r.plis)
    }));
  }

  saveChutesMaille(mailleList: ChuteMaille[]) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM chutes_maille');
      const stmt = this.db.prepare(`
        INSERT INTO chutes_maille (id, dimension_fixe, plis)
        VALUES (?, ?, ?)
      `);
      let counter = 1;
      for (const m of mailleList) {
        stmt.run(
          m.id || `m-${counter++}-${m.dimension_fixe}`,
          m.dimension_fixe,
          m.plis
        );
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  // ==========================================
  // MAPPING
  // ==========================================
  getMapping(): MappingChutes {
    const rows = this.db.prepare('SELECT * FROM mapping_chutes').all() as any[];
    const map: MappingChutes = {};
    for (const r of rows) {
      map[r.code_art] = r.sheet_name;
    }
    return map;
  }

  saveMapping(mapping: MappingChutes) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM mapping_chutes');
      const stmt = this.db.prepare('INSERT INTO mapping_chutes (code_art, sheet_name) VALUES (?, ?)');
      for (const [code, sheet] of Object.entries(mapping || {})) {
        if (code && sheet && String(sheet).trim()) {
          stmt.run(code.trim(), String(sheet).trim());
        }
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  // ==========================================
  // DOSSIERS
  // ==========================================
  getDossiers(): DossierCommandeGlobal[] {
    const rows = this.db.prepare('SELECT json_data FROM dossiers ORDER BY updated_at DESC').all() as any[];
    return rows.map(r => {
      try {
        return JSON.parse(r.json_data);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  saveDossiers(dossiers: DossierCommandeGlobal[]) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM dossiers');
      const stmt = this.db.prepare(`
        INSERT INTO dossiers (
          id, donneur_ordre, nom_client_final, date_commande,
          ref_commande, statut, json_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of dossiers) {
        stmt.run(
          d.id, d.donneurOrdre, d.nomClientFinal, d.dateCommande,
          d.refCommande, d.statut, JSON.stringify(d)
        );
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  upsertDossier(d: DossierCommandeGlobal) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO dossiers (
        id, donneur_ordre, nom_client_final, date_commande,
        ref_commande, statut, json_data, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      d.id, d.donneurOrdre, d.nomClientFinal, d.dateCommande,
      d.refCommande, d.statut, JSON.stringify(d)
    );
  }

  deleteDossier(id: string) {
    this.db.prepare('DELETE FROM dossiers WHERE id = ?').run(id);
  }

  // ==========================================
  // SUIVIS OF
  // ==========================================
  getSuivisOF(): SuiviOF[] {
    const rows = this.db.prepare('SELECT json_data FROM suivis_of ORDER BY updated_at DESC').all() as any[];
    return rows.map(r => {
      try {
        return JSON.parse(r.json_data);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  saveSuivisOF(suivis: SuiviOF[]) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM suivis_of');
      const stmt = this.db.prepare(`
        INSERT INTO suivis_of (
          id, num_commande, nom_client, donneur_ordre,
          famille, titre_section, statut, date_emission, date_retour, json_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of suivis) {
        stmt.run(
          s.id, s.numCommande, s.nomClient, s.donneurOrdre,
          s.famille, s.titreSection, s.statut, s.dateEmission,
          s.dateRetour || null, JSON.stringify(s)
        );
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  upsertSuiviOF(s: SuiviOF) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO suivis_of (
        id, num_commande, nom_client, donneur_ordre,
        famille, titre_section, statut, date_emission, date_retour, json_data, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      s.id, s.numCommande, s.nomClient, s.donneurOrdre,
      s.famille, s.titreSection, s.statut, s.dateEmission,
      s.dateRetour || null, JSON.stringify(s)
    );
  }

  closeOF(s: SuiviOF, mvts: MouvementStock[]) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      const existing = this.db.prepare('SELECT statut FROM suivis_of WHERE id = ?').get(s.id) as { statut?: string } | undefined;
      if (existing?.statut === 'CLOTURE') {
        throw new Error(`L'OF ${s.numCommande} est déjà clôturé`);
      }

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO mouvements_stock (
          id, date, type, of_id, num_commande, nom_client,
          article_code, designation, longueur_mm, quantite, remarque
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of mvts) {
        stmt.run(
          m.id, m.date, m.type, m.ofId || null, m.numCommande || null,
          m.nomClient || null, m.articleCode || null, m.designation || null,
          m.longueurMm || null, m.quantite || null, m.remarque || null
        );
        if (m.type === 'SORTIE_BARRE_NEUVE' && m.articleCode) {
          const quantite = m.quantite || 1;
          this.db.prepare(
            'UPDATE articles SET stock_physique = stock_physique - ? WHERE code_art = ?'
          ).run(quantite, m.articleCode);
        }

        if ((m.type === 'SORTIE_CHUTE' || m.type === 'ENTREE_CHUTE') && m.articleCode && m.longueurMm) {
          const sheet = this.db.prepare('SELECT sheet_name FROM mapping_chutes WHERE code_art = ?').get(m.articleCode) as { sheet_name?: string } | undefined;
          if (sheet?.sheet_name && sheet.sheet_name.toUpperCase() !== 'MAILLE MSTQ') {
            const quantite = m.quantite || 1;
            if (m.type === 'SORTIE_CHUTE') {
              // Trouver la chute la plus proche (tolérance jusqu'à 5mm)
              const matched = this.db.prepare(
                'SELECT rowid, id, quantite FROM chutes_barres WHERE sheet_name = ? AND ABS(longueur - ?) <= 5.0 AND quantite > 0 ORDER BY ABS(longueur - ?) ASC LIMIT 1'
              ).get(sheet.sheet_name, m.longueurMm, m.longueurMm) as { rowid?: number; id?: string; quantite?: number } | undefined;

              if (matched?.rowid) {
                this.db.prepare(
                  'UPDATE chutes_barres SET quantite = quantite - ? WHERE rowid = ?'
                ).run(quantite, matched.rowid);
                this.db.prepare('DELETE FROM chutes_barres WHERE quantite <= 0').run();
              } else {
                // Si aucune chute proche, décrémenter la plus grande disponible de l'onglet
                const fallback = this.db.prepare(
                  'SELECT rowid, quantite FROM chutes_barres WHERE sheet_name = ? AND quantite > 0 ORDER BY ABS(longueur - ?) ASC LIMIT 1'
                ).get(sheet.sheet_name, m.longueurMm) as { rowid?: number; quantite?: number } | undefined;
                if (fallback?.rowid) {
                  this.db.prepare('UPDATE chutes_barres SET quantite = quantite - ? WHERE rowid = ?').run(quantite, fallback.rowid);
                  this.db.prepare('DELETE FROM chutes_barres WHERE quantite <= 0').run();
                }
              }
            } else if (m.type === 'ENTREE_CHUTE' && m.longueurMm > 0) {
              this.db.prepare(
                'INSERT INTO chutes_barres (id, sheet_name, longueur, quantite) VALUES (?, ?, ?, ?)'
              ).run(`cht-${Date.now()}-${Math.floor(Math.random() * 1000)}`, sheet.sheet_name, m.longueurMm, quantite);
            }
          }
        }
      }
      this.upsertSuiviOF(s);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  deleteSuiviOF(id: string) {
    this.db.prepare('DELETE FROM suivis_of WHERE id = ?').run(id);
  }

  // ==========================================
  // MOUVEMENTS DE STOCK
  // ==========================================
  getMouvements(): MouvementStock[] {
    const rows = this.db.prepare('SELECT * FROM mouvements_stock ORDER BY rowid DESC LIMIT 1000').all() as any[];
    return rows.map(r => ({
      id: r.id,
      date: r.date,
      type: r.type,
      ofId: r.of_id || undefined,
      numCommande: r.num_commande || undefined,
      nomClient: r.nom_client || undefined,
      articleCode: r.article_code || undefined,
      designation: r.designation || undefined,
      longueurMm: r.longueur_mm ? Number(r.longueur_mm) : undefined,
      quantite: r.quantite ? Number(r.quantite) : undefined,
      remarque: r.remarque || undefined
    }));
  }

  addMouvement(m: MouvementStock) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO mouvements_stock (
        id, date, type, of_id, num_commande, nom_client,
        article_code, designation, longueur_mm, quantite, remarque
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      m.id, m.date, m.type, m.ofId || null, m.numCommande || null,
      m.nomClient || null, m.articleCode || null, m.designation || null,
      m.longueurMm || null, m.quantite || null, m.remarque || null
    );
  }

  addMouvements(mvts: MouvementStock[]) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO mouvements_stock (
          id, date, type, of_id, num_commande, nom_client,
          article_code, designation, longueur_mm, quantite, remarque
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of mvts) {
        stmt.run(
          m.id, m.date, m.type, m.ofId || null, m.numCommande || null,
          m.nomClient || null, m.articleCode || null, m.designation || null,
          m.longueurMm || null, m.quantite || null, m.remarque || null
        );
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  // ==========================================
  // CODIFICATIONS CLIENTS
  // ==========================================
  getClientCodifications(): ClientCodification[] {
    const rows = this.db.prepare('SELECT * FROM client_codifications ORDER BY ordre ASC, nom ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      code: r.code,
      nom: r.nom,
      prefixeCommande: r.prefixe_commande,
      prefixeRepereSpecial: r.prefixe_repere_special || undefined,
      type: r.type,
      badgeColor: r.badge_color || undefined,
      badgeBg: r.badge_bg || undefined,
      description: r.description || undefined,
      actif: Boolean(r.actif),
      ordre: Number(r.ordre || 0)
    }));
  }

  saveClientCodifications(codifs: ClientCodification[]) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM client_codifications');
      const stmt = this.db.prepare(`
        INSERT INTO client_codifications (
          id, code, nom, prefixe_commande, prefixe_repere_special,
          type, badge_color, badge_bg, description, actif, ordre
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of codifs) {
        stmt.run(
          c.id, c.code, c.nom, c.prefixeCommande, c.prefixeRepereSpecial || null,
          c.type, c.badgeColor || null, c.badgeBg || null, c.description || null,
          c.actif ? 1 : 0, c.ordre || 0
        );
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  upsertClientCodification(c: ClientCodification) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO client_codifications (
        id, code, nom, prefixe_commande, prefixe_repere_special,
        type, badge_color, badge_bg, description, actif, ordre
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      c.id, c.code, c.nom, c.prefixeCommande, c.prefixeRepereSpecial || null,
      c.type, c.badgeColor || null, c.badgeBg || null, c.description || null,
      c.actif ? 1 : 0, c.ordre || 0
    );
  }

  deleteClientCodification(id: string) {
    this.db.prepare('DELETE FROM client_codifications WHERE id = ?').run(id);
  }

  // ==========================================
  // SYNC / MIGRATION TOTALE INITIALE
  // ==========================================
  fullSyncFromFrontend(data: {
    articles?: Article[];
    chutesBarres?: Record<string, ChuteItem[]>;
    chutesMaille?: ChuteMaille[];
    mapping?: MappingChutes;
    dossiers?: DossierCommandeGlobal[];
    suivisOF?: SuiviOF[];
    mouvements?: MouvementStock[];
    clientCodifications?: ClientCodification[];
  }) {
    if (data.articles !== undefined) this.saveArticles(data.articles);
    if (data.chutesBarres !== undefined) this.saveChutesBarres(data.chutesBarres);
    if (data.chutesMaille !== undefined) this.saveChutesMaille(data.chutesMaille);
    if (data.mapping !== undefined) this.saveMapping(data.mapping);
    if (data.dossiers !== undefined) this.saveDossiers(data.dossiers);
    if (data.suivisOF !== undefined) this.saveSuivisOF(data.suivisOF);
    if (data.clientCodifications !== undefined) this.saveClientCodifications(data.clientCodifications);
    if (data.mouvements !== undefined) {
      this.db.exec('DELETE FROM mouvements_stock');
      if (data.mouvements.length > 0) this.addMouvements(data.mouvements);
    }
  }

  getAllData() {
    return {
      articles: this.getArticles(),
      chutesBarres: this.getChutesBarres(),
      chutesMaille: this.getChutesMaille(),
      mapping: this.getMapping(),
      dossiers: this.getDossiers(),
      suivisOF: this.getSuivisOF(),
      mouvements: this.getMouvements(),
      clientCodifications: this.getClientCodifications()
    };
  }

  wipeAllData() {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.exec('DELETE FROM articles');
      this.db.exec('DELETE FROM chutes_barres');
      this.db.exec('DELETE FROM chutes_maille');
      this.db.exec('DELETE FROM mapping_chutes');
      this.db.exec('DELETE FROM dossiers');
      this.db.exec('DELETE FROM suivis_of');
      this.db.exec('DELETE FROM mouvements_stock');
      this.db.exec('DELETE FROM client_codifications');
      this.db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('db_initialized', ?)").run(new Date().toISOString());
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }


  getDbFilePath(): string {
    return DB_PATH;
  }
}

// Instance Singleton
export const atelierDb = new AtelierDatabase();
