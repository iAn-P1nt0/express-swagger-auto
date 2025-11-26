const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Import internal modules
const { RouteDiscovery } = require('./core/RouteDiscovery');
const { SpecGenerator } = require('./core/SpecGenerator');

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
  .option('-i, --input <path>', 'Entry point file (default: ./src/app.ts)', './src/app.ts')
  .option('-o, --output <path>', 'Output path (default: ./openapi.json)', './openapi.json')
  .option('-w, --watch', 'Watch mode - regenerate on file changes', false)
  .option('--title <string>', 'API title (default: from package.json)', '')
  .option('--version <string>', 'API version (default: from package.json)', '')
  .option('--description <string>', 'API description', '')
  .action(async function (options: any) {
    try {
      console.log(chalk.blue('📋 Generating OpenAPI specification...\n'));

      // Validate input file exists
      const resolvedInput = path.resolve(options.input);
      if (!fs.existsSync(resolvedInput)) {
        console.error(chalk.red(`✗ Input file not found: ${options.input}`));
        process.exit(1);
      }

      // Load Express app dynamically
      let app;
      try {
        const module = require(resolvedInput);
        app = module.default || module;
      } catch (error) {
        console.error(chalk.red(`✗ Failed to load Express app: ${(error as any).message}`));
        process.exit(1);
      }

      // Get API info
      const apiInfo = {
        title: options.title || getPackageTitle(),
        version: options.version || getPackageVersion(),
        description: options.description || '',
      };

      // Create generator config
      const config = {
        info: apiInfo,
      };

      // Discover routes
      console.log(chalk.gray('→ Discovering routes...'));
      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      console.log(chalk.green(`✓ Found ${routes.length} routes\n`));

      // Generate spec
      console.log(chalk.gray('→ Generating OpenAPI specification...'));
      const generator = new SpecGenerator(config);
      const spec = generator.generate(routes);

      // Ensure output directory exists
      const outputDir = path.dirname(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write spec to file
      fs.writeFileSync(options.output, JSON.stringify(spec, null, 2));
      const specSize = (JSON.stringify(spec).length / 1024).toFixed(2);
      console.log(chalk.green(`✓ Spec written to ${options.output} (${specSize}KB)\n`));

      // Watch mode
      if (options.watch) {
        console.log(chalk.yellow('👀 Watch mode enabled. Watching for changes...\n'));
        console.log(chalk.gray('(Watch mode implementation coming in Phase 4)'));
      }

      console.log(chalk.blue('✅ Done!\n'));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${(error as any).message}`));
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
  .action(async function (specPath: any, options: any) {
    try {
      console.log(chalk.blue('🔍 Validating OpenAPI specification...\n'));

      // Check file exists
      if (!fs.existsSync(specPath)) {
        console.error(chalk.red(`✗ Specification file not found: ${specPath}`));
        process.exit(1);
      }

      // Parse spec file
      let spec;
      try {
        const content = fs.readFileSync(specPath, 'utf-8');
        spec = JSON.parse(content);
      } catch (error) {
        console.error(chalk.red(`✗ Invalid JSON: ${(error as any).message}`));
        process.exit(1);
      }

      // Validate required fields
      const errors = [];

      if (!spec.openapi) {
        errors.push('Missing required field: openapi');
      }
      if (!spec.info) {
        errors.push('Missing required field: info');
      }
      if (!spec.info?.title) {
        errors.push('Missing required field: info.title');
      }
      if (!spec.info?.version) {
        errors.push('Missing required field: info.version');
      }
      if (!spec.paths) {
        errors.push('Missing required field: paths');
      }

      if (errors.length > 0) {
        console.error(chalk.red('✗ Validation failed:\n'));
        errors.forEach((err) => console.error(chalk.red(`  • ${err}`)));
        process.exit(1);
      }

      // Count paths and operations
      let pathCount = 0;
      let operationCount = 0;
      for (const [, pathItem] of Object.entries(spec.paths || {})) {
        pathCount++;
        if (typeof pathItem === 'object' && pathItem !== null) {
          operationCount += Object.keys(pathItem).filter((k) =>
            ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(k.toLowerCase())
          ).length;
        }
      }

      console.log(chalk.green('✓ Validation passed!\n'));
      console.log(`  OpenAPI Version: ${spec.openapi}`);
      console.log(`  Title: ${spec.info.title}`);
      console.log(`  Version: ${spec.info.version}`);
      console.log(`  Paths: ${pathCount}`);
      console.log(`  Operations: ${operationCount}\n`);

      if (options.strict) {
        console.log(chalk.gray('→ Running strict validation...\n'));
        console.log(chalk.gray('(Strict validation implementation coming in Phase 4)'));
      }

      console.log(chalk.blue('✅ Done!\n'));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${(error as any).message}`));
      process.exit(1);
    }
  });

// ============================================================
// SERVE COMMAND
// ============================================================

program
  .command('serve')
  .description('Serve Swagger UI for existing spec')
  .option('-s, --spec <path>', 'OpenAPI spec file (default: ./openapi.json)', './openapi.json')
  .option('-p, --port <number>', 'Port number (default: 3000)', '3000')
  .action(function (options: any) {
    try {
      console.log(chalk.blue('🎯 Starting Swagger UI server...\n'));

      if (!fs.existsSync(options.spec)) {
        console.error(chalk.red(`✗ Specification file not found: ${options.spec}`));
        process.exit(1);
      }

      console.log(chalk.yellow('⚠️  Serve command requires additional setup'));
      console.log(chalk.gray('    Implementation coming in Phase 4\n'));
      console.log(chalk.gray(`   To manually serve Swagger UI:`));
      console.log(chalk.gray(`   1. Use SwaggerUI static files`));
      console.log(chalk.gray(`   2. Point to spec file at: ${options.spec}\n`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${(error as any).message}`));
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
      console.log(chalk.blue('🔄 Starting migration tool...\n'));

      const supportedSources = ['swagger-jsdoc', 'tsoa', 'express-oas-generator'];
      if (!supportedSources.includes(source)) {
        console.error(chalk.red(`✗ Unsupported source: ${source}`));
        console.error(chalk.gray(`   Supported: ${supportedSources.join(', ')}\n`));
        process.exit(1);
      }

      console.log(chalk.yellow('⚠️  Migration command implementation coming in Phase 4\n'));
      console.log(chalk.gray(`   To migrate from ${source}:`));
      console.log(chalk.gray(`   1. Review your existing config`));
      console.log(chalk.gray(`   2. Map decorators/JSDoc to express-swagger-auto format`));
      console.log(chalk.gray(`   3. Run: express-swagger-auto generate\n`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${(error as any).message}`));
      process.exit(1);
    }
  });

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

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

// ============================================================
// INITIALIZE & RUN
// ============================================================

program.parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}
