/**
 * API Statistics Calculator
 * Analyzes OpenAPI specifications and provides comprehensive metrics
 */

export interface ApiStats {
  title: string;
  version: string;
  openapi: string;
  operations: {
    total: number;
    byMethod: Record<string, number>;
  };
  paths: {
    total: number;
    maxDepth: number;
    avgDepth: number;
  };
  schemas: {
    components: number;
    inline: number;
    referenced: number;
  };
  parameters: {
    path: number;
    query: number;
    header: number;
    cookie: number;
    total: number;
  };
  documentation: {
    summaries: { count: number; total: number; percentage: number };
    descriptions: { count: number; total: number; percentage: number };
    examples: { count: number; total: number; percentage: number };
  };
  security: {
    coverage: number;
    protectedOperations: number;
    totalOperations: number;
    schemes: string[];
  };
  tags: Record<string, number>;
  responses: {
    total: number;
    byStatusCode: Record<string, number>;
  };
}

export interface StatsOptions {
  format: 'text' | 'json' | 'markdown';
  ci: boolean;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

/**
 * Calculate comprehensive statistics for an OpenAPI specification
 */
export function calculateStats(spec: any): ApiStats {
  const operations = countOperations(spec);
  const paths = analyzePaths(spec);
  const schemas = analyzeSchemas(spec);
  const parameters = countParameters(spec);
  const documentation = analyzeDocumentation(spec, operations.total);
  const security = analyzeSecurity(spec, operations.total);
  const tags = countTags(spec);
  const responses = analyzeResponses(spec);

  return {
    title: spec.info?.title || 'Unknown API',
    version: spec.info?.version || '0.0.0',
    openapi: spec.openapi || spec.swagger || 'unknown',
    operations,
    paths,
    schemas,
    parameters,
    documentation,
    security,
    tags,
    responses,
  };
}

function countOperations(spec: any): { total: number; byMethod: Record<string, number> } {
  const byMethod: Record<string, number> = {};
  let total = 0;

  for (const method of HTTP_METHODS) {
    byMethod[method] = 0;
  }

  for (const pathItem of Object.values(spec.paths || {})) {
    for (const method of HTTP_METHODS) {
      if ((pathItem as any)[method]) {
        byMethod[method]++;
        total++;
      }
    }
  }

  return { total, byMethod };
}

function analyzePaths(spec: any): { total: number; maxDepth: number; avgDepth: number } {
  const pathKeys = Object.keys(spec.paths || {});
  const total = pathKeys.length;

  if (total === 0) {
    return { total: 0, maxDepth: 0, avgDepth: 0 };
  }

  const depths = pathKeys.map((p) => p.split('/').filter(Boolean).length);
  const maxDepth = Math.max(...depths);
  const avgDepth = Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 10) / 10;

  return { total, maxDepth, avgDepth };
}

function analyzeSchemas(spec: any): { components: number; inline: number; referenced: number } {
  const componentSchemas = Object.keys(spec.components?.schemas || {}).length;
  let inlineCount = 0;
  let referencedCount = 0;

  // Count inline schemas and references in paths
  const countInSpec = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;

    if (obj.$ref) {
      referencedCount++;
      return;
    }

    if (obj.type || obj.properties || obj.items || obj.allOf || obj.oneOf || obj.anyOf) {
      // This is an inline schema definition
      if (!obj.$ref) {
        inlineCount++;
      }
    }

    for (const value of Object.values(obj)) {
      if (typeof value === 'object') {
        countInSpec(value);
      }
    }
  };

  countInSpec(spec.paths);

  return {
    components: componentSchemas,
    inline: inlineCount,
    referenced: referencedCount,
  };
}

function countParameters(spec: any): {
  path: number;
  query: number;
  header: number;
  cookie: number;
  total: number;
} {
  const counts = { path: 0, query: 0, header: 0, cookie: 0, total: 0 };

  for (const pathItem of Object.values(spec.paths || {})) {
    // Path-level parameters
    const pathParams = (pathItem as any).parameters || [];
    for (const param of pathParams) {
      const location = param.in as keyof typeof counts;
      if (location in counts) {
        counts[location]++;
        counts.total++;
      }
    }

    // Operation-level parameters
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as any)[method];
      if (operation?.parameters) {
        for (const param of operation.parameters) {
          const location = param.in as keyof typeof counts;
          if (location in counts) {
            counts[location]++;
            counts.total++;
          }
        }
      }
    }
  }

  return counts;
}

function analyzeDocumentation(
  spec: any,
  totalOperations: number
): {
  summaries: { count: number; total: number; percentage: number };
  descriptions: { count: number; total: number; percentage: number };
  examples: { count: number; total: number; percentage: number };
} {
  let summaryCount = 0;
  let descriptionCount = 0;
  let exampleCount = 0;

  for (const pathItem of Object.values(spec.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as any)[method];
      if (operation) {
        if (operation.summary) summaryCount++;
        if (operation.description) descriptionCount++;
        if (hasExamples(operation)) exampleCount++;
      }
    }
  }

  const calcPercentage = (count: number) =>
    totalOperations > 0 ? Math.round((count / totalOperations) * 100) : 0;

  return {
    summaries: {
      count: summaryCount,
      total: totalOperations,
      percentage: calcPercentage(summaryCount),
    },
    descriptions: {
      count: descriptionCount,
      total: totalOperations,
      percentage: calcPercentage(descriptionCount),
    },
    examples: {
      count: exampleCount,
      total: totalOperations,
      percentage: calcPercentage(exampleCount),
    },
  };
}

function hasExamples(operation: any): boolean {
  // Check requestBody examples
  if (operation.requestBody?.content) {
    for (const content of Object.values(operation.requestBody.content)) {
      if ((content as any).example || (content as any).examples) {
        return true;
      }
    }
  }

  // Check response examples
  if (operation.responses) {
    for (const response of Object.values(operation.responses)) {
      if ((response as any).content) {
        for (const content of Object.values((response as any).content)) {
          if ((content as any).example || (content as any).examples) {
            return true;
          }
        }
      }
    }
  }

  // Check parameter examples
  if (operation.parameters) {
    for (const param of operation.parameters) {
      if (param.example || param.examples) {
        return true;
      }
    }
  }

  return false;
}

function analyzeSecurity(
  spec: any,
  totalOperations: number
): {
  coverage: number;
  protectedOperations: number;
  totalOperations: number;
  schemes: string[];
} {
  const schemes = Object.keys(spec.components?.securitySchemes || {});
  const globalSecurity = spec.security && spec.security.length > 0;
  let protectedCount = 0;

  for (const pathItem of Object.values(spec.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as any)[method];
      if (operation) {
        // Operation has explicit security or inherits global security
        const hasSecurity =
          operation.security !== undefined ? operation.security.length > 0 : globalSecurity;

        if (hasSecurity) {
          protectedCount++;
        }
      }
    }
  }

  return {
    coverage: totalOperations > 0 ? Math.round((protectedCount / totalOperations) * 100) : 0,
    protectedOperations: protectedCount,
    totalOperations,
    schemes,
  };
}

function countTags(spec: any): Record<string, number> {
  const tagCounts: Record<string, number> = {};

  for (const pathItem of Object.values(spec.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as any)[method];
      if (operation?.tags) {
        for (const tag of operation.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
  }

  // Sort by count descending
  return Object.fromEntries(Object.entries(tagCounts).sort(([, a], [, b]) => b - a));
}

function analyzeResponses(spec: any): { total: number; byStatusCode: Record<string, number> } {
  const byStatusCode: Record<string, number> = {};
  let total = 0;

  for (const pathItem of Object.values(spec.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as any)[method];
      if (operation?.responses) {
        for (const statusCode of Object.keys(operation.responses)) {
          byStatusCode[statusCode] = (byStatusCode[statusCode] || 0) + 1;
          total++;
        }
      }
    }
  }

  return { total, byStatusCode };
}

/**
 * Format stats as colored terminal text
 */
export function formatStatsText(stats: ApiStats): string {
  const lines: string[] = [];

  // Header
  lines.push(`📊 API Statistics: ${stats.title} v${stats.version}`);
  lines.push(`   OpenAPI ${stats.openapi}`);
  lines.push('');

  // Operations
  lines.push('Operations');
  lines.push(`  Total:     ${stats.operations.total}`);
  for (const [method, count] of Object.entries(stats.operations.byMethod)) {
    if (count > 0) {
      const pct = Math.round((count / stats.operations.total) * 100);
      lines.push(`  ${method.toUpperCase().padEnd(8)}   ${String(count).padStart(3)} (${pct}%)`);
    }
  }
  lines.push('');

  // Paths
  lines.push('Paths');
  lines.push(`  Total:     ${stats.paths.total}`);
  lines.push(`  Max Depth: ${stats.paths.maxDepth}`);
  lines.push(`  Avg Depth: ${stats.paths.avgDepth}`);
  lines.push('');

  // Schemas
  lines.push('Schemas');
  lines.push(`  Components: ${stats.schemas.components}`);
  lines.push(`  Inline:     ${stats.schemas.inline}`);
  lines.push(`  References: ${stats.schemas.referenced}`);
  lines.push('');

  // Parameters
  lines.push('Parameters');
  lines.push(`  Total:  ${stats.parameters.total}`);
  lines.push(`  Path:   ${stats.parameters.path}`);
  lines.push(`  Query:  ${stats.parameters.query}`);
  lines.push(`  Header: ${stats.parameters.header}`);
  lines.push(`  Cookie: ${stats.parameters.cookie}`);
  lines.push('');

  // Documentation Coverage
  lines.push('Documentation Coverage');
  lines.push(
    `  Summaries:     ${formatProgressBar(stats.documentation.summaries.percentage)} ${stats.documentation.summaries.percentage}% (${stats.documentation.summaries.count}/${stats.documentation.summaries.total})`
  );
  lines.push(
    `  Descriptions:  ${formatProgressBar(stats.documentation.descriptions.percentage)} ${stats.documentation.descriptions.percentage}% (${stats.documentation.descriptions.count}/${stats.documentation.descriptions.total})`
  );
  lines.push(
    `  Examples:      ${formatProgressBar(stats.documentation.examples.percentage)} ${stats.documentation.examples.percentage}% (${stats.documentation.examples.count}/${stats.documentation.examples.total})`
  );
  lines.push('');

  // Security
  lines.push('Security');
  lines.push(
    `  Coverage: ${formatProgressBar(stats.security.coverage)} ${stats.security.coverage}% (${stats.security.protectedOperations}/${stats.security.totalOperations} operations)`
  );
  if (stats.security.schemes.length > 0) {
    lines.push(`  Schemes:  ${stats.security.schemes.join(', ')}`);
  } else {
    lines.push('  Schemes:  None defined');
  }
  lines.push('');

  // Tags
  if (Object.keys(stats.tags).length > 0) {
    lines.push('Tags');
    for (const [tag, count] of Object.entries(stats.tags)) {
      lines.push(`  ${tag.padEnd(20)} ${count} operations`);
    }
    lines.push('');
  }

  // Responses
  lines.push('Response Codes');
  const sortedCodes = Object.entries(stats.responses.byStatusCode).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  for (const [code, count] of sortedCodes) {
    const emoji = code.startsWith('2')
      ? '✅'
      : code.startsWith('3')
        ? '↪️'
        : code.startsWith('4')
          ? '⚠️'
          : code.startsWith('5')
            ? '❌'
            : '📋';
    lines.push(`  ${emoji} ${code}: ${count}`);
  }

  return lines.join('\n');
}

function formatProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format stats as markdown table
 */
export function formatStatsMarkdown(stats: ApiStats): string {
  const lines: string[] = [];

  lines.push(`# API Statistics: ${stats.title} v${stats.version}`);
  lines.push('');
  lines.push(`OpenAPI Version: ${stats.openapi}`);
  lines.push('');

  // Operations table
  lines.push('## Operations');
  lines.push('');
  lines.push('| Method | Count | Percentage |');
  lines.push('|--------|-------|------------|');
  lines.push(`| **Total** | **${stats.operations.total}** | 100% |`);
  for (const [method, count] of Object.entries(stats.operations.byMethod)) {
    if (count > 0) {
      const pct = Math.round((count / stats.operations.total) * 100);
      lines.push(`| ${method.toUpperCase()} | ${count} | ${pct}% |`);
    }
  }
  lines.push('');

  // Paths
  lines.push('## Paths');
  lines.push('');
  lines.push(`- **Total Paths:** ${stats.paths.total}`);
  lines.push(`- **Max Depth:** ${stats.paths.maxDepth}`);
  lines.push(`- **Avg Depth:** ${stats.paths.avgDepth}`);
  lines.push('');

  // Documentation Coverage
  lines.push('## Documentation Coverage');
  lines.push('');
  lines.push('| Metric | Coverage | Count |');
  lines.push('|--------|----------|-------|');
  lines.push(
    `| Summaries | ${stats.documentation.summaries.percentage}% | ${stats.documentation.summaries.count}/${stats.documentation.summaries.total} |`
  );
  lines.push(
    `| Descriptions | ${stats.documentation.descriptions.percentage}% | ${stats.documentation.descriptions.count}/${stats.documentation.descriptions.total} |`
  );
  lines.push(
    `| Examples | ${stats.documentation.examples.percentage}% | ${stats.documentation.examples.count}/${stats.documentation.examples.total} |`
  );
  lines.push('');

  // Security
  lines.push('## Security');
  lines.push('');
  lines.push(
    `- **Coverage:** ${stats.security.coverage}% (${stats.security.protectedOperations}/${stats.security.totalOperations} operations)`
  );
  lines.push(
    `- **Schemes:** ${stats.security.schemes.length > 0 ? stats.security.schemes.join(', ') : 'None'}`
  );
  lines.push('');

  // Tags
  if (Object.keys(stats.tags).length > 0) {
    lines.push('## Tags');
    lines.push('');
    lines.push('| Tag | Operations |');
    lines.push('|-----|------------|');
    for (const [tag, count] of Object.entries(stats.tags)) {
      lines.push(`| ${tag} | ${count} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
