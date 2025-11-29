/**
 * Performance Test Suite: Spec Generation Benchmarks
 * Tests OpenAPI spec generation performance with various configurations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import {
  measurePerformance,
  formatDuration,
  formatMemory,
  checkThresholds,
  createTestApp,
  BenchmarkResult,
} from './utils';

describe('Spec Generation Performance', () => {
  let discovery: RouteDiscovery;
  const results: BenchmarkResult[] = [];

  beforeAll(() => {
    discovery = new RouteDiscovery();
  });

  describe('Route Count Scaling', () => {
    it('should generate spec for 100 routes in <100ms', async () => {
      const app = createTestApp(34);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const result = await measurePerformance(
        () => generator.generate(routes),
        {
          name: 'generate-100-routes',
          iterations: 10,
          thresholds: { maxDuration: 100 },
        }
      );

      results.push(result);
      const check = checkThresholds(result, { maxDuration: 100 });

      console.log(`  100 routes: ${formatDuration(result.avgDuration)} (target: <100ms)`);
      expect(check.passed).toBe(true);
    });

    it('should generate spec for 500 routes in <400ms', async () => {
      const app = createTestApp(167);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const result = await measurePerformance(
        () => generator.generate(routes),
        {
          name: 'generate-500-routes',
          iterations: 5,
          thresholds: { maxDuration: 400 },
        }
      );

      results.push(result);
      const check = checkThresholds(result, { maxDuration: 400 });

      console.log(`  500 routes: ${formatDuration(result.avgDuration)} (target: <400ms)`);
      expect(check.passed).toBe(true);
    });

    it('should generate spec for 1000 routes in <1000ms', async () => {
      const app = createTestApp(334);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const result = await measurePerformance(
        () => generator.generate(routes),
        {
          name: 'generate-1000-routes',
          iterations: 3,
          thresholds: { maxDuration: 1000 },
        }
      );

      results.push(result);
      const check = checkThresholds(result, { maxDuration: 1000 });

      console.log(`  1000 routes: ${formatDuration(result.avgDuration)} (target: <1000ms)`);
      expect(check.passed).toBe(true);
    });
  });

  describe('Complex Schema Generation', () => {
    it('should handle routes with complex schemas', async () => {
      const express = require('express');
      const app = express();
      app.use(express.json());

      // Create routes with complex response structures
      for (let i = 0; i < 50; i++) {
        app.get(`/complex/${i}`, (_req: unknown, res: { json: (data: unknown) => void }) => {
          res.json({
            id: i,
            data: {
              nested: {
                deep: {
                  value: `item-${i}`,
                  items: [1, 2, 3],
                },
              },
            },
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              version: 1,
            },
          });
        });
      }

      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Complex API', version: '1.0.0' },
      });

      const result = await measurePerformance(
        () => generator.generate(routes),
        {
          name: 'complex-schemas',
          iterations: 10,
        }
      );

      results.push(result);

      console.log(`  Complex schemas (50 routes): ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(100);
    });
  });

  describe('Large Component Libraries', () => {
    it('should handle 100+ schemas efficiently', async () => {
      const app = createTestApp(100);
      const routes = discovery.discover(app);

      // Create generator with many component schemas
      const schemas: Record<string, unknown> = {};
      for (let i = 0; i < 100; i++) {
        schemas[`Schema${i}`] = {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            data: { type: 'object' },
          },
        };
      }

      const generator = new SpecGenerator({
        info: { title: 'Schema Library API', version: '1.0.0' },
        components: { schemas },
      });

      const result = await measurePerformance(
        () => generator.generate(routes),
        {
          name: 'large-schema-library',
          iterations: 5,
        }
      );

      results.push(result);

      console.log(`  100+ schemas: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(200);
    });
  });

  describe('Memory Efficiency', () => {
    it('should have efficient memory usage for 100 routes', async () => {
      const app = createTestApp(34);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const result = await measurePerformance(
        () => generator.generate(routes),
        {
          name: 'memory-100-routes',
          iterations: 5,
        }
      );

      results.push(result);

      // Memory should be reasonable
      console.log(`  Memory (100 routes): ${formatMemory(result.memoryUsed)}`);
      expect(result.memoryUsed).toBeLessThan(20 * 1024 * 1024); // 20MB
    });

    it('should have efficient memory usage for 500 routes', async () => {
      const app = createTestApp(167);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const result = await measurePerformance(
        () => generator.generate(routes),
        {
          name: 'memory-500-routes',
          iterations: 3,
        }
      );

      results.push(result);

      console.log(`  Memory (500 routes): ${formatMemory(result.memoryUsed)}`);
      expect(result.memoryUsed).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  describe('Spec Size', () => {
    it('should generate reasonably sized specs', async () => {
      const app = createTestApp(100);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const specSize = JSON.stringify(spec).length;

      console.log(`  Spec size (100 routes): ${(specSize / 1024).toFixed(2)}KB`);
      
      // Should be under 500KB for 100 routes
      expect(specSize).toBeLessThan(500 * 1024);
    });
  });

  describe('Incremental Generation', () => {
    it('should generate quickly for small additions', async () => {
      const app = createTestApp(50);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      // Generate initial spec
      generator.generate(routes);

      // Add a few more routes
      const express = require('express');
      const additionalRoutes = [
        { method: 'get', path: '/new/route1' },
        { method: 'post', path: '/new/route2' },
        { method: 'put', path: '/new/route3' },
      ];

      const result = await measurePerformance(
        () => generator.generate([...routes, ...additionalRoutes.map((r) => ({
          ...r,
          middleware: [],
        }))]),
        {
          name: 'incremental-gen',
          iterations: 10,
        }
      );

      results.push(result);

      console.log(`  Incremental generation: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(50);
    });
  });

  describe('Configuration Variations', () => {
    it('should perform similarly with servers config', async () => {
      const app = createTestApp(50);
      const routes = discovery.discover(app);

      const generatorWithServers = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://staging.example.com', description: 'Staging' },
          { url: 'http://localhost:3000', description: 'Development' },
        ],
      });

      const generatorWithout = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const resultWith = await measurePerformance(
        () => generatorWithServers.generate(routes),
        { name: 'with-servers', iterations: 10 }
      );

      const resultWithout = await measurePerformance(
        () => generatorWithout.generate(routes),
        { name: 'without-servers', iterations: 10 }
      );

      results.push(resultWith);
      results.push(resultWithout);

      // Adding servers shouldn't significantly impact performance
      const ratio = resultWith.avgDuration / resultWithout.avgDuration;
      console.log(`  With servers: ${formatDuration(resultWith.avgDuration)}`);
      console.log(`  Without servers: ${formatDuration(resultWithout.avgDuration)}`);
      console.log(`  Ratio: ${ratio.toFixed(2)}x`);
      
      expect(ratio).toBeLessThan(1.5);
    });

    it('should perform well with security schemes', async () => {
      const app = createTestApp(50);
      const routes = discovery.discover(app);

      const generatorWithSecurity = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
            oauth2: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://auth.example.com/authorize',
                  tokenUrl: 'https://auth.example.com/token',
                  scopes: { read: 'Read access', write: 'Write access' },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      });

      const result = await measurePerformance(
        () => generatorWithSecurity.generate(routes),
        { name: 'with-security', iterations: 10 }
      );

      results.push(result);

      console.log(`  With security schemes: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(100);
    });
  });
});
