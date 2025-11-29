#!/usr/bin/env node
/**
 * Mutation Trends Tracking Script
 * Tracks mutation score changes over time for trend analysis
 *
 * Usage:
 *   npx tsx scripts/mutation-trends.ts [command] [options]
 *
 * Commands:
 *   record     Record current mutation score
 *   show       Display trend data
 *   compare    Compare two runs
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TrendEntry {
  timestamp: string;
  commit?: string;
  branch?: string;
  overall: {
    score: number;
    total: number;
    killed: number;
    survived: number;
  };
  modules: Record<
    string,
    {
      score: number;
      total: number;
      killed: number;
    }
  >;
}

interface TrendsData {
  version: string;
  entries: TrendEntry[];
}

const TRENDS_FILE = './reports/mutation/trends.json';
const REPORT_FILE = './reports/mutation/mutation-report.json';

/**
 * Load trends data from file
 */
function loadTrends(): TrendsData {
  if (!fs.existsSync(TRENDS_FILE)) {
    return { version: '1.0.0', entries: [] };
  }
  const content = fs.readFileSync(TRENDS_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * Save trends data to file
 */
function saveTrends(data: TrendsData): void {
  const dir = path.dirname(TRENDS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TRENDS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Get current git info
 */
function getGitInfo(): { commit?: string; branch?: string } {
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    return { commit, branch };
  } catch {
    return {};
  }
}

/**
 * Parse mutation report to extract scores
 */
function extractScores(reportPath: string): TrendEntry | null {
  if (!fs.existsSync(reportPath)) {
    return null;
  }

  const content = fs.readFileSync(reportPath, 'utf-8');
  const report = JSON.parse(content);

  const modules: TrendEntry['modules'] = {};
  let totalMutants = 0;
  let totalKilled = 0;
  let totalSurvived = 0;

  for (const [fileName, fileData] of Object.entries(report.files) as [string, any][]) {
    // Extract module name
    const match = fileName.match(/src\/([^/]+)/);
    const moduleName = match ? match[1] : path.basename(fileName, path.extname(fileName));

    if (!modules[moduleName]) {
      modules[moduleName] = { score: 0, total: 0, killed: 0 };
    }

    for (const mutant of fileData.mutants) {
      modules[moduleName].total++;
      totalMutants++;

      if (mutant.status === 'Killed' || mutant.status === 'Timeout') {
        modules[moduleName].killed++;
        totalKilled++;
      } else if (mutant.status === 'Survived') {
        totalSurvived++;
      }
    }
  }

  // Calculate scores
  for (const mod of Object.values(modules)) {
    mod.score = mod.total > 0 ? Math.round((mod.killed / mod.total) * 10000) / 100 : 100;
  }

  const gitInfo = getGitInfo();

  return {
    timestamp: new Date().toISOString(),
    commit: gitInfo.commit,
    branch: gitInfo.branch,
    overall: {
      score: totalMutants > 0 ? Math.round((totalKilled / totalMutants) * 10000) / 100 : 100,
      total: totalMutants,
      killed: totalKilled,
      survived: totalSurvived,
    },
    modules,
  };
}

/**
 * Record current mutation scores
 */
function recordScores(): void {
  const entry = extractScores(REPORT_FILE);

  if (!entry) {
    console.error(`Error: Mutation report not found at ${REPORT_FILE}`);
    console.error('Run mutation tests first: pnpm test:mutation');
    process.exit(1);
  }

  const trends = loadTrends();
  trends.entries.push(entry);

  // Keep only last 100 entries
  if (trends.entries.length > 100) {
    trends.entries = trends.entries.slice(-100);
  }

  saveTrends(trends);

  console.log(`✅ Recorded mutation score: ${entry.overall.score}%`);
  console.log(`   Commit: ${entry.commit || 'unknown'}`);
  console.log(`   Branch: ${entry.branch || 'unknown'}`);
  console.log(`   Total entries: ${trends.entries.length}`);
}

/**
 * Display trend data
 */
function showTrends(count: number = 10): void {
  const trends = loadTrends();

  if (trends.entries.length === 0) {
    console.log('No trend data available. Run "pnpm mutation-trends record" after mutation tests.');
    return;
  }

  const entries = trends.entries.slice(-count);

  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                          MUTATION SCORE TRENDS                                  ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

  console.log(`Showing last ${entries.length} entries:\n`);

  // Header
  console.log('Date                  | Score  | Killed | Survived | Total  | Commit');
  console.log('----------------------+--------+--------+----------+--------+---------');

  for (const entry of entries) {
    const date = new Date(entry.timestamp).toISOString().slice(0, 16).replace('T', ' ');
    const scoreStr = `${entry.overall.score.toFixed(1)}%`.padStart(6);
    const killedStr = entry.overall.killed.toString().padStart(6);
    const survivedStr = entry.overall.survived.toString().padStart(8);
    const totalStr = entry.overall.total.toString().padStart(6);
    const commitStr = entry.commit || 'N/A';

    console.log(`${date} | ${scoreStr} | ${killedStr} | ${survivedStr} | ${totalStr} | ${commitStr}`);
  }

  // Calculate trend
  if (entries.length >= 2) {
    const first = entries[0];
    const last = entries[entries.length - 1];
    const change = last.overall.score - first.overall.score;
    const changeStr = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
    const trend = change >= 0 ? '📈' : '📉';

    console.log(`\nTrend: ${trend} ${changeStr} over ${entries.length} runs`);
  }

  // Show module breakdown for latest
  const latest = entries[entries.length - 1];
  console.log('\nLatest Module Scores:');
  console.log('-'.repeat(50));

  const sortedModules = Object.entries(latest.modules)
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 10);

  for (const [name, data] of sortedModules) {
    const status = data.score >= 85 ? '✅' : data.score >= 70 ? '⚠️' : '❌';
    console.log(`  ${status} ${name.padEnd(25)} ${data.score.toFixed(1)}%`);
  }
}

/**
 * Compare two entries
 */
function compareEntries(index1: number, index2: number): void {
  const trends = loadTrends();

  if (trends.entries.length < 2) {
    console.log('Need at least 2 entries to compare. Record more mutation test runs.');
    return;
  }

  const entry1 = trends.entries[index1] || trends.entries[0];
  const entry2 = trends.entries[index2] || trends.entries[trends.entries.length - 1];

  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                         MUTATION SCORE COMPARISON                               ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

  console.log(`Entry 1: ${entry1.timestamp} (${entry1.commit || 'N/A'})`);
  console.log(`Entry 2: ${entry2.timestamp} (${entry2.commit || 'N/A'})`);
  console.log();

  // Overall comparison
  const scoreDiff = entry2.overall.score - entry1.overall.score;
  const scoreDiffStr = scoreDiff >= 0 ? `+${scoreDiff.toFixed(1)}%` : `${scoreDiff.toFixed(1)}%`;
  const trend = scoreDiff >= 0 ? '📈' : '📉';

  console.log('Overall:');
  console.log(`  Score:    ${entry1.overall.score}% → ${entry2.overall.score}% (${trend} ${scoreDiffStr})`);
  console.log(`  Killed:   ${entry1.overall.killed} → ${entry2.overall.killed}`);
  console.log(`  Survived: ${entry1.overall.survived} → ${entry2.overall.survived}`);
  console.log();

  // Module comparison
  console.log('Module Changes:');
  console.log('-'.repeat(60));

  const allModules = new Set([
    ...Object.keys(entry1.modules),
    ...Object.keys(entry2.modules),
  ]);

  const changes: Array<{ name: string; before: number; after: number; diff: number }> = [];

  for (const mod of allModules) {
    const before = entry1.modules[mod]?.score || 0;
    const after = entry2.modules[mod]?.score || 0;
    const diff = after - before;

    if (Math.abs(diff) > 0.1) {
      changes.push({ name: mod, before, after, diff });
    }
  }

  changes.sort((a, b) => b.diff - a.diff);

  for (const change of changes) {
    const diffStr = change.diff >= 0 ? `+${change.diff.toFixed(1)}%` : `${change.diff.toFixed(1)}%`;
    const status = change.diff >= 0 ? '✅' : '❌';
    console.log(`  ${status} ${change.name.padEnd(25)} ${change.before.toFixed(1)}% → ${change.after.toFixed(1)}% (${diffStr})`);
  }

  if (changes.length === 0) {
    console.log('  No significant changes in module scores.');
  }
}

// CLI execution
const args = process.argv.slice(2);
const command = args[0] || 'show';

if (args.includes('--help')) {
  console.log(`
Mutation Trends Tracking Script

Usage:
  npx tsx scripts/mutation-trends.ts [command] [options]

Commands:
  record      Record current mutation score from latest report
  show        Display trend data (default)
  compare     Compare first and last entries

Options:
  --count <n>  Number of entries to show (default: 10)
  --help       Show this help message

Examples:
  npx tsx scripts/mutation-trends.ts record
  npx tsx scripts/mutation-trends.ts show --count 20
  npx tsx scripts/mutation-trends.ts compare
`);
  process.exit(0);
}

switch (command) {
  case 'record':
    recordScores();
    break;
  case 'show': {
    const countIdx = args.indexOf('--count');
    const count = countIdx >= 0 ? parseInt(args[countIdx + 1], 10) : 10;
    showTrends(count);
    break;
  }
  case 'compare': {
    const idx1 = parseInt(args[1], 10) || 0;
    const idx2 = parseInt(args[2], 10) || -1;
    compareEntries(idx1, idx2);
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Use --help for usage information.');
    process.exit(1);
}

export { loadTrends, extractScores, TrendsData, TrendEntry };
