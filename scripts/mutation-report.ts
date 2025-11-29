#!/usr/bin/env node
/**
 * Mutation Report Generation Script
 * Generates summary of mutation testing results from Stryker JSON report
 *
 * Usage:
 *   npx tsx scripts/mutation-report.ts [report-path]
 *   npx tsx scripts/mutation-report.ts ./reports/mutation/mutation-report.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface MutantResult {
  id: string;
  mutatorName: string;
  replacement?: string;
  status: 'Killed' | 'Survived' | 'Timeout' | 'NoCoverage' | 'Ignored' | 'RuntimeError' | 'CompileError';
  statusReason?: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  fileName: string;
}

interface StrykerReport {
  schemaVersion: string;
  thresholds: {
    high: number;
    low: number;
  };
  projectRoot: string;
  files: Record<
    string,
    {
      language: string;
      mutants: MutantResult[];
      source?: string;
    }
  >;
  testFiles?: Record<string, unknown>;
  framework?: {
    name: string;
    version: string;
  };
}

interface ModuleSummary {
  name: string;
  total: number;
  killed: number;
  survived: number;
  timeout: number;
  noCoverage: number;
  ignored: number;
  runtimeError: number;
  compileError: number;
  score: number;
}

interface MutationSummary {
  timestamp: string;
  reportPath: string;
  overall: {
    total: number;
    killed: number;
    survived: number;
    timeout: number;
    noCoverage: number;
    score: number;
  };
  byModule: ModuleSummary[];
  byMutator: Record<string, { total: number; killed: number; survived: number }>;
  survivedMutants: Array<{
    file: string;
    mutator: string;
    location: { line: number; column: number };
    status: string;
  }>;
  recommendations: string[];
}

/**
 * Calculate mutation score
 */
function calculateScore(killed: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((killed / total) * 10000) / 100;
}

/**
 * Parse Stryker JSON report
 */
function parseMutationReport(reportPath: string): StrykerReport {
  const content = fs.readFileSync(reportPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Extract module name from file path
 */
function getModuleName(filePath: string): string {
  // Extract first directory after 'src/'
  const match = filePath.match(/src\/([^/]+)/);
  if (match) return match[1];

  // Fallback to filename without extension
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Generate mutation summary from Stryker report
 */
function generateSummary(report: StrykerReport, reportPath: string): MutationSummary {
  const moduleStats: Record<string, ModuleSummary> = {};
  const mutatorStats: Record<string, { total: number; killed: number; survived: number }> = {};
  const survivedMutants: MutationSummary['survivedMutants'] = [];

  let totalMutants = 0;
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalTimeout = 0;
  let totalNoCoverage = 0;

  for (const [fileName, fileData] of Object.entries(report.files)) {
    const moduleName = getModuleName(fileName);

    if (!moduleStats[moduleName]) {
      moduleStats[moduleName] = {
        name: moduleName,
        total: 0,
        killed: 0,
        survived: 0,
        timeout: 0,
        noCoverage: 0,
        ignored: 0,
        runtimeError: 0,
        compileError: 0,
        score: 0,
      };
    }

    for (const mutant of fileData.mutants) {
      const mod = moduleStats[moduleName];
      mod.total++;
      totalMutants++;

      // Track by mutator type
      if (!mutatorStats[mutant.mutatorName]) {
        mutatorStats[mutant.mutatorName] = { total: 0, killed: 0, survived: 0 };
      }
      mutatorStats[mutant.mutatorName].total++;

      switch (mutant.status) {
        case 'Killed':
          mod.killed++;
          totalKilled++;
          mutatorStats[mutant.mutatorName].killed++;
          break;
        case 'Survived':
          mod.survived++;
          totalSurvived++;
          mutatorStats[mutant.mutatorName].survived++;
          survivedMutants.push({
            file: fileName,
            mutator: mutant.mutatorName,
            location: mutant.location.start,
            status: mutant.status,
          });
          break;
        case 'Timeout':
          mod.timeout++;
          totalTimeout++;
          mutatorStats[mutant.mutatorName].killed++; // Timeout is treated as killed
          break;
        case 'NoCoverage':
          mod.noCoverage++;
          totalNoCoverage++;
          break;
        case 'Ignored':
          mod.ignored++;
          break;
        case 'RuntimeError':
          mod.runtimeError++;
          break;
        case 'CompileError':
          mod.compileError++;
          break;
      }
    }
  }

  // Calculate scores for each module
  const byModule = Object.values(moduleStats)
    .map((mod) => ({
      ...mod,
      score: calculateScore(mod.killed + mod.timeout, mod.total - mod.ignored),
    }))
    .sort((a, b) => a.score - b.score);

  // Generate recommendations
  const recommendations: string[] = [];

  // Find weak modules (score < 80%)
  const weakModules = byModule.filter((m) => m.score < 80 && m.total > 0);
  if (weakModules.length > 0) {
    recommendations.push(
      `Focus on improving test coverage for: ${weakModules.map((m) => m.name).join(', ')}`
    );
  }

  // Find weak mutators
  for (const [mutator, stats] of Object.entries(mutatorStats)) {
    const score = calculateScore(stats.killed, stats.total);
    if (score < 70 && stats.total > 5) {
      recommendations.push(`Add more tests for ${mutator} mutations (${score}% killed)`);
    }
  }

  // Check for uncovered mutations
  if (totalNoCoverage > totalMutants * 0.1) {
    recommendations.push(
      `${totalNoCoverage} mutants have no test coverage - consider adding tests`
    );
  }

  return {
    timestamp: new Date().toISOString(),
    reportPath,
    overall: {
      total: totalMutants,
      killed: totalKilled,
      survived: totalSurvived,
      timeout: totalTimeout,
      noCoverage: totalNoCoverage,
      score: calculateScore(totalKilled + totalTimeout, totalMutants),
    },
    byModule,
    byMutator: mutatorStats,
    survivedMutants: survivedMutants.slice(0, 50), // Limit to first 50
    recommendations,
  };
}

/**
 * Format summary as text
 */
function formatText(summary: MutationSummary): string {
  let output = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                        MUTATION TESTING SUMMARY                                 ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Generated: ${summary.timestamp.padEnd(65)}║
╚════════════════════════════════════════════════════════════════════════════════╝

OVERALL SCORE: ${summary.overall.score}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Mutants:    ${summary.overall.total}
  Killed:           ${summary.overall.killed}
  Survived:         ${summary.overall.survived}
  Timeout:          ${summary.overall.timeout}
  No Coverage:      ${summary.overall.noCoverage}

MODULE SCORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // Find max module name length for formatting
  const maxNameLen = Math.max(...summary.byModule.map((m) => m.name.length), 20);

  output += `${'Module'.padEnd(maxNameLen)} | Score   | Killed | Survived | Total\n`;
  output += `${'-'.repeat(maxNameLen)}-+---------+--------+----------+-------\n`;

  for (const mod of summary.byModule) {
    const status = mod.score >= 85 ? '✅' : mod.score >= 70 ? '⚠️' : '❌';
    output += `${mod.name.padEnd(maxNameLen)} | ${status} ${mod.score.toString().padStart(4)}% | ${mod.killed
      .toString()
      .padStart(6)} | ${mod.survived.toString().padStart(8)} | ${mod.total.toString().padStart(5)}\n`;
  }

  if (summary.recommendations.length > 0) {
    output += `
RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    for (const rec of summary.recommendations) {
      output += `  • ${rec}\n`;
    }
  }

  if (summary.survivedMutants.length > 0) {
    output += `
SURVIVED MUTANTS (first ${Math.min(10, summary.survivedMutants.length)})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    for (const mutant of summary.survivedMutants.slice(0, 10)) {
      output += `  ${mutant.file}:${mutant.location.line} - ${mutant.mutator}\n`;
    }
    if (summary.survivedMutants.length > 10) {
      output += `  ... and ${summary.survivedMutants.length - 10} more\n`;
    }
  }

  return output;
}

/**
 * Format summary as markdown
 */
function formatMarkdown(summary: MutationSummary): string {
  let md = `# Mutation Testing Report

**Generated:** ${summary.timestamp}

## Overall Score: ${summary.overall.score}%

| Metric | Count |
|--------|-------|
| Total Mutants | ${summary.overall.total} |
| Killed | ${summary.overall.killed} |
| Survived | ${summary.overall.survived} |
| Timeout | ${summary.overall.timeout} |
| No Coverage | ${summary.overall.noCoverage} |

## Module Scores

| Module | Score | Status | Killed | Survived | Total |
|--------|-------|--------|--------|----------|-------|
`;

  for (const mod of summary.byModule) {
    const status = mod.score >= 85 ? '✅' : mod.score >= 70 ? '⚠️' : '❌';
    md += `| ${mod.name} | ${mod.score}% | ${status} | ${mod.killed} | ${mod.survived} | ${mod.total} |\n`;
  }

  if (summary.recommendations.length > 0) {
    md += `\n## Recommendations\n\n`;
    for (const rec of summary.recommendations) {
      md += `- ${rec}\n`;
    }
  }

  md += `\n## Mutator Statistics\n\n`;
  md += `| Mutator | Total | Killed | Survived | Score |\n`;
  md += `|---------|-------|--------|----------|-------|\n`;

  for (const [mutator, stats] of Object.entries(summary.byMutator)) {
    const score = calculateScore(stats.killed, stats.total);
    md += `| ${mutator} | ${stats.total} | ${stats.killed} | ${stats.survived} | ${score}% |\n`;
  }

  return md;
}

// CLI execution
const args = process.argv.slice(2);
const defaultReportPath = './reports/mutation/mutation-report.json';

if (args.includes('--help')) {
  console.log(`
Mutation Report Generation Script

Usage:
  npx tsx scripts/mutation-report.ts [report-path] [options]

Arguments:
  report-path     Path to Stryker JSON report (default: ${defaultReportPath})

Options:
  --format <type>  Output format: text, markdown, json (default: text)
  --output <file>  Write report to file
  --help           Show this help message

Examples:
  npx tsx scripts/mutation-report.ts
  npx tsx scripts/mutation-report.ts ./reports/mutation/mutation-report.json
  npx tsx scripts/mutation-report.ts --format markdown --output MUTATION_SUMMARY.md
`);
  process.exit(0);
}

const reportPath = args.find((a) => !a.startsWith('--')) || defaultReportPath;
const formatIdx = args.indexOf('--format');
const format = formatIdx >= 0 ? args[formatIdx + 1] : 'text';
const outputIdx = args.indexOf('--output');
const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : null;

if (!fs.existsSync(reportPath)) {
  console.error(`Error: Report file not found: ${reportPath}`);
  console.error(`\nRun mutation tests first: pnpm test:mutation`);
  process.exit(1);
}

try {
  const report = parseMutationReport(reportPath);
  const summary = generateSummary(report, reportPath);

  let output: string;
  switch (format) {
    case 'json':
      output = JSON.stringify(summary, null, 2);
      break;
    case 'markdown':
      output = formatMarkdown(summary);
      break;
    default:
      output = formatText(summary);
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, output);
    console.log(`Report saved to: ${outputPath}`);
  } else {
    console.log(output);
  }

  // Exit with error if score is below threshold
  if (summary.overall.score < 65) {
    process.exit(1);
  }
} catch (error: any) {
  console.error(`Error generating report: ${error.message}`);
  process.exit(1);
}

export { generateSummary, MutationSummary };
