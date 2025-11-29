#!/usr/bin/env node
/**
 * Contract Validation Script
 * Validates OpenAPI specifications against contract rules
 * 
 * Usage:
 *   npx tsx scripts/validate-contracts.ts <spec-path>
 *   npx tsx scripts/validate-contracts.ts ./openapi.json --strict
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: SpecInfo;
}

interface ValidationIssue {
  rule: string;
  path: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface SpecInfo {
  openapi: string;
  title: string;
  version: string;
  pathCount: number;
  operationCount: number;
  schemaCount: number;
}

/**
 * Load OpenAPI spec from file (JSON or YAML)
 */
function loadSpec(specPath: string): any {
  const content = fs.readFileSync(specPath, 'utf-8');
  
  if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
    return yaml.load(content);
  }
  
  return JSON.parse(content);
}

/**
 * Validate OpenAPI spec structure
 */
function validateStructure(spec: any, strict: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Required fields
  if (!spec.openapi) {
    issues.push({
      rule: 'openapi-version-required',
      path: '/openapi',
      message: 'Missing required field: openapi',
      severity: 'error',
    });
  } else if (!spec.openapi.match(/^3\.[01]\.\d+$/)) {
    issues.push({
      rule: 'openapi-version-valid',
      path: '/openapi',
      message: `Invalid OpenAPI version: ${spec.openapi}. Expected 3.0.x or 3.1.x`,
      severity: 'error',
    });
  }

  if (!spec.info) {
    issues.push({
      rule: 'info-required',
      path: '/info',
      message: 'Missing required field: info',
      severity: 'error',
    });
  } else {
    if (!spec.info.title) {
      issues.push({
        rule: 'info-title-required',
        path: '/info/title',
        message: 'Missing required field: info.title',
        severity: 'error',
      });
    }
    if (!spec.info.version) {
      issues.push({
        rule: 'info-version-required',
        path: '/info/version',
        message: 'Missing required field: info.version',
        severity: 'error',
      });
    }
    if (strict && !spec.info.description) {
      issues.push({
        rule: 'info-description-recommended',
        path: '/info/description',
        message: 'Missing recommended field: info.description',
        severity: 'warning',
      });
    }
  }

  if (!spec.paths) {
    issues.push({
      rule: 'paths-required',
      path: '/paths',
      message: 'Missing required field: paths',
      severity: 'error',
    });
  }

  return issues;
}

/**
 * Validate operations in paths
 */
function validateOperations(spec: any, strict: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const operationIds = new Set<string>();
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  if (!spec.paths) return issues;

  for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
    if (!pathKey.startsWith('/')) {
      issues.push({
        rule: 'path-starts-with-slash',
        path: `/paths/${pathKey}`,
        message: `Path should start with /: ${pathKey}`,
        severity: 'warning',
      });
    }

    for (const method of methods) {
      const operation = (pathItem as any)?.[method];
      if (!operation) continue;

      const opPath = `/paths/${pathKey}/${method}`;

      // Validate responses
      if (!operation.responses || Object.keys(operation.responses).length === 0) {
        issues.push({
          rule: 'operation-responses-required',
          path: opPath,
          message: 'Operation must have at least one response',
          severity: 'error',
        });
      }

      // Validate operationId
      if (operation.operationId) {
        if (operationIds.has(operation.operationId)) {
          issues.push({
            rule: 'operationId-unique',
            path: opPath,
            message: `Duplicate operationId: ${operation.operationId}`,
            severity: 'error',
          });
        }
        operationIds.add(operation.operationId);
      } else if (strict) {
        issues.push({
          rule: 'operationId-recommended',
          path: opPath,
          message: 'Operation should have operationId',
          severity: 'warning',
        });
      }

      // Strict mode: check for summary/description
      if (strict) {
        if (!operation.summary && !operation.description) {
          issues.push({
            rule: 'operation-description-recommended',
            path: opPath,
            message: 'Operation should have summary or description',
            severity: 'warning',
          });
        }

        if (!operation.tags || operation.tags.length === 0) {
          issues.push({
            rule: 'operation-tags-recommended',
            path: opPath,
            message: 'Operation should have tags for organization',
            severity: 'warning',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Validate schema references
 */
function validateReferences(spec: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const definedSchemas = new Set<string>();

  // Collect defined schemas
  if (spec.components?.schemas) {
    for (const schemaName of Object.keys(spec.components.schemas)) {
      definedSchemas.add(`#/components/schemas/${schemaName}`);
    }
  }

  // Find and validate $refs
  function checkRefs(obj: any, currentPath: string): void {
    if (!obj || typeof obj !== 'object') return;

    if (obj.$ref && typeof obj.$ref === 'string') {
      if (obj.$ref.startsWith('#/')) {
        // Local reference - check if it exists
        const refParts = obj.$ref.split('/');
        let target = spec;
        for (let i = 1; i < refParts.length && target; i++) {
          target = target[refParts[i]];
        }
        if (!target) {
          issues.push({
            rule: 'reference-valid',
            path: currentPath,
            message: `Unresolved reference: ${obj.$ref}`,
            severity: 'error',
          });
        }
      }
    }

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => checkRefs(item, `${currentPath}/${key}/${index}`));
      } else if (typeof value === 'object' && value !== null) {
        checkRefs(value, `${currentPath}/${key}`);
      }
    }
  }

  checkRefs(spec, '');
  return issues;
}

/**
 * Validate security schemes
 */
function validateSecurity(spec: any, strict: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const hasSecuritySchemes =
    spec.components?.securitySchemes &&
    Object.keys(spec.components.securitySchemes).length > 0;
  
  const hasGlobalSecurity = spec.security && spec.security.length > 0;

  if (strict && !hasSecuritySchemes && !hasGlobalSecurity) {
    issues.push({
      rule: 'security-schemes-recommended',
      path: '/components/securitySchemes',
      message: 'Consider adding security schemes for API security',
      severity: 'warning',
    });
  }

  // Check for sensitive paths without security
  const sensitivePaths = ['/users', '/admin', '/auth', '/account', '/settings'];
  const methods = ['post', 'put', 'patch', 'delete'];

  if (spec.paths) {
    for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
      const isSensitive = sensitivePaths.some((p) =>
        pathKey.toLowerCase().includes(p)
      );

      if (isSensitive && strict) {
        for (const method of methods) {
          const operation = (pathItem as any)?.[method];
          if (operation) {
            const hasSecurity =
              operation.security !== undefined
                ? operation.security.length > 0
                : hasGlobalSecurity;

            if (!hasSecurity) {
              issues.push({
                rule: 'sensitive-path-security',
                path: `/paths/${pathKey}/${method}`,
                message: `Sensitive endpoint may need security: ${method.toUpperCase()} ${pathKey}`,
                severity: 'warning',
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

/**
 * Get spec information
 */
function getSpecInfo(spec: any): SpecInfo {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  let operationCount = 0;

  if (spec.paths) {
    for (const pathItem of Object.values(spec.paths)) {
      if (typeof pathItem === 'object' && pathItem !== null) {
        for (const method of methods) {
          if ((pathItem as any)[method]) {
            operationCount++;
          }
        }
      }
    }
  }

  return {
    openapi: spec.openapi || 'unknown',
    title: spec.info?.title || 'unknown',
    version: spec.info?.version || 'unknown',
    pathCount: spec.paths ? Object.keys(spec.paths).length : 0,
    operationCount,
    schemaCount: spec.components?.schemas
      ? Object.keys(spec.components.schemas).length
      : 0,
  };
}

/**
 * Main validation function
 */
function validateContracts(specPath: string, options: { strict?: boolean } = {}): ValidationResult {
  const spec = loadSpec(specPath);
  const strict = options.strict ?? false;

  const allIssues = [
    ...validateStructure(spec, strict),
    ...validateOperations(spec, strict),
    ...validateReferences(spec),
    ...validateSecurity(spec, strict),
  ];

  const errors = allIssues.filter((i) => i.severity === 'error');
  const warnings = allIssues.filter((i) => i.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info: getSpecInfo(spec),
  };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Contract Validation Script

Usage:
  npx tsx scripts/validate-contracts.ts <spec-path> [options]

Options:
  --strict    Enable strict validation mode
  --json      Output results as JSON
  --help      Show this help message

Examples:
  npx tsx scripts/validate-contracts.ts ./openapi.json
  npx tsx scripts/validate-contracts.ts ./openapi.yaml --strict
  npx tsx scripts/validate-contracts.ts ./openapi.json --json
`);
    process.exit(0);
  }

  const specPath = args.find((a) => !a.startsWith('--'));
  const strict = args.includes('--strict');
  const jsonOutput = args.includes('--json');

  if (!specPath) {
    console.error('Error: spec path is required');
    process.exit(1);
  }

  if (!fs.existsSync(specPath)) {
    console.error(`Error: file not found: ${specPath}`);
    process.exit(1);
  }

  try {
    const result = validateContracts(specPath, { strict });

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n📋 Contract Validation Report\n');
      console.log(`File: ${specPath}`);
      console.log(`OpenAPI: ${result.info.openapi}`);
      console.log(`Title: ${result.info.title}`);
      console.log(`Version: ${result.info.version}`);
      console.log(`Paths: ${result.info.pathCount}`);
      console.log(`Operations: ${result.info.operationCount}`);
      console.log(`Schemas: ${result.info.schemaCount}`);
      console.log('');

      if (result.errors.length > 0) {
        console.log('❌ Errors:');
        for (const error of result.errors) {
          console.log(`  • [${error.rule}] ${error.path}: ${error.message}`);
        }
        console.log('');
      }

      if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(`  • [${warning.rule}] ${warning.path}: ${warning.message}`);
        }
        console.log('');
      }

      if (result.valid) {
        console.log('✅ Validation passed!\n');
      } else {
        console.log(`❌ Validation failed with ${result.errors.length} error(s)\n`);
      }
    }

    process.exit(result.valid ? 0 : 1);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

export { validateContracts, ValidationResult, ValidationIssue };
