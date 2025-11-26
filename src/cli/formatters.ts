/**
 * Extended Output Formatters for CI/CD Integration
 * Provides multiple output formats for validation and lint results
 */

export interface ValidationResult {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface FormatterOptions {
  specPath: string;
  results: ValidationResult[];
  stats?: {
    errors: number;
    warnings: number;
    infos: number;
  };
  duration?: number;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format results as Checkstyle XML
 * Compatible with Jenkins, SonarQube, and other static analysis tools
 */
export function formatCheckstyle(options: FormatterOptions): string {
  const { specPath, results } = options;
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<checkstyle version="4.3">\n';
  xml += `  <file name="${escapeXml(specPath)}">\n`;
  
  for (const result of results) {
    const severity = result.severity === 'info' ? 'info' : result.severity;
    xml += '    <error';
    xml += ` line="${result.line || 1}"`;
    xml += ` column="${result.column || 1}"`;
    xml += ` severity="${severity}"`;
    xml += ` message="${escapeXml(result.message)}"`;
    xml += ` source="${escapeXml(result.ruleId)}"`;
    xml += ' />\n';
  }
  
  xml += '  </file>\n';
  xml += '</checkstyle>';
  
  return xml;
}

/**
 * Format results as JUnit XML
 * Compatible with test runners and CI dashboards
 */
export function formatJunit(options: FormatterOptions): string {
  const { specPath, results, stats, duration } = options;
  const failures = stats?.errors || 0;
  const tests = Math.max(results.length, 1);
  const time = duration ? (duration / 1000).toFixed(3) : '0.000';
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuite name="OpenAPI Validation" tests="${tests}" failures="${failures}" errors="0" time="${time}">\n`;
  
  if (results.length === 0) {
    xml += `  <testcase name="validation" classname="${escapeXml(specPath)}" time="${time}" />\n`;
  } else {
    for (const result of results) {
      xml += `  <testcase name="${escapeXml(result.ruleId)}" classname="${escapeXml(specPath)}" time="0.001">\n`;
      
      if (result.severity === 'error') {
        xml += `    <failure message="${escapeXml(result.message)}" type="${escapeXml(result.ruleId)}">\n`;
        xml += `Path: ${result.path}\n`;
        if (result.line) {
          xml += `Line: ${result.line}\n`;
        }
        if (result.suggestion) {
          xml += `Suggestion: ${result.suggestion}\n`;
        }
        xml += '    </failure>\n';
      } else if (result.severity === 'warning') {
        xml += '    <system-out>\n';
        xml += `Warning: ${result.message}\n`;
        xml += `Path: ${result.path}\n`;
        xml += '    </system-out>\n';
      }
      
      xml += '  </testcase>\n';
    }
  }
  
  xml += '</testsuite>';
  
  return xml;
}

/**
 * Format results as GitHub Actions annotations
 * Creates inline annotations in PR diffs
 */
export function formatGitHubActions(options: FormatterOptions): string {
  const { specPath, results } = options;
  const lines: string[] = [];
  
  for (const result of results) {
    const level = result.severity === 'error' ? 'error' : 'warning';
    const parts: string[] = [`::${level} file=${specPath}`];
    
    if (result.line) {
      parts.push(`line=${result.line}`);
    }
    if (result.column) {
      parts.push(`col=${result.column}`);
    }
    
    // GitHub Actions message format: ::level file=path,line=n,col=n::message
    const location = parts.join(',');
    lines.push(`${location}::${result.message} (${result.ruleId})`);
  }
  
  // Add summary
  const errors = results.filter(r => r.severity === 'error').length;
  const warnings = results.filter(r => r.severity === 'warning').length;
  
  if (errors > 0 || warnings > 0) {
    lines.push('');
    lines.push(`::group::Validation Summary`);
    lines.push(`Total issues: ${results.length}`);
    lines.push(`Errors: ${errors}`);
    lines.push(`Warnings: ${warnings}`);
    lines.push('::endgroup::');
  }
  
  return lines.join('\n');
}

/**
 * Format results in stylish terminal format
 * Condensed, colored output for terminals
 */
export function formatStylish(options: FormatterOptions): string {
  const { specPath, results, stats } = options;
  const lines: string[] = [];
  
  if (results.length === 0) {
    lines.push(`✓ ${specPath} - No issues found`);
    return lines.join('\n');
  }
  
  lines.push('');
  lines.push(specPath);
  
  // Group by severity
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const infos = results.filter(r => r.severity === 'info');
  
  for (const result of [...errors, ...warnings, ...infos]) {
    const line = result.line ? String(result.line).padStart(4) : '   -';
    const col = result.column ? String(result.column).padStart(3) : '  -';
    const severity = result.severity === 'error' ? 'error  ' : 
                     result.severity === 'warning' ? 'warning' : 'info   ';
    
    lines.push(`  ${line}:${col}  ${severity}  ${result.message}  ${result.ruleId}`);
  }
  
  lines.push('');
  
  const errorCount = stats?.errors || errors.length;
  const warningCount = stats?.warnings || warnings.length;
  
  if (errorCount > 0 || warningCount > 0) {
    const parts: string[] = [];
    if (errorCount > 0) parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
    if (warningCount > 0) parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
    lines.push(`✖ ${parts.join(', ')}`);
  }
  
  return lines.join('\n');
}

/**
 * Format results as Code Climate JSON
 * Compatible with Code Climate quality tracking
 */
export function formatCodeClimate(options: FormatterOptions): string {
  const { specPath, results } = options;
  
  const issues = results.map((result, index) => ({
    type: 'issue',
    check_name: result.ruleId,
    description: result.message,
    content: {
      body: result.suggestion || `Path: ${result.path}`
    },
    categories: ['Style'],
    severity: result.severity === 'error' ? 'major' : 
              result.severity === 'warning' ? 'minor' : 'info',
    fingerprint: `${result.ruleId}-${result.path}-${index}`,
    location: {
      path: specPath,
      lines: {
        begin: result.line || 1,
        end: result.line || 1
      }
    }
  }));
  
  return JSON.stringify(issues, null, 2);
}

/**
 * Format results as Markdown
 * Suitable for PR comments and documentation
 */
export function formatMarkdown(options: FormatterOptions): string {
  const { specPath, results, stats, duration } = options;
  const lines: string[] = [];
  
  lines.push('## 📋 OpenAPI Validation Results');
  lines.push('');
  lines.push(`**File:** \`${specPath}\``);
  
  if (duration !== undefined) {
    lines.push(`**Duration:** ${duration}ms`);
  }
  
  lines.push('');
  
  if (results.length === 0) {
    lines.push('✅ **No issues found!**');
    return lines.join('\n');
  }
  
  // Summary
  const errors = results.filter(r => r.severity === 'error').length;
  const warnings = results.filter(r => r.severity === 'warning').length;
  const infos = results.filter(r => r.severity === 'info').length;
  
  lines.push('### Summary');
  lines.push('');
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  if (errors > 0) lines.push(`| 🔴 Errors | ${errors} |`);
  if (warnings > 0) lines.push(`| 🟡 Warnings | ${warnings} |`);
  if (infos > 0) lines.push(`| 🔵 Info | ${infos} |`);
  lines.push('');
  
  // Details table
  lines.push('### Details');
  lines.push('');
  lines.push('| Severity | Rule | Message | Location |');
  lines.push('|----------|------|---------|----------|');
  
  for (const result of results) {
    const icon = result.severity === 'error' ? '🔴' : 
                 result.severity === 'warning' ? '🟡' : '🔵';
    const location = result.line ? `L${result.line}` : result.path;
    lines.push(`| ${icon} | \`${result.ruleId}\` | ${result.message} | ${location} |`);
  }
  
  return lines.join('\n');
}

/**
 * Format results as GitLab Code Quality JSON
 * Compatible with GitLab CI/CD code quality reports
 */
export function formatGitLabCodeQuality(options: FormatterOptions): string {
  const { specPath, results } = options;
  
  const issues = results.map((result, index) => ({
    description: result.message,
    check_name: result.ruleId,
    fingerprint: `${result.ruleId}-${result.path}-${index}`,
    severity: result.severity === 'error' ? 'critical' : 
              result.severity === 'warning' ? 'major' : 'minor',
    location: {
      path: specPath,
      lines: {
        begin: result.line || 1
      }
    }
  }));
  
  return JSON.stringify(issues, null, 2);
}

/**
 * Get formatter by name
 */
export function getFormatter(format: string): (options: FormatterOptions) => string {
  const formatters: Record<string, (options: FormatterOptions) => string> = {
    checkstyle: formatCheckstyle,
    junit: formatJunit,
    'github-actions': formatGitHubActions,
    stylish: formatStylish,
    codeclimate: formatCodeClimate,
    markdown: formatMarkdown,
    gitlab: formatGitLabCodeQuality,
  };
  
  const formatter = formatters[format.toLowerCase()];
  if (!formatter) {
    throw new Error(`Unknown format: ${format}. Available: ${Object.keys(formatters).join(', ')}`);
  }
  
  return formatter;
}

/**
 * List available formats
 */
export function getAvailableFormats(): string[] {
  return ['text', 'json', 'sarif', 'checkstyle', 'junit', 'github-actions', 'stylish', 'codeclimate', 'markdown', 'gitlab'];
}
