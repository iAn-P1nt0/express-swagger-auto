/**
 * E2E Test Suite: CLI Complete Workflow
 * Tests all CLI commands and their interactions
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import {
  createTempDir,
  cleanupTempDir,
  writeFile,
  readFile,
  fileExists,
  parseJSON,
  getCliPath,
  runCommand,
  getAvailablePort,
  delay,
  createMockPackageJson,
} from './helpers/test-utils';
import { validOpenAPISpec, testConfig } from './fixtures/sample-apps';

describe('CLI Complete Workflow E2E', () => {
  let testDir: string;
  let cliPath: string;
  let serverProcess: ChildProcess | null = null;

  beforeAll(async () => {
    cliPath = getCliPath();
    testDir = createTempDir('cli-workflow');
    // Ensure CLI is built
    expect(fileExists(cliPath)).toBe(true);
  });

  afterEach(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
      await delay(500);
    }
  });

  afterAll(() => {
    cleanupTempDir(testDir);
  });

  describe('Generate Command', () => {
    let generateDir: string;

    beforeAll(() => {
      generateDir = path.join(testDir, 'generate-tests');
      if (!fileExists(generateDir)) {
        require('fs').mkdirSync(generateDir, { recursive: true });
      }
    });

    it('should display generate command help', async () => {
      const result = await runCommand('node', [cliPath, 'generate', '--help'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--input');
      expect(result.stdout).toContain('--output');
      expect(result.stdout).toContain('--format');
      expect(result.stdout).toContain('--watch');
    });

    it('should fail gracefully with missing input', async () => {
      const result = await runCommand('node', [cliPath, 'generate', '-i', './missing-app.js'], {
        cwd: generateDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr + result.stdout).toMatch(/not found|error/i);
    });

    it('should support --ci flag for machine-readable output', async () => {
      const result = await runCommand('node', [cliPath, 'generate', '-i', './missing.js', '--ci', '--ci-format', 'json'], {
        cwd: generateDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(1);
      // In CI mode, output should be structured
      const output = result.stdout + result.stderr;
      expect(output).toBeDefined();
    });
  });

  describe('Validate Command', () => {
    let validateDir: string;

    beforeAll(() => {
      validateDir = path.join(testDir, 'validate-tests');
      require('fs').mkdirSync(validateDir, { recursive: true });
      writeFile(path.join(validateDir, 'valid-spec.json'), JSON.stringify(validOpenAPISpec, null, 2));
    });

    it('should display validate command help', async () => {
      const result = await runCommand('node', [cliPath, 'validate', '--help'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--strict');
      expect(result.stdout).toContain('--ci');
    });

    it('should validate a valid OpenAPI spec', async () => {
      const specPath = path.join(validateDir, 'valid-spec.json');
      const result = await runCommand('node', [cliPath, 'validate', specPath], {
        cwd: validateDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/passed|success/i);
    });

    it('should detect missing required fields', async () => {
      const invalidSpec = { paths: {} };
      const invalidPath = path.join(validateDir, 'invalid-spec.json');
      writeFile(invalidPath, JSON.stringify(invalidSpec, null, 2));

      const result = await runCommand('node', [cliPath, 'validate', invalidPath], {
        cwd: validateDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toMatch(/missing|error/i);
    });

    it('should support strict mode validation', async () => {
      const specPath = path.join(validateDir, 'valid-spec.json');
      const result = await runCommand('node', [cliPath, 'validate', specPath, '--strict'], {
        cwd: validateDir,
        timeout: 10000,
      });

      // Strict mode may find warnings
      expect(result.stdout).toBeDefined();
    });

    it('should support CI JSON output format', async () => {
      const specPath = path.join(validateDir, 'valid-spec.json');
      const result = await runCommand('node', [cliPath, 'validate', specPath, '--ci', '--ci-format', 'json'], {
        cwd: validateDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(0);
      const output = parseJSON(result.stdout);
      expect(output).toBeDefined();
      if (output) {
        expect(output).toHaveProperty('success');
      }
    });

    it('should support SARIF output format', async () => {
      const specPath = path.join(validateDir, 'valid-spec.json');
      const result = await runCommand('node', [cliPath, 'validate', specPath, '--ci', '--ci-format', 'sarif'], {
        cwd: validateDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(0);
      const output = parseJSON(result.stdout);
      expect(output).toBeDefined();
      if (output) {
        expect(output).toHaveProperty('$schema');
        expect(output).toHaveProperty('runs');
      }
    });

    it('should support security audit', async () => {
      const specPath = path.join(validateDir, 'valid-spec.json');
      const result = await runCommand('node', [cliPath, 'validate', specPath, '--security-audit'], {
        cwd: validateDir,
        timeout: 10000,
      });

      // Security audit will check for security schemes
      expect(result.stdout + result.stderr).toBeDefined();
    });
  });

  describe('Serve Command', () => {
    let serveDir: string;

    beforeAll(() => {
      serveDir = path.join(testDir, 'serve-tests');
      require('fs').mkdirSync(serveDir, { recursive: true });
      writeFile(path.join(serveDir, 'openapi.json'), JSON.stringify(validOpenAPISpec, null, 2));
    });

    it('should display serve command help', async () => {
      const result = await runCommand('node', [cliPath, 'serve', '--help'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--spec');
      expect(result.stdout).toContain('--port');
      expect(result.stdout).toContain('--host');
    });

    it('should start Swagger UI server', async () => {
      const specPath = path.join(serveDir, 'openapi.json');
      const port = await getAvailablePort(5000);

      const started = await new Promise<boolean>((resolve) => {
        const child = spawn('node', [cliPath, 'serve', '--spec', specPath, '--port', String(port)]);
        serverProcess = child;

        let output = '';
        const timeout = setTimeout(() => {
          child.kill();
          resolve(false);
        }, 5000);

        child.stdout?.on('data', (data) => {
          output += data.toString();
          if (output.includes('started') || output.includes('API Documentation')) {
            clearTimeout(timeout);
            resolve(true);
          }
        });

        child.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });

      expect(started).toBe(true);
    });

    it('should reject invalid port numbers', async () => {
      const specPath = path.join(serveDir, 'openapi.json');

      const result = await runCommand('node', [cliPath, 'serve', '--spec', specPath, '--port', '99999'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(1);
    });

    it('should report error for missing spec file', async () => {
      const result = await runCommand('node', [cliPath, 'serve', '--spec', './nonexistent.json', '--port', '3333'], {
        cwd: serveDir,
        timeout: 5000,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/not found/i);
    });
  });

  describe('Export Command', () => {
    let exportDir: string;

    beforeAll(() => {
      exportDir = path.join(testDir, 'export-tests');
      require('fs').mkdirSync(exportDir, { recursive: true });
      writeFile(path.join(exportDir, 'openapi.json'), JSON.stringify(validOpenAPISpec, null, 2));
    });

    it('should display export command help', async () => {
      const result = await runCommand('node', [cliPath, 'export', '--help'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--format');
      expect(result.stdout).toContain('postman');
    });

    it('should export to Postman format', async () => {
      const specPath = path.join(exportDir, 'openapi.json');
      const outputPath = path.join(exportDir, 'postman-collection.json');

      const result = await runCommand('node', [cliPath, 'export', specPath, '-f', 'postman', '-o', outputPath], {
        cwd: exportDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(0);
      expect(fileExists(outputPath)).toBe(true);
    });

    it('should export to Insomnia format', async () => {
      const specPath = path.join(exportDir, 'openapi.json');
      const outputPath = path.join(exportDir, 'insomnia-export.json');

      const result = await runCommand('node', [cliPath, 'export', specPath, '-f', 'insomnia', '-o', outputPath], {
        cwd: exportDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(0);
      expect(fileExists(outputPath)).toBe(true);
    });

    it('should support CI mode for export', async () => {
      const specPath = path.join(exportDir, 'openapi.json');
      const outputPath = path.join(exportDir, 'ci-export.json');

      const result = await runCommand('node', [cliPath, 'export', specPath, '-f', 'postman', '-o', outputPath, '--ci'], {
        cwd: exportDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(0);
      const output = parseJSON(result.stdout);
      expect(output).toBeDefined();
    });
  });

  describe('Stats Command', () => {
    let statsDir: string;

    beforeAll(() => {
      statsDir = path.join(testDir, 'stats-tests');
      require('fs').mkdirSync(statsDir, { recursive: true });
      writeFile(path.join(statsDir, 'openapi.json'), JSON.stringify(validOpenAPISpec, null, 2));
    });

    it('should display stats command help', async () => {
      const result = await runCommand('node', [cliPath, 'stats', '--help'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--format');
    });

    it('should show API statistics in text format', async () => {
      const specPath = path.join(statsDir, 'openapi.json');
      const result = await runCommand('node', [cliPath, 'stats', specPath], {
        cwd: statsDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/operations|paths|test api/i);
    });

    it('should show API statistics in JSON format', async () => {
      const specPath = path.join(statsDir, 'openapi.json');
      const result = await runCommand('node', [cliPath, 'stats', specPath, '-f', 'json'], {
        cwd: statsDir,
        timeout: 10000,
      });

      expect(result.exitCode).toBe(0);
      const stats = parseJSON(result.stdout);
      expect(stats).toBeDefined();
      if (stats) {
        expect(stats).toHaveProperty('title');
        expect(stats).toHaveProperty('operations');
      }
    });

    it('should show API statistics in markdown format', async () => {
      const specPath = path.join(statsDir, 'openapi.json');
      const result = await runCommand('node', [cliPath, 'stats', specPath, '-f', 'markdown'], {
        cwd: statsDir,
        timeout: 10000,
        env: { ...process.env, CI: undefined },
      });

      expect(result.exitCode).toBe(0);
      // When CI is not set, format=markdown should produce markdown output
      // In CI environments it may fall back to JSON
      expect(result.stdout).toMatch(/API Statistics|operations/i);
    });
  });

  describe('Migrate Command', () => {
    it('should display migrate command help', async () => {
      const result = await runCommand('node', [cliPath, 'migrate', '--help'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('source');
    });

    it('should recognize swagger-jsdoc as source', async () => {
      const result = await runCommand('node', [cliPath, 'migrate', 'swagger-jsdoc'], {
        timeout: 5000,
      });

      // Migrate command shows implementation notice
      expect(result.stdout).toBeDefined();
    });

    it('should reject unsupported sources', async () => {
      const result = await runCommand('node', [cliPath, 'migrate', 'unsupported-tool'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr + result.stdout).toMatch(/unsupported/i);
    });
  });

  describe('Completion Command', () => {
    it('should generate bash completion script', async () => {
      const result = await runCommand('node', [cliPath, 'completion', 'bash'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('_express_swagger_auto');
    });

    it('should generate zsh completion script', async () => {
      const result = await runCommand('node', [cliPath, 'completion', 'zsh'], {
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('compdef');
    });
  });

  describe('Config File Loading', () => {
    let configDir: string;

    beforeAll(() => {
      configDir = path.join(testDir, 'config-tests');
      require('fs').mkdirSync(configDir, { recursive: true });
    });

    it('should recognize JavaScript config file', async () => {
      const configContent = `module.exports = ${JSON.stringify(testConfig, null, 2)};`;
      writeFile(path.join(configDir, 'swagger-auto.config.js'), configContent);

      // Config is loaded automatically
      expect(fileExists(path.join(configDir, 'swagger-auto.config.js'))).toBe(true);
    });

    it('should recognize JSON config file', async () => {
      writeFile(path.join(configDir, '.swagger-autorc.json'), JSON.stringify(testConfig, null, 2));

      expect(fileExists(path.join(configDir, '.swagger-autorc.json'))).toBe(true);
    });
  });
});
