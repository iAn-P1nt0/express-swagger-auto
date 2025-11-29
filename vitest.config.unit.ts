import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for isolated unit testing
 * Focuses on testing individual modules in isolation
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    name: 'unit',
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/integration.test.ts',
      '**/*.integration.test.ts',
      '**/*.e2e.test.ts',
      'test/cli/**',
      'src/cli.serve.test.ts',
      'src/cli.comprehensive.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/unit',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'examples/**',
        'benchmarks/**',
        'test/fixtures/**',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
