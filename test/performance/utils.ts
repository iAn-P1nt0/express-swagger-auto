/**
 * Performance Test Utilities
 * Provides timing, memory profiling, and benchmarking helpers
 */

import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  duration: number;
  memoryUsed: number;
  iterations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  stdDev: number;
  timestamp: string;
}

export interface PerformanceThresholds {
  maxDuration: number;
  maxMemory?: number;
  maxStdDev?: number;
}

export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  name?: string;
  thresholds?: PerformanceThresholds;
}

/**
 * Measures the execution time and memory usage of a function
 */
export async function measurePerformance<T>(
  fn: () => T | Promise<T>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 3, name = 'benchmark' } = options;
  const durations: number[] = [];

  // Warmup runs
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const memBefore = process.memoryUsage().heapUsed;

  // Measured runs
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    durations.push(end - start);
  }

  const memAfter = process.memoryUsage().heapUsed;
  const memoryUsed = memAfter - memBefore;

  // Calculate statistics
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const avgDuration = totalDuration / iterations;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  // Standard deviation
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / iterations;
  const stdDev = Math.sqrt(variance);

  return {
    name,
    duration: totalDuration,
    memoryUsed,
    iterations,
    avgDuration,
    minDuration,
    maxDuration,
    stdDev,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Formats duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Formats memory in human-readable format
 */
export function formatMemory(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * Checks if benchmark result meets thresholds
 */
export function checkThresholds(
  result: BenchmarkResult,
  thresholds: PerformanceThresholds
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (result.avgDuration > thresholds.maxDuration) {
    violations.push(`Duration ${formatDuration(result.avgDuration)} exceeds threshold ${formatDuration(thresholds.maxDuration)}`);
  }

  if (thresholds.maxMemory && result.memoryUsed > thresholds.maxMemory) {
    violations.push(`Memory ${formatMemory(result.memoryUsed)} exceeds threshold ${formatMemory(thresholds.maxMemory)}`);
  }

  if (thresholds.maxStdDev && result.stdDev > thresholds.maxStdDev) {
    violations.push(`StdDev ${formatDuration(result.stdDev)} exceeds threshold ${formatDuration(thresholds.maxStdDev)}`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Creates a test Express app with specified number of routes
 */
export function createTestApp(routeCount: number): ReturnType<typeof import('express')> {
  const express = require('express');
  const app = express();
  app.use(express.json());

  for (let i = 0; i < routeCount; i++) {
    const route = `/api/resource${i}`;
    app.get(route, (_req: unknown, res: { json: (data: unknown) => void }) => res.json({ id: i }));
    app.post(route, (_req: unknown, res: { json: (data: unknown) => void }) => res.json({ created: true }));
    app.get(`${route}/:id`, (req: { params: { id: string } }, res: { json: (data: unknown) => void }) =>
      res.json({ id: req.params.id })
    );
  }

  return app;
}

/**
 * Creates a deeply nested router structure
 */
export function createNestedRouters(depth: number): ReturnType<typeof import('express')> {
  const express = require('express');
  const app = express();
  app.use(express.json());

  let currentRouter = express.Router();
  app.use('/api', currentRouter);

  for (let i = 0; i < depth; i++) {
    const nextRouter = express.Router();
    currentRouter.get(`/level${i}`, (_req: unknown, res: { json: (data: unknown) => void }) =>
      res.json({ level: i })
    );
    currentRouter.use(`/nested${i}`, nextRouter);
    currentRouter = nextRouter;
  }

  // Add some routes at the deepest level
  currentRouter.get('/deep', (_req: unknown, res: { json: (data: unknown) => void }) =>
    res.json({ deep: true })
  );

  return app;
}

/**
 * Creates app with middleware chains
 */
export function createMiddlewareChainApp(middlewareCount: number): ReturnType<typeof import('express')> {
  const express = require('express');
  const app = express();

  // Add middleware chain
  for (let i = 0; i < middlewareCount; i++) {
    app.use((_req: unknown, _res: unknown, next: () => void) => {
      // Simulate middleware processing
      next();
    });
  }

  // Add routes
  app.get('/test', (_req: unknown, res: { json: (data: unknown) => void }) =>
    res.json({ success: true })
  );

  return app;
}

/**
 * Generates performance report
 */
export function generateReport(results: BenchmarkResult[]): string {
  const lines: string[] = [
    '# Performance Benchmark Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Results',
    '',
    '| Benchmark | Avg Duration | Min | Max | Std Dev | Memory |',
    '|-----------|--------------|-----|-----|---------|--------|',
  ];

  for (const result of results) {
    lines.push(
      `| ${result.name} | ${formatDuration(result.avgDuration)} | ${formatDuration(result.minDuration)} | ${formatDuration(result.maxDuration)} | ${formatDuration(result.stdDev)} | ${formatMemory(result.memoryUsed)} |`
    );
  }

  return lines.join('\n');
}

/**
 * Compares benchmark results against baseline
 */
export function compareToBaseline(
  current: BenchmarkResult,
  baseline: BenchmarkResult,
  tolerancePercent = 10
): { improved: boolean; regression: boolean; change: number; message: string } {
  const change = ((current.avgDuration - baseline.avgDuration) / baseline.avgDuration) * 100;
  const improved = change < -tolerancePercent;
  const regression = change > tolerancePercent;

  let message = `${current.name}: `;
  if (improved) {
    message += `✅ Improved by ${Math.abs(change).toFixed(1)}%`;
  } else if (regression) {
    message += `❌ Regressed by ${change.toFixed(1)}%`;
  } else {
    message += `➖ No significant change (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`;
  }

  return { improved, regression, change, message };
}
