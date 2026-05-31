import { defineConfig } from 'vitest/config';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify('test'),
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: [
        // Coverage is intentionally scoped to non-visual logic with stable
        // branch behavior. Component coverage is handled by interaction tests.
        'src/adapters/gemini.ts',
        'src/services/llm-client.ts',
        'src/services/runtime-fetch.ts',
        'src/services/codegen/*.ts',
        'src/stores/history-store.ts',
        'src/stores/response-store.ts',
        'src/stores/theme-store.ts',
        'src/stores/toast-store.ts',
        'src/stores/ui-store.ts',
        'src/hooks/use-global-shortcuts.ts',
        'src/hooks/use-history.ts',
        'src/hooks/use-providers.ts',
        'src/hooks/use-token-count.ts',
        'src/providers/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/__tests__/**',
        'src/services/codegen/types.ts',
        'src/services/codegen/index.ts',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
