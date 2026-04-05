import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { execSync } from 'child_process';
import { devProxyPlugin } from './src/dev/dev-proxy-plugin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

const appVersion = process.env.VITE_APP_VERSION ?? pkg.version;

let appCommit = process.env.VITE_APP_COMMIT;
if (!appCommit) {
  try {
    appCommit = execSync('git rev-parse --short=9 HEAD').toString().trim();
  } catch {
    appCommit = 'unknown';
  }
}

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss(), devProxyPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**', '**/coverage/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari16',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 2100,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-markdown': ['react-markdown'],
          'gpt-tokenizer': ['gpt-tokenizer'],
          dexie: ['dexie'],
        },
      },
    },
  },
});
