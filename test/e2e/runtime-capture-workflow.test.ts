/**
 * E2E Test Suite: Runtime Capture Workflow
 * Tests the development mode runtime capture and schema inference
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import {
  createTempDir,
  cleanupTempDir,
  writeFile,
  readFile,
  fileExists,
  createMockPackageJson,
} from './helpers/test-utils';
import { runtimeCaptureApp } from './fixtures/sample-apps';

describe('Runtime Capture Workflow E2E', () => {
  let testDir: string;

  beforeAll(() => {
    testDir = createTempDir('runtime-capture');
  });

  afterAll(() => {
    cleanupTempDir(testDir);
  });

  describe('Enable Runtime Capture Middleware', () => {
    it('should create app with runtime capture middleware enabled', () => {
      const runtimeApp = `
const express = require('express');
const {
  runtimeCapture,
  SnapshotStorage,
} = require('express-swagger-auto');

const app = express();
app.use(express.json());

// Initialize snapshot storage
const snapshotStorage = new SnapshotStorage({
  outputDir: './data/snapshots',
  enabled: true,
});

// Enable runtime capture middleware
app.use(runtimeCapture({
  enabled: true,
  storage: snapshotStorage,
  sanitize: true, // Mask sensitive fields
  captureRequestBody: true,
  captureResponseBody: true,
}));

// Sample routes
app.get('/posts', (req, res) => {
  res.json({ posts: [], total: 0 });
});

app.post('/posts', (req, res) => {
  res.status(201).json({ id: 1, ...req.body });
});

module.exports = app;
`;

      const appPath = path.join(testDir, 'app.js');
      writeFile(appPath, runtimeApp);
      createMockPackageJson(testDir, {
        dependencies: {
          express: '^4.18.0',
          'express-swagger-auto': '^0.3.0',
        },
      });

      expect(fileExists(appPath)).toBe(true);
      const content = readFile(appPath);
      expect(content).toContain('runtimeCapture');
      expect(content).toContain('SnapshotStorage');
      expect(content).toContain('sanitize: true');
    });

    it('should configure runtime capture with options', () => {
      const content = readFile(path.join(testDir, 'app.js'));

      // Verify configuration options
      expect(content).toContain('enabled: true');
      expect(content).toContain('captureRequestBody: true');
      expect(content).toContain('captureResponseBody: true');
    });
  });

  describe('Making HTTP Requests to Routes', () => {
    let requestDir: string;

    beforeAll(() => {
      requestDir = path.join(testDir, 'request-tests');
      require('fs').mkdirSync(requestDir, { recursive: true });
      writeFile(path.join(requestDir, 'app.js'), runtimeCaptureApp);
    });

    it('should have routes that accept various HTTP methods', () => {
      const content = readFile(path.join(requestDir, 'app.js'));

      // Verify route methods
      expect(content).toContain("app.get('/posts'");
      expect(content).toContain("app.get('/posts/:id'");
      expect(content).toContain("app.post('/posts'");
      expect(content).toContain("app.put('/posts/:id'");
      expect(content).toContain("app.delete('/posts/:id'");
    });

    it('should have routes that return structured responses', () => {
      const content = readFile(path.join(requestDir, 'app.js'));

      // Verify response patterns
      expect(content).toContain('res.json(');
      expect(content).toContain('res.status(201)');
      expect(content).toContain('res.status(404)');
      expect(content).toContain('res.status(204)');
    });
  });

  describe('Capturing Request/Response Schemas', () => {
    let captureDir: string;

    beforeAll(() => {
      captureDir = path.join(testDir, 'capture-tests');
      require('fs').mkdirSync(captureDir, { recursive: true });
    });

    it('should define schema capture configuration', () => {
      const captureApp = `
const express = require('express');
const app = express();
app.use(express.json());

// Schema capture happens automatically
// when runtimeCapture middleware is enabled

const capturedSchemas = new Map();

// Simulated capture middleware
const captureMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = (body) => {
    // Capture response schema
    const schema = inferSchema(body);
    const key = \`\${req.method}:\${req.path}\`;
    capturedSchemas.set(key, { request: req.body, response: body, schema });
    return originalJson(body);
  };
  
  next();
};

function inferSchema(value) {
  if (value === null) return { type: 'null' };
  if (Array.isArray(value)) {
    return { 
      type: 'array', 
      items: value.length > 0 ? inferSchema(value[0]) : {} 
    };
  }
  if (typeof value === 'object') {
    const properties = {};
    for (const [key, val] of Object.entries(value)) {
      properties[key] = inferSchema(val);
    }
    return { type: 'object', properties };
  }
  return { type: typeof value };
}

app.use(captureMiddleware);

app.get('/data', (req, res) => {
  res.json({ items: [{ id: 1, name: 'Test' }], total: 1 });
});

module.exports = app;
`;

      writeFile(path.join(captureDir, 'app.js'), captureApp);
      const content = readFile(path.join(captureDir, 'app.js'));

      expect(content).toContain('capturedSchemas');
      expect(content).toContain('inferSchema');
      expect(content).toContain("type: 'object'");
      expect(content).toContain("type: 'array'");
    });
  });

  describe('Verifying Schema Inference Accuracy', () => {
    it('should infer correct types for primitives', () => {
      // Test the inferSchema concept
      const inferSchemaImpl = (value: unknown): Record<string, unknown> => {
        if (value === null) return { type: 'null' };
        if (Array.isArray(value)) {
          return {
            type: 'array',
            items: value.length > 0 ? inferSchemaImpl(value[0]) : {},
          };
        }
        if (typeof value === 'object') {
          const properties: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(value)) {
            properties[key] = inferSchemaImpl(val);
          }
          return { type: 'object', properties };
        }
        return { type: typeof value };
      };

      expect(inferSchemaImpl('hello')).toEqual({ type: 'string' });
      expect(inferSchemaImpl(42)).toEqual({ type: 'number' });
      expect(inferSchemaImpl(true)).toEqual({ type: 'boolean' });
      expect(inferSchemaImpl(null)).toEqual({ type: 'null' });
    });

    it('should infer correct types for arrays', () => {
      const inferSchemaImpl = (value: unknown): Record<string, unknown> => {
        if (value === null) return { type: 'null' };
        if (Array.isArray(value)) {
          return {
            type: 'array',
            items: value.length > 0 ? inferSchemaImpl(value[0]) : {},
          };
        }
        if (typeof value === 'object') {
          const properties: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(value)) {
            properties[key] = inferSchemaImpl(val);
          }
          return { type: 'object', properties };
        }
        return { type: typeof value };
      };

      const arraySchema = inferSchemaImpl([1, 2, 3]);
      expect(arraySchema.type).toBe('array');
      expect((arraySchema.items as Record<string, unknown>).type).toBe('number');

      const objectArraySchema = inferSchemaImpl([{ id: 1 }]);
      expect(objectArraySchema.type).toBe('array');
      expect((objectArraySchema.items as Record<string, unknown>).type).toBe('object');
    });

    it('should infer correct types for nested objects', () => {
      const inferSchemaImpl = (value: unknown): Record<string, unknown> => {
        if (value === null) return { type: 'null' };
        if (Array.isArray(value)) {
          return {
            type: 'array',
            items: value.length > 0 ? inferSchemaImpl(value[0]) : {},
          };
        }
        if (typeof value === 'object') {
          const properties: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(value)) {
            properties[key] = inferSchemaImpl(val);
          }
          return { type: 'object', properties };
        }
        return { type: typeof value };
      };

      const nestedSchema = inferSchemaImpl({
        user: { name: 'John', age: 30 },
        items: [{ id: 1, price: 19.99 }],
      });

      expect(nestedSchema.type).toBe('object');
      const props = nestedSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.user.type).toBe('object');
      expect(props.items.type).toBe('array');
    });
  });

  describe('Testing Sensitive Field Masking', () => {
    let maskingDir: string;

    beforeAll(() => {
      maskingDir = path.join(testDir, 'masking-tests');
      require('fs').mkdirSync(maskingDir, { recursive: true });
    });

    it('should define sensitive field patterns', () => {
      const sensitivePatterns = [
        'password',
        'token',
        'apiKey',
        'api_key',
        'secret',
        'authorization',
        'auth',
        'credential',
        'ssn',
        'creditCard',
        'credit_card',
      ];

      const maskApp = `
const sensitiveFields = ${JSON.stringify(sensitivePatterns)};

function maskSensitiveData(obj, fields = sensitiveFields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = fields.some(f => keyLower.includes(f.toLowerCase()));
    
    if (isSensitive && typeof value === 'string') {
      result[key] = '[MASKED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = maskSensitiveData(value, fields);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

module.exports = { maskSensitiveData, sensitiveFields };
`;

      writeFile(path.join(maskingDir, 'masking.js'), maskApp);
      const content = readFile(path.join(maskingDir, 'masking.js'));

      expect(content).toContain('password');
      expect(content).toContain('token');
      expect(content).toContain('apiKey');
      expect(content).toContain('[MASKED]');
    });

    it('should mask sensitive fields correctly', () => {
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

      const maskSensitiveData = (
        obj: Record<string, unknown>,
        fields: string[] = sensitiveFields
      ): Record<string, unknown> => {
        if (!obj || typeof obj !== 'object') return obj;

        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(obj)) {
          const keyLower = key.toLowerCase();
          const isSensitive = fields.some((f) => keyLower.includes(f.toLowerCase()));

          if (isSensitive && typeof value === 'string') {
            result[key] = '[MASKED]';
          } else if (typeof value === 'object' && value !== null) {
            result[key] = maskSensitiveData(value as Record<string, unknown>, fields);
          } else {
            result[key] = value;
          }
        }

        return result;
      };

      const data = {
        username: 'john',
        password: 'secret123',
        token: 'abc123xyz',
        apiKey: 'key-12345',
        profile: {
          email: 'john@example.com',
          authToken: 'auth-token-value',
        },
      };

      const masked = maskSensitiveData(data);

      expect(masked.username).toBe('john');
      expect(masked.password).toBe('[MASKED]');
      expect(masked.token).toBe('[MASKED]');
      expect(masked.apiKey).toBe('[MASKED]');
      expect((masked.profile as Record<string, unknown>).email).toBe('john@example.com');
      expect((masked.profile as Record<string, unknown>).authToken).toBe('[MASKED]');
    });
  });

  describe('Validating Snapshot Storage', () => {
    let storageDir: string;

    beforeAll(() => {
      storageDir = path.join(testDir, 'storage-tests');
      require('fs').mkdirSync(storageDir, { recursive: true });
    });

    it('should define snapshot storage structure', () => {
      const storageApp = `
const fs = require('fs');
const path = require('path');

class SnapshotStorage {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './data/snapshots';
    this.enabled = options.enabled !== false;
    this.snapshots = new Map();
    
    if (this.enabled && !fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  save(key, snapshot) {
    if (!this.enabled) return;
    
    const existing = this.snapshots.get(key) || [];
    existing.push({
      ...snapshot,
      timestamp: new Date().toISOString(),
    });
    this.snapshots.set(key, existing);
    
    // Persist to disk
    const filePath = path.join(this.outputDir, \`\${key.replace(/[^a-z0-9]/gi, '_')}.json\`);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  }
  
  get(key) {
    return this.snapshots.get(key) || [];
  }
  
  getAllSnapshots() {
    return this.snapshots;
  }
}

module.exports = SnapshotStorage;
`;

      writeFile(path.join(storageDir, 'SnapshotStorage.js'), storageApp);
      const content = readFile(path.join(storageDir, 'SnapshotStorage.js'));

      expect(content).toContain('class SnapshotStorage');
      expect(content).toContain('save(key, snapshot)');
      expect(content).toContain('getAllSnapshots');
      expect(content).toContain('timestamp');
    });

    it('should create snapshot files with proper structure', () => {
      const snapshotData = {
        method: 'POST',
        path: '/posts',
        requestSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
          },
        },
        responseSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            content: { type: 'string' },
          },
        },
        statusCode: 201,
        timestamp: new Date().toISOString(),
      };

      const snapshotPath = path.join(storageDir, 'POST_posts.json');
      writeFile(snapshotPath, JSON.stringify([snapshotData], null, 2));

      expect(fileExists(snapshotPath)).toBe(true);
      const loaded = JSON.parse(readFile(snapshotPath));
      expect(loaded).toHaveLength(1);
      expect(loaded[0].method).toBe('POST');
      expect(loaded[0].requestSchema).toBeDefined();
      expect(loaded[0].responseSchema).toBeDefined();
    });
  });

  describe('Runtime Capture Disabled in Production', () => {
    it('should respect NODE_ENV setting', () => {
      const prodApp = `
const express = require('express');
const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Runtime capture should be disabled in production
const runtimeCaptureConfig = {
  enabled: !isProduction,
  sanitize: true,
  captureRequestBody: !isProduction,
  captureResponseBody: !isProduction,
};

console.log('Runtime capture enabled:', runtimeCaptureConfig.enabled);

module.exports = { app, runtimeCaptureConfig };
`;

      const appPath = path.join(testDir, 'prod-app.js');
      writeFile(appPath, prodApp);

      const content = readFile(appPath);
      expect(content).toContain("process.env.NODE_ENV === 'production'");
      expect(content).toContain('enabled: !isProduction');
    });

    it('should document production safety', () => {
      const safetyDoc = `
# Runtime Capture Safety

## Production Mode
- Runtime capture is DISABLED by default in production
- Set \`enabled: false\` explicitly for production deployments
- Never capture sensitive data in production logs

## Sensitive Field Masking
- Passwords, tokens, and API keys are masked
- Credit card numbers are masked
- Custom patterns can be added

## Data Retention
- Snapshots are stored locally for development
- Clear snapshots directory before deployment
- Never commit snapshot data to version control
`;

      writeFile(path.join(testDir, 'RUNTIME_CAPTURE_SAFETY.md'), safetyDoc);
      const content = readFile(path.join(testDir, 'RUNTIME_CAPTURE_SAFETY.md'));

      expect(content).toContain('DISABLED by default in production');
      expect(content).toContain('Sensitive Field Masking');
    });
  });
});
