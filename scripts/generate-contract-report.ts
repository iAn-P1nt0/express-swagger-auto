#!/usr/bin/env node
/**
 * Contract Report Generation Script
 * Generates detailed reports about OpenAPI specification compliance
 * 
 * Usage:
 *   npx tsx scripts/generate-contract-report.ts <spec-path>
 *   npx tsx scripts/generate-contract-report.ts ./openapi.json --format markdown
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ContractReport {
  timestamp: string;
  specPath: string;
  summary: ReportSummary;
  compliance: ComplianceReport;
  coverage: CoverageReport;
  security: SecurityReport;
  quality: QualityReport;
}

interface ReportSummary {
  openapi: string;
  title: string;
  version: string;
  status: 'passing' | 'failing' | 'warning';
  totalIssues: number;
  errorCount: number;
  warningCount: number;
}

interface ComplianceReport {
  structureValid: boolean;
  referencesValid: boolean;
  operationsValid: boolean;
  issues: ComplianceIssue[];
}

interface ComplianceIssue {
  category: string;
  rule: string;
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

interface CoverageReport {
  pathCount: number;
  operationCount: number;
  schemaCount: number;
  operationsByMethod: Record<string, number>;
  operationsWithSummary: number;
  operationsWithDescription: number;
  operationsWithOperationId: number;
  operationsWithTags: number;
  responseCoverage: ResponseCoverage;
}

interface ResponseCoverage {
  withSuccessResponse: number;
  withErrorResponse: number;
  with4xxResponse: number;
  with5xxResponse: number;
}

interface SecurityReport {
  hasSecuritySchemes: boolean;
  hasGlobalSecurity: boolean;
  securitySchemes: string[];
  unsecuredOperations: number;
  sensitivePaths: string[];
}

interface QualityReport {
  score: number;
  maxScore: number;
  percentage: number;
  checks: QualityCheck[];
}

interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
}

/**
 * Load OpenAPI spec from file
 */
function loadSpec(specPath: string): any {
  const content = fs.readFileSync(specPath, 'utf-8');
  
  if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
    return yaml.load(content);
  }
  
  return JSON.parse(content);
}

/**
 * Check structural compliance
 */
function checkCompliance(spec: any): ComplianceReport {
  const issues: ComplianceIssue[] = [];
  let structureValid = true;
  let referencesValid = true;
  let operationsValid = true;

  // Structure validation
  if (!spec.openapi || !spec.openapi.match(/^3\.[01]\.\d+$/)) {
    structureValid = false;
    issues.push({
      category: 'structure',
      rule: 'openapi-version',
      path: '/openapi',
      message: 'Invalid or missing OpenAPI version',
      severity: 'error',
    });
  }

  if (!spec.info?.title || !spec.info?.version) {
    structureValid = false;
    issues.push({
      category: 'structure',
      rule: 'info-required',
      path: '/info',
      message: 'Missing required info.title or info.version',
      severity: 'error',
    });
  }

  if (!spec.paths) {
    structureValid = false;
    issues.push({
      category: 'structure',
      rule: 'paths-required',
      path: '/paths',
      message: 'Missing required paths object',
      severity: 'error',
    });
  }

  // Reference validation
  const refs = collectRefs(spec);
  for (const ref of refs) {
    if (!resolveRef(spec, ref.value)) {
      referencesValid = false;
      issues.push({
        category: 'references',
        rule: 'valid-reference',
        path: ref.path,
        message: `Unresolved reference: ${ref.value}`,
        severity: 'error',
      });
    }
  }

  // Operation validation
  const operationIds = new Set<string>();
  const methods = ['get', 'post', 'put', 'patch', 'delete'];

  if (spec.paths) {
    for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
      for (const method of methods) {
        const op = (pathItem as any)?.[method];
        if (!op) continue;

        if (!op.responses || Object.keys(op.responses).length === 0) {
          operationsValid = false;
          issues.push({
            category: 'operations',
            rule: 'responses-required',
            path: `/paths/${pathKey}/${method}`,
            message: 'Operation must have responses',
            severity: 'error',
          });
        }

        if (op.operationId && operationIds.has(op.operationId)) {
          operationsValid = false;
          issues.push({
            category: 'operations',
            rule: 'unique-operationId',
            path: `/paths/${pathKey}/${method}`,
            message: `Duplicate operationId: ${op.operationId}`,
            severity: 'error',
          });
        }
        if (op.operationId) operationIds.add(op.operationId);
      }
    }
  }

  return {
    structureValid,
    referencesValid,
    operationsValid,
    issues,
  };
}

/**
 * Collect all $ref values in the spec
 */
function collectRefs(obj: any, currentPath: string = ''): Array<{ path: string; value: string }> {
  const refs: Array<{ path: string; value: string }> = [];

  if (!obj || typeof obj !== 'object') return refs;

  if (obj.$ref && typeof obj.$ref === 'string') {
    refs.push({ path: currentPath, value: obj.$ref });
  }

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      value.forEach((item, i) => refs.push(...collectRefs(item, `${currentPath}/${key}/${i}`)));
    } else if (typeof value === 'object' && value !== null) {
      refs.push(...collectRefs(value, `${currentPath}/${key}`));
    }
  }

  return refs;
}

/**
 * Resolve a $ref to its target
 */
function resolveRef(spec: any, ref: string): any {
  if (!ref.startsWith('#/')) return null;

  const parts = ref.slice(2).split('/');
  let target = spec;

  for (const part of parts) {
    if (!target || typeof target !== 'object') return null;
    target = target[part];
  }

  return target;
}

/**
 * Calculate coverage statistics
 */
function calculateCoverage(spec: any): CoverageReport {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const operationsByMethod: Record<string, number> = {};
  let operationCount = 0;
  let withSummary = 0;
  let withDescription = 0;
  let withOperationId = 0;
  let withTags = 0;
  let withSuccess = 0;
  let withError = 0;
  let with4xx = 0;
  let with5xx = 0;

  if (spec.paths) {
    for (const pathItem of Object.values(spec.paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) continue;

      for (const method of methods) {
        const op = (pathItem as any)[method];
        if (!op) continue;

        operationCount++;
        operationsByMethod[method] = (operationsByMethod[method] || 0) + 1;

        if (op.summary) withSummary++;
        if (op.description) withDescription++;
        if (op.operationId) withOperationId++;
        if (op.tags && op.tags.length > 0) withTags++;

        if (op.responses) {
          const codes = Object.keys(op.responses);
          if (codes.some((c) => c.startsWith('2'))) withSuccess++;
          if (codes.some((c) => c.startsWith('4') || c.startsWith('5'))) withError++;
          if (codes.some((c) => c.startsWith('4'))) with4xx++;
          if (codes.some((c) => c.startsWith('5'))) with5xx++;
        }
      }
    }
  }

  return {
    pathCount: spec.paths ? Object.keys(spec.paths).length : 0,
    operationCount,
    schemaCount: spec.components?.schemas ? Object.keys(spec.components.schemas).length : 0,
    operationsByMethod,
    operationsWithSummary: withSummary,
    operationsWithDescription: withDescription,
    operationsWithOperationId: withOperationId,
    operationsWithTags: withTags,
    responseCoverage: {
      withSuccessResponse: withSuccess,
      withErrorResponse: withError,
      with4xxResponse: with4xx,
      with5xxResponse: with5xx,
    },
  };
}

/**
 * Analyze security configuration
 */
function analyzeSecurity(spec: any): SecurityReport {
  const methods = ['post', 'put', 'patch', 'delete'];
  const sensitivePaths = ['/users', '/admin', '/auth', '/account'];
  const foundSensitive: string[] = [];
  let unsecuredCount = 0;

  const hasSecuritySchemes =
    spec.components?.securitySchemes &&
    Object.keys(spec.components.securitySchemes).length > 0;

  const hasGlobalSecurity = spec.security && spec.security.length > 0;

  if (spec.paths) {
    for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
      const isSensitive = sensitivePaths.some((p) => pathKey.toLowerCase().includes(p));
      if (isSensitive) foundSensitive.push(pathKey);

      for (const method of methods) {
        const op = (pathItem as any)?.[method];
        if (!op) continue;

        const hasSecurity =
          op.security !== undefined ? op.security.length > 0 : hasGlobalSecurity;

        if (!hasSecurity) unsecuredCount++;
      }
    }
  }

  return {
    hasSecuritySchemes,
    hasGlobalSecurity,
    securitySchemes: spec.components?.securitySchemes
      ? Object.keys(spec.components.securitySchemes)
      : [],
    unsecuredOperations: unsecuredCount,
    sensitivePaths: foundSensitive,
  };
}

/**
 * Calculate quality score
 */
function calculateQuality(spec: any, coverage: CoverageReport, security: SecurityReport): QualityReport {
  const checks: QualityCheck[] = [];
  let totalScore = 0;
  let maxScore = 0;

  // Check: Valid OpenAPI version (10 points)
  const hasValidVersion = spec.openapi?.match(/^3\.[01]\.\d+$/);
  checks.push({
    name: 'Valid OpenAPI version',
    passed: !!hasValidVersion,
    score: hasValidVersion ? 10 : 0,
    maxScore: 10,
    message: hasValidVersion ? 'Using OpenAPI 3.x' : 'Missing or invalid OpenAPI version',
  });
  totalScore += hasValidVersion ? 10 : 0;
  maxScore += 10;

  // Check: Has description (5 points)
  const hasDescription = !!spec.info?.description;
  checks.push({
    name: 'API description',
    passed: hasDescription,
    score: hasDescription ? 5 : 0,
    maxScore: 5,
    message: hasDescription ? 'API has description' : 'Consider adding an API description',
  });
  totalScore += hasDescription ? 5 : 0;
  maxScore += 5;

  // Check: OperationIds coverage (15 points)
  const opIdCoverage = coverage.operationCount > 0
    ? (coverage.operationsWithOperationId / coverage.operationCount) * 100
    : 100;
  const opIdScore = Math.round((opIdCoverage / 100) * 15);
  checks.push({
    name: 'OperationId coverage',
    passed: opIdCoverage >= 80,
    score: opIdScore,
    maxScore: 15,
    message: `${opIdCoverage.toFixed(0)}% of operations have operationId`,
  });
  totalScore += opIdScore;
  maxScore += 15;

  // Check: Summary/description coverage (10 points)
  const summaryCount = Math.max(coverage.operationsWithSummary, coverage.operationsWithDescription);
  const summaryCoverage = coverage.operationCount > 0
    ? (summaryCount / coverage.operationCount) * 100
    : 100;
  const summaryScore = Math.round((summaryCoverage / 100) * 10);
  checks.push({
    name: 'Operation documentation',
    passed: summaryCoverage >= 80,
    score: summaryScore,
    maxScore: 10,
    message: `${summaryCoverage.toFixed(0)}% of operations have summary/description`,
  });
  totalScore += summaryScore;
  maxScore += 10;

  // Check: Tags coverage (10 points)
  const tagsCoverage = coverage.operationCount > 0
    ? (coverage.operationsWithTags / coverage.operationCount) * 100
    : 100;
  const tagsScore = Math.round((tagsCoverage / 100) * 10);
  checks.push({
    name: 'Tags organization',
    passed: tagsCoverage >= 80,
    score: tagsScore,
    maxScore: 10,
    message: `${tagsCoverage.toFixed(0)}% of operations have tags`,
  });
  totalScore += tagsScore;
  maxScore += 10;

  // Check: Error responses (15 points)
  const errorCoverage = coverage.operationCount > 0
    ? (coverage.responseCoverage.withErrorResponse / coverage.operationCount) * 100
    : 100;
  const errorScore = Math.round((errorCoverage / 100) * 15);
  checks.push({
    name: 'Error response coverage',
    passed: errorCoverage >= 50,
    score: errorScore,
    maxScore: 15,
    message: `${errorCoverage.toFixed(0)}% of operations have error responses`,
  });
  totalScore += errorScore;
  maxScore += 15;

  // Check: Security (15 points)
  const securityScore = security.hasSecuritySchemes || security.hasGlobalSecurity ? 15 : 0;
  checks.push({
    name: 'Security configuration',
    passed: securityScore > 0,
    score: securityScore,
    maxScore: 15,
    message: securityScore > 0
      ? `Security schemes defined: ${security.securitySchemes.join(', ') || 'global'}`
      : 'Consider adding security schemes',
  });
  totalScore += securityScore;
  maxScore += 15;

  // Check: Component schemas (10 points)
  const hasSchemas = coverage.schemaCount > 0;
  checks.push({
    name: 'Component schemas',
    passed: hasSchemas,
    score: hasSchemas ? 10 : 5,
    maxScore: 10,
    message: hasSchemas
      ? `${coverage.schemaCount} schemas defined`
      : 'Consider using component schemas for reusability',
  });
  totalScore += hasSchemas ? 10 : 5;
  maxScore += 10;

  // Check: Server configuration (5 points)
  const hasServers = spec.servers && spec.servers.length > 0;
  checks.push({
    name: 'Server configuration',
    passed: hasServers,
    score: hasServers ? 5 : 0,
    maxScore: 5,
    message: hasServers
      ? `${spec.servers.length} server(s) configured`
      : 'Consider adding server URLs',
  });
  totalScore += hasServers ? 5 : 0;
  maxScore += 5;

  return {
    score: totalScore,
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    checks,
  };
}

/**
 * Generate full contract report
 */
function generateContractReport(specPath: string): ContractReport {
  const spec = loadSpec(specPath);
  const compliance = checkCompliance(spec);
  const coverage = calculateCoverage(spec);
  const security = analyzeSecurity(spec);
  const quality = calculateQuality(spec, coverage, security);

  const errorCount = compliance.issues.filter((i) => i.severity === 'error').length;
  const warningCount = compliance.issues.filter((i) => i.severity === 'warning').length;

  let status: 'passing' | 'failing' | 'warning' = 'passing';
  if (errorCount > 0) status = 'failing';
  else if (warningCount > 0) status = 'warning';

  return {
    timestamp: new Date().toISOString(),
    specPath,
    summary: {
      openapi: spec.openapi || 'unknown',
      title: spec.info?.title || 'unknown',
      version: spec.info?.version || 'unknown',
      status,
      totalIssues: compliance.issues.length,
      errorCount,
      warningCount,
    },
    compliance,
    coverage,
    security,
    quality,
  };
}

/**
 * Format report as markdown
 */
function formatMarkdown(report: ContractReport): string {
  let md = `# OpenAPI Contract Report

**Generated:** ${report.timestamp}  
**File:** ${report.specPath}

## Summary

| Property | Value |
|----------|-------|
| OpenAPI Version | ${report.summary.openapi} |
| Title | ${report.summary.title} |
| Version | ${report.summary.version} |
| Status | ${report.summary.status === 'passing' ? '✅ Passing' : report.summary.status === 'warning' ? '⚠️ Warning' : '❌ Failing'} |
| Errors | ${report.summary.errorCount} |
| Warnings | ${report.summary.warningCount} |

## Coverage

| Metric | Count |
|--------|-------|
| Paths | ${report.coverage.pathCount} |
| Operations | ${report.coverage.operationCount} |
| Schemas | ${report.coverage.schemaCount} |
| With OperationId | ${report.coverage.operationsWithOperationId} (${report.coverage.operationCount > 0 ? Math.round((report.coverage.operationsWithOperationId / report.coverage.operationCount) * 100) : 100}%) |
| With Summary | ${report.coverage.operationsWithSummary} (${report.coverage.operationCount > 0 ? Math.round((report.coverage.operationsWithSummary / report.coverage.operationCount) * 100) : 100}%) |
| With Tags | ${report.coverage.operationsWithTags} (${report.coverage.operationCount > 0 ? Math.round((report.coverage.operationsWithTags / report.coverage.operationCount) * 100) : 100}%) |

## Quality Score: ${report.quality.percentage}%

| Check | Score | Status |
|-------|-------|--------|
`;

  for (const check of report.quality.checks) {
    md += `| ${check.name} | ${check.score}/${check.maxScore} | ${check.passed ? '✅' : '❌'} |\n`;
  }

  if (report.compliance.issues.length > 0) {
    md += `\n## Issues\n\n`;

    const errors = report.compliance.issues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      md += `### Errors\n\n`;
      for (const issue of errors) {
        md += `- **[${issue.rule}]** ${issue.path}: ${issue.message}\n`;
      }
    }

    const warnings = report.compliance.issues.filter((i) => i.severity === 'warning');
    if (warnings.length > 0) {
      md += `\n### Warnings\n\n`;
      for (const issue of warnings) {
        md += `- **[${issue.rule}]** ${issue.path}: ${issue.message}\n`;
      }
    }
  }

  md += `\n## Security\n\n`;
  md += `- Security Schemes: ${report.security.hasSecuritySchemes ? report.security.securitySchemes.join(', ') : 'None'}\n`;
  md += `- Global Security: ${report.security.hasGlobalSecurity ? 'Yes' : 'No'}\n`;
  md += `- Unsecured Operations: ${report.security.unsecuredOperations}\n`;

  return md;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Contract Report Generation Script

Usage:
  npx tsx scripts/generate-contract-report.ts <spec-path> [options]

Options:
  --format <type>  Output format: json, markdown (default: text)
  --output <file>  Write report to file
  --help           Show this help message

Examples:
  npx tsx scripts/generate-contract-report.ts ./openapi.json
  npx tsx scripts/generate-contract-report.ts ./openapi.yaml --format markdown
  npx tsx scripts/generate-contract-report.ts ./openapi.json --format json --output report.json
`);
    process.exit(0);
  }

  const specPath = args.find((a) => !a.startsWith('--'));
  const formatIdx = args.indexOf('--format');
  const format = formatIdx >= 0 ? args[formatIdx + 1] : 'text';
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : null;

  if (!specPath) {
    console.error('Error: spec path is required');
    process.exit(1);
  }

  if (!fs.existsSync(specPath)) {
    console.error(`Error: file not found: ${specPath}`);
    process.exit(1);
  }

  try {
    const report = generateContractReport(specPath);
    let output: string;

    if (format === 'json') {
      output = JSON.stringify(report, null, 2);
    } else if (format === 'markdown') {
      output = formatMarkdown(report);
    } else {
      // Text format
      output = formatMarkdown(report);
    }

    if (outputPath) {
      fs.writeFileSync(outputPath, output);
      console.log(`Report saved to: ${outputPath}`);
    } else {
      console.log(output);
    }

    process.exit(report.summary.status === 'failing' ? 1 : 0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

export { generateContractReport, ContractReport };
