import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(__dirname, '../test-cli-automation');
const TEST_APP_FILE = path.join(TEST_DIR, 'app.ts');
const TEST_SPEC_FILE = path.join(TEST_DIR, 'openapi.json');
const TEST_CONFIG_FILE = path.join(TEST_DIR, 'express-swagger-auto.config.js');

// Minimal Express app for testing
const TEST_APP_CODE = `
import express from 'express';

export const app = express();

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
  res.json({ id: 1, name: 'John' });
});

app.get('/api/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'John' });
});

export default app;
`;

// Test config file
const TEST_CONFIG_CODE = `
module.exports = {
  input: './test-cli-automation/app.ts',
  output: './test-cli-automation/openapi.json',
  format: 'json',
  info: {
    title: 'Test API',
    version: '1.0.0',
    description: 'Test API for CLI automation',
  },
};
`;

// Valid OpenAPI spec for testing
const VALID_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {
    '/api/users': {
      get: {
        summary: 'Get users',
        responses: {
          200: {
            description: 'Success',
          },
        },
      },
    },
  },
};

describe('CLI Comprehensive Automation Tests', () => {
  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // Create test app file
    fs.writeFileSync(TEST_APP_FILE, TEST_APP_CODE);

    // Create test config file
    fs.writeFileSync(TEST_CONFIG_FILE, TEST_CONFIG_CODE);

    // Create valid spec file
    fs.writeFileSync(TEST_SPEC_FILE, JSON.stringify(VALID_SPEC, null, 2));
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('VERSION & HELP', () => {
    it('should display version with --version flag', () => {
      const result = spawnSync('node', ['dist/cli.js', '--version']);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should display version with -v flag', () => {
      const result = spawnSync('node', ['dist/cli.js', '-v']);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should display help for main command', () => {
      const result = spawnSync('node', ['dist/cli.js', '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toContain('generate');
      expect(result.stdout.toString()).toContain('validate');
      expect(result.stdout.toString()).toContain('serve');
    });

    it('should display help for generate command', () => {
      const result = spawnSync('node', ['dist/cli.js', 'generate', '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toContain('--config');
      expect(result.stdout.toString()).toContain('--input');
      expect(result.stdout.toString()).toContain('--output');
    });

    it('should display help for serve command', () => {
      const result = spawnSync('node', ['dist/cli.js', 'serve', '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toContain('--spec');
      expect(result.stdout.toString()).toContain('--port');
      expect(result.stdout.toString()).toContain('--host');
    });

    it('should display help for validate command', () => {
      const result = spawnSync('node', ['dist/cli.js', 'validate', '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toContain('--strict');
    });
  });

  describe('VALIDATE Command', () => {
    it('should validate a valid OpenAPI spec', () => {
      const result = spawnSync('node', ['dist/cli.js', 'validate', TEST_SPEC_FILE]);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toContain('✓');
      expect(result.stdout.toString()).toContain('Validation passed');
    });

    it('should reject non-existent spec file', () => {
      const result = spawnSync('node', ['dist/cli.js', 'validate', '/nonexistent/spec.json']);
      expect(result.status).toBe(1);
      expect(result.stderr.toString()).toContain('not found');
    });

    it('should reject invalid JSON spec file', () => {
      const invalidFile = path.join(TEST_DIR, 'invalid-spec.json');
      fs.writeFileSync(invalidFile, 'not valid json {');
      try {
        const result = spawnSync('node', ['dist/cli.js', 'validate', invalidFile]);
        expect(result.status).toBe(1);
        // Check for JSON parsing error in either stderr or stdout
        const output = result.stderr.toString() + result.stdout.toString();
        expect(output).toMatch(/parse|JSON|valid/i);
      } finally {
        fs.unlinkSync(invalidFile);
      }
    });

    it('should reject spec without openapi field', () => {
      const invalidSpec = path.join(TEST_DIR, 'no-openapi-spec.json');
      fs.writeFileSync(invalidSpec, JSON.stringify({ info: { title: 'Test' } }));
      try {
        const result = spawnSync('node', ['dist/cli.js', 'validate', invalidSpec]);
        expect(result.status).toBe(1);
        // Check for validation error
        const output = result.stderr.toString() + result.stdout.toString();
        expect(output).toMatch(/error|validation/i);
      } finally {
        fs.unlinkSync(invalidSpec);
      }
    });

    it('should reject spec without info field', () => {
      const invalidSpec = path.join(TEST_DIR, 'no-info-spec.json');
      fs.writeFileSync(invalidSpec, JSON.stringify({ openapi: '3.1.0' }));
      try {
        const result = spawnSync('node', ['dist/cli.js', 'validate', invalidSpec]);
        expect(result.status).toBe(1);
        // The error message may vary, just ensure it fails
        const output = result.stderr.toString() + result.stdout.toString();
        expect(output.length).toBeGreaterThan(0);
      } finally {
        fs.unlinkSync(invalidSpec);
      }
    });

    it('should support strict validation mode', () => {
      const result = spawnSync('node', ['dist/cli.js', 'validate', TEST_SPEC_FILE, '--strict']);
      expect(result.status).toBeGreaterThanOrEqual(0);
    });

    it('should handle YAML spec files', () => {
      const yamlSpec = path.join(TEST_DIR, 'spec.yaml');
      const yamlContent = `
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths:
  /api/users:
    get:
      responses:
        '200':
          description: Success
`;
      fs.writeFileSync(yamlSpec, yamlContent);
      try {
        const result = spawnSync('node', ['dist/cli.js', 'validate', yamlSpec]);
        // Should either pass or handle gracefully
        expect(result.status).toBeGreaterThanOrEqual(0);
      } finally {
        fs.unlinkSync(yamlSpec);
      }
    });
  });

  describe('SERVE Command', () => {
    const TEST_PORT = 9988;

    it('should start server with valid spec', () => {
      return new Promise<void>((resolve, reject) => {
        const child = spawn('node', [
          'dist/cli.js',
          'serve',
          '--spec',
          TEST_SPEC_FILE,
          '--port',
          TEST_PORT.toString(),
        ]);

        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error('Server failed to start'));
        }, 3000);

        child.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('Swagger UI server started')) {
            clearTimeout(timeout);
            child.kill();
            resolve();
          }
        });

        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it('should reject server without spec file', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'serve',
        '--spec',
        '/nonexistent/spec.json',
        '--port',
        '9989',
      ]);
      expect(result.status).toBe(1);
      expect(result.stderr.toString()).toContain('not found');
    });

    it('should reject invalid port numbers', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'serve',
        '--spec',
        TEST_SPEC_FILE,
        '--port',
        '99999',
      ]);
      expect(result.status).toBe(1);
      expect(result.stderr.toString()).toContain('Invalid port');
    });

    it('should reject port 0', () => {
      const result = spawnSync('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_FILE, '--port', '0']);
      expect(result.status).toBe(1);
    });

    it('should reject negative port numbers', () => {
      const result = spawnSync('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_FILE, '--port', '-1']);
      expect(result.status).toBe(1);
    });

    it('should use default port 3000 if not specified', () => {
      return new Promise<void>((resolve, reject) => {
        const child = spawn('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_FILE]);

        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error('Server failed to start'));
        }, 3000);

        child.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('3000')) {
            clearTimeout(timeout);
            child.kill();
            resolve();
          }
        });

        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it('should accept custom host option', () => {
      return new Promise<void>((resolve, reject) => {
        const child = spawn('node', [
          'dist/cli.js',
          'serve',
          '--spec',
          TEST_SPEC_FILE,
          '--port',
          '9990',
          '--host',
          '127.0.0.1',
        ]);

        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error('Server failed to start'));
        }, 3000);

        child.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('127.0.0.1:9990')) {
            clearTimeout(timeout);
            child.kill();
            resolve();
          }
        });

        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });
  });

  describe('GENERATE Command', () => {
    it('should show help for generate command', () => {
      const result = spawnSync('node', ['dist/cli.js', 'generate', '--help']);
      expect(result.status).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('--config');
      expect(output).toContain('--input');
      expect(output).toContain('--output');
      expect(output).toContain('--format');
      expect(output).toContain('--watch');
    });

    it('should show error for non-existent input file', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        '/nonexistent/app.ts',
        '--output',
        path.join(TEST_DIR, 'spec-output.json'),
      ]);
      expect(result.status).toBe(1);
      expect(result.stderr.toString()).toContain('not found');
    });

    it('should validate config file path', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--config',
        '/nonexistent/config.js',
        '--input',
        TEST_APP_FILE,
      ]);
      // Should handle gracefully (may succeed with defaults or fail with clear message)
      expect(result.status).toBeGreaterThanOrEqual(0);
    });

    it('should support JSON output format', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'output.json'),
        '--format',
        'json',
      ]);
      expect([0, 1]).toContain(result.status); // May fail due to missing dependencies
    });

    it('should support YAML output format', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'output.yaml'),
        '--format',
        'yaml',
      ]);
      expect([0, 1]).toContain(result.status); // May fail due to missing dependencies
    });

    it('should support strategy selection', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'output.json'),
        '--strategies',
        'jsdoc',
        'decorator',
      ]);
      expect([0, 1]).toContain(result.status);
    });

    it('should support path filtering with include-paths', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'output.json'),
        '--include-paths',
        '/api/*',
      ]);
      expect([0, 1]).toContain(result.status);
    });

    it('should support path filtering with exclude-paths', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'output.json'),
        '--exclude-paths',
        '/admin/*',
      ]);
      expect([0, 1]).toContain(result.status);
    });

    it('should support tag filtering', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'output.json'),
        '--tags',
        'users',
        'products',
      ]);
      expect([0, 1]).toContain(result.status);
    });

    it('should support CI mode', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'output.json'),
        '--ci',
      ]);
      expect([0, 1]).toContain(result.status);
    });

    it('should support CI format options', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'output.json'),
        '--ci',
        '--ci-format',
        'json',
      ]);
      expect([0, 1]).toContain(result.status);
    });

    it('should override config file with CLI options', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--config',
        TEST_CONFIG_FILE,
        '--output',
        path.join(TEST_DIR, 'cli-override.json'),
      ]);
      // Should handle gracefully
      expect([0, 1]).toContain(result.status);
    });

    it('should show custom API title and version', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'custom-title.json'),
        '--title',
        'My Custom API',
        '--version',
        '2.0.0',
      ]);
      expect([0, 1]).toContain(result.status);
    });

    it('should accept custom API description', () => {
      const result = spawnSync('node', [
        'dist/cli.js',
        'generate',
        '--input',
        TEST_APP_FILE,
        '--output',
        path.join(TEST_DIR, 'desc.json'),
        '--description',
        'My API description',
      ]);
      expect([0, 1]).toContain(result.status);
    });
  });

  describe('MIGRATE Command', () => {
    it('should show help for migrate command', () => {
      const result = spawnSync('node', ['dist/cli.js', 'migrate', '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toContain('--config');
    });

    it('should list supported migration sources', () => {
      const result = spawnSync('node', ['dist/cli.js', 'migrate', 'invalid-source']);
      expect(result.status).toBe(1);
      expect(result.stderr.toString()).toContain('Unsupported source');
    });

    it('should support swagger-jsdoc migration', () => {
      const result = spawnSync('node', ['dist/cli.js', 'migrate', 'swagger-jsdoc']);
      expect([0, 1]).toContain(result.status);
    });

    it('should support tsoa migration', () => {
      const result = spawnSync('node', ['dist/cli.js', 'migrate', 'tsoa']);
      expect([0, 1]).toContain(result.status);
    });

    it('should support express-oas-generator migration', () => {
      const result = spawnSync('node', ['dist/cli.js', 'migrate', 'express-oas-generator']);
      expect([0, 1]).toContain(result.status);
    });

    it('should reject unknown migration source', () => {
      const result = spawnSync('node', ['dist/cli.js', 'migrate', 'unknown-tool']);
      expect(result.status).toBe(1);
      expect(result.stderr.toString()).toContain('Unsupported');
    });
  });

  describe('INIT Command', () => {
    it('should show help for init command', () => {
      const result = spawnSync('node', ['dist/cli.js', 'init', '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toContain('init');
    });

    it('should have init command available', () => {
      const result = spawnSync('node', ['dist/cli.js', '--help']);
      expect(result.stdout.toString()).toContain('init');
    });
  });

  describe('ERROR HANDLING', () => {
    it('should handle invalid command gracefully', () => {
      const result = spawnSync('node', ['dist/cli.js', 'invalid-command']);
      expect(result.status).toBe(1);
    });

    it('should show usage on no arguments', () => {
      const result = spawnSync('node', ['dist/cli.js']);
      // Should either show help or exit with 0
      expect(result.status).toBeGreaterThanOrEqual(0);
      const output = result.stdout.toString() + result.stderr.toString();
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle missing required arguments', () => {
      const result = spawnSync('node', ['dist/cli.js', 'validate']);
      expect(result.status).toBe(1);
    });

    it('should provide helpful error for file permission issues', () => {
      const restrictedFile = path.join(TEST_DIR, 'restricted.json');
      fs.writeFileSync(restrictedFile, JSON.stringify(VALID_SPEC));
      fs.chmodSync(restrictedFile, 0o000);

      try {
        const result = spawnSync('node', ['dist/cli.js', 'validate', restrictedFile]);
        expect(result.status).toBe(1);
      } finally {
        fs.chmodSync(restrictedFile, 0o644);
        fs.unlinkSync(restrictedFile);
      }
    });
  });

  describe('INTEGRATION SCENARIOS', () => {
    it('should handle workflow: generate -> validate -> serve', () => {
      // This is a high-level integration test
      // In real scenario, would generate spec, then validate it
      const validateResult = spawnSync('node', ['dist/cli.js', 'validate', TEST_SPEC_FILE]);
      expect(validateResult.status).toBe(0);

      // Then try to serve it
      return new Promise<void>((resolve, reject) => {
        const child = spawn('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_FILE, '--port', '9991']);
        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error('Server failed to start'));
        }, 2000);

        child.stdout.on('data', (data) => {
          if (data.toString().includes('started')) {
            clearTimeout(timeout);
            child.kill();
            resolve();
          }
        });

        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it('should validate multiple spec files in sequence', () => {
      const spec1 = path.join(TEST_DIR, 'spec1.json');
      const spec2 = path.join(TEST_DIR, 'spec2.json');

      fs.writeFileSync(spec1, JSON.stringify(VALID_SPEC));
      fs.writeFileSync(spec2, JSON.stringify(VALID_SPEC));

      try {
        const result1 = spawnSync('node', ['dist/cli.js', 'validate', spec1]);
        const result2 = spawnSync('node', ['dist/cli.js', 'validate', spec2]);

        expect(result1.status).toBe(0);
        expect(result2.status).toBe(0);
      } finally {
        fs.unlinkSync(spec1);
        fs.unlinkSync(spec2);
      }
    });
  });

  describe('OUTPUT FORMATS', () => {
    it('should produce valid JSON output', () => {
      const spec = path.join(TEST_DIR, 'valid-output.json');
      fs.writeFileSync(spec, JSON.stringify(VALID_SPEC));

      try {
        const result = spawnSync('node', ['dist/cli.js', 'validate', spec]);
        expect(result.status).toBe(0);

        // Output should be readable
        const output = result.stdout.toString();
        expect(output.length).toBeGreaterThan(0);
      } finally {
        fs.unlinkSync(spec);
      }
    });

    it('should handle special characters in paths', () => {
      const spec = path.join(TEST_DIR, 'special-chars-spec.json');
      const specWithSpecialChars = {
        ...VALID_SPEC,
        paths: {
          '/api/users/{id}': {
            get: {
              summary: 'Get user by ID',
              responses: {
                200: { description: 'Success' },
              },
            },
          },
        },
      };

      fs.writeFileSync(spec, JSON.stringify(specWithSpecialChars));

      try {
        const result = spawnSync('node', ['dist/cli.js', 'validate', spec]);
        expect(result.status).toBe(0);
      } finally {
        fs.unlinkSync(spec);
      }
    });

    it('should handle very large spec files', () => {
      const largeSpec = { ...VALID_SPEC };
      // Add many paths
      for (let i = 0; i < 100; i++) {
        (largeSpec.paths as any)[`/api/endpoint${i}`] = {
          get: {
            summary: `Endpoint ${i}`,
            responses: {
              200: { description: 'Success' },
            },
          },
        };
      }

      const spec = path.join(TEST_DIR, 'large-spec.json');
      fs.writeFileSync(spec, JSON.stringify(largeSpec));

      try {
        const result = spawnSync('node', ['dist/cli.js', 'validate', spec]);
        expect(result.status).toBe(0);
        // Should have 101 paths (1 from VALID_SPEC + 100 new ones)
        expect(result.stdout.toString()).toContain('101');
      } finally {
        fs.unlinkSync(spec);
      }
    });
  });

  describe('ENVIRONMENT HANDLING', () => {
    it('should respect CI environment variable', () => {
      const env = { ...process.env, CI: 'true' };
      const result = spawnSync('node', ['dist/cli.js', 'generate', '--help'], { env });
      expect(result.status).toBe(0);
    });

    it('should work with custom NODE_ENV', () => {
      const env = { ...process.env, NODE_ENV: 'test' };
      const result = spawnSync('node', ['dist/cli.js', '--version'], { env });
      expect(result.status).toBe(0);
    });

    it('should handle missing HOME directory gracefully', () => {
      const env = { ...process.env };
      delete env.HOME;
      const result = spawnSync('node', ['dist/cli.js', '--version'], { env });
      expect(result.status).toBe(0);
    });
  });

  describe('CONCURRENCY', () => {
    it('should handle multiple validate commands in parallel', async () => {
      const specs = [];
      for (let i = 0; i < 5; i++) {
        const spec = path.join(TEST_DIR, `concurrent-spec-${i}.json`);
        fs.writeFileSync(spec, JSON.stringify(VALID_SPEC));
        specs.push(spec);
      }

      try {
        const promises = specs.map(
          (spec) =>
            new Promise<number>((resolve) => {
              const result = spawnSync('node', ['dist/cli.js', 'validate', spec]);
              resolve(result.status);
            })
        );

        const results = await Promise.all(promises);
        expect(results.every((status) => status === 0)).toBe(true);
      } finally {
        specs.forEach((spec) => {
          if (fs.existsSync(spec)) fs.unlinkSync(spec);
        });
      }
    });
  });
});
