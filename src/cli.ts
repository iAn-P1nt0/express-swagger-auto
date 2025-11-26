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
};

// Import internal modules
const { RouteDiscovery } = require('./core/RouteDiscovery');
const { SpecGenerator } = require('./core/SpecGenerator');
const { FileWatcher } = require('./watch/FileWatcher');

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
      const generateSpec = async () => {
        // Load Express app dynamically
        let app;
        try {
          delete require.cache[path.resolve(options.input)];
          const module = require(path.resolve(options.input));
          app = module.default || module;
        } catch (error) {
          const errorMsg = (error as any).message || String(error);

          // Check for ES module directory import error
          if (errorMsg.includes('is not supported resolving ES modules') || errorMsg.includes('directory import')) {
            console.error(colors.red('\n✗ ES Module or Directory Import Error\n'));
            console.error(colors.yellow('Your project uses ES modules (ESM) or has directory imports,'));
            console.error(colors.yellow('but express-swagger-auto loads apps using CommonJS require().\n'));
            console.error(colors.yellow('RECOMMENDED SOLUTION:\n'));
            console.error(colors.yellow('1. Build your Babel/TypeScript/ESM code first:'));
            console.error(colors.yellow('   npm run build\n'));
            console.error(colors.yellow('2. Point to the compiled output:'));
            console.error(colors.yellow(`   npx express-swagger-auto generate -i dist/index.js -o openapi.json ...\n`));
            console.error(colors.yellow('ALTERNATIVE SOLUTIONS:\n'));
            console.error(colors.yellow('3. Add to package.json scripts for automation:'));
            console.error(colors.yellow('   "swagger:generate": "npm run build && npx express-swagger-auto generate -i dist/index.js -o openapi.json --title \\"My API\\""\n'));
            console.error(colors.yellow('4. Ensure your entry file uses CommonJS require() for all imports:'));
            console.error(colors.yellow('   const middlewares = require("./middlewares");\n'));
            return false;
          }

          // Check for other module-related errors
          if (errorMsg.includes('directory import') || errorMsg.includes('Cannot find module')) {
            console.error(colors.red(`\n✗ Failed to load Express app:\n`));
            console.error(colors.yellow(`  Error: ${errorMsg}\n`));
            console.error(colors.yellow('Solutions:\n'));
            console.error(colors.yellow('1. Ensure the input file exists and is readable'));
            console.error(colors.yellow('2. Use absolute or relative paths from current working directory'));
            console.error(colors.yellow('3. If using TypeScript, ensure it\'s compiled to JavaScript first'));
            console.error(colors.yellow('4. For ES modules, point to the compiled/built version\n'));
            return false;
          }

          console.error(colors.red(`✗ Failed to load Express app: ${errorMsg}`));
          return false;
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
        const discovery = new RouteDiscovery();
        const routes = discovery.discover(app);

        // Generate spec
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
        console.log(colors.green(`✓ Updated spec (${routes.length} routes, ${specSize}KB)\n`));
        return true;
      };

      console.log(colors.blue('📋 Generating OpenAPI specification...\n'));

      // Validate input file exists
      const resolvedInput = path.resolve(options.input);
      if (!fs.existsSync(resolvedInput)) {
        console.error(colors.red(`✗ Input file not found: ${options.input}`));
        process.exit(1);
      }

      // Initial generation
      const success = await generateSpec();
      if (!success) {
        process.exit(1);
      }

      console.log(colors.blue('✅ Done!\n'));

      // Watch mode
      if (options.watch) {
        console.log(colors.yellow('👀 Watch mode enabled. Watching for changes...\n'));

        const watcher = new FileWatcher({
          paths: ['src/**', 'lib/**'],
          debounce: 500,
          ignored: ['node_modules', '.git', 'dist', 'build', '**/*.test.ts', '**/*.spec.ts'],
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
  .action(async function (specPath: any, options: any) {
    try {
      console.log(colors.blue('🔍 Validating OpenAPI specification...\n'));

      // Check file exists
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
        console.error(colors.red(`✗ Invalid JSON: ${(error as any).message}`));
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
        console.error(colors.red('✗ Validation failed:\n'));
        errors.forEach((err) => console.error(colors.red(`  • ${err}`)));
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

      console.log(colors.green('✓ Validation passed!\n'));
      console.log(`  OpenAPI Version: ${spec.openapi}`);
      console.log(`  Title: ${spec.info.title}`);
      console.log(`  Version: ${spec.info.version}`);
      console.log(`  Paths: ${pathCount}`);
      console.log(`  Operations: ${operationCount}\n`);

      if (options.strict) {
        console.log(colors.yellow('→ Running strict validation...\n'));
        console.log(colors.yellow('(Strict validation implementation coming in Phase 4)'));
      }

      console.log(colors.blue('✅ Done!\n'));
    } catch (error) {
      console.error(colors.red(`✗ Error: ${(error as any).message}`));
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
      console.log(colors.blue('🎯 Starting Swagger UI server...\n'));

      if (!fs.existsSync(options.spec)) {
        console.error(colors.red(`✗ Specification file not found: ${options.spec}`));
        process.exit(1);
      }

      console.log(colors.yellow('⚠️  Serve command requires additional setup'));
      console.log(colors.yellow('    Implementation coming in Phase 4\n'));
      console.log(colors.yellow(`   To manually serve Swagger UI:`));
      console.log(colors.yellow(`   1. Use SwaggerUI static files`));
      console.log(colors.yellow(`   2. Point to spec file at: ${options.spec}\n`));
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
