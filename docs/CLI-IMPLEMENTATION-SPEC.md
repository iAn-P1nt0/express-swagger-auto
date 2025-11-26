# CLI Implementation Specification

This document provides TypeScript interfaces, implementation details, and step-by-step instructions for implementing the planned CLI enhancements.

## Implementation Order

Execute in this order to maintain dependencies and enable incremental testing:

1. **Phase 7.1a** - `stats` command (standalone, no dependencies)
2. **Phase 7.1b** - Extended output formats (enhances existing validate)
3. **Phase 7.1c** - Shell completion (standalone)
4. **Phase 7.2a** - `diff` command (standalone)
5. **Phase 7.2b** - `lint` command (can use diff engine for some rules)
6. **Phase 7.3a** - `bundle` command (standalone)
7. **Phase 7.3b** - `mock` command (uses bundle for $ref resolution)
8. **Phase 7.3c** - `score` command (uses stats + lint results)
9. **Phase 7.3d** - `preview` command (extends serve)

---

## Phase 7.1a: Stats Command

### File: `src/cli/commands/stats.ts`

```typescript
import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface StatsOptions {
  format: 'text' | 'json' | 'markdown';
  ci: boolean;
}

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
  };
  schemas: {
    components: number;
    inline: number;
  };
  parameters: {
    path: number;
    query: number;
    header: number;
    cookie: number;
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
}

export function calculateStats(spec: any): ApiStats {
  // Implementation here
}

export function formatStatsText(stats: ApiStats): string {
  // Implementation here
}

export function formatStatsMarkdown(stats: ApiStats): string {
  // Implementation here
}

export function createStatsCommand(): Command {
  return new Command('stats')
    .description('Display statistics about an OpenAPI specification')
    .argument('[specPath]', 'Path to OpenAPI spec', './openapi.json')
    .option('-f, --format <format>', 'Output format (text|json|markdown)', 'text')
    .option('--ci', 'CI mode with structured output', false)
    .action(async (specPath: string, options: StatsOptions) => {
      // Implementation here
    });
}
```

### Implementation Steps:

1. Create `src/cli/commands/` directory structure
2. Implement `calculateStats()` function:
   - Parse spec file (JSON/YAML)
   - Count operations by method
   - Calculate path depths
   - Count component vs inline schemas
   - Calculate documentation coverage
   - Analyze security coverage
   - Build tag distribution
3. Implement formatters (text, JSON, markdown)
4. Add command to main CLI
5. Write tests in `test/cli/stats.test.ts`

### Test Cases:
- Empty spec handling
- Full spec with all features
- Spec with no security
- Spec with inline schemas only
- JSON and YAML input formats
- All output formats

---

## Phase 7.1b: Extended Output Formats

### File: `src/cli/formatters/index.ts`

```typescript
export interface ValidationResult {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  line?: number;
  column?: number;
}

export interface FormatterOptions {
  specPath: string;
  results: ValidationResult[];
  stats?: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

// Checkstyle XML format
export function formatCheckstyle(options: FormatterOptions): string {
  const { specPath, results } = options;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<checkstyle version="4.3">\n';
  xml += `  <file name="${specPath}">\n`;
  
  for (const result of results) {
    const severity = result.severity === 'info' ? 'info' : result.severity;
    xml += `    <error line="${result.line || 0}" column="${result.column || 0}" `;
    xml += `severity="${severity}" message="${escapeXml(result.message)}" `;
    xml += `source="${result.ruleId}" />\n`;
  }
  
  xml += '  </file>\n';
  xml += '</checkstyle>';
  return xml;
}

// JUnit XML format
export function formatJunit(options: FormatterOptions): string {
  const { specPath, results, stats } = options;
  const failures = stats?.errors || 0;
  const tests = results.length || 1;
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuite name="OpenAPI Validation" tests="${tests}" failures="${failures}">\n`;
  
  for (const result of results) {
    xml += `  <testcase name="${result.ruleId}" classname="${specPath}">\n`;
    if (result.severity === 'error') {
      xml += `    <failure message="${escapeXml(result.message)}" type="${result.ruleId}">\n`;
      xml += `      ${result.path}\n`;
      xml += '    </failure>\n';
    }
    xml += '  </testcase>\n';
  }
  
  xml += '</testsuite>';
  return xml;
}

// GitHub Actions annotations
export function formatGitHubActions(options: FormatterOptions): string {
  const { specPath, results } = options;
  const lines: string[] = [];
  
  for (const result of results) {
    const level = result.severity === 'error' ? 'error' : 'warning';
    const line = result.line ? `,line=${result.line}` : '';
    const col = result.column ? `,col=${result.column}` : '';
    lines.push(`::${level} file=${specPath}${line}${col}::${result.message}`);
  }
  
  return lines.join('\n');
}

// Stylish terminal format
export function formatStylish(options: FormatterOptions): string {
  // Implementation with colors and aligned columns
}

// Code Climate JSON
export function formatCodeClimate(options: FormatterOptions): string {
  const issues = options.results.map(result => ({
    type: 'issue',
    check_name: result.ruleId,
    description: result.message,
    categories: ['Style'],
    severity: result.severity === 'error' ? 'major' : 'minor',
    location: {
      path: options.specPath,
      lines: { begin: result.line || 1 }
    }
  }));
  return JSON.stringify(issues, null, 2);
}

// Markdown table format
export function formatMarkdown(options: FormatterOptions): string {
  let md = '## OpenAPI Validation Results\n\n';
  md += '| Severity | Rule | Message | Location |\n';
  md += '|----------|------|---------|----------|\n';
  
  for (const result of options.results) {
    const icon = result.severity === 'error' ? '🔴' : '🟡';
    md += `| ${icon} ${result.severity} | ${result.ruleId} | ${result.message} | ${result.path} |\n`;
  }
  
  return md;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

### Implementation Steps:

1. Create `src/cli/formatters/` directory
2. Implement each formatter function
3. Update validate command to use formatters
4. Add `--ci-format` option values: `checkstyle`, `junit`, `github-actions`, `stylish`, `codeclimate`, `markdown`
5. Write tests for each formatter

### Integration with validate command:

```typescript
// In src/cli.ts validate command
.option('--ci-format <format>', 
  'CI output format (text|json|sarif|checkstyle|junit|github-actions|stylish|codeclimate|markdown)', 
  'text')
```

---

## Phase 7.1c: Shell Completion

### File: `src/cli/commands/completion.ts`

```typescript
import { Command } from 'commander';

export function createCompletionCommand(program: Command): Command {
  return new Command('completion')
    .description('Generate shell completion script')
    .argument('[shell]', 'Shell type (bash|zsh|fish|powershell)', 'bash')
    .action((shell: string) => {
      switch (shell) {
        case 'bash':
          console.log(generateBashCompletion(program));
          break;
        case 'zsh':
          console.log(generateZshCompletion(program));
          break;
        case 'fish':
          console.log(generateFishCompletion(program));
          break;
        case 'powershell':
          console.log(generatePowerShellCompletion(program));
          break;
        default:
          console.error(`Unknown shell: ${shell}`);
          process.exit(1);
      }
    });
}

function generateBashCompletion(program: Command): string {
  const commands = program.commands.map(c => c.name()).join(' ');
  
  return `
# express-swagger-auto bash completion
_express_swagger_auto_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="${commands}"

  case "\${prev}" in
    express-swagger-auto)
      COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
      return 0
      ;;
    generate)
      COMPREPLY=( $(compgen -W "--input --output --format --watch --config --strategies --ci" -- \${cur}) )
      return 0
      ;;
    validate)
      COMPREPLY=( $(compgen -f -W "--strict --ci --ci-format --security-audit" -- \${cur}) )
      return 0
      ;;
    stats)
      COMPREPLY=( $(compgen -f -W "--format --ci" -- \${cur}) )
      return 0
      ;;
    *)
      COMPREPLY=( $(compgen -f -- \${cur}) )
      return 0
      ;;
  esac
}
complete -F _express_swagger_auto_completions express-swagger-auto
`.trim();
}

function generateZshCompletion(program: Command): string {
  // Similar implementation for zsh
}

function generateFishCompletion(program: Command): string {
  // Similar implementation for fish
}

function generatePowerShellCompletion(program: Command): string {
  // Similar implementation for PowerShell
}
```

### Implementation Steps:

1. Create completion command file
2. Generate completion scripts dynamically from Commander program
3. Include all commands and their options
4. Add to main CLI
5. Test with each shell

---

## Phase 7.2a: Diff Command

### File: `src/cli/commands/diff.ts`

```typescript
import { Command } from 'commander';

export interface DiffOptions {
  failOnBreaking: boolean;
  failOnAny: boolean;
  format: 'text' | 'json' | 'markdown';
  breakingOnly: boolean;
  ci: boolean;
}

export interface DiffChange {
  type: 'breaking' | 'non-breaking' | 'deprecation';
  category: string;
  path: string;
  method?: string;
  description: string;
  details?: string;
}

export interface DiffResult {
  source: { title: string; version: string };
  target: { title: string; version: string };
  breaking: DiffChange[];
  nonBreaking: DiffChange[];
  deprecations: DiffChange[];
  summary: {
    breaking: number;
    nonBreaking: number;
    deprecations: number;
  };
}

export class OpenAPIDiffer {
  constructor(
    private sourceSpec: any,
    private targetSpec: any
  ) {}

  diff(): DiffResult {
    const breaking: DiffChange[] = [];
    const nonBreaking: DiffChange[] = [];
    const deprecations: DiffChange[] = [];

    // Compare paths
    this.diffPaths(breaking, nonBreaking, deprecations);
    
    // Compare schemas
    this.diffSchemas(breaking, nonBreaking, deprecations);
    
    // Compare security
    this.diffSecurity(breaking, nonBreaking, deprecations);

    return {
      source: {
        title: this.sourceSpec.info?.title || 'Unknown',
        version: this.sourceSpec.info?.version || '0.0.0'
      },
      target: {
        title: this.targetSpec.info?.title || 'Unknown',
        version: this.targetSpec.info?.version || '0.0.0'
      },
      breaking,
      nonBreaking,
      deprecations,
      summary: {
        breaking: breaking.length,
        nonBreaking: nonBreaking.length,
        deprecations: deprecations.length
      }
    };
  }

  private diffPaths(
    breaking: DiffChange[],
    nonBreaking: DiffChange[],
    deprecations: DiffChange[]
  ): void {
    const sourcePaths = Object.keys(this.sourceSpec.paths || {});
    const targetPaths = Object.keys(this.targetSpec.paths || {});

    // Removed paths (breaking)
    for (const path of sourcePaths) {
      if (!targetPaths.includes(path)) {
        breaking.push({
          type: 'breaking',
          category: 'path-removed',
          path,
          description: `Endpoint removed: ${path}`
        });
      }
    }

    // Added paths (non-breaking)
    for (const path of targetPaths) {
      if (!sourcePaths.includes(path)) {
        nonBreaking.push({
          type: 'non-breaking',
          category: 'path-added',
          path,
          description: `New endpoint: ${path}`
        });
      }
    }

    // Changed paths
    for (const path of sourcePaths) {
      if (targetPaths.includes(path)) {
        this.diffOperations(
          path,
          this.sourceSpec.paths[path],
          this.targetSpec.paths[path],
          breaking,
          nonBreaking,
          deprecations
        );
      }
    }
  }

  private diffOperations(
    path: string,
    sourceOps: any,
    targetOps: any,
    breaking: DiffChange[],
    nonBreaking: DiffChange[],
    deprecations: DiffChange[]
  ): void {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

    for (const method of methods) {
      const sourceOp = sourceOps[method];
      const targetOp = targetOps[method];

      if (sourceOp && !targetOp) {
        // Method removed (breaking)
        breaking.push({
          type: 'breaking',
          category: 'operation-removed',
          path,
          method: method.toUpperCase(),
          description: `${method.toUpperCase()} ${path} removed`
        });
      } else if (!sourceOp && targetOp) {
        // Method added (non-breaking)
        nonBreaking.push({
          type: 'non-breaking',
          category: 'operation-added',
          path,
          method: method.toUpperCase(),
          description: `${method.toUpperCase()} ${path} added`
        });
      } else if (sourceOp && targetOp) {
        // Check for deprecation
        if (!sourceOp.deprecated && targetOp.deprecated) {
          deprecations.push({
            type: 'deprecation',
            category: 'operation-deprecated',
            path,
            method: method.toUpperCase(),
            description: `${method.toUpperCase()} ${path} deprecated`
          });
        }

        // Diff parameters
        this.diffParameters(path, method, sourceOp, targetOp, breaking, nonBreaking);
        
        // Diff responses
        this.diffResponses(path, method, sourceOp, targetOp, breaking, nonBreaking);
      }
    }
  }

  private diffParameters(
    path: string,
    method: string,
    sourceOp: any,
    targetOp: any,
    breaking: DiffChange[],
    nonBreaking: DiffChange[]
  ): void {
    const sourceParams = sourceOp.parameters || [];
    const targetParams = targetOp.parameters || [];

    // Check for new required parameters (breaking)
    for (const targetParam of targetParams) {
      const sourceParam = sourceParams.find(
        (p: any) => p.name === targetParam.name && p.in === targetParam.in
      );

      if (!sourceParam && targetParam.required) {
        breaking.push({
          type: 'breaking',
          category: 'parameter-added-required',
          path,
          method: method.toUpperCase(),
          description: `Required parameter added: ${targetParam.name} (${targetParam.in})`
        });
      } else if (!sourceParam && !targetParam.required) {
        nonBreaking.push({
          type: 'non-breaking',
          category: 'parameter-added-optional',
          path,
          method: method.toUpperCase(),
          description: `Optional parameter added: ${targetParam.name} (${targetParam.in})`
        });
      }
    }

    // Check for removed parameters (breaking if required)
    for (const sourceParam of sourceParams) {
      const targetParam = targetParams.find(
        (p: any) => p.name === sourceParam.name && p.in === sourceParam.in
      );

      if (!targetParam) {
        breaking.push({
          type: 'breaking',
          category: 'parameter-removed',
          path,
          method: method.toUpperCase(),
          description: `Parameter removed: ${sourceParam.name} (${sourceParam.in})`
        });
      }
    }
  }

  private diffResponses(
    path: string,
    method: string,
    sourceOp: any,
    targetOp: any,
    breaking: DiffChange[],
    nonBreaking: DiffChange[]
  ): void {
    const sourceResponses = Object.keys(sourceOp.responses || {});
    const targetResponses = Object.keys(targetOp.responses || {});

    // Removed response codes (breaking)
    for (const code of sourceResponses) {
      if (!targetResponses.includes(code)) {
        breaking.push({
          type: 'breaking',
          category: 'response-removed',
          path,
          method: method.toUpperCase(),
          description: `Response ${code} removed`
        });
      }
    }

    // Added response codes (non-breaking)
    for (const code of targetResponses) {
      if (!sourceResponses.includes(code)) {
        nonBreaking.push({
          type: 'non-breaking',
          category: 'response-added',
          path,
          method: method.toUpperCase(),
          description: `Response ${code} added`
        });
      }
    }
  }

  private diffSchemas(
    breaking: DiffChange[],
    nonBreaking: DiffChange[],
    deprecations: DiffChange[]
  ): void {
    const sourceSchemas = Object.keys(this.sourceSpec.components?.schemas || {});
    const targetSchemas = Object.keys(this.targetSpec.components?.schemas || {});

    // Note: Schema changes are complex - this is a simplified version
    // Full implementation should recursively compare schema properties
    
    for (const schema of sourceSchemas) {
      if (!targetSchemas.includes(schema)) {
        breaking.push({
          type: 'breaking',
          category: 'schema-removed',
          path: `#/components/schemas/${schema}`,
          description: `Schema removed: ${schema}`
        });
      }
    }

    for (const schema of targetSchemas) {
      if (!sourceSchemas.includes(schema)) {
        nonBreaking.push({
          type: 'non-breaking',
          category: 'schema-added',
          path: `#/components/schemas/${schema}`,
          description: `Schema added: ${schema}`
        });
      }
    }
  }

  private diffSecurity(
    breaking: DiffChange[],
    nonBreaking: DiffChange[],
    deprecations: DiffChange[]
  ): void {
    // Compare security schemes
    const sourceSchemes = Object.keys(this.sourceSpec.components?.securitySchemes || {});
    const targetSchemes = Object.keys(this.targetSpec.components?.securitySchemes || {});

    for (const scheme of sourceSchemes) {
      if (!targetSchemes.includes(scheme)) {
        breaking.push({
          type: 'breaking',
          category: 'security-scheme-removed',
          path: `#/components/securitySchemes/${scheme}`,
          description: `Security scheme removed: ${scheme}`
        });
      }
    }
  }
}

export function createDiffCommand(): Command {
  return new Command('diff')
    .description('Compare two OpenAPI specifications for breaking changes')
    .argument('<source>', 'Source/old OpenAPI spec file')
    .argument('<target>', 'Target/new OpenAPI spec file')
    .option('--fail-on-breaking', 'Exit with error on breaking changes', false)
    .option('--fail-on-any', 'Exit with error on any changes', false)
    .option('-f, --format <format>', 'Output format (text|json|markdown)', 'text')
    .option('--breaking-only', 'Show only breaking changes', false)
    .option('--ci', 'CI mode with structured output', false)
    .action(async (source: string, target: string, options: DiffOptions) => {
      // Implementation
    });
}
```

### Implementation Steps:

1. Create `src/cli/commands/diff.ts`
2. Implement `OpenAPIDiffer` class with:
   - Path comparison (added/removed/changed)
   - Operation comparison (methods, parameters, responses)
   - Schema comparison (properties, types)
   - Security comparison
3. Implement formatters (text, JSON, markdown)
4. Add command to main CLI
5. Write comprehensive tests

### Express-Specific Enhancements:

```typescript
// Add to OpenAPIDiffer class
private detectExpressPatterns(): void {
  // Detect middleware changes (from x-middleware extension)
  // Detect route pattern evolution
  // Detect validation schema changes
}
```

---

## Phase 7.2b: Lint Command

### File: `src/cli/commands/lint.ts`

```typescript
import { Command } from 'commander';

export interface LintRule {
  id: string;
  description: string;
  severity: 'error' | 'warn' | 'off';
  category: 'structure' | 'documentation' | 'security' | 'express' | 'style';
  check: (spec: any, path?: string) => LintViolation[];
}

export interface LintViolation {
  ruleId: string;
  severity: 'error' | 'warn';
  message: string;
  path: string;
  line?: number;
  suggestion?: string;
}

export interface LintConfig {
  extends?: 'minimal' | 'recommended' | 'strict';
  rules?: Record<string, 'error' | 'warn' | 'off'>;
}

// Built-in rules
export const builtInRules: LintRule[] = [
  {
    id: 'operation-operationId',
    description: 'Operations must have operationId',
    severity: 'error',
    category: 'structure',
    check: (spec) => {
      const violations: LintViolation[] = [];
      for (const [path, pathItem] of Object.entries(spec.paths || {})) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
          const op = (pathItem as any)[method];
          if (op && !op.operationId) {
            violations.push({
              ruleId: 'operation-operationId',
              severity: 'error',
              message: 'Operation is missing operationId',
              path: `paths.${path}.${method}`
            });
          }
        }
      }
      return violations;
    }
  },
  {
    id: 'operation-summary',
    description: 'Operations should have summary',
    severity: 'warn',
    category: 'documentation',
    check: (spec) => {
      // Implementation
      return [];
    }
  },
  {
    id: 'operation-tags',
    description: 'Operations should have tags',
    severity: 'warn',
    category: 'documentation',
    check: (spec) => {
      // Implementation
      return [];
    }
  },
  {
    id: 'no-unused-schemas',
    description: 'Schemas should be referenced',
    severity: 'warn',
    category: 'structure',
    check: (spec) => {
      // Implementation
      return [];
    }
  },
  {
    id: 'security-defined',
    description: 'Security schemes should be defined',
    severity: 'error',
    category: 'security',
    check: (spec) => {
      // Implementation
      return [];
    }
  },
  // Express-specific rules
  {
    id: 'express/consistent-path-params',
    description: 'Path parameters should follow Express conventions',
    severity: 'warn',
    category: 'express',
    check: (spec) => {
      // Check for :param vs {param} consistency
      return [];
    }
  },
  {
    id: 'express/error-responses',
    description: 'Operations should have error responses',
    severity: 'warn',
    category: 'express',
    check: (spec) => {
      // Check for 4xx/5xx responses
      return [];
    }
  }
];

// Rulesets
export const rulesets: Record<string, Record<string, 'error' | 'warn' | 'off'>> = {
  minimal: {
    'operation-operationId': 'off',
    'operation-summary': 'off',
    'operation-tags': 'off',
    'no-unused-schemas': 'off',
    'security-defined': 'warn'
  },
  recommended: {
    'operation-operationId': 'error',
    'operation-summary': 'warn',
    'operation-tags': 'warn',
    'no-unused-schemas': 'warn',
    'security-defined': 'error',
    'express/consistent-path-params': 'warn',
    'express/error-responses': 'warn'
  },
  strict: {
    'operation-operationId': 'error',
    'operation-summary': 'error',
    'operation-tags': 'error',
    'no-unused-schemas': 'error',
    'security-defined': 'error',
    'express/consistent-path-params': 'error',
    'express/error-responses': 'error'
  }
};

export class Linter {
  private rules: Map<string, LintRule> = new Map();
  private config: Record<string, 'error' | 'warn' | 'off'>;

  constructor(config: LintConfig = { extends: 'recommended' }) {
    // Load built-in rules
    for (const rule of builtInRules) {
      this.rules.set(rule.id, rule);
    }

    // Apply ruleset
    this.config = { ...rulesets[config.extends || 'recommended'] };
    
    // Override with custom rules
    if (config.rules) {
      Object.assign(this.config, config.rules);
    }
  }

  lint(spec: any): LintViolation[] {
    const violations: LintViolation[] = [];

    for (const [ruleId, severity] of Object.entries(this.config)) {
      if (severity === 'off') continue;

      const rule = this.rules.get(ruleId);
      if (!rule) continue;

      const ruleViolations = rule.check(spec);
      for (const violation of ruleViolations) {
        violation.severity = severity as 'error' | 'warn';
        violations.push(violation);
      }
    }

    return violations;
  }
}

export function createLintCommand(): Command {
  return new Command('lint')
    .description('Lint OpenAPI specification with configurable rules')
    .argument('[specPath]', 'Path to OpenAPI spec', './openapi.json')
    .option('--ruleset <ruleset>', 'Built-in ruleset (minimal|recommended|strict)', 'recommended')
    .option('-c, --config <path>', 'Custom ruleset config file')
    .option('-f, --format <format>', 'Output format', 'stylish')
    .option('--fail-severity <level>', 'Fail on severity (error|warn)', 'error')
    .option('--ignore <patterns...>', 'Paths to ignore')
    .action(async (specPath: string, options) => {
      // Implementation
    });
}
```

### Implementation Steps:

1. Create `src/cli/commands/lint.ts`
2. Implement built-in rules (start with ~15 rules)
3. Implement ruleset loading and merging
4. Create config file loader (`.swagger-auto-lint.yaml`)
5. Implement output formatters
6. Add command to main CLI
7. Write tests for each rule

---

## Testing Strategy

### Unit Tests
- Each command in isolation
- Each formatter function
- Each linting rule
- Diff engine comparisons

### Integration Tests
- Full CLI command execution
- Config file loading
- CI mode output validation
- Exit code verification

### Snapshot Tests
- Output format snapshots
- Stats output snapshots
- Diff output snapshots

### Test File Location
```
test/
├── cli/
│   ├── commands/
│   │   ├── stats.test.ts
│   │   ├── diff.test.ts
│   │   ├── lint.test.ts
│   │   └── completion.test.ts
│   ├── formatters/
│   │   ├── checkstyle.test.ts
│   │   ├── junit.test.ts
│   │   └── github-actions.test.ts
│   └── fixtures/
│       ├── minimal-spec.yaml
│       ├── full-spec.yaml
│       ├── spec-v1.yaml
│       └── spec-v2.yaml
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    // No new dependencies needed for Phase 7.1
  },
  "devDependencies": {
    // For testing
  }
}
```

Phase 7.2+ dependencies (add when implementing):
```json
{
  "dependencies": {
    "json-diff": "^1.0.6"  // For deep object comparison in diff
  }
}
```

---

## Migration Notes

### Non-Breaking Changes
- All new commands are additive
- Existing validate command enhanced with new formats
- Config file format unchanged

### Backward Compatibility
- Existing CLI interface preserved
- New options are optional with sensible defaults
- No changes to programmatic API
