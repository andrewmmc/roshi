import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/adapters/**/*.ts',
        'src/services/**/*.ts',
        'src/stores/**/*.ts',
        'src/hooks/**/*.ts',
        'src/providers/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
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
