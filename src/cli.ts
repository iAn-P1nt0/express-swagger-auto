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
        // Load Express app dynamically with ESM/CommonJS fallback chain
        let app;
        const resolvedInput = path.resolve(options.input);

        // Try loading the app using a smart loader with multiple strategies
        const loadResult = await loadApp(resolvedInput);

        if (!loadResult.success) {
          displayLoadError(loadResult.error, resolvedInput);
          return false;
        }

        app = loadResult.app;

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

// ============================================================
// INITIALIZE & RUN
// ============================================================

program.parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}
