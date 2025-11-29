/**
 * Performance Test Suite: Middleware Analysis Benchmarks
 * Tests middleware parsing and analysis performance
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import {
  measurePerformance,
  formatDuration,
  BenchmarkResult,
} from './utils';

describe('Middleware Analysis Performance', () => {
  let discovery: RouteDiscovery;
  const results: BenchmarkResult[] = [];

  beforeAll(() => {
    discovery = new RouteDiscovery();
  });

  describe('Single Middleware Per Route', () => {
    it('should analyze single middleware in <5ms per route', async () => {
      const express = require('express');
      const app = express();
      app.use(express.json());

      // Create 100 routes with single middleware each
      for (let i = 0; i < 100; i++) {
        const middleware = (_req: unknown, _res: unknown, next: () => void) => next();
        app.get(`/route${i}`, middleware, (_req: unknown, res: { json: (data: unknown) => void }) =>
          res.json({ id: i })
        );
      }

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'single-middleware-100-routes',
          iterations: 10,
        }
      );

      results.push(result);

      // Calculate per-route time
      const perRouteTime = result.avgDuration / 100;
      console.log(`  Single middleware per route: ${formatDuration(perRouteTime)} (target: <5ms)`);
      expect(perRouteTime).toBeLessThan(5);
    });
  });

  describe('10 Middleware Chain', () => {
    it('should analyze 10 middleware chain in <15ms per route', async () => {
      const express = require('express');
      const app = express();

      // Create 50 routes with 10 middleware each
      for (let i = 0; i < 50; i++) {
        const middlewares = Array(10)
          .fill(null)
          .map(
            (_, j) =>
              (_req: unknown, _res: unknown, next: () => void) => {
                // Simulate middleware processing
                next();
              }
          );

        app.get(
          `/route${i}`,
          ...middlewares,
          (_req: unknown, res: { json: (data: unknown) => void }) => res.json({ id: i })
        );
      }

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '10-middleware-chain-50-routes',
          iterations: 10,
        }
      );

      results.push(result);

      // Calculate per-route time
      const perRouteTime = result.avgDuration / 50;
      console.log(`  10 middleware chain per route: ${formatDuration(perRouteTime)} (target: <15ms)`);
      expect(perRouteTime).toBeLessThan(15);
    });
  });

  describe('50 Middleware Chain', () => {
    it('should analyze 50 middleware chain in <50ms per route', async () => {
      const express = require('express');
      const app = express();

      // Create 20 routes with 50 middleware each
      for (let i = 0; i < 20; i++) {
        const middlewares = Array(50)
          .fill(null)
          .map(
            () =>
              (_req: unknown, _res: unknown, next: () => void) => next()
          );

        app.get(
          `/route${i}`,
          ...middlewares,
          (_req: unknown, res: { json: (data: unknown) => void }) => res.json({ id: i })
        );
      }

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: '50-middleware-chain-20-routes',
          iterations: 5,
        }
      );

      results.push(result);

      // Calculate per-route time
      const perRouteTime = result.avgDuration / 20;
      console.log(`  50 middleware chain per route: ${formatDuration(perRouteTime)} (target: <50ms)`);
      expect(perRouteTime).toBeLessThan(50);
    });
  });

  describe('Auth Guard Detection', () => {
    it('should detect auth middleware in <2ms per route', async () => {
      const express = require('express');
      const app = express();
      app.use(express.json());

      // Create auth middleware pattern
      const authMiddleware = (req: { headers: { authorization?: string }; user?: unknown }, res: { status: (code: number) => { json: (data: unknown) => void } }, next: () => void) => {
        const token = req.headers.authorization;
        if (!token) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verify token (simulated)
        req.user = { id: '123' };
        next();
      };

      // Create 100 routes with auth middleware
      for (let i = 0; i < 100; i++) {
        app.get(`/protected${i}`, authMiddleware, (_req: unknown, res: { json: (data: unknown) => void }) =>
          res.json({ secure: true })
        );
      }

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'auth-middleware-100-routes',
          iterations: 10,
        }
      );

      results.push(result);

      // Calculate per-route time
      const perRouteTime = result.avgDuration / 100;
      console.log(`  Auth guard detection per route: ${formatDuration(perRouteTime)} (target: <2ms)`);
      expect(perRouteTime).toBeLessThan(2);
    });
  });

  describe('Validation Middleware Detection', () => {
    it('should detect validation middleware in <3ms per route', async () => {
      const express = require('express');
      const app = express();
      app.use(express.json());

      // Create validation middleware pattern
      const validateBody = (schema: { validate: (data: unknown) => { error?: { message: string } } }) => {
        return (req: { body: unknown }, res: { status: (code: number) => { json: (data: unknown) => void } }, next: () => void) => {
          const validation = schema.validate(req.body);
          if (validation.error) {
            return res.status(400).json({ error: validation.error.message });
          }
          next();
        };
      };

      // Mock schema
      const mockSchema = {
        validate: () => ({ error: null }),
      };

      // Create 100 routes with validation middleware
      for (let i = 0; i < 100; i++) {
        app.post(
          `/data${i}`,
          validateBody(mockSchema),
          (_req: unknown, res: { json: (data: unknown) => void }) => res.json({ valid: true })
        );
      }

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'validation-middleware-100-routes',
          iterations: 10,
        }
      );

      results.push(result);

      // Calculate per-route time
      const perRouteTime = result.avgDuration / 100;
      console.log(`  Validation middleware detection per route: ${formatDuration(perRouteTime)} (target: <3ms)`);
      expect(perRouteTime).toBeLessThan(3);
    });
  });

  describe('Mixed Middleware Types', () => {
    it('should handle mixed middleware efficiently', async () => {
      const express = require('express');
      const app = express();
      app.use(express.json());

      // Different middleware types
      const logger = (_req: unknown, _res: unknown, next: () => void) => next();
      const auth = (_req: unknown, _res: unknown, next: () => void) => next();
      const validate = (_req: unknown, _res: unknown, next: () => void) => next();
      const rateLimit = (_req: unknown, _res: unknown, next: () => void) => next();
      const cors = (_req: unknown, _res: unknown, next: () => void) => next();

      // Create routes with various middleware combinations
      for (let i = 0; i < 50; i++) {
        const middlewares = [logger];
        if (i % 2 === 0) middlewares.push(auth);
        if (i % 3 === 0) middlewares.push(validate);
        if (i % 5 === 0) middlewares.push(rateLimit);
        if (i % 7 === 0) middlewares.push(cors);

        app.get(
          `/mixed${i}`,
          ...middlewares,
          (_req: unknown, res: { json: (data: unknown) => void }) => res.json({ id: i })
        );
      }

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'mixed-middleware-50-routes',
          iterations: 10,
        }
      );

      results.push(result);

      console.log(`  Mixed middleware (50 routes): ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(100);
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle error middleware efficiently', async () => {
      const express = require('express');
      const app = express();
      app.use(express.json());

      // Create routes
      for (let i = 0; i < 50; i++) {
        app.get(`/route${i}`, (_req: unknown, res: { json: (data: unknown) => void }) =>
          res.json({ id: i })
        );
      }

      // Add error handling middleware (4 arguments)
      app.use(
        (
          err: Error,
          _req: unknown,
          res: { status: (code: number) => { json: (data: unknown) => void } },
          _next: () => void
        ) => {
          res.status(500).json({ error: err.message });
        }
      );

      const result = await measurePerformance(
        () => discovery.discover(app),
        {
          name: 'error-middleware-50-routes',
          iterations: 10,
        }
      );

      results.push(result);

      console.log(`  With error handling (50 routes): ${formatDuration(result.avgDuration)}`);
      expect(result.avgDuration).toBeLessThan(50);
    });
  });

  describe('Middleware Scaling', () => {
    it('should scale linearly with middleware count', async () => {
      const express = require('express');

      const createAppWithMiddleware = (count: number) => {
        const app = express();
        const middlewares = Array(count)
          .fill(null)
          .map(() => (_req: unknown, _res: unknown, next: () => void) => next());

        app.get('/test', ...middlewares, (_req: unknown, res: { json: (data: unknown) => void }) =>
          res.json({})
        );
        return app;
      };

      const result10 = await measurePerformance(
        () => discovery.discover(createAppWithMiddleware(10)),
        { name: '10-middleware', iterations: 10 }
      );

      const result50 = await measurePerformance(
        () => discovery.discover(createAppWithMiddleware(50)),
        { name: '50-middleware', iterations: 10 }
      );

      results.push(result10);
      results.push(result50);

      // 50 middleware should not be more than 10x slower than 10 middleware
      const ratio = result50.avgDuration / result10.avgDuration;
      console.log(`  10 middleware: ${formatDuration(result10.avgDuration)}`);
      console.log(`  50 middleware: ${formatDuration(result50.avgDuration)}`);
      console.log(`  Scaling ratio: ${ratio.toFixed(2)}x`);

      expect(ratio).toBeLessThan(10);
    });
  });
});
