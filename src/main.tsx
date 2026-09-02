import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logger } from './services/logger';

// Capture globale des erreurs non gérées et promesses rejetées
window.addEventListener('error', (event) => {
  logger.error('WindowError', event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack || event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('UnhandledRejection', event.reason?.message || String(event.reason), {
    reason: event.reason?.stack || event.reason
  });
});

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.error('ReactErrorBoundary', error.message, {
      componentStack: errorInfo.componentStack,
      stack: error.stack
    });
  }

  handleResetStorage = () => {
    window.location.reload();
  };

  handleFullReset = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/50 rounded-2xl p-6 shadow-2xl shadow-red-950/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h1 className="text-lg font-black text-red-400">Une anomalie d'affichage a été interceptée</h1>
                <p className="text-xs text-slate-400 font-mono">Le gestionnaire d'erreur a consigné l'événement dans le journal système.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-red-300 overflow-x-auto space-y-2">
              <div className="font-bold text-red-200">Message : {this.state.error?.message || 'Erreur inconnue'}</div>
              {this.state.error?.stack && (
                <pre className="text-[11px] text-slate-400 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  🔄 Recharger l'application
                </button>
                <button
                  type="button"
                  onClick={this.handleResetStorage}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                  title="Nettoie le brouillon temporaire qui pourrait être corrompu et recharge"
                >
                  🧹 Vider le brouillon en cours
                </button>
              </div>

              <button
                type="button"
                onClick={this.handleFullReset}
                className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                🗑️ Réinitialisation complète
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
