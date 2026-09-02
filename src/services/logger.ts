export type LogLevel = 'SQLITE' | 'ACTION' | 'CALC' | 'OPTIM' | 'ANOMALY' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  isoTimestamp: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
  stack?: string;
  context?: {
    ongletActif?: string;
    refDossier?: string;
    numCommande?: string;
    familleProduit?: string;
    client?: string;
  };
}

export interface SystemDiagnosticSnapshot {
  appName: string;
  version: string;
  generatedAt: string;
  userAgent: string;
  screenResolution: string;
  stats: {
    totalLogs: number;
    errorCount: number;
    anomalyCount: number;
    warnCount: number;
    actionCount: number;
    sqliteCount: number;
  };
  context: {
    ongletActif?: string;
    refDossier?: string;
    numCommande?: string;
    familleProduit?: string;
    client?: string;
  };
  recentLogs: LogEntry[];
  errorsOnly: LogEntry[];
}

type LogListener = (logs: LogEntry[]) => void;

class SystemLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs: number = 500;
  private currentContext: {
    ongletActif?: string;
    refDossier?: string;
    numCommande?: string;
    familleProduit?: string;
    client?: string;
  } = {};

  private readonly STORAGE_KEY = '3m_atelier_system_logs_cache';

  constructor() {
    this.restoreFromStorage();
    this.setupGlobalHandlers();
    this.log('INFO', 'System', 'Moteur de traçabilité et logs système haute fidélité initialisé.', {
      maxLogs: this.maxLogs,
      restoredLogs: this.logs.length
    });
  }

  /**
   * Met à jour le contexte global actif (onglet courant, dossier, client, etc.)
   * pour enrichir automatiquement tous les prochains logs.
   */
  public setContext(ctx: Partial<typeof this.currentContext>) {
    this.currentContext = { ...this.currentContext, ...ctx };
  }

  public getContext() {
    return { ...this.currentContext };
  }

  private restoreFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.logs = parsed.slice(0, this.maxLogs);
          }
        }
      }
    } catch {
      // Ignore cache reading error
    }
  }

  private persistToStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs.slice(0, 100)));
      }
    } catch {
      // Ignore cache writing error
    }
  }

  private setupGlobalHandlers() {
    if (typeof window === 'undefined') return;

    // Erreurs JS globales non capturées
    window.addEventListener('error', (event) => {
      this.log('ERROR', 'GlobalWindow', event.message || 'Erreur non gérée interceptée', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: event.type
      }, event.error?.stack);
    });

    // Promesses rejetées non capturées
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      this.log('ERROR', 'UnhandledPromise', `Promesse rejetée : ${message}`, {
        rawReason: reason
      }, stack);
    });
  }

  /**
   * Enregistre un événement dans la traçabilité système
   */
  public log(
    level: LogLevel,
    category: string,
    message: string,
    details?: any,
    explicitStack?: string
  ) {
    const now = new Date();
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      isoTimestamp: now.toISOString(),
      timestamp: now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      } as any),
      level,
      category,
      message,
      details: details !== undefined ? this.sanitizeDetails(details) : undefined,
      stack: explicitStack || (level === 'ERROR' ? new Error().stack : undefined),
      context: Object.keys(this.currentContext).length > 0 ? { ...this.currentContext } : undefined
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Affichage coloré et structuré dans la console développeur
    this.printToDevConsole(entry);

    // Sauvegarde mémoire tampon session
    this.persistToStorage();

    // Notifier les abonnés UI (SystemLogsModal)
    this.notify();
  }

  private sanitizeDetails(details: any): any {
    try {
      if (details instanceof Error) {
        return {
          name: details.name,
          message: details.message,
          stack: details.stack
        };
      }
      // Cloner et vérifier circularité
      return JSON.parse(JSON.stringify(details, (_key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof HTMLElement) return `[HTMLElement <${value.tagName.toLowerCase()}>]`;
        return value;
      }));
    } catch {
      return String(details);
    }
  }

  private printToDevConsole(entry: LogEntry) {
    const prefix = `[3M-LOG][${entry.level}][${entry.category}]`;
    const details = entry.details !== undefined ? entry.details : '';

    switch (entry.level) {
      case 'ERROR':
        console.error(prefix, entry.message, details, entry.stack || '');
        break;
      case 'ANOMALY':
        console.warn(`%c${prefix} ⚠️ ${entry.message}`, 'color: #f43f5e; font-weight: bold;', details);
        break;
      case 'WARN':
        console.warn(prefix, entry.message, details);
        break;
      case 'SQLITE':
        console.info(`%c${prefix} 🗄️ ${entry.message}`, 'color: #38bdf8; font-weight: bold;', details);
        break;
      case 'ACTION':
        console.info(`%c${prefix} ⚡ ${entry.message}`, 'color: #f59e0b; font-weight: bold;', details);
        break;
      case 'CALC':
        console.info(`%c${prefix} 📐 ${entry.message}`, 'color: #a855f7; font-weight: bold;', details);
        break;
      case 'OPTIM':
        console.info(`%c${prefix} ✂️ ${entry.message}`, 'color: #10b981; font-weight: bold;', details);
        break;
      default:
        console.log(prefix, entry.message, details);
    }
  }

  // Raccourcis typés
  public sqlite(category: string, message: string, details?: any) {
    this.log('SQLITE', category, message, details);
  }

  public action(category: string, message: string, details?: any) {
    this.log('ACTION', category, message, details);
  }

  public calc(category: string, message: string, details?: any) {
    this.log('CALC', category, message, details);
  }

  public optim(category: string, message: string, details?: any) {
    this.log('OPTIM', category, message, details);
  }

  public anomaly(category: string, message: string, details?: any) {
    this.log('ANOMALY', category, message, details);
  }

  public info(category: string, message: string, details?: any) {
    this.log('INFO', category, message, details);
  }

  public warn(category: string, message: string, details?: any) {
    this.log('WARN', category, message, details);
  }

  public error(category: string, message: string, details?: any, stack?: string) {
    this.log('ERROR', category, message, details, stack);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [];
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
    this.log('INFO', 'System', 'Journal des événements vidé par l\'utilisateur.');
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot = this.getLogs();
    this.listeners.forEach(fn => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('[SystemLogger] Erreur dans subscriber:', err);
      }
    });
  }

  /**
   * Génère un rapport de diagnostic complet formaté pour être donné directement à une IA
   * (Gemini, Claude, ChatGPT) avec tous les éléments pour isoler instantanément la cause racine.
   */
  public exportDiagnosticForAI(extraSystemInfo?: any): string {
    const now = new Date();
    const allLogs = this.getLogs();
    const errors = allLogs.filter(l => l.level === 'ERROR' || l.level === 'ANOMALY');
    const sqliteLogs = allLogs.filter(l => l.level === 'SQLITE');
    const calcLogs = allLogs.filter(l => l.level === 'CALC' || l.level === 'OPTIM');
    const actionLogs = allLogs.filter(l => l.level === 'ACTION');

    const report = [
      `# 📋 RAPPORT DE DIAGNOSTIC SYSTÈME 3M-ATELIER (ANALYSE IA EXPERTE)`,
      `*Généré le : ${now.toISOString()} (${now.toLocaleString('fr-FR')})*`,
      ``,
      `## 1. 🖥️ ENVIRONNEMENT & CONTEXTE ACTIF`,
      `- **Application** : 3M-Atelier Menuiserie Aluminium & Découpe 1D`,
      `- **Contexte Utilisateur Actif** : ${JSON.stringify(this.currentContext, null, 2)}`,
      `- **Navigateur / UserAgent** : ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Inconnu'}`,
      `- **Résolution Écran** : ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight} (Pixel Ratio: ${window.devicePixelRatio})` : 'Inconnue'}`,
      `- **Volumétrie Journal** : ${allLogs.length} événements enregistrés`,
      `- **Bilan Sévérité** : ❌ ${errors.filter(e => e.level === 'ERROR').length} Erreurs critiques | ⚠️ ${errors.filter(e => e.level === 'ANOMALY').length} Anomalies métier | 🗄️ ${sqliteLogs.length} Requêtes SQLite | ⚡ ${actionLogs.length} Actions UI | 📐 ${calcLogs.length} Calculs/Optimisations`,
      ``,
      extraSystemInfo ? `## 2. 🗃️ ÉTAT DU STOCK ET DES DONNÉES\n\`\`\`json\n${JSON.stringify(extraSystemInfo, null, 2)}\n\`\`\`\n` : '',
      `## 3. 🚨 ERREURS ET ANOMALIES INTERCEPTÉES (${errors.length})`,
      errors.length === 0
        ? `*Aucune erreur critique ni anomalie enregistrée dans la session.*`
        : errors.map((err, idx) => `
### [${err.level}] #${idx + 1} - ${err.timestamp} [${err.category}]
- **Message** : ${err.message}
${err.context ? `- **Contexte au moment de l'erreur** : \`${JSON.stringify(err.context)}\`` : ''}
${err.details ? `- **Détails / Payload** :\n\`\`\`json\n${JSON.stringify(err.details, null, 2)}\n\`\`\`` : ''}
${err.stack ? `- **Stack Trace** :\n\`\`\`\n${err.stack}\n\`\`\`` : ''}
`).join('\n'),
      ``,
      `## 4. ⏱️ HISTORIQUE CHRONOLOGIQUE COMPLET (TIMELINE DES 80 DERNIERS ÉVÉNEMENTS)`,
      `\`\`\`text`,
      ...allLogs.slice(0, 80).map(l => {
        const detailsStr = l.details ? ` | Data: ${JSON.stringify(l.details)}` : '';
        return `[${l.timestamp}] [${l.level.padEnd(7, ' ')}] [${l.category}] ${l.message}${detailsStr}`;
      }),
      `\`\`\``,
      ``,
      `---`,
      `*Fin du rapport de diagnostic. Ce rapport contient la traçabilité intégrale pour analyse automatique par une IA.*`
    ].join('\n');

    return report;
  }

  /**
   * Exporte les logs bruts sous forme d'objet JSON sérialisable
   */
  public exportJson(): SystemDiagnosticSnapshot {
    const allLogs = this.getLogs();
    return {
      appName: '3M-Atelier',
      version: '2.0-ALNS-SQLITE',
      generatedAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      stats: {
        totalLogs: allLogs.length,
        errorCount: allLogs.filter(l => l.level === 'ERROR').length,
        anomalyCount: allLogs.filter(l => l.level === 'ANOMALY').length,
        warnCount: allLogs.filter(l => l.level === 'WARN').length,
        actionCount: allLogs.filter(l => l.level === 'ACTION').length,
        sqliteCount: allLogs.filter(l => l.level === 'SQLITE').length
      },
      context: { ...this.currentContext },
      recentLogs: allLogs,
      errorsOnly: allLogs.filter(l => l.level === 'ERROR' || l.level === 'ANOMALY')
    };
  }
}

export const logger = new SystemLogger();
