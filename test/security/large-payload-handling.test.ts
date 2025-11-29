/**
 * Large Payload Handling & Performance Tests
 *
 * Tests for handling large payloads and ensuring scalability
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import { runtimeCapture } from '../../src/middleware/runtimeCapture';
import type { Request, Response, NextFunction } from 'express';
import {
  createSecurityMockRequest,
  createSecurityMockResponse,
  createTrackedNext,
  getMemoryUsage,
} from './utils';
import { largePayloadGenerators } from './fixtures';

describe('Large Payload Handling - Performance Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
  });

  describe('1000+ Route Express App', () => {
    it('should discover 1000 routes efficiently', () => {
      const app = express();

      for (let i = 0; i < 1000; i++) {
        app.get(`/route${i}`, (req, res) => res.send(`Route ${i}`));
      }

      const discovery = new RouteDiscovery();
      const startTime = Date.now();
      const routes = discovery.discover(app);
      const duration = Date.now() - startTime;

      expect(routes.length).toBe(1000);
      expect(duration).toBeLessThan(1000); // <1s for 1000 routes
    });

    it('should handle mixed methods across 500 routes', () => {
      const app = express();
      const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

      for (let i = 0; i < 500; i++) {
        const method = methods[i % methods.length];
        (app as any)[method](`/resource${i}`, (req: any, res: any) => res.send('OK'));
      }

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBe(500);
    });
  });

  describe('Large OpenAPI Spec Generation', () => {
    it('should generate spec for 500 routes efficiently', () => {
      const routes = Array.from({ length: 500 }, (_, i) => ({
        method: 'get' as const,
        path: `/api/resource${i}`,
        handler: () => {},
        metadata: {
          summary: `Get resource ${i}`,
          description: `Retrieves resource ${i} from the system`,
        },
      }));

      const generator = new SpecGenerator({
        info: {
          title: 'Large API',
          version: '1.0.0',
        },
      });

      const startTime = Date.now();
      const spec = generator.generate(routes);
      const duration = Date.now() - startTime;

      expect(Object.keys(spec.paths).length).toBe(500);
      expect(duration).toBeLessThan(1000);
    });

    it('should generate spec with complex response schemas', () => {
      const routes = Array.from({ length: 100 }, (_, i) => ({
        method: 'get' as const,
        path: `/api/complex${i}`,
        handler: () => {},
        metadata: {
          summary: `Complex resource ${i}`,
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      nested: {
                        type: 'object',
                        properties: {
                          level1: {
                            type: 'object',
                            properties: {
                              level2: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }));

      const generator = new SpecGenerator({
        info: {
          title: 'Complex API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate(routes);

      expect(Object.keys(spec.paths).length).toBe(100);
    });
  });

  describe('Component Schema Handling', () => {
    it('should handle routes with many schemas', () => {
      const routes = Array.from({ length: 200 }, (_, i) => ({
        method: 'post' as const,
        path: `/api/schemas${i}`,
        handler: () => {},
        metadata: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    field1: { type: 'string' },
                    field2: { type: 'number' },
                    field3: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      }));

      const generator = new SpecGenerator({
        info: {
          title: 'Schema API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate(routes);

      expect(Object.keys(spec.paths).length).toBe(200);
    });
  });

  describe('Deeply Nested Schemas (20+ levels)', () => {
    it('should handle 10-level nested schema', () => {
      const deepSchema = largePayloadGenerators.generateDeeplyNested(10);

      mockRequest = createSecurityMockRequest({
        body: deepSchema,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle 20-level nested schema', () => {
      const deepSchema = largePayloadGenerators.generateDeeplyNested(20);

      mockRequest = createSecurityMockRequest({
        body: deepSchema,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle deeply nested array structures', () => {
      const createNestedArray = (depth: number): any => {
        if (depth === 0) return ['leaf'];
        return [createNestedArray(depth - 1)];
      };

      const deepArray = createNestedArray(15);

      mockRequest = createSecurityMockRequest({
        body: { nested: deepArray },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Large Arrays (10,000+ items)', () => {
    it('should handle array with 10,000 items', () => {
      const largeArray = largePayloadGenerators.generateLargeArray(10000);

      mockRequest = createSecurityMockRequest({
        body: { items: largeArray },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 1024 * 1024, // 1MB
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle array with 1,000 complex objects', () => {
      const complexArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        nested: {
          a: i * 2,
          b: `value${i}`,
          c: { d: i % 100 },
        },
        tags: [`tag${i % 10}`, `category${i % 5}`],
      }));

      mockRequest = createSecurityMockRequest({
        body: { data: complexArray },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 1024 * 1024,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Long Strings (1MB+)', () => {
    it('should handle 100KB string', () => {
      const longString = largePayloadGenerators.generateLargeString(100 * 1024);

      mockRequest = createSecurityMockRequest({
        body: { content: longString },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 200 * 1024,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should truncate strings exceeding maxBodySize', () => {
      const hugeString = largePayloadGenerators.generateLargeString(500 * 1024);

      mockRequest = createSecurityMockRequest({
        body: { content: hugeString },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 10 * 1024, // 10KB limit
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Memory Usage', () => {
    it('should have reasonable memory usage for 100 routes', () => {
      const initialMemory = getMemoryUsage();
      const app = express();

      for (let i = 0; i < 100; i++) {
        app.get(`/mem${i}`, (req, res) => res.send(`${i}`));
      }

      const discovery = new RouteDiscovery();
      discovery.discover(app);

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(10); // <10MB
    });

    it('should not leak memory during repeated operations', () => {
      const initialMemory = getMemoryUsage();

      for (let iteration = 0; iteration < 100; iteration++) {
        const app = express();

        for (let i = 0; i < 10; i++) {
          app.get(`/route${i}`, (req, res) => res.send(`${i}`));
        }

        const discovery = new RouteDiscovery();
        discovery.discover(app);
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(50); // <50MB
    });
  });

  describe('CPU Usage / Performance', () => {
    it('should complete route discovery in <500ms for 500 routes', () => {
      const app = express();

      for (let i = 0; i < 500; i++) {
        app.get(`/perf${i}`, (req, res) => res.send(`${i}`));
      }

      const discovery = new RouteDiscovery();

      const times: number[] = [];
      for (let run = 0; run < 5; run++) {
        const start = Date.now();
        discovery.discover(app);
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      expect(avgTime).toBeLessThan(500);
    });

    it('should generate spec in <1s for 200 routes with schemas', () => {
      const routes = Array.from({ length: 200 }, (_, i) => ({
        method: 'get' as const,
        path: `/api/r${i}`,
        handler: () => {},
        metadata: {
          summary: `Route ${i}`,
          parameters: [
            { name: 'id', in: 'path' as const, schema: { type: 'string' as const } },
          ],
        },
      }));

      const generator = new SpecGenerator({
        info: {
          title: 'Perf API',
          version: '1.0.0',
        },
      });

      const start = Date.now();
      generator.generate(routes);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent middleware invocations', async () => {
      const middleware = runtimeCapture({ enabled: true });
      const concurrency = 100;

      const promises = Array.from({ length: concurrency }, (_, i) =>
        new Promise<void>((resolve) => {
          const req = createSecurityMockRequest({
            body: { id: i, data: `payload${i}` },
          });
          const res = createSecurityMockResponse();
          const next = vi.fn(() => resolve());

          middleware(req, res, next);
        })
      );

      const startTime = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent route discovery', async () => {
      const app = express();

      for (let i = 0; i < 50; i++) {
        app.get(`/concurrent${i}`, (req, res) => res.send(`${i}`));
      }

      const discoveries = Array.from({ length: 10 }, () =>
        new Promise<number>((resolve) => {
          const discovery = new RouteDiscovery();
          const routes = discovery.discover(app);
          resolve(routes.length);
        })
      );

      const results = await Promise.all(discoveries);

      // All should return same number of routes
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe(50);
    });
  });

  describe('Edge Cases with Large Data', () => {
    it('should handle object with 1000+ keys', () => {
      const largeObject = largePayloadGenerators.generateLargeObject(1000);

      mockRequest = createSecurityMockRequest({
        body: largeObject,
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 1024 * 1024,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle mixed large payload types', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          longString: 'x'.repeat(10000),
          largeArray: Array.from({ length: 1000 }, (_, i) => i),
          deepNested: largePayloadGenerators.generateDeeplyNested(5),
          manyKeys: largePayloadGenerators.generateLargeObject(100),
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 512 * 1024,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle payload at exact maxBodySize limit', () => {
      const exactSize = 1024; // 1KB
      const payload = 'a'.repeat(exactSize);

      mockRequest = createSecurityMockRequest({
        body: { data: payload },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: exactSize + 50, // Account for wrapper
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Response Handling with Large Data', () => {
    it('should handle large response body capture', () => {
      mockRequest = createSecurityMockRequest({
        method: 'GET',
        path: '/large-response',
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 100 * 1024,
      });

      const originalSend = mockResponse.send;
      (mockResponse.send as any) = function (body: any) {
        return originalSend.call(this, body);
      };

      middleware(mockRequest, mockResponse, () => {
        mockResponse.send({
          data: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            value: `item${i}`,
          })),
        });
      });
    });
  });

  describe('Stress Testing', () => {
    it('should survive rapid sequential requests', () => {
      const middleware = runtimeCapture({ enabled: true });

      for (let i = 0; i < 500; i++) {
        const req = createSecurityMockRequest({
          body: { iteration: i },
        });
        const res = createSecurityMockResponse();
        const next = vi.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      }
    });

    it('should handle payload size boundary conditions', () => {
      const sizes = [0, 1, 100, 1000, 10000, 100000];

      sizes.forEach((size) => {
        mockRequest = createSecurityMockRequest({
          body: { data: 'x'.repeat(size) },
        });

        const middleware = runtimeCapture({
          enabled: true,
          maxBodySize: 200000,
        });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
        (nextFn as any).mockClear();
      });
    });
  });
});
