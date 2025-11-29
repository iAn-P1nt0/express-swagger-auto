import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'examples/**',
        'benchmarks/**',
        'test/**',
        'scripts/**',
        'src/cli/**',
        'src/cli.ts',
        'src/index.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'test/**/*.test.ts', 'test/**/*.spec.ts'],
  },
});
