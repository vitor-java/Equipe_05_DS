import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.entity.ts',
        'src/main.ts',
        'src/database/**',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
      ],
      thresholds: {
        lines: 80,      // Falha se a cobertura de linhas for < 80%
        branches: 80,   // Falha se a cobertura de branches for < 80%
        functions: 80,
        statements: 80,
      },
    },
    root: '.',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
