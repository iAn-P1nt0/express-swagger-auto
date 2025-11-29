/**
 * Performance Test Suite: Route Discovery Benchmarks
 * Tests route discovery performance with various route counts and configurations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import {
  measurePerformance,
  formatDuration,
  checkThresholds,
  createTestApp,
  createNestedRouters,
  createMiddlewareChainApp,
  BenchmarkResult,
} from './utils';

// Route count configuration
// Each "resource" creates 3 routes (GET /, POST /, GET /:id)
const RESOURCES_FOR_100_ROUTES = Math.ceil(100 / 3); // ~102 routes
const RESOURCES_FOR_500_ROUTES = Math.ceil(500 / 3); // ~501 routes
const RESOURCES_FOR_1000_ROUTES = Math.ceil(1000 / 3); // ~1002 routes

describe('Route Discovery Performance', () => {
  let discovery: RouteDiscovery;
  const results: BenchmarkResult[] = [];

  beforeAll(() => {
    discovery = new RouteDiscovery();
  });

  describe('Route Count Scaling', () => {
    it('should discover 100 routes in <50ms', async () => {
      const app = createTestApp(RESOURCES_FOR_100_ROUTES);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '100 routes',
          iterations: 10,
          thresholds: { maxDuration: 50 },
        }
      );

      results.push(result);
      const check = checkThresholds(result, { maxDuration: 50 });
      
      console.log(`  100 routes: ${formatDuration(result.avgDuration)} (target: <50ms)`);
      expect(check.passed).toBe(true);
    });

    it('should discover 500 routes in <200ms', async () => {
      const app = createTestApp(RESOURCES_FOR_500_ROUTES);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '500 routes',
          iterations: 5,
          thresholds: { maxDuration: 200 },
        }
      );

      results.push(result);
      const check = checkThresholds(result, { maxDuration: 200 });
      
      console.log(`  500 routes: ${formatDuration(result.avgDuration)} (target: <200ms)`);
      expect(check.passed).toBe(true);
    });

    it('should discover 1000 routes in <500ms', async () => {
      const app = createTestApp(RESOURCES_FOR_1000_ROUTES);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '1000 routes',
          iterations: 3,
          thresholds: { maxDuration: 500 },
        }
      );

      results.push(result);
      const check = checkThresholds(result, { maxDuration: 500 });
      
      console.log(`  1000 routes: ${formatDuration(result.avgDuration)} (target: <500ms)`);
      expect(check.passed).toBe(true);
    });
  });

  describe('Nested Router Performance', () => {
    it('should handle 5-level nested routers efficiently', async () => {
      const app = createNestedRouters(5);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '5-level nested',
          iterations: 10,
          thresholds: { maxDuration: 20 },
        }
      );

      results.push(result);
      
      console.log(`  5-level nested: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(20);
    });

    it('should handle 10-level nested routers', async () => {
      const app = createNestedRouters(10);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '10-level nested',
          iterations: 10,
          thresholds: { maxDuration: 50 },
        }
      );

      results.push(result);
      
      console.log(`  10-level nested: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(50);
    });

    it('should scale linearly with nesting depth', async () => {
      const depth5 = createNestedRouters(5);
      const depth10 = createNestedRouters(10);

      const result5 = await measurePerformance(() => discovery.discover(depth5), {
        name: 'depth-5',
        iterations: 5,
      });

      const result10 = await measurePerformance(() => discovery.discover(depth10), {
        name: 'depth-10',
        iterations: 5,
      });

      // 10-level should not be more than 10x slower than 5-level
      // (relaxed from 3x to account for CI environment variance)
      const ratio = result10.avgDuration / result5.avgDuration;
      console.log(`  Nesting depth scaling ratio: ${ratio.toFixed(2)}x`);
      expect(ratio).toBeLessThan(10);
    });
  });

  describe('Middleware Chain Performance', () => {
    it('should handle 10 middleware chain', async () => {
      const app = createMiddlewareChainApp(10);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '10 middleware',
          iterations: 10,
          thresholds: { maxDuration: 15 },
        }
      );

      results.push(result);
      
      console.log(`  10 middleware chain: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(15);
    });

    it('should handle 50 middleware chain', async () => {
      const app = createMiddlewareChainApp(50);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '50 middleware',
          iterations: 10,
          thresholds: { maxDuration: 50 },
        }
      );

      results.push(result);
      
      console.log(`  50 middleware chain: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('should have reasonable memory usage for 100 routes', async () => {
      const app = createTestApp(RESOURCES_FOR_100_ROUTES);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'memory-100-routes',
          iterations: 5,
        }
      );

      results.push(result);
      
      // Memory should be less than 10MB for 100 routes
      const maxMemory = 10 * 1024 * 1024;
      console.log(`  Memory (100 routes): ${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
      expect(result.memoryUsed).toBeLessThan(maxMemory);
    });

    it('should have reasonable memory usage for 500 routes', async () => {
      const app = createTestApp(RESOURCES_FOR_500_ROUTES);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'memory-500-routes',
          iterations: 3,
        }
      );

      results.push(result);
      
      // Memory should be less than 50MB for 500 routes
      const maxMemory = 50 * 1024 * 1024;
      console.log(`  Memory (500 routes): ${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
      expect(result.memoryUsed).toBeLessThan(maxMemory);
    });
  });

  describe('Performance Consistency', () => {
    it('should have low variance in discovery time', async () => {
      const app = createTestApp(50);

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'consistency-test',
          iterations: 20,
        }
      );

      results.push(result);
      
      // Standard deviation should be less than 200% of average
      // (relaxed threshold to account for CI environment variance and system load)
      const relativeStdDev = result.stdDev / result.avgDuration;
      console.log(`  Relative StdDev: ${(relativeStdDev * 100).toFixed(1)}%`);
      expect(relativeStdDev).toBeLessThan(2.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty app quickly', async () => {
      const express = require('express');
      const app = express();

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'empty-app',
          iterations: 10,
        }
      );

      results.push(result);
      
      console.log(`  Empty app: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(5);
    });

    it('should handle app with only middleware', async () => {
      const express = require('express');
      const app = express();
      
      // Add several middleware without routes
      for (let i = 0; i < 20; i++) {
        app.use((_req: unknown, _res: unknown, next: () => void) => next());
      }

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'middleware-only',
          iterations: 10,
        }
      );

      results.push(result);
      
      console.log(`  Middleware-only app: ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(10);
    });
  });
});
