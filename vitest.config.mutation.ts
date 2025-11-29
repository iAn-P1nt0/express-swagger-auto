import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for mutation testing.
 * Excludes performance, e2e, and certain CLI tests that spawn child processes
 * to focus on unit and integration tests that validate code correctness.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'test/integration/**/*.test.ts',
      'test/cli/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude performance tests - they measure timing not correctness
      'test/performance/**',
      // Exclude e2e tests - they're for full workflow validation
      'test/e2e/**',
      // Exclude CLI tests that spawn child processes
      'src/cli.comprehensive.test.ts',
      'src/cli.serve.test.ts',
      // Exclude serve tests that start actual servers
      'test/cli/serve.detailed.test.ts',
    ],
    testTimeout: 30000,
  },
});
