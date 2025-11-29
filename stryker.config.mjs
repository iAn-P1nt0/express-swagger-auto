// @ts-check
/**
 * Stryker Mutation Testing Configuration
 *
 * This configuration enables mutation testing for the express-swagger-auto package.
 * Mutation testing validates test suite quality by introducing small changes (mutants)
 * to the source code and checking if tests catch them.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',

  // Plugins to load
  plugins: ['@stryker-mutator/vitest-runner'],

  // Files to mutate - source files only, excluding tests and type definitions
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    '!src/types.ts',
    '!src/**/index.ts',
  ],

  // Mutators configuration - enable core mutation types
  mutator: {
    plugins: null, // Use default mutators
    excludedMutations: [
      // Exclude mutations that produce too many equivalent mutants
      'StringLiteral', // Avoid mutating all strings
    ],
  },

  // Vitest runner configuration
  vitest: {
    configFile: 'vitest.config.mutation.ts',
  },

  // Threshold configuration
  thresholds: {
    high: 85,
    low: 70,
    break: 65,
  },

  // Reporters - generate HTML report for detailed analysis
  reporters: ['html', 'json', 'progress', 'clear-text'],

  // Output directories
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/mutation-report.json',
  },

  // Performance settings
  timeoutMS: 30000,
  timeoutFactor: 2,
  concurrency: 4,

  // Incremental mode - reuse results from previous runs
  incremental: true,
  incrementalFile: '.stryker-tmp/incremental.json',

  // Ignore patterns for better performance
  ignorePatterns: [
    'node_modules',
    'dist',
    'coverage',
    'reports',
    'examples',
    'benchmarks',
    'docs',
    '.git',
    '.stryker-tmp',
  ],

  // Disable sandbox for better performance in CI
  disableTypeChecks: 'src/**/*.ts',

  // Log level
  logLevel: 'info',

  // Clean up temporary files
  cleanTempDir: 'always',

  // Disable unknown options warning
  warnings: {
    unknownOptions: false,
  },
};
