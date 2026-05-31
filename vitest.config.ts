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
        'src/adapters/**/*.ts',
        'src/components/**/*.tsx',
        'src/components/**/*.ts',
        'src/services/**/*.ts',
        'src/stores/**/*.ts',
        'src/hooks/**/*.ts',
        'src/providers/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/__tests__/**',
        'src/adapters/types.ts',
        'src/adapters/index.ts',
        'src/adapters/anthropic.ts',
        'src/adapters/openai.ts',
        'src/components/**',
        'src/services/codegen/types.ts',
        'src/services/codegen/index.ts',
        'src/services/models-api.ts',
        'src/stores/composer-store.ts',
        'src/stores/provider-store.ts',
        'src/hooks/use-send-request.ts',
        'src/types/**',
        'src/dev/**',
        'src/db/index.ts',
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
