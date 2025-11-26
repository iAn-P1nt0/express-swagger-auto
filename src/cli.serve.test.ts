import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_PORT = 9876;
const TEST_SPEC_PATH = path.join(__dirname, '../test-serve-spec.json');

// Minimal valid OpenAPI spec
const VALID_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {
    '/test': {
      get: {
        summary: 'Test endpoint',
        responses: {
          200: {
            description: 'Success',
          },
        },
      },
    },
  },
};

const INVALID_SPEC = {
  data: 'invalid',
};

describe('CLI serve command', () => {
  beforeAll(() => {
    // Create test spec file
    fs.writeFileSync(TEST_SPEC_PATH, JSON.stringify(VALID_SPEC, null, 2));
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_SPEC_PATH)) {
      fs.unlinkSync(TEST_SPEC_PATH);
    }
  });

  it('should start server and serve Swagger UI', async () => {
    const child = spawn('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_PATH, '--port', TEST_PORT.toString()]);

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      // Test health endpoint
      const healthRes = await fetch(`http://localhost:${TEST_PORT}/health`);
      expect(healthRes.status).toBe(200);
      const healthData = await healthRes.json();
      expect(healthData).toHaveProperty('status', 'ok');
      expect(healthData).toHaveProperty('timestamp');
    } finally {
      child.kill();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  it('should serve OpenAPI spec as JSON', async () => {
    const child = spawn('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_PATH, '--port', TEST_PORT.toString()]);

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const specRes = await fetch(`http://localhost:${TEST_PORT}/openapi.json`);
      expect(specRes.status).toBe(200);
      const specData = await specRes.json();
      expect(specData.openapi).toBe('3.1.0');
      expect(specData.info.title).toBe('Test API');
    } finally {
      child.kill();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  it('should redirect root to /api-docs', async () => {
    const child = spawn('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_PATH, '--port', TEST_PORT.toString()]);

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const res = await fetch(`http://localhost:${TEST_PORT}/`, { redirect: 'manual' });
      expect([301, 302, 307, 308]).toContain(res.status);
      expect(res.headers.get('location')).toBe('/api-docs');
    } finally {
      child.kill();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  it('should exit with error when spec file not found', async () => {
    const child = spawn('node', ['dist/cli.js', 'serve', '--spec', '/nonexistent/path.json', '--port', TEST_PORT.toString()]);

    const exitCode = await new Promise<number>((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1));
    });

    expect(exitCode).toBe(1);
  });

  it('should reject invalid port numbers', async () => {
    const child = spawn('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_PATH, '--port', '99999']);

    const exitCode = await new Promise<number>((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1));
    });

    expect(exitCode).toBe(1);
  });

  it('should reject port 0', async () => {
    const child = spawn('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_PATH, '--port', '0']);

    const exitCode = await new Promise<number>((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1));
    });

    expect(exitCode).toBe(1);
  });

  it('should handle invalid JSON spec file', async () => {
    const invalidSpecPath = path.join(__dirname, '../test-invalid-spec.json');
    fs.writeFileSync(invalidSpecPath, 'not valid json {');

    try {
      const child = spawn('node', ['dist/cli.js', 'serve', '--spec', invalidSpecPath, '--port', TEST_PORT.toString()]);

      const exitCode = await new Promise<number>((resolve) => {
        child.on('exit', (code) => resolve(code ?? 1));
      });

      expect(exitCode).toBe(1);
    } finally {
      if (fs.existsSync(invalidSpecPath)) {
        fs.unlinkSync(invalidSpecPath);
      }
    }
  });

  it('should handle spec without required fields', async () => {
    const invalidSpecPath = path.join(__dirname, '../test-invalid-fields-spec.json');
    fs.writeFileSync(invalidSpecPath, JSON.stringify(INVALID_SPEC));

    try {
      const child = spawn('node', ['dist/cli.js', 'serve', '--spec', invalidSpecPath, '--port', TEST_PORT.toString()]);

      const exitCode = await new Promise<number>((resolve) => {
        child.on('exit', (code) => resolve(code ?? 1));
      });

      expect(exitCode).toBe(1);
    } finally {
      if (fs.existsSync(invalidSpecPath)) {
        fs.unlinkSync(invalidSpecPath);
      }
    }
  });

  it('should use custom host option', async () => {
    const child = spawn('node', ['dist/cli.js', 'serve', '--spec', TEST_SPEC_PATH, '--port', TEST_PORT.toString(), '--host', '127.0.0.1']);

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const healthRes = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
      expect(healthRes.status).toBe(200);
    } finally {
      child.kill();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });
});
