#!/usr/bin/env node
/**
 * Automated Benchmark Runner
 * Executes performance benchmarks and generates reports
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import express, { Express } from 'express';
import { RouteDiscovery } from '../src/core/RouteDiscovery';
import { SpecGenerator } from '../src/core/SpecGenerator';

interface BenchmarkResult {
  name: string;
  category: string;
  duration: number;
  memoryUsed: number;
  iterations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  stdDev: number;
  passed: boolean;
  threshold: number;
  timestamp: string;
}

interface BenchmarkConfig {
  name: string;
  category: string;
  fn: () => void | Promise<void>;
  iterations: number;
  warmupIterations: number;
  threshold: number;
}

const results: BenchmarkResult[] = [];

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function createTestApp(routeCount: number): Express {
  const app = express();
  app.use(express.json());

  for (let i = 0; i < routeCount; i++) {
    const route = `/api/resource${i}`;
    app.get(route, (_req, res) => res.json({ id: i }));
    app.post(route, (_req, res) => res.json({ created: true }));
    app.get(`${route}/:id`, (req, res) => res.json({ id: req.params.id }));
  }

  return app;
}

async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  const { name, category, fn, iterations, warmupIterations, threshold } = config;
  const durations: number[] = [];

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // Force GC if available
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
  const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / iterations;
  const stdDev = Math.sqrt(variance);

  const result: BenchmarkResult = {
    name,
    category,
    duration: durations.reduce((a, b) => a + b, 0),
    memoryUsed,
    iterations,
    avgDuration,
    minDuration,
    maxDuration,
    stdDev,
    passed: avgDuration <= threshold,
    threshold,
    timestamp: new Date().toISOString(),
  };

  return result;
}

async function runRouteDiscoveryBenchmarks(): Promise<void> {
  console.log('\n📊 Route Discovery Benchmarks\n');

  const discovery = new RouteDiscovery();
  const benchmarks: BenchmarkConfig[] = [
    {
      name: '100 routes',
      category: 'route-discovery',
      fn: () => {
        const app = createTestApp(34);
        discovery.discover(app);
      },
      iterations: 10,
      warmupIterations: 3,
      threshold: 50,
    },
    {
      name: '500 routes',
      category: 'route-discovery',
      fn: () => {
        const app = createTestApp(167);
        discovery.discover(app);
      },
      iterations: 5,
      warmupIterations: 2,
      threshold: 200,
    },
    {
      name: '1000 routes',
      category: 'route-discovery',
      fn: () => {
        const app = createTestApp(334);
        discovery.discover(app);
      },
      iterations: 3,
      warmupIterations: 1,
      threshold: 500,
    },
  ];

  for (const config of benchmarks) {
    const result = await runBenchmark(config);
    results.push(result);

    const status = result.passed ? '✅' : '❌';
    console.log(
      `  ${status} ${result.name}: ${formatDuration(result.avgDuration)} (threshold: ${formatDuration(result.threshold)})`
    );
  }
}

async function runSpecGenerationBenchmarks(): Promise<void> {
  console.log('\n📊 Spec Generation Benchmarks\n');

  const discovery = new RouteDiscovery();
  const benchmarks: BenchmarkConfig[] = [
    {
      name: '100 routes',
      category: 'spec-generation',
      fn: () => {
        const app = createTestApp(34);
        const routes = discovery.discover(app);
        const generator = new SpecGenerator({ info: { title: 'Test', version: '1.0.0' } });
        generator.generate(routes);
      },
      iterations: 10,
      warmupIterations: 3,
      threshold: 100,
    },
    {
      name: '500 routes',
      category: 'spec-generation',
      fn: () => {
        const app = createTestApp(167);
        const routes = discovery.discover(app);
        const generator = new SpecGenerator({ info: { title: 'Test', version: '1.0.0' } });
        generator.generate(routes);
      },
      iterations: 5,
      warmupIterations: 2,
      threshold: 400,
    },
    {
      name: '1000 routes',
      category: 'spec-generation',
      fn: () => {
        const app = createTestApp(334);
        const routes = discovery.discover(app);
        const generator = new SpecGenerator({ info: { title: 'Test', version: '1.0.0' } });
        generator.generate(routes);
      },
      iterations: 3,
      warmupIterations: 1,
      threshold: 1000,
    },
  ];

  for (const config of benchmarks) {
    const result = await runBenchmark(config);
    results.push(result);

    const status = result.passed ? '✅' : '❌';
    console.log(
      `  ${status} ${result.name}: ${formatDuration(result.avgDuration)} (threshold: ${formatDuration(result.threshold)})`
    );
  }
}

function generateReport(): string {
  const report: string[] = [
    '# Performance Benchmark Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Node Version:** ${process.version}`,
    `**Platform:** ${process.platform} ${process.arch}`,
    '',
    '## Summary',
    '',
    `| Category | Benchmark | Avg Duration | Min | Max | Threshold | Status |`,
    `|----------|-----------|--------------|-----|-----|-----------|--------|`,
  ];

  for (const result of results) {
    const status = result.passed ? '✅ Pass' : '❌ Fail';
    report.push(
      `| ${result.category} | ${result.name} | ${formatDuration(result.avgDuration)} | ${formatDuration(result.minDuration)} | ${formatDuration(result.maxDuration)} | ${formatDuration(result.threshold)} | ${status} |`
    );
  }

  report.push('');
  report.push('## Detailed Results');
  report.push('');
  report.push('```json');
  report.push(JSON.stringify(results, null, 2));
  report.push('```');

  return report.join('\n');
}

async function main(): Promise<void> {
  console.log('🚀 Express Swagger Auto - Performance Benchmark Runner\n');
  console.log('='.repeat(60));

  await runRouteDiscoveryBenchmarks();
  await runSpecGenerationBenchmarks();

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Results Summary\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`  Total benchmarks: ${results.length}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  // Save results
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const resultsFile = path.join(resultsDir, `benchmark-${timestamp}.json`);
  const reportFile = path.join(resultsDir, `report-${timestamp}.md`);

  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  fs.writeFileSync(reportFile, generateReport());

  console.log(`\n💾 Results saved to:`);
  console.log(`   ${resultsFile}`);
  console.log(`   ${reportFile}`);

  // Exit with error if any benchmark failed
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} benchmark(s) failed to meet thresholds`);
    process.exit(1);
  }

  console.log('\n✅ All benchmarks passed!\n');
}

main().catch((error) => {
  console.error('❌ Benchmark error:', error);
  process.exit(1);
});
