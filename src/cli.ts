/* eslint-disable no-console */
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

// Simple color functions that work with chalk v5
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
};

// Import internal modules
const { RouteDiscovery } = require('./core/RouteDiscovery');
const { SpecGenerator } = require('./core/SpecGenerator');
const { FileWatcher } = require('./watch/FileWatcher');
const { ConfigLoader, DEFAULT_CONFIG } = require('./config/ConfigLoader');
const configLoader = new ConfigLoader();

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('express-swagger-auto')
  .description('Hybrid OpenAPI 3.x generator for Express.js')
  .version(packageJson.version, '-v, --version', 'Display version');

// ============================================================
// GENERATE COMMAND
// ============================================================

program
  .command('generate')
  .description('Generate OpenAPI specification from Express app')
  .option('-c, --config <path>', 'Path to config file')
  .option('-i, --input <path>', 'Entry point file')
  .option('-o, --output <path>', 'Output path')
  .option('-f, --format <format>', 'Output format (json|yaml)')
  .option('-w, --watch', 'Watch mode - regenerate on file changes', false)
  .option('--title <string>', 'API title')
  .option('--version <string>', 'API version')
  .option('--description <string>', 'API description')
  .option('--strategies <strategies...>', 'Generation strategies (jsdoc,decorator,runtime)')
  .option('--include-paths <patterns...>', 'Include only paths matching patterns')
  .option('--exclude-paths <patterns...>', 'Exclude paths matching patterns')
  .option('--tags <tags...>', 'Include only routes with specified tags')
  .option('--ci', 'CI mode: no colors, JSON output, strict errors', false)
  .option('--ci-format <format>', 'CI output format (text|json|sarif)', 'text')
  .action(async function (options: any) {
    // Track start time for CI output
    const startTime = Date.now();
    const isCiMode = options.ci || process.env.CI === 'true';
    
    // Disable colors in CI mode
    const log = {
      info: (msg: string) => !isCiMode && console.log(colors.blue(msg)),
      success: (msg: string) => !isCiMode && console.log(colors.green(msg)),
      warn: (msg: string) => !isCiMode && console.log(colors.yellow(msg)),
      error: (msg: string) => console.error(isCiMode ? msg : colors.red(msg)),
      dim: (msg: string) => !isCiMode && console.log(colors.dim(msg)),
    };

    try {
      // Load configuration from file
      const configResult = await configLoader.load(options.config);
      
      // Merge config file with CLI options (CLI takes precedence)
      const mergedConfig = configLoader.mergeWithCliOptions(configResult.config, options);
      
      // Validate configuration
      const validation = configLoader.validate(mergedConfig);
      if (!validation.valid) {
        for (const error of validation.errors) {
          log.error(`✗ Config error: ${error}`);
        }
        process.exit(1);
      }

      // Show config source if found
      if (!configResult.isEmpty && configResult.filepath) {
        log.dim(`Using config: ${configResult.filepath}\n`);
      }

      // Use merged config values with fallbacks
      const inputPath = mergedConfig.input || DEFAULT_CONFIG.input;
      const outputPath = mergedConfig.output || DEFAULT_CONFIG.output;
      const outputFormat = mergedConfig.format || 'json';

      const generateSpec = async (): Promise<{ success: boolean; routes?: number; spec?: any }> => {
        // Load Express app dynamically with ESM/CommonJS fallback chain
        let app;
        const resolvedInput = path.resolve(inputPath!);

        // Try loading the app using a smart loader with multiple strategies
        const loadResult = await loadApp(resolvedInput);

        if (!loadResult.success) {
          if (!isCiMode) {
            displayLoadError(loadResult.error, resolvedInput);
          }
          return { success: false };
        }

        app = loadResult.app;

        // Get API info from config, CLI options, or package.json
        const apiInfo = {
          title: mergedConfig.info?.title || getPackageTitle(),
          version: mergedConfig.info?.version || getPackageVersion(),
          description: mergedConfig.info?.description || '',
        };

        // Create generator config
        const generatorConfig = {
          info: apiInfo,
          servers: mergedConfig.servers,
        };

        // Discover routes with strategy options
        const discoveryOptions: any = {};
        if (mergedConfig.strategies) {
          discoveryOptions.enableJsDocParsing = mergedConfig.strategies.includes('jsdoc');
          discoveryOptions.enableDecorators = mergedConfig.strategies.includes('decorator');
          discoveryOptions.enableRuntimeCapture = mergedConfig.strategies.includes('runtime');
        }

        const discovery = new RouteDiscovery(discoveryOptions);
        let routes = discovery.discover(app);

        // Apply route filtering
        if (mergedConfig.routes?.include || mergedConfig.routes?.exclude || mergedConfig.routes?.tags) {
          routes = filterRoutes(routes, mergedConfig.routes);
        }

        // Generate spec
        const generator = new SpecGenerator(generatorConfig);
        const spec = generator.generate(routes);

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath!);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write spec to file in appropriate format
        let outputContent: string;
        let actualOutputPath = outputPath!;
        
        // Detect format from file extension if not explicitly set
        const detectedFormat = actualOutputPath.endsWith('.yaml') || actualOutputPath.endsWith('.yml') 
          ? 'yaml' 
          : outputFormat;

        if (detectedFormat === 'yaml') {
          // Dynamic import yaml package
          try {
            const yaml = require('js-yaml');
            outputContent = yaml.dump(spec, { indent: 2, lineWidth: 120, noRefs: true });
          } catch {
            log.warn('⚠ js-yaml not installed, falling back to JSON output');
            outputContent = JSON.stringify(spec, null, 2);
            if (actualOutputPath.endsWith('.yaml') || actualOutputPath.endsWith('.yml')) {
              actualOutputPath = actualOutputPath.replace(/\.(yaml|yml)$/, '.json');
            }
          }
        } else {
          outputContent = JSON.stringify(spec, null, 2);
        }

        fs.writeFileSync(actualOutputPath, outputContent);
        const specSize = (outputContent.length / 1024).toFixed(2);
        
        if (!isCiMode) {
          log.success(`✓ Updated spec (${routes.length} routes, ${specSize}KB)\n`);
        }
        
        return { success: true, routes: routes.length, spec };
      };

      log.info('📋 Generating OpenAPI specification...\n');

      // Validate input file exists
      const resolvedInput = path.resolve(inputPath!);
      if (!fs.existsSync(resolvedInput)) {
        log.error(`✗ Input file not found: ${inputPath}`);
        if (isCiMode && options.ciFormat === 'json') {
          console.log(JSON.stringify({
            success: false,
            error: `Input file not found: ${inputPath}`,
            duration: Date.now() - startTime,
          }));
        }
        process.exit(1);
      }

      // Initial generation
      const result = await generateSpec();
      if (!result.success) {
        if (isCiMode && options.ciFormat === 'json') {
          console.log(JSON.stringify({
            success: false,
            error: 'Failed to load Express app',
            duration: Date.now() - startTime,
          }));
        }
        process.exit(1);
      }

      // Output CI format
      if (isCiMode) {
        const duration = Date.now() - startTime;
        if (options.ciFormat === 'json') {
          const ciOutput = {
            success: true,
            routes: result.routes,
            outputPath: outputPath,
            format: outputPath?.endsWith('.yaml') || outputPath?.endsWith('.yml') ? 'yaml' : 'json',
            duration,
            config: configResult.filepath || null,
          };
          console.log(JSON.stringify(ciOutput, null, 2));
        } else {
          console.log(`✓ Generated ${result.routes} routes in ${duration}ms → ${outputPath}`);
        }
      } else {
        log.info('✅ Done!\n');
      }

      // Watch mode
      if (options.watch) {
        log.warn('👀 Watch mode enabled. Watching for changes...\n');

        const watchConfig = mergedConfig.watch || DEFAULT_CONFIG.watch;
        const watcher = new FileWatcher({
          paths: watchConfig?.paths || ['src/**', 'lib/**'],
          debounce: watchConfig?.debounce || 500,
          ignored: watchConfig?.ignored || ['node_modules', '.git', 'dist', 'build', '**/*.test.ts', '**/*.spec.ts'],
        });

        watcher.onChange(async (eventType: any, filePath: any) => {
          console.log(colors.yellow(`→ File ${eventType}: ${filePath}`));
          console.log(colors.yellow('→ Regenerating specification...\n'));

          const updated = await generateSpec();
          if (updated) {
            console.log(colors.yellow(`Press Ctrl+C to stop watching\n`));
          }
        });

        await watcher.start();

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n\n' + colors.yellow('👋 Stopping file watcher...\n'));
          await watcher.stop();
          process.exit(0);
        });
      }
    } catch (error) {
      console.error(colors.red(`✗ Error: ${(error as any).message}`));
      process.exit(1);
    }
  });

// ============================================================
// VALIDATE COMMAND
// ============================================================

program
  .command('validate <specPath>')
  .description('Validate OpenAPI specification')
  .option('--strict', 'Enable strict validation mode', false)
  .option('--ci', 'CI mode: no colors, JSON output', false)
  .option('--ci-format <format>', 'CI output format (text|json|sarif)', 'text')
  .option('--fail-on-warnings', 'Exit with error code on warnings', false)
  .option('--security-audit', 'Check for security best practices', false)
  .action(async function (specPath: any, options: any) {
    const startTime = Date.now();
    const isCiMode = options.ci || process.env.CI === 'true';
    
    const log = {
      info: (msg: string) => !isCiMode && console.log(colors.blue(msg)),
      success: (msg: string) => !isCiMode && console.log(colors.green(msg)),
      warn: (msg: string) => !isCiMode && console.log(colors.yellow(msg)),
      error: (msg: string) => console.error(isCiMode ? msg : colors.red(msg)),
    };

    try {
      log.info('🔍 Validating OpenAPI specification...\n');

      // Check file exists
      if (!fs.existsSync(specPath)) {
        log.error(`✗ Specification file not found: ${specPath}`);
        if (isCiMode && options.ciFormat === 'json') {
          console.log(JSON.stringify({ success: false, error: 'File not found', path: specPath }));
        }
        process.exit(1);
      }

      // Parse spec file (JSON or YAML)
      let spec;
      try {
        const content = fs.readFileSync(specPath, 'utf-8');
        if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
          const yaml = require('js-yaml');
          spec = yaml.load(content);
        } else {
          spec = JSON.parse(content);
        }
      } catch (error) {
        log.error(`✗ Failed to parse spec: ${(error as any).message}`);
        if (isCiMode && options.ciFormat === 'json') {
          console.log(JSON.stringify({ success: false, error: 'Parse error', details: (error as any).message }));
        }
        process.exit(1);
      }

      const errors: Array<{ path: string; message: string; severity: 'error' | 'warning' }> = [];
      const warnings: Array<{ path: string; message: string; severity: 'error' | 'warning' }> = [];

      // Basic structure validation
      if (!spec.openapi) {
        errors.push({ path: '/openapi', message: 'Missing required field: openapi', severity: 'error' });
      } else if (!spec.openapi.startsWith('3.')) {
        errors.push({ path: '/openapi', message: `Unsupported OpenAPI version: ${spec.openapi}. Expected 3.x`, severity: 'error' });
      }

      if (!spec.info) {
        errors.push({ path: '/info', message: 'Missing required field: info', severity: 'error' });
      } else {
        if (!spec.info.title) {
          errors.push({ path: '/info/title', message: 'Missing required field: info.title', severity: 'error' });
        }
        if (!spec.info.version) {
          errors.push({ path: '/info/version', message: 'Missing required field: info.version', severity: 'error' });
        }
      }

      if (!spec.paths) {
        errors.push({ path: '/paths', message: 'Missing required field: paths', severity: 'error' });
      }

      // Strict mode validation using ajv
      if (options.strict && errors.length === 0) {
        log.info('→ Running strict schema validation...\n');
        
        const Ajv = require('ajv');
        const addFormats = require('ajv-formats');
        
        const ajv = new Ajv({ 
          allErrors: true, 
          strict: false,
          validateFormats: true,
        });
        addFormats(ajv);

        // Validate schema references
        const schemaErrors = validateSchemaReferences(spec);
        for (const error of schemaErrors) {
          errors.push({ path: error.path, message: error.message, severity: 'error' });
        }

        // Validate operations
        const operationErrors = validateOperations(spec, options.strict);
        for (const error of operationErrors) {
          if (error.severity === 'error') {
            errors.push(error);
          } else {
            warnings.push(error);
          }
        }
      }

      // Security audit
      if (options.securityAudit) {
        log.info('→ Running security audit...\n');
        
        const securityIssues = runSecurityAudit(spec);
        for (const issue of securityIssues) {
          if (issue.severity === 'error') {
            errors.push(issue);
          } else {
            warnings.push(issue);
          }
        }
      }

      // Count paths and operations
      let pathCount = 0;
      let operationCount = 0;
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
      
      for (const [, pathItem] of Object.entries(spec.paths || {})) {
        pathCount++;
        if (typeof pathItem === 'object' && pathItem !== null) {
          for (const method of methods) {
            if ((pathItem as any)[method]) {
              operationCount++;
            }
          }
        }
      }

      // Output results
      const duration = Date.now() - startTime;
      const hasErrors = errors.length > 0;
      const hasWarnings = warnings.length > 0;
      const failed = hasErrors || (options.failOnWarnings && hasWarnings);

      if (isCiMode) {
        if (options.ciFormat === 'json') {
          const output = {
            success: !failed,
            specPath,
            openapi: spec.openapi,
            title: spec.info?.title,
            version: spec.info?.version,
            paths: pathCount,
            operations: operationCount,
            errors: errors.map(e => ({ path: e.path, message: e.message })),
            warnings: warnings.map(w => ({ path: w.path, message: w.message })),
            duration,
          };
          console.log(JSON.stringify(output, null, 2));
        } else if (options.ciFormat === 'sarif') {
          // SARIF format for code quality tools
          const sarif = {
            $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
            version: '2.1.0',
            runs: [{
              tool: {
                driver: {
                  name: 'express-swagger-auto',
                  version: packageJson.version,
                  rules: [
                    { id: 'openapi-structure', shortDescription: { text: 'OpenAPI structure validation' } },
                    { id: 'openapi-security', shortDescription: { text: 'Security best practices' } },
                  ],
                },
              },
              results: [
                ...errors.map(e => ({
                  ruleId: 'openapi-structure',
                  level: 'error',
                  message: { text: e.message },
                  locations: [{ physicalLocation: { artifactLocation: { uri: specPath }, region: { startLine: 1 } } }],
                })),
                ...warnings.map(w => ({
                  ruleId: 'openapi-structure',
                  level: 'warning',
                  message: { text: w.message },
                  locations: [{ physicalLocation: { artifactLocation: { uri: specPath }, region: { startLine: 1 } } }],
                })),
              ],
            }],
          };
          console.log(JSON.stringify(sarif, null, 2));
        } else {
          // Text format for CI
          if (failed) {
            console.log(`✗ Validation failed: ${errors.length} errors, ${warnings.length} warnings`);
          } else {
            console.log(`✓ Validation passed: ${pathCount} paths, ${operationCount} operations (${duration}ms)`);
          }
        }
      } else {
        // Interactive output
        if (errors.length > 0) {
          log.error('✗ Validation errors:\n');
          for (const error of errors) {
            console.log(colors.red(`  • ${error.path}: ${error.message}`));
          }
          console.log('');
        }

        if (warnings.length > 0) {
          log.warn('⚠ Warnings:\n');
          for (const warning of warnings) {
            console.log(colors.yellow(`  • ${warning.path}: ${warning.message}`));
          }
          console.log('');
        }

        if (!hasErrors) {
          log.success('✓ Validation passed!\n');
          console.log(`  OpenAPI Version: ${spec.openapi}`);
          console.log(`  Title: ${spec.info?.title}`);
          console.log(`  Version: ${spec.info?.version}`);
          console.log(`  Paths: ${pathCount}`);
          console.log(`  Operations: ${operationCount}`);
          console.log(`  Duration: ${duration}ms\n`);
        }

        if (hasErrors) {
          log.error(`\n✗ Found ${errors.length} error(s)`);
        }
        if (hasWarnings) {
          log.warn(`⚠ Found ${warnings.length} warning(s)`);
        }
        if (!hasErrors && !hasWarnings) {
          log.info('✅ Done!\n');
        }
      }

      process.exit(failed ? 1 : 0);
    } catch (error) {
      log.error(`✗ Error: ${(error as any).message}`);
      process.exit(1);
    }
  });

/**
 * Validate schema references ($ref)
 */
function validateSchemaReferences(spec: any): Array<{ path: string; message: string }> {
  const errors: Array<{ path: string; message: string }> = [];
  const definedSchemas = new Set<string>();

  // Collect defined schemas
  if (spec.components?.schemas) {
    for (const schemaName of Object.keys(spec.components.schemas)) {
      definedSchemas.add(`#/components/schemas/${schemaName}`);
    }
  }

  // Helper to find $ref recursively
  function findRefs(obj: any, path: string): void {
    if (!obj || typeof obj !== 'object') return;

    if (obj.$ref && typeof obj.$ref === 'string') {
      if (obj.$ref.startsWith('#/') && !definedSchemas.has(obj.$ref)) {
        // Check if it's a local reference
        const refParts = obj.$ref.split('/');
        let target = spec;
        for (let i = 1; i < refParts.length && target; i++) {
          target = target[refParts[i]];
        }
        if (!target) {
          errors.push({ path, message: `Unresolved reference: ${obj.$ref}` });
        }
      }
    }

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => findRefs(item, `${path}/${key}/${index}`));
      } else if (typeof value === 'object' && value !== null) {
        findRefs(value, `${path}/${key}`);
      }
    }
  }

  findRefs(spec, '');
  return errors;
}

/**
 * Validate operations for best practices
 */
function validateOperations(spec: any, strict: boolean): Array<{ path: string; message: string; severity: 'error' | 'warning' }> {
  const issues: Array<{ path: string; message: string; severity: 'error' | 'warning' }> = [];
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  const operationIds = new Set<string>();

  for (const [pathKey, pathItem] of Object.entries(spec.paths || {})) {
    if (typeof pathItem !== 'object' || pathItem === null) continue;

    for (const method of methods) {
      const operation = (pathItem as any)[method];
      if (!operation) continue;

      const opPath = `/paths/${pathKey}/${method}`;

      // Check for operationId
      if (operation.operationId) {
        if (operationIds.has(operation.operationId)) {
          issues.push({ path: opPath, message: `Duplicate operationId: ${operation.operationId}`, severity: 'error' });
        }
        operationIds.add(operation.operationId);
      } else if (strict) {
        issues.push({ path: opPath, message: 'Missing operationId', severity: 'warning' });
      }

      // Check for responses
      if (!operation.responses || Object.keys(operation.responses).length === 0) {
        issues.push({ path: opPath, message: 'Operation must have at least one response', severity: 'error' });
      }

      // Strict mode checks
      if (strict) {
        if (!operation.summary && !operation.description) {
          issues.push({ path: opPath, message: 'Missing summary or description', severity: 'warning' });
        }

        if (!operation.tags || operation.tags.length === 0) {
          issues.push({ path: opPath, message: 'Missing tags', severity: 'warning' });
        }
      }
    }
  }

  return issues;
}

/**
 * Run security audit on the spec
 */
function runSecurityAudit(spec: any): Array<{ path: string; message: string; severity: 'error' | 'warning' }> {
  const issues: Array<{ path: string; message: string; severity: 'error' | 'warning' }> = [];
  const methods = ['get', 'post', 'put', 'delete', 'patch'];

  // Check for security schemes
  const hasSecuritySchemes = spec.components?.securitySchemes && Object.keys(spec.components.securitySchemes).length > 0;
  const hasGlobalSecurity = spec.security && spec.security.length > 0;

  if (!hasSecuritySchemes) {
    issues.push({ path: '/components/securitySchemes', message: 'No security schemes defined', severity: 'warning' });
  }

  // Check operations for security
  let unsecuredOperations = 0;
  const sensitivePatterns = ['/users', '/admin', '/account', '/auth', '/profile', '/settings'];

  for (const [pathKey, pathItem] of Object.entries(spec.paths || {})) {
    if (typeof pathItem !== 'object' || pathItem === null) continue;

    const isSensitivePath = sensitivePatterns.some(p => pathKey.toLowerCase().includes(p));

    for (const method of methods) {
      const operation = (pathItem as any)[method];
      if (!operation) continue;

      const hasSecurity = operation.security !== undefined 
        ? operation.security.length > 0 
        : hasGlobalSecurity;

      if (!hasSecurity) {
        unsecuredOperations++;
        if (isSensitivePath && method !== 'get') {
          issues.push({ 
            path: `/paths/${pathKey}/${method}`, 
            message: `Sensitive endpoint without security: ${method.toUpperCase()} ${pathKey}`, 
            severity: 'warning' 
          });
        }
      }
    }
  }

  if (unsecuredOperations > 0 && !hasGlobalSecurity) {
    issues.push({ 
      path: '/security', 
      message: `${unsecuredOperations} operation(s) have no security requirements`, 
      severity: 'warning' 
    });
  }

  return issues;
}

// ============================================================
// SERVE COMMAND
// ============================================================

program
  .command('serve')
  .description('Serve Swagger UI for existing spec')
  .option('-s, --spec <path>', 'OpenAPI spec file (default: ./openapi.json)', './openapi.json')
  .option('-p, --port <number>', 'Port number (default: 3000)', '3000')
  .option('--host <address>', 'Host address (default: localhost)', 'localhost')
  .action(function (options: any) {
    try {
      const port = parseInt(options.port, 10);
      const host = options.host;

      // Validate port number
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error(colors.red(`✗ Invalid port number: ${options.port}`));
        console.error(colors.yellow('Port must be between 1 and 65535\n'));
        process.exit(1);
      }

      // Check if spec file exists
      const specPath = path.resolve(options.spec);
      if (!fs.existsSync(specPath)) {
        console.error(colors.red(`✗ Specification file not found: ${specPath}`));
        process.exit(1);
      }

      // Parse spec file
      let spec;
      try {
        const content = fs.readFileSync(specPath, 'utf-8');
        spec = JSON.parse(content);
      } catch (error) {
        console.error(colors.red(`✗ Failed to parse specification file:`));
        console.error(colors.yellow(`  ${(error as any).message}\n`));
        process.exit(1);
      }

      // Validate spec has required OpenAPI fields
      if (!spec.openapi || !spec.info) {
        console.error(colors.red(`✗ Invalid OpenAPI specification`));
        console.error(colors.yellow('Spec must contain "openapi" and "info" fields\n'));
        process.exit(1);
      }

      // Create Express app for serving Swagger UI
      const express = require('express');
      const swaggerUi = require('swagger-ui-express');
      const app = express();

      const swaggerOptions = {
        customSiteTitle: spec.info.title || 'API Documentation',
        swaggerOptions: {
          url: '/openapi.json',
        },
      };

      // Serve spec as JSON
      app.get('/openapi.json', (_req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(spec);
      });

      // Serve Swagger UI
      app.use('/api-docs', swaggerUi.serve);
      app.get('/api-docs', swaggerUi.setup(spec, swaggerOptions));

      // Root route redirects to API docs
      app.get('/', (_req: any, res: any) => {
        res.redirect('/api-docs');
      });

      // Health check endpoint
      app.get('/health', (_req: any, res: any) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      // Start server
      const server = app.listen(port, host, () => {
        console.log(colors.blue('🎯 Swagger UI server started\n'));
        console.log(colors.green(`✓ API Documentation: ${colors.blue(`http://${host}:${port}/api-docs`)}`));
        console.log(colors.green(`✓ OpenAPI Spec JSON: ${colors.blue(`http://${host}:${port}/openapi.json`)}`));
        console.log(colors.green(`✓ Health Check: ${colors.blue(`http://${host}:${port}/health`)}\n`));
        console.log(colors.yellow('Press Ctrl+C to stop server\n'));
      });

      // Graceful shutdown handler
      process.on('SIGINT', () => {
        console.log('\n' + colors.yellow('👋 Shutting down server...\n'));
        server.close(() => {
          console.log(colors.green('✓ Server stopped\n'));
          process.exit(0);
        });

        // Force exit if server doesn't close within 5 seconds
        setTimeout(() => {
          console.error(colors.red('✗ Server did not shut down gracefully, forcing exit\n'));
          process.exit(1);
        }, 5000);
      });

      // Handle server errors
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(colors.red(`✗ Port ${port} is already in use`));
          console.error(colors.yellow(`Try using a different port: npx express-swagger-auto serve --port ${port + 1}\n`));
        } else {
          console.error(colors.red(`✗ Server error: ${error.message}\n`));
        }
        process.exit(1);
      });
    } catch (error) {
      console.error(colors.red(`✗ Error: ${(error as any).message}`));
      process.exit(1);
    }
  });

// ============================================================
// MIGRATE COMMAND
// ============================================================

program
  .command('migrate <source>')
  .description('Migrate from other OpenAPI tools')
  .option('--config <path>', 'Config file path')
  .action(function (source: any) {
    try {
      console.log(colors.blue('🔄 Starting migration tool...\n'));

      const supportedSources = ['swagger-jsdoc', 'tsoa', 'express-oas-generator'];
      if (!supportedSources.includes(source)) {
        console.error(colors.red(`✗ Unsupported source: ${source}`));
        console.error(colors.yellow(`   Supported: ${supportedSources.join(', ')}\n`));
        process.exit(1);
      }

      console.log(colors.yellow('⚠️  Migration command implementation coming in Phase 4\n'));
      console.log(colors.yellow(`   To migrate from ${source}:`));
      console.log(colors.yellow(`   1. Review your existing config`));
      console.log(colors.yellow(`   2. Map decorators/JSDoc to express-swagger-auto format`));
      console.log(colors.yellow(`   3. Run: express-swagger-auto generate\n`));
    } catch (error) {
      console.error(colors.red(`✗ Error: ${(error as any).message}`));
      process.exit(1);
    }
  });

// ============================================================
// INIT COMMAND
// ============================================================

program
  .command('init')
  .description('Initialize express-swagger-auto in your project')
  .option('-y, --yes', 'Skip prompts and use defaults', false)
  .option('--format <format>', 'Config file format (js|json|yaml)', 'js')
  .option('--example', 'Generate example route file with JSDoc', false)
  .action(async function (options: any) {
    const inquirer = await import('inquirer');
    
    try {
      console.log(colors.blue('🚀 Initializing express-swagger-auto...\n'));

      let answers: any;

      if (options.yes) {
        // Use defaults
        answers = {
          input: './src/app.ts',
          output: './openapi.yaml',
          format: 'yaml',
          strategies: ['jsdoc', 'decorator'],
          securityDetect: true,
          watchMode: false,
          generateExample: options.example,
          configFormat: options.format,
          addScripts: true,
        };
      } else {
        // Interactive prompts
        answers = await inquirer.default.prompt([
          {
            type: 'input',
            name: 'input',
            message: 'Entry point for your Express app:',
            default: detectEntryPoint(),
          },
          {
            type: 'input',
            name: 'output',
            message: 'Output path for OpenAPI spec:',
            default: './docs/openapi.yaml',
          },
          {
            type: 'list',
            name: 'format',
            message: 'Output format:',
            choices: ['yaml', 'json'],
            default: 'yaml',
          },
          {
            type: 'checkbox',
            name: 'strategies',
            message: 'Generation strategies:',
            choices: [
              { name: 'JSDoc comments', value: 'jsdoc', checked: true },
              { name: 'TypeScript decorators', value: 'decorator', checked: true },
              { name: 'Runtime capture', value: 'runtime', checked: false },
            ],
          },
          {
            type: 'confirm',
            name: 'securityDetect',
            message: 'Enable security scheme auto-detection?',
            default: true,
          },
          {
            type: 'confirm',
            name: 'watchMode',
            message: 'Enable watch mode by default?',
            default: false,
          },
          {
            type: 'confirm',
            name: 'generateExample',
            message: 'Generate example route file with JSDoc annotations?',
            default: true,
          },
          {
            type: 'list',
            name: 'configFormat',
            message: 'Config file format:',
            choices: [
              { name: 'JavaScript (swagger-auto.config.js)', value: 'js' },
              { name: 'JSON (.swagger-autorc.json)', value: 'json' },
              { name: 'YAML (.swagger-autorc.yaml)', value: 'yaml' },
            ],
            default: 'js',
          },
          {
            type: 'confirm',
            name: 'addScripts',
            message: 'Add npm scripts to package.json?',
            default: true,
          },
        ]);
      }

      // Generate config file
      const configContent = generateConfigContent(answers);
      const configFileName = getConfigFileName(answers.configFormat);
      
      if (fs.existsSync(configFileName)) {
        const overwrite = options.yes || (await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `${configFileName} already exists. Overwrite?`,
            default: false,
          },
        ])).overwrite;

        if (!overwrite) {
          console.log(colors.yellow('⚠ Skipping config file creation\n'));
        } else {
          fs.writeFileSync(configFileName, configContent);
          console.log(colors.green(`✓ Created ${configFileName}\n`));
        }
      } else {
        fs.writeFileSync(configFileName, configContent);
        console.log(colors.green(`✓ Created ${configFileName}\n`));
      }

      // Generate example route file
      if (answers.generateExample) {
        const exampleDir = path.dirname(answers.input);
        const examplePath = path.join(exampleDir, 'routes', 'example.routes.js');
        
        if (!fs.existsSync(path.dirname(examplePath))) {
          fs.mkdirSync(path.dirname(examplePath), { recursive: true });
        }

        if (!fs.existsSync(examplePath)) {
          fs.writeFileSync(examplePath, generateExampleRouteFile());
          console.log(colors.green(`✓ Created ${examplePath}\n`));
        } else {
          console.log(colors.yellow(`⚠ ${examplePath} already exists, skipping\n`));
        }
      }

      // Add npm scripts
      if (answers.addScripts) {
        const pkgPath = path.resolve('package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            pkg.scripts = pkg.scripts || {};
            
            const scriptsToAdd: Record<string, string> = {
              'swagger:generate': 'express-swagger-auto generate',
              'swagger:watch': 'express-swagger-auto generate --watch',
              'swagger:serve': 'express-swagger-auto serve',
              'swagger:validate': 'express-swagger-auto validate ' + answers.output,
            };

            let addedScripts = false;
            for (const [name, command] of Object.entries(scriptsToAdd)) {
              if (!pkg.scripts[name]) {
                pkg.scripts[name] = command;
                addedScripts = true;
              }
            }

            if (addedScripts) {
              fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
              console.log(colors.green('✓ Added npm scripts to package.json\n'));
              console.log(colors.dim('  Available scripts:'));
              console.log(colors.dim('    npm run swagger:generate  - Generate OpenAPI spec'));
              console.log(colors.dim('    npm run swagger:watch     - Generate with watch mode'));
              console.log(colors.dim('    npm run swagger:serve     - Serve Swagger UI'));
              console.log(colors.dim('    npm run swagger:validate  - Validate spec\n'));
            } else {
              console.log(colors.yellow('⚠ Scripts already exist in package.json\n'));
            }
          } catch (error) {
            console.log(colors.yellow('⚠ Could not update package.json\n'));
          }
        }
      }

      console.log(colors.blue('✅ Initialization complete!\n'));
      console.log(colors.cyan('Next steps:'));
      console.log(colors.cyan('  1. Add JSDoc annotations to your routes'));
      console.log(colors.cyan('  2. Run: npm run swagger:generate'));
      console.log(colors.cyan('  3. View docs: npm run swagger:serve\n'));

    } catch (error) {
      if ((error as any).isTtyError) {
        console.error(colors.red('✗ Prompts not supported in this environment. Use --yes flag.\n'));
      } else {
        console.error(colors.red(`✗ Error: ${(error as any).message}`));
      }
      process.exit(1);
    }
  });

/**
 * Detect likely entry point for Express app
 */
function detectEntryPoint(): string {
  const candidates = [
    './src/app.ts',
    './src/app.js',
    './src/index.ts',
    './src/index.js',
    './app.ts',
    './app.js',
    './index.ts',
    './index.js',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return './src/app.ts';
}

/**
 * Get config file name based on format
 */
function getConfigFileName(format: string): string {
  switch (format) {
    case 'json':
      return '.swagger-autorc.json';
    case 'yaml':
      return '.swagger-autorc.yaml';
    default:
      return 'swagger-auto.config.js';
  }
}

/**
 * Generate config file content based on answers
 */
function generateConfigContent(answers: any): string {
  const config = {
    input: answers.input,
    output: answers.output,
    format: answers.format,
    strategies: answers.strategies,
    info: {
      title: getPackageTitle(),
      version: getPackageVersion(),
      description: 'API Documentation',
    },
    security: {
      detect: answers.securityDetect,
    },
    watch: answers.watchMode ? {
      paths: ['src/**', 'lib/**'],
      ignored: ['node_modules', '.git', 'dist', 'build'],
      debounce: 500,
    } : undefined,
  };

  switch (answers.configFormat) {
    case 'json':
      return JSON.stringify(config, null, 2);
    case 'yaml':
      try {
        const yaml = require('js-yaml');
        return yaml.dump(config, { indent: 2 });
      } catch {
        return JSON.stringify(config, null, 2);
      }
    default:
      return `/** @type {import('express-swagger-auto').SwaggerAutoConfig} */
module.exports = ${JSON.stringify(config, null, 2)};
`;
  }
}

/**
 * Generate example route file with JSDoc annotations
 */
function generateExampleRouteFile(): string {
  return `const express = require('express');
const router = express.Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a list of all users with pagination support
 *     tags:
 *       - Users
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Number of items per page
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 */
router.get('/users', (req, res) => {
  res.json({
    users: [],
    total: 0,
    page: 1,
  });
});

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves a specific user by their unique identifier
 *     tags:
 *       - Users
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: User not found
 */
router.get('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, name: 'Example User', email: 'user@example.com' });
});

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user with the provided data
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid request body
 */
router.post('/users', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({ id: '123', name, email });
});

module.exports = router;
`;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Smart app loader that tries multiple strategies:
 * 1. Dynamic import (ESM) for .js and .mjs files
 * 2. CommonJS require() for .js, .cjs files
 * 3. Fallback to compiled output if original fails
 */
async function loadApp(inputPath: string): Promise<{ success: boolean; app?: any; error?: any }> {
  const isTypeScriptFile = inputPath.endsWith('.ts');
  const fileExtension = path.extname(inputPath);

  // Pre-check: detect ESM source files early
  let fileContent = '';
  let isESMSource = false;

  if (fs.existsSync(inputPath)) {
    try {
      fileContent = fs.readFileSync(inputPath, 'utf-8');
      const hasImportStatements = /^\s*import\s+/m.test(fileContent);
      const hasExport = /export\s+(default|const|function|class)\s+/m.test(fileContent);
      const hasAppListen = /app\.listen\s*\(/m.test(fileContent);
      isESMSource = hasImportStatements && (!hasExport || hasAppListen);
    } catch {
      // Continue with regular loading
    }
  }

  // First, try to load the file as-is

  // Strategy 1: Try CommonJS require (works for .js, .cjs)
  if (fileExtension === '.js' || fileExtension === '.cjs' || isTypeScriptFile) {
    try {
      delete require.cache[inputPath];
      let loaded = require(inputPath);

      // Try different export patterns
      let app = loaded.default || loaded;

      // Check if it has a .use method (Express apps can be functions with methods)
      if (app && typeof app.use === 'function') {
        return { success: true, app };
      }

      // If it's a factory function (like createApp()), call it to get the app
      if (typeof app === 'function' && !app.use) {
        try {
          app = app();
          if (app && typeof app.use === 'function') {
            return { success: true, app };
          }
        } catch {
          // Factory function call failed, will handle in error catch below
        }
      }
    } catch (error) {
      const errorMsg = String((error as any).message || error);

      // If it's an ESM error, try dynamic import
      const isESModuleError =
        errorMsg.includes('ERR_REQUIRE_ESM') ||
        errorMsg.includes('is not supported resolving ES modules') ||
        errorMsg.includes('directory import') ||
        errorMsg.includes('Cannot use import statement outside a module');

      if (isESModuleError) {
        // Strategy 2: Try ESM dynamic import
        try {
          const fileUrl = `file://${inputPath}`;
          const imported = await import(fileUrl);
          let app = imported.default || imported;

          // Check if it has a .use method (Express apps can be functions with methods)
          if (app && typeof app.use === 'function') {
            return { success: true, app };
          }

          // If it's a factory function (like createApp()), call it to get the app
          if (typeof app === 'function' && !app.use) {
            try {
              app = app();
              if (app && typeof app.use === 'function') {
                return { success: true, app };
              }
            } catch {
              // Factory function call failed, continue to fallback
            }
          }
        } catch (importError) {
          // ESM import also failed, continue to fallback
        }
      }

      // Store the error for later use
      const firstError = {
        message: errorMsg,
        isESModule: isESModuleError,
        isESMSource,
        fileContent,
      };

      // Strategy 3: Try to find and load compiled output
      const compiledPath = await findCompiledOutput(inputPath);
      if (compiledPath) {
        try {
          delete require.cache[compiledPath];
          let loaded = require(compiledPath);
          let app = loaded.default || loaded;

          // Check if it has a .use method (Express apps can be functions with methods)
          if (app && typeof app.use === 'function') {
            console.log(colors.green(`✓ Loaded compiled output from: ${compiledPath}\n`));
            return { success: true, app };
          }

          // If it's a factory function (like createApp()), call it to get the app
          if (typeof app === 'function' && !app.use) {
            try {
              app = app();
              if (app && typeof app.use === 'function') {
                console.log(colors.green(`✓ Loaded compiled output from: ${compiledPath}\n`));
                return { success: true, app };
              }
            } catch {
              // Factory function call failed
            }
          }
        } catch (compiledError) {
          // Compiled version also failed
        }
      }

      // All strategies failed
      return { success: false, error: firstError };
    }
  }

  // If we get here, the file couldn't be loaded
  return {
    success: false,
    error: {
      message: `Unable to load file: ${inputPath}`,
      isESModule: false,
    },
  };
}

/**
 * Find compiled output file if the input is a source file
 */
async function findCompiledOutput(inputPath: string): Promise<string | null> {
  // Map source files to potential compiled locations
  const fileName = path.basename(inputPath);
  const nameWithoutExt = path.parse(fileName).name;

  const commonBuildPaths = [
    path.join('dist', nameWithoutExt + '.js'),
    path.join('build', nameWithoutExt + '.js'),
    path.join('lib', nameWithoutExt + '.js'),
    path.join('dist', 'index.js'),
    path.join('build', 'index.js'),
    path.join('lib', 'index.js'),
  ];

  for (const buildPath of commonBuildPaths) {
    const resolvedPath = path.resolve(buildPath);
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return null;
}

/**
 * Display a helpful error message with solutions
 */
function displayLoadError(error: any, resolvedInput: string) {
  const errorMsg = error.message || String(error);
  const isESModuleError = error.isESModule || false;
  const isESMSource = error.isESMSource || false;
  const fileContent = error.fileContent || '';
  const hasAppListen = /app\.listen\s*\(/m.test(fileContent);

  if (isESMSource && hasAppListen) {
    console.error(colors.red('\n✗ Entry File Contains app.listen()\n'));
    console.error(colors.yellow('Your entry file directly calls app.listen(), which starts the server.'));
    console.error(colors.yellow('express-swagger-auto needs to load the app without executing the server startup.\n'));
  } else if (isESMSource) {
    console.error(colors.red('\n✗ ESM Source File Detected\n'));
    console.error(colors.yellow('Your file uses ES6 import/export syntax but doesn\'t export the app.\n'));
    console.error(colors.yellow('The entry file needs to export the Express app instance.\n'));
  } else if (isESModuleError) {
    console.error(colors.red('\n✗ ES Module or TypeScript Loading Error\n'));
    console.error(colors.yellow('Your project uses ES modules (ESM) or TypeScript,'));
    console.error(colors.yellow('and express-swagger-auto tried both ESM and CommonJS loading.\n'));
  } else if (errorMsg.includes('Cannot find module') || errorMsg.includes('ENOENT')) {
    console.error(colors.red(`\n✗ Failed to load Express app:\n`));
    console.error(colors.yellow(`  Error: ${errorMsg}\n`));
  } else {
    console.error(colors.red(`✗ Failed to load Express app:`));
    console.error(colors.yellow(`  ${errorMsg}\n`));
  }

  console.error(colors.yellow('SOLUTIONS:\n'));

  if (isESMSource && hasAppListen) {
    console.error(colors.yellow('Best: Create a separate app.js that exports the app without calling listen():\n'));
    console.error(colors.yellow('   // app.js (or app.ts) - exports only, no listen()'));
    console.error(colors.yellow('   import express from "express";'));
    console.error(colors.yellow('   export default createApp();\n'));
    console.error(colors.yellow('   function createApp() {'));
    console.error(colors.yellow('     const app = express();'));
    console.error(colors.yellow('     // ... configure routes, middleware'));
    console.error(colors.yellow('     return app;'));
    console.error(colors.yellow('   }\n'));
    console.error(colors.yellow('   // index.js (or server.ts) - uses app.js'));
    console.error(colors.yellow('   import app from "./app.js";'));
    console.error(colors.yellow('   app.listen(PORT, () => { ... });\n'));
    console.error(colors.yellow('   Then run: npx express-swagger-auto generate -i dist/app.js -o openapi.json\n'));
  } else if (isESMSource) {
    console.error(colors.yellow('1. Add export to your entry file:'));
    console.error(colors.yellow('   // At the end of your file:'));
    console.error(colors.yellow('   export default app;\n'));
    console.error(colors.yellow('   OR (if using CommonJS):\n'));
    console.error(colors.yellow('   module.exports = app;\n'));
  }

  console.error(colors.yellow('2. Build your code using your build script:'));
  console.error(colors.yellow('   npm run build (or pnpm build / yarn build)\n'));
  console.error(colors.yellow('3. Point to the compiled output:'));
  console.error(colors.yellow('   npx express-swagger-auto generate -i dist/app.js -o openapi.json'));
  console.error(colors.yellow('   (if using app.js) or'));
  console.error(colors.yellow('   npx express-swagger-auto generate -i dist/index.js -o openapi.json\n'));

  console.error(colors.yellow('4. For full automation, add to package.json:'));
  console.error(colors.yellow('   "scripts": {'));
  console.error(colors.yellow('     "swagger:generate": "npm run build && npx express-swagger-auto generate -i dist/app.js -o openapi.json"'));
  console.error(colors.yellow('   }\n'));

  console.error(colors.yellow('5. File location checked:'));
  console.error(colors.yellow(`   ${resolvedInput}\n`));
}

function getPackageTitle() {
  try {
    const pkgPath = path.resolve('package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.name || 'API';
  } catch {
    return 'API';
  }
}

function getPackageVersion() {
  try {
    const pkgPath = path.resolve('package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/**
 * Filter routes based on include/exclude patterns and tags
 */
function filterRoutes(
  routes: any[],
  filters: { include?: string[]; exclude?: string[]; tags?: string[] }
): any[] {
  return routes.filter((route) => {
    const routePath = route.path || '';
    
    // Check include patterns
    if (filters.include && filters.include.length > 0) {
      const matches = filters.include.some((pattern) => matchPath(routePath, pattern));
      if (!matches) return false;
    }
    
    // Check exclude patterns
    if (filters.exclude && filters.exclude.length > 0) {
      const excluded = filters.exclude.some((pattern) => matchPath(routePath, pattern));
      if (excluded) return false;
    }
    
    // Check tags
    if (filters.tags && filters.tags.length > 0) {
      const routeTags = route.tags || [];
      const hasTag = filters.tags.some((tag) => routeTags.includes(tag));
      if (!hasTag) return false;
    }
    
    return true;
  });
}

/**
 * Simple path matching with wildcard support
 */
function matchPath(routePath: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\//g, '\\/');
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(routePath);
}

// ============================================================
// INITIALIZE & RUN
// ============================================================

program.parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}
