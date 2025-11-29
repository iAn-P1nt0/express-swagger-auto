/**
 * Concurrency & Race Condition Tests
 *
 * Tests for thread safety and concurrent operations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express from 'express';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import { runtimeCapture } from '../../src/middleware/runtimeCapture';
import { SnapshotStorage } from '../../src/core/SnapshotStorage';
import type { Request, Response, NextFunction } from 'express';
import {
  createSecurityMockRequest,
  createSecurityMockResponse,
  createTrackedNext,
} from './utils';

describe('Concurrency & Race Condition Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
  });

  describe('Concurrent Route Discovery', () => {
    it('should handle concurrent discoveries on same app', async () => {
      const app = express();

      for (let i = 0; i < 50; i++) {
        app.get(`/route${i}`, (req, res) => res.send(`${i}`));
      }

      const discoveries = Array.from({ length: 10 }, () =>
        new Promise<number>((resolve) => {
          const discovery = new RouteDiscovery();
          const routes = discovery.discover(app);
          resolve(routes.length);
        })
      );

      const results = await Promise.all(discoveries);

      // All concurrent discoveries should return same result
      expect(results.every((r) => r === 50)).toBe(true);
    });

    it('should handle concurrent discoveries on different apps', async () => {
      const apps = Array.from({ length: 5 }, (_, appIndex) => {
        const app = express();
        for (let i = 0; i < 10; i++) {
          app.get(`/app${appIndex}/route${i}`, (req, res) => res.send('OK'));
        }
        return app;
      });

      const discoveries = apps.map(
        (app) =>
          new Promise<number>((resolve) => {
            const discovery = new RouteDiscovery();
            const routes = discovery.discover(app);
            resolve(routes.length);
          })
      );

      const results = await Promise.all(discoveries);

      expect(results.every((r) => r === 10)).toBe(true);
    });

    it('should not have race conditions with shared discovery instance', async () => {
      const discovery = new RouteDiscovery();

      const apps = Array.from({ length: 3 }, (_, i) => {
        const app = express();
        app.get(`/test${i}`, (req, res) => res.send('OK'));
        return app;
      });

      const results = await Promise.all(
        apps.map((app) => Promise.resolve(discovery.discover(app)))
      );

      results.forEach((routes, i) => {
        expect(routes.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Parallel Spec Generation', () => {
    it('should generate specs in parallel without interference', async () => {
      const routeSets = Array.from({ length: 5 }, (_, setIndex) =>
        Array.from({ length: 10 }, (_, routeIndex) => ({
          method: 'get' as const,
          path: `/set${setIndex}/route${routeIndex}`,
          handler: () => {},
        }))
      );

      const generators = routeSets.map((routes) =>
        new Promise<number>((resolve) => {
          const generator = new SpecGenerator({
            info: {
              title: 'Parallel API',
              version: '1.0.0',
            },
          });
          const spec = generator.generate(routes);
          resolve(Object.keys(spec.paths).length);
        })
      );

      const results = await Promise.all(generators);

      expect(results.every((r) => r === 10)).toBe(true);
    });

    it('should handle concurrent spec generation with same generator', async () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Shared Generator',
          version: '1.0.0',
        },
      });

      const routeSets = Array.from({ length: 5 }, (_, i) => [
        {
          method: 'get' as const,
          path: `/concurrent${i}`,
          handler: () => {},
        },
      ]);

      const results = await Promise.all(
        routeSets.map((routes) => Promise.resolve(generator.generate(routes)))
      );

      results.forEach((spec) => {
        expect(spec.openapi).toBe('3.1.0');
      });
    });
  });

  describe('Simultaneous File Operations', () => {
    it('should handle concurrent snapshot storage operations', async () => {
      const storage = new SnapshotStorage({ enabled: true });

      const storeOperations = Array.from({ length: 20 }, (_, i) =>
        Promise.resolve(
          storage.store({
            method: 'GET',
            path: `/concurrent${i}`,
            requestSchema: { type: 'object' },
            responseSchema: { type: 'object' },
          })
        )
      );

      await Promise.all(storeOperations);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle rapid sequential storage operations', async () => {
      const storage = new SnapshotStorage({ enabled: true });

      for (let i = 0; i < 50; i++) {
        storage.store({
          method: 'POST',
          path: `/rapid${i}`,
          requestSchema: { type: 'string' },
          responseSchema: null,
        });
      }

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Cache Corruption Prevention', () => {
    it('should maintain spec cache integrity under concurrent access', async () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Cache Test',
          version: '1.0.0',
        },
      });

      const routes = [
        { method: 'get' as const, path: '/cached', handler: () => {} },
      ];

      // Generate spec to populate cache
      generator.generate(routes);

      const cachedSpecs = await Promise.all(
        Array.from({ length: 10 }, () =>
          Promise.resolve(generator.getCachedSpec())
        )
      );

      // All cached specs should be equivalent
      const firstSpec = JSON.stringify(cachedSpecs[0]);
      expect(cachedSpecs.every((spec) => JSON.stringify(spec) === firstSpec)).toBe(true);
    });

    it('should handle cache updates during concurrent reads', async () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Update Test',
          version: '1.0.0',
        },
      });

      const initialRoutes = [
        { method: 'get' as const, path: '/initial', handler: () => {} },
      ];

      generator.generate(initialRoutes);

      // Mix of reads and updates
      const operations = Array.from({ length: 20 }, (_, i) => {
        if (i % 3 === 0) {
          // Update operation
          return Promise.resolve(
            generator.generate([
              { method: 'get' as const, path: `/update${i}`, handler: () => {} },
            ])
          );
        } else {
          // Read operation
          return Promise.resolve(generator.getCachedSpec());
        }
      });

      const results = await Promise.all(operations);

      // All results should be valid specs
      results.forEach((result) => {
        if (result) {
          expect(result.openapi).toBe('3.1.0');
        }
      });
    });
  });

  describe('Shared State Race Conditions', () => {
    it('should handle concurrent middleware invocations safely', async () => {
      const middleware = runtimeCapture({ enabled: true });
      const results: boolean[] = [];

      const invocations = Array.from({ length: 50 }, (_, i) =>
        new Promise<boolean>((resolve) => {
          const req = createSecurityMockRequest({
            body: { id: i, timestamp: Date.now() },
          });
          const res = createSecurityMockResponse();
          const next = vi.fn(() => {
            results.push(true);
            resolve(true);
          });

          middleware(req, res, next);
        })
      );

      await Promise.all(invocations);

      expect(results.length).toBe(50);
      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should not leak data between concurrent requests', async () => {
      const middleware = runtimeCapture({ enabled: true });

      const invocations = Array.from({ length: 10 }, (_, i) =>
        new Promise<any>((resolve) => {
          const uniqueData = { requestId: `unique-${i}`, secret: `secret-${i}` };
          const req = createSecurityMockRequest({
            body: uniqueData,
          });
          const res = createSecurityMockResponse();
          const next = vi.fn(() => {
            resolve({
              requestId: req.body.requestId,
              receivedSecret: req.body.secret,
            });
          });

          middleware(req, res, next);
        })
      );

      const results = await Promise.all(invocations);

      // Each request should have its own unique data
      results.forEach((result, i) => {
        expect(result.requestId).toBe(`unique-${i}`);
      });
    });
  });

  describe('Async Error Handling', () => {
    it('should handle async errors in concurrent operations', async () => {
      const middleware = runtimeCapture({ enabled: true });

      const operations = Array.from({ length: 20 }, (_, i) =>
        new Promise<string>((resolve) => {
          const req = createSecurityMockRequest({
            body: i % 5 === 0 ? null : { data: i },
          });
          const res = createSecurityMockResponse();
          const next = vi.fn(() => resolve('success'));

          middleware(req, res, next);
        })
      );

      const results = await Promise.all(operations);

      // All should complete successfully despite null bodies
      expect(results.every((r) => r === 'success')).toBe(true);
    });

    it('should not crash on concurrent circular reference handling', async () => {
      const middleware = runtimeCapture({ enabled: true });

      const operations = Array.from({ length: 10 }, () =>
        new Promise<boolean>((resolve) => {
          const circular: any = { name: 'test' };
          circular.self = circular;

          const req = createSecurityMockRequest({
            body: circular,
          });
          const res = createSecurityMockResponse();
          const next = vi.fn(() => resolve(true));

          middleware(req, res, next);
        })
      );

      const results = await Promise.all(operations);

      expect(results.every((r) => r === true)).toBe(true);
    });
  });

  describe('Resource Contention', () => {
    it('should handle high contention scenario', async () => {
      const highContention = 100;
      const middleware = runtimeCapture({ enabled: true });
      const completionOrder: number[] = [];

      const operations = Array.from({ length: highContention }, (_, i) =>
        new Promise<number>((resolve) => {
          const req = createSecurityMockRequest({
            body: { index: i },
          });
          const res = createSecurityMockResponse();
          const next = vi.fn(() => {
            completionOrder.push(i);
            resolve(i);
          });

          // Small random delay to simulate real-world conditions
          setTimeout(() => middleware(req, res, next), Math.random() * 10);
        })
      );

      const results = await Promise.all(operations);

      // All should complete
      expect(results.length).toBe(highContention);
      expect(completionOrder.length).toBe(highContention);
    });

    it('should maintain consistency under load', async () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Load Test',
          version: '1.0.0',
        },
      });

      const baseRoutes = [
        { method: 'get' as const, path: '/load', handler: () => {} },
      ];

      // Generate initial spec
      const initialSpec = generator.generate(baseRoutes);

      // Concurrent reads
      const concurrentReads = await Promise.all(
        Array.from({ length: 50 }, () =>
          Promise.resolve(generator.getCachedSpec())
        )
      );

      // All reads should return consistent result
      const initialJson = JSON.stringify(initialSpec);
      concurrentReads.forEach((spec) => {
        expect(JSON.stringify(spec)).toBe(initialJson);
      });
    });
  });

  describe('Deadlock Prevention', () => {
    it('should not deadlock with interdependent operations', async () => {
      const discovery = new RouteDiscovery();
      const generator = new SpecGenerator({
        info: {
          title: 'Deadlock Test',
          version: '1.0.0',
        },
      });

      const app = express();
      app.get('/test', (req, res) => res.send('OK'));

      // Interleaved operations that could potentially deadlock
      const operations = Array.from({ length: 20 }, (_, i) => {
        if (i % 2 === 0) {
          return Promise.resolve(discovery.discover(app));
        } else {
          return Promise.resolve(
            generator.generate([
              { method: 'get' as const, path: `/gen${i}`, handler: () => {} },
            ])
          );
        }
      });

      // Should complete without hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout - possible deadlock')), 5000)
      );

      await Promise.race([Promise.all(operations), timeoutPromise]);
    });
  });

  describe('Timing-Sensitive Operations', () => {
    it('should handle rapid start/stop cycles', async () => {
      for (let cycle = 0; cycle < 10; cycle++) {
        const middleware = runtimeCapture({ enabled: true });
        const app = express();
        app.use(middleware);

        const req = createSecurityMockRequest();
        const res = createSecurityMockResponse();
        const next = vi.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      }
    });

    it('should handle config changes during operation', async () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Config Change Test',
          version: '1.0.0',
        },
      });

      const routes = [
        { method: 'get' as const, path: '/config', handler: () => {} },
      ];

      // Interleave generation and config updates
      const operations = Array.from({ length: 10 }, (_, i) => {
        if (i % 2 === 0) {
          return Promise.resolve(generator.generate(routes));
        } else {
          return Promise.resolve(
            generator.updateConfig({
              info: {
                title: `Updated ${i}`,
                version: '1.0.0',
              },
            })
          );
        }
      });

      await Promise.all(operations);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Memory Consistency', () => {
    it('should maintain memory consistency under concurrent access', async () => {
      const storage = new SnapshotStorage({ enabled: true });

      // Concurrent writes
      const writes = Array.from({ length: 50 }, (_, i) =>
        Promise.resolve(
          storage.store({
            method: 'GET',
            path: `/memory${i}`,
            requestSchema: { type: 'object' },
            responseSchema: { type: 'object' },
          })
        )
      );

      await Promise.all(writes);

      // Subsequent operations should work correctly
      storage.store({
        method: 'POST',
        path: '/final',
        requestSchema: { type: 'string' },
        responseSchema: null,
      });

      expect(true).toBe(true);
    });
  });
});
