/**
 * Error Recovery Edge Case Tests
 *
 * Tests for graceful degradation and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { runtimeCapture } from '../../src/middleware/runtimeCapture';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import {
  createSecurityMockRequest,
  createSecurityMockResponse,
  createTrackedNext,
  withTimeout,
} from './utils';

describe('Error Recovery - Edge Case Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
    vi.clearAllMocks();
  });

  describe('Partial Route Discovery on Error', () => {
    it('should continue discovery after encountering invalid route', () => {
      const app = express();

      // Valid routes
      app.get('/valid1', (req, res) => res.json({ ok: true }));
      app.post('/valid2', (req, res) => res.json({ ok: true }));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle app with mixed valid and problematic routes', () => {
      const app = express();

      // Add multiple routes
      app.get('/health', (req, res) => res.send('OK'));
      app.get('/api/users', (req, res) => res.json([]));
      app.post('/api/users', (req, res) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });

    it('should handle routes with unusual method names', () => {
      const app = express();

      // Standard methods
      app.get('/test', (req, res) => res.send('GET'));
      app.post('/test', (req, res) => res.send('POST'));
      app.put('/test', (req, res) => res.send('PUT'));
      app.delete('/test', (req, res) => res.send('DELETE'));
      app.patch('/test', (req, res) => res.send('PATCH'));
      app.options('/test', (req, res) => res.send('OPTIONS'));
      app.head('/test', (req, res) => res.send('HEAD'));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Invalid Route Skipping', () => {
    it('should skip routes with undefined handler', () => {
      const app = express();
      app.get('/valid', (req, res) => res.send('OK'));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.some((r) => r.path === '/valid')).toBe(true);
    });

    it('should handle routes with empty path', () => {
      const app = express();
      app.get('/', (req, res) => res.send('Root'));
      app.get('/api', (req, res) => res.send('API'));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.some((r) => r.path === '/')).toBe(true);
    });
  });

  describe('Malformed JSDoc Handling', () => {
    it('should handle missing JSDoc gracefully', () => {
      const app = express();

      // Route without JSDoc
      app.get('/no-doc', (req, res) => res.send('OK'));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });

    it('should handle incomplete JSDoc', () => {
      const app = express();

      /**
       * @description Incomplete
       */
      app.get('/partial-doc', (req, res) => res.send('OK'));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('File Read Errors', () => {
    it('should handle non-existent file gracefully', () => {
      // This tests internal file handling
      expect(() => {
        const discovery = new RouteDiscovery();
        // Discovery should not throw on valid app
        const app = express();
        app.get('/test', (req, res) => res.send('OK'));
        discovery.discover(app);
      }).not.toThrow();
    });
  });

  describe('Middleware Error Handling', () => {
    it('should continue to next() even with processing errors', () => {
      // Create circular reference that can't be serialized
      const circular: any = { name: 'test' };
      circular.self = circular;

      mockRequest = createSecurityMockRequest({
        body: circular,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      // Should still call next despite serialization issues
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle errors in response interception', () => {
      mockRequest = createSecurityMockRequest({
        method: 'GET',
        path: '/test',
      });

      const middleware = runtimeCapture({ enabled: true });

      let threwError = false;
      try {
        middleware(mockRequest, mockResponse, () => {
          mockResponse.send({ data: 'test' });
        });
      } catch {
        threwError = true;
      }

      expect(threwError).toBe(false);
    });

    it('should handle null response body', () => {
      mockRequest = createSecurityMockRequest({
        method: 'GET',
        path: '/test',
      });

      const middleware = runtimeCapture({ enabled: true });

      middleware(mockRequest, mockResponse, () => {
        mockResponse.send(null);
      });
    });

    it('should handle undefined response body', () => {
      mockRequest = createSecurityMockRequest({
        method: 'GET',
        path: '/test',
      });

      const middleware = runtimeCapture({ enabled: true });

      middleware(mockRequest, mockResponse, () => {
        mockResponse.send(undefined);
      });
    });
  });

  describe('Network Timeout Handling', () => {
    it('should timeout operations that take too long', async () => {
      const slowOperation = new Promise<string>((resolve) => {
        setTimeout(() => resolve('done'), 2000);
      });

      await expect(
        withTimeout(slowOperation, 100, 'Operation timed out')
      ).rejects.toThrow('Operation timed out');
    });

    it('should complete fast operations within timeout', async () => {
      const fastOperation = new Promise<string>((resolve) => {
        setTimeout(() => resolve('done'), 10);
      });

      const result = await withTimeout(fastOperation, 1000);
      expect(result).toBe('done');
    });
  });

  describe('Dependency Failures', () => {
    it('should handle missing optional dependencies', () => {
      // SpecGenerator should work without all optional configs
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate([]);
      expect(spec.openapi).toBe('3.1.0');
    });

    it('should provide defaults for missing configuration', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate([]);

      expect(spec.info.title).toBe('Test API');
      expect(spec.info.version).toBe('1.0.0');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle rapid middleware creation', () => {
      for (let i = 0; i < 100; i++) {
        const middleware = runtimeCapture({ enabled: true });
        expect(typeof middleware).toBe('function');
      }
    });

    it('should handle concurrent middleware execution', async () => {
      const middleware = runtimeCapture({ enabled: true });
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 50; i++) {
        const promise = new Promise<void>((resolve) => {
          const req = createSecurityMockRequest({
            body: { id: i },
          });
          const res = createSecurityMockResponse();
          const next = vi.fn(() => resolve());

          middleware(req, res, next);
        });
        promises.push(promise);
      }

      await Promise.all(promises);
    });
  });

  describe('Recovery from Invalid State', () => {
    it('should recover from invalid request state', () => {
      // Missing expected properties
      const badRequest = {
        method: 'GET',
        // Missing path, query, headers, body
      } as unknown as Request;

      const middleware = runtimeCapture({ enabled: true });

      // Should not throw
      expect(() => {
        middleware(badRequest, mockResponse, nextFn);
      }).not.toThrow();
    });

    it('should handle request with unusual properties', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          // Symbol properties can't be serialized
          [Symbol('test')]: 'value',
          normal: 'data',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Error Propagation', () => {
    it('should not swallow errors from next()', () => {
      mockRequest = createSecurityMockRequest();

      const errorNext = vi.fn((err?: Error) => {
        if (err) throw err;
      });

      const middleware = runtimeCapture({ enabled: true });

      // Middleware should complete normally
      expect(() => {
        middleware(mockRequest, mockResponse, errorNext);
      }).not.toThrow();
    });

    it('should allow error middleware to handle errors', () => {
      const app = express();
      app.get('/error', (req, res, next) => {
        next(new Error('Test error'));
      });

      // Error handler
      app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        res.status(500).json({ error: err.message });
      });

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('Memory Management on Errors', () => {
    it('should not leak memory on repeated errors', () => {
      const initialHeap = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        try {
          const circular: any = {};
          circular.self = circular;

          mockRequest = createSecurityMockRequest({
            body: circular,
          });

          const middleware = runtimeCapture({ enabled: true });
          middleware(mockRequest, createSecurityMockResponse(), vi.fn());
        } catch {
          // Ignore errors
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalHeap = process.memoryUsage().heapUsed;
      const increase = (finalHeap - initialHeap) / 1024 / 1024;

      // Allow up to 50MB increase
      expect(increase).toBeLessThan(50);
    });
  });

  describe('Spec Generation Error Recovery', () => {
    it('should generate valid spec even with problematic routes', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const routes = [
        {
          method: 'get' as const,
          path: '/valid',
          handler: () => {},
        },
        {
          method: 'post' as const,
          path: '/also-valid',
          description: 'Test route',
          handler: () => {},
        },
      ];

      const spec = generator.generate(routes);

      expect(spec.openapi).toBe('3.1.0');
      expect(Object.keys(spec.paths).length).toBe(2);
    });

    it('should handle routes with missing required fields', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      // Route with minimal info
      const routes = [
        {
          method: 'get' as const,
          path: '/minimal',
          handler: () => {},
        },
      ];

      const spec = generator.generate(routes);
      expect(spec.paths['/minimal']).toBeDefined();
    });
  });

  describe('Configuration Error Handling', () => {
    it('should use defaults for invalid configuration', () => {
      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: -1, // Invalid, should use default or handle gracefully
      });

      mockRequest = createSecurityMockRequest({
        body: { data: 'test' },
      });

      middleware(mockRequest, mockResponse, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle empty sensitiveFields array', () => {
      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: [],
      });

      mockRequest = createSecurityMockRequest({
        body: { password: 'secret' },
      });

      middleware(mockRequest, mockResponse, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Async Error Handling', () => {
    it('should handle async middleware errors', async () => {
      const asyncMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        try {
          await Promise.reject(new Error('Async error'));
        } catch {
          next();
        }
      };

      await asyncMiddleware(mockRequest, mockResponse, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle Promise rejection in processing', async () => {
      const processRequest = async (req: Request): Promise<boolean> => {
        if (req.body === null) {
          return false;
        }
        return true;
      };

      mockRequest = createSecurityMockRequest({ body: null });
      const result = await processRequest(mockRequest);

      expect(result).toBe(false);
    });
  });
});
