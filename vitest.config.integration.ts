import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for integration testing
 * Tests module interactions and CLI functionality
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    name: 'integration',
    include: [
      'src/integration.test.ts',
      '**/*.integration.test.ts',
      'test/cli/**/*.test.ts',
      'test/integration/**/*.test.ts',
      'src/cli.serve.test.ts',
      'src/cli.comprehensive.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
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
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run integration tests sequentially to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
