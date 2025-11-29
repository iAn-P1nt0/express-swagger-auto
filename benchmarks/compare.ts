#!/usr/bin/env node
/**
 * Baseline Comparison Tool
 * Compares current benchmark results against stored baselines
 */

import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  category: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  stdDev: number;
  memoryUsed: number;
  passed: boolean;
  threshold: number;
  timestamp: string;
}

interface ComparisonResult {
  name: string;
  category: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
  status: 'improved' | 'regressed' | 'unchanged';
  significant: boolean;
}

interface ComparisonReport {
  timestamp: string;
  baselineFile: string;
  currentFile: string;
  tolerancePercent: number;
  comparisons: ComparisonResult[];
  summary: {
    total: number;
    improved: number;
    regressed: number;
    unchanged: number;
  };
}

function loadResults(filePath: string): BenchmarkResult[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function compare(
  baseline: BenchmarkResult[],
  current: BenchmarkResult[],
  tolerancePercent = 10
): ComparisonReport {
  const comparisons: ComparisonResult[] = [];

  for (const currentResult of current) {
    const baselineResult = baseline.find(
      (b) => b.name === currentResult.name && b.category === currentResult.category
    );

    if (!baselineResult) {
      // New benchmark, no comparison available
      continue;
    }

    const change = currentResult.avgDuration - baselineResult.avgDuration;
    const changePercent = (change / baselineResult.avgDuration) * 100;
    const significant = Math.abs(changePercent) > tolerancePercent;

    let status: 'improved' | 'regressed' | 'unchanged';
    if (changePercent < -tolerancePercent) {
      status = 'improved';
    } else if (changePercent > tolerancePercent) {
      status = 'regressed';
    } else {
      status = 'unchanged';
    }

    comparisons.push({
      name: currentResult.name,
      category: currentResult.category,
      baseline: baselineResult.avgDuration,
      current: currentResult.avgDuration,
      change,
      changePercent,
      status,
      significant,
    });
  }

  const summary = {
    total: comparisons.length,
    improved: comparisons.filter((c) => c.status === 'improved').length,
    regressed: comparisons.filter((c) => c.status === 'regressed').length,
    unchanged: comparisons.filter((c) => c.status === 'unchanged').length,
  };

  return {
    timestamp: new Date().toISOString(),
    baselineFile: '',
    currentFile: '',
    tolerancePercent,
    comparisons,
    summary,
  };
}

function generateComparisonReport(report: ComparisonReport): string {
  const lines: string[] = [
    '# Performance Comparison Report',
    '',
    `**Generated:** ${report.timestamp}`,
    `**Tolerance:** ${report.tolerancePercent}%`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total Benchmarks | ${report.summary.total} |`,
    `| Improved | ${report.summary.improved} |`,
    `| Regressed | ${report.summary.regressed} |`,
    `| Unchanged | ${report.summary.unchanged} |`,
    '',
    '## Detailed Comparison',
    '',
    '| Category | Benchmark | Baseline | Current | Change | Status |',
    '|----------|-----------|----------|---------|--------|--------|',
  ];

  for (const comp of report.comparisons) {
    const icon =
      comp.status === 'improved' ? '🟢' : comp.status === 'regressed' ? '🔴' : '⚪';
    lines.push(
      `| ${comp.category} | ${comp.name} | ${formatDuration(comp.baseline)} | ${formatDuration(comp.current)} | ${formatChange(comp.changePercent)} | ${icon} ${comp.status} |`
    );
  }

  // Add regression warnings
  const regressions = report.comparisons.filter((c) => c.status === 'regressed');
  if (regressions.length > 0) {
    lines.push('');
    lines.push('## ⚠️ Regressions Detected');
    lines.push('');
    for (const reg of regressions) {
      lines.push(
        `- **${reg.category} / ${reg.name}**: ${formatChange(reg.changePercent)} slower (${formatDuration(reg.baseline)} → ${formatDuration(reg.current)})`
      );
    }
  }

  // Add improvements
  const improvements = report.comparisons.filter((c) => c.status === 'improved');
  if (improvements.length > 0) {
    lines.push('');
    lines.push('## ✅ Improvements');
    lines.push('');
    for (const imp of improvements) {
      lines.push(
        `- **${imp.category} / ${imp.name}**: ${formatChange(Math.abs(imp.changePercent))} faster (${formatDuration(imp.baseline)} → ${formatDuration(imp.current)})`
      );
    }
  }

  return lines.join('\n');
}

function findLatestResults(): string | null {
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    return null;
  }

  const files = fs.readdirSync(resultsDir)
    .filter((f) => f.startsWith('benchmark-') && f.endsWith('.json'))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(resultsDir, files[0]) : null;
}

function findBaseline(): string | null {
  const baselinePath = path.join(__dirname, 'baseline-results.json');
  if (fs.existsSync(baselinePath)) {
    return baselinePath;
  }
  return null;
}

async function main(): Promise<void> {
  console.log('📊 Performance Baseline Comparison Tool\n');

  const args = process.argv.slice(2);
  let baselineFile: string | null = null;
  let currentFile: string | null = null;
  let tolerancePercent = 10;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--baseline' && args[i + 1]) {
      baselineFile = args[i + 1];
      i++;
    } else if (args[i] === '--current' && args[i + 1]) {
      currentFile = args[i + 1];
      i++;
    } else if (args[i] === '--tolerance' && args[i + 1]) {
      tolerancePercent = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--update-baseline') {
      // Update baseline from latest results
      const latest = findLatestResults();
      if (!latest) {
        console.error('❌ No benchmark results found');
        process.exit(1);
      }
      const baselinePath = path.join(__dirname, 'baseline-results.json');
      fs.copyFileSync(latest, baselinePath);
      console.log(`✅ Updated baseline from ${latest}`);
      return;
    } else if (args[i] === '--help') {
      console.log(`Usage: compare.ts [options]

Options:
  --baseline <file>    Baseline results file
  --current <file>     Current results file
  --tolerance <n>      Change tolerance percentage (default: 10)
  --update-baseline    Update baseline from latest results
  --help               Show this help
`);
      return;
    }
  }

  // Find files if not specified
  if (!baselineFile) {
    baselineFile = findBaseline();
    if (!baselineFile) {
      console.error('❌ No baseline file found. Run --update-baseline first.');
      process.exit(1);
    }
  }

  if (!currentFile) {
    currentFile = findLatestResults();
    if (!currentFile) {
      console.error('❌ No current results found. Run benchmarks first.');
      process.exit(1);
    }
  }

  console.log(`Baseline: ${baselineFile}`);
  console.log(`Current:  ${currentFile}`);
  console.log(`Tolerance: ${tolerancePercent}%\n`);

  // Load and compare
  const baseline = loadResults(baselineFile);
  const current = loadResults(currentFile);
  const report = compare(baseline, current, tolerancePercent);
  report.baselineFile = baselineFile;
  report.currentFile = currentFile;

  // Print results
  console.log(generateComparisonReport(report));

  // Save report
  const reportPath = path.join(__dirname, 'results', `comparison-${Date.now()}.md`);
  fs.writeFileSync(reportPath, generateComparisonReport(report));
  console.log(`\n💾 Report saved to: ${reportPath}`);

  // Exit with error if regressions detected
  if (report.summary.regressed > 0) {
    console.log(`\n⚠️ ${report.summary.regressed} regression(s) detected`);
    process.exit(1);
  }

  console.log('\n✅ No regressions detected');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
