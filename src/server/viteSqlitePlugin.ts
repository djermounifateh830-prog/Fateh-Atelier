import type { Plugin, ViteDevServer } from 'vite';
import { atelierDb } from './db';
import fs from 'fs';

// Helper pour lire le corps JSON d'une requête HTTP native Node
function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Corps de requête trop volumineux'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('JSON invalide'));
      }
    });
    req.on('error', (err: any) => reject(err));
  });
}

// Helper pour envoyer une réponse JSON
function sendJson(res: any, data: any, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function sqlitePlugin(): Plugin {
  const handleApi = (server: ViteDevServer) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url || '';
      const method = req.method || 'GET';

      // Intercepter uniquement les routes /api/*
      if (!url.startsWith('/api/')) {
        return next();
      }

      try {
        // --- 1. TOUTES LES DONNÉES EN 1 APPEL RAPIDE ---
        if (url === '/api/data' && method === 'GET') {
          return sendJson(res, { success: true, data: atelierDb.getAllData() });
        }

        // --- 2. SYNCHRONISATION / MIGRATION INITIALE ---
        if (url === '/api/sync/initial' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.fullSyncFromFrontend(body);
          return sendJson(res, { success: true, message: 'Données synchronisées avec succès dans SQLite' });
        }

        // --- 3. ARTICLES ---
        if (url === '/api/articles' && method === 'GET') {
          return sendJson(res, { success: true, data: atelierDb.getArticles() });
        }
        if (url === '/api/articles' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.saveArticles(Array.isArray(body) ? body : body.articles || []);
          return sendJson(res, { success: true });
        }
        if (url === '/api/articles' && method === 'PUT') {
          const body = await parseBody(req);
          atelierDb.upsertArticle(body);
          return sendJson(res, { success: true });
        }
        if (url.startsWith('/api/articles/') && method === 'DELETE') {
          const code = decodeURIComponent(url.replace('/api/articles/', ''));
          atelierDb.deleteArticle(code);
          return sendJson(res, { success: true });
        }

        // --- 4. CHUTES ---
        if (url === '/api/chutes/barres' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.saveChutesBarres(body);
          return sendJson(res, { success: true });
        }
        if (url === '/api/chutes/maille' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.saveChutesMaille(Array.isArray(body) ? body : []);
          return sendJson(res, { success: true });
        }
        if (url === '/api/chutes/create-family' && method === 'POST') {
          const body = await parseBody(req);
          if (!body?.name) {
            return sendJson(res, { error: 'Nom de famille requis' }, 400);
          }
          atelierDb.createChuteFamily(body.name);
          return sendJson(res, { success: true });
        }
        if (url === '/api/chutes/rename-sheet' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.renameChuteSheet(body.oldName, body.newName);
          return sendJson(res, { success: true });
        }
        if (url.startsWith('/api/chutes/sheet/') && method === 'DELETE') {
          const sheetName = decodeURIComponent(url.replace('/api/chutes/sheet/', ''));
          atelierDb.deleteChuteSheet(sheetName);
          return sendJson(res, { success: true });
        }

        // --- 5. MAPPING ---
        if (url === '/api/mapping' && method === 'GET') {
          return sendJson(res, { success: true, data: atelierDb.getMapping() });
        }
        if (url === '/api/mapping' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.saveMapping(body);
          return sendJson(res, { success: true });
        }

        // --- 6. DOSSIERS ---
        if (url === '/api/dossiers' && method === 'GET') {
          return sendJson(res, { success: true, data: atelierDb.getDossiers() });
        }
        if (url === '/api/dossiers' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.saveDossiers(Array.isArray(body) ? body : []);
          return sendJson(res, { success: true });
        }
        if (url === '/api/dossiers' && method === 'PUT') {
          const body = await parseBody(req);
          atelierDb.upsertDossier(body);
          return sendJson(res, { success: true });
        }
        if (url.startsWith('/api/dossiers/') && method === 'DELETE') {
          const id = decodeURIComponent(url.replace('/api/dossiers/', ''));
          atelierDb.deleteDossier(id);
          return sendJson(res, { success: true });
        }

        // --- 7. SUIVIS OF ---
        if (url === '/api/of' && method === 'GET') {
          return sendJson(res, { success: true, data: atelierDb.getSuivisOF() });
        }
        if (url === '/api/of' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.saveSuivisOF(Array.isArray(body) ? body : []);
          return sendJson(res, { success: true });
        }
        if (url === '/api/of' && method === 'PUT') {
          const body = await parseBody(req);
          atelierDb.upsertSuiviOF(body);
          return sendJson(res, { success: true });
        }
        if (url === '/api/of/close' && method === 'POST') {
          const body = await parseBody(req);
          if (!body?.suivi || !Array.isArray(body.mouvements)) {
            return sendJson(res, { error: 'Données de clôture OF invalides' }, 400);
          }
          atelierDb.closeOF(body.suivi, body.mouvements);
          return sendJson(res, { success: true });
        }
        if (url.startsWith('/api/of/') && method === 'DELETE') {
          const id = decodeURIComponent(url.replace('/api/of/', ''));
          atelierDb.deleteSuiviOF(id);
          return sendJson(res, { success: true });
        }

        // --- 8. MOUVEMENTS ---
        if (url === '/api/mouvements' && method === 'GET') {
          return sendJson(res, { success: true, data: atelierDb.getMouvements() });
        }
        if (url === '/api/mouvements' && method === 'POST') {
          const body = await parseBody(req);
          if (Array.isArray(body)) {
            atelierDb.addMouvements(body);
          } else {
            atelierDb.addMouvement(body);
          }
          return sendJson(res, { success: true });
        }

        // --- 9. CODIFICATIONS CLIENTS & PRÉFIXES ---
        if (url === '/api/codifications' && method === 'GET') {
          return sendJson(res, { success: true, data: atelierDb.getClientCodifications() });
        }
        if (url === '/api/codifications' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.saveClientCodifications(Array.isArray(body) ? body : []);
          return sendJson(res, { success: true });
        }
        if (url === '/api/codifications' && method === 'PUT') {
          const body = await parseBody(req);
          atelierDb.upsertClientCodification(body);
          return sendJson(res, { success: true });
        }
        if (url.startsWith('/api/codifications/') && method === 'DELETE') {
          const id = decodeURIComponent(url.replace('/api/codifications/', ''));
          atelierDb.deleteClientCodification(id);
          return sendJson(res, { success: true });
        }

        // --- 10. FICHES DE TRANSFERT & BONS DE LIVRAISON ---
        if (url === '/api/fiches-transfert' && method === 'GET') {
          return sendJson(res, { success: true, data: atelierDb.getFichesTransfert() });
        }
        if (url === '/api/fiches-transfert' && method === 'POST') {
          const body = await parseBody(req);
          atelierDb.saveFichesTransfert(Array.isArray(body) ? body : []);
          return sendJson(res, { success: true });
        }
        if (url === '/api/fiches-transfert' && method === 'PUT') {
          const body = await parseBody(req);
          atelierDb.upsertFicheTransfert(body);
          return sendJson(res, { success: true });
        }
        if (url.startsWith('/api/fiches-transfert/') && method === 'DELETE') {
          const id = decodeURIComponent(url.replace('/api/fiches-transfert/', ''));
          atelierDb.deleteFicheTransfert(id);
          return sendJson(res, { success: true });
        }

        // --- 11. TÉLÉCHARGER LE FICHIER .DB PHYSIQUE ---
        if (url === '/api/db/download' && method === 'GET') {
          const dbPath = atelierDb.getDbFilePath();
          if (fs.existsSync(dbPath)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', 'attachment; filename="3m_atelier.db"');
            const fileStream = fs.createReadStream(dbPath);
            return fileStream.pipe(res);
          } else {
            return sendJson(res, { error: 'Fichier base de données introuvable' }, 404);
          }
        }

        // --- 12. VIDER COMPLÈTEMENT LA BASE SQLITE ---
        if (url === '/api/db/wipe' && method === 'POST') {
          atelierDb.wipeAllData();
          return sendJson(res, { success: true, message: 'Base de données SQLite vidée avec succès' });
        }


        // Si aucune route ne correspond
        return sendJson(res, { error: 'Route API non trouvée' }, 404);
      } catch (err: any) {
        console.error('❌ [API SQLite Error]', err);
        return sendJson(res, { error: err.message || 'Erreur serveur SQLite' }, 500);
      }
    });
  };

  return {
    name: 'vite-plugin-sqlite',
    configureServer(server) {
      handleApi(server);
    },
    configurePreviewServer(server: any) {
      handleApi(server);
    }
  };
}
