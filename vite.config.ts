import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {sqlitePlugin} from './src/server/viteSqlitePlugin';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), sqlitePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: [
          '**/*.db',
          '**/*.db-wal',
          '**/*.db-shm',
          '**/*.log',
          '**/*.bat',
          '**/*.xlsx',
          '**/*.pdf',
          '**/dist/**'
        ]
      },
    },
  };
});
