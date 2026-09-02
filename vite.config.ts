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
