import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for performance testing
 * Tests benchmark thresholds and performance requirements
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    name: 'performance',
    include: [
      'test/performance/**/*.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
    ],
    // Performance tests may take longer
    testTimeout: 120000,
    hookTimeout: 30000,
    // Run performance tests sequentially for consistent measurements
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Disable coverage for performance tests
    coverage: {
      enabled: false,
    },
  },
});
