import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for E2E testing
 * Tests complete workflows with process spawning and server management
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    name: 'e2e',
    include: [
      'test/e2e/**/*.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
    ],
    // E2E tests need longer timeouts for process spawning
    testTimeout: 60000,
    hookTimeout: 30000,
    // Run E2E tests sequentially to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Setup and teardown for E2E tests
    setupFiles: [],
    // Disable coverage for E2E tests (unit tests handle coverage)
    coverage: {
      enabled: false,
    },
  },
});
