#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  // Phase 1: Minimal CLI scaffolding
  // TODO(Phase 4): Implement generate, serve, validate, migrate commands
  // TODO(Phase 4): Add watch mode with hot reload
  // TODO(Phase 4): Implement migration helpers for swagger-jsdoc, tsoa, etc.

  switch (command) {
    case 'generate':
      await generateCommand(args.slice(1));
      break;
    case 'serve':
      await serveCommand(args.slice(1));
      break;
    case 'validate':
      await validateCommand(args.slice(1));
      break;
    case 'migrate':
      await migrateCommand(args.slice(1));
      break;
    case '--version':
    case '-v':
      showVersion();
      break;
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

async function generateCommand(_args: string[]): Promise<void> {
  console.warn('Generate command - Phase 4 implementation pending');
  console.warn('Usage: express-swagger-auto generate [options]');
  console.warn('  --input, -i <path>     Entry point file (default: ./src/app.ts)');
  console.warn('  --output, -o <path>    Output path (default: ./openapi.json)');
  console.warn('  --watch, -w            Watch mode');
}

async function serveCommand(_args: string[]): Promise<void> {
  console.warn('Serve command - Phase 4 implementation pending');
  console.warn('Usage: express-swagger-auto serve [options]');
  console.warn('  --port, -p <number>    Port (default: 3000)');
  console.warn('  --spec, -s <path>      OpenAPI spec file');
}

async function validateCommand(_args: string[]): Promise<void> {
  console.warn('Validate command - Phase 4 implementation pending');
  console.warn('Usage: express-swagger-auto validate <spec-path>');
}

async function migrateCommand(_args: string[]): Promise<void> {
  console.warn('Migrate command - Phase 4 implementation pending');
  console.warn('Usage: express-swagger-auto migrate <source> [options]');
  console.warn('  <source>: swagger-jsdoc | tsoa | express-oas-generator');
}

function showVersion(): void {
  const packageJson = require('../package.json');
  console.warn(`express-swagger-auto v${packageJson.version}`);
}

function showHelp(): void {
  console.warn(`
express-swagger-auto - Hybrid OpenAPI generator for Express.js

Usage:
  express-swagger-auto <command> [options]

Commands:
  generate    Generate OpenAPI spec from Express app
  serve       Serve Swagger UI for existing spec
  validate    Validate OpenAPI spec file
  migrate     Migrate from other OpenAPI tools

Options:
  --version, -v    Show version
  --help, -h       Show help

Examples:
  express-swagger-auto generate --input ./src/app.ts --output ./openapi.json
  express-swagger-auto serve --spec ./openapi.json --port 3000
  express-swagger-auto validate ./openapi.json
  express-swagger-auto migrate swagger-jsdoc

For more information, visit: https://github.com/iAn-P1nt0/express-swagger-auto
  `);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
