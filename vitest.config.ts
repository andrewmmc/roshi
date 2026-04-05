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
        'src/services/codegen/types.ts',
        'src/types/**',
        'src/dev/**',
        'src/db/index.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
      reporter: ['text', 'html'],
    },
  },
});
