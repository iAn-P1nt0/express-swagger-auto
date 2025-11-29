/**
 * Contract Tests: Schema Consistency
 * Tests that implementation matches OpenAPI specification
 * Validates route handlers, request bodies, responses match spec
 */
import { describe, it, expect } from 'vitest';
import express, { Express, Request, Response } from 'express';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import type { RouteMetadata, OpenAPISpec } from '../../src/types';

describe('Contract Tests: Schema Consistency', () => {
  describe('Route Handler → OpenAPI Path Mapping', () => {
    it('should generate path matching handler registration', () => {
      const app = express();
      app.get('/users', (_req: Request, res: Response) => res.json([]));
      app.get('/users/:id', (_req: Request, res: Response) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // Paths should match Express routes
      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/users/:id']).toBeDefined();
    });

    it('should include all registered HTTP methods', () => {
      const app = express();
      app.get('/items', (_req: Request, res: Response) => res.json([]));
      app.post('/items', (_req: Request, res: Response) => res.status(201).json({}));
      app.put('/items/:id', (_req: Request, res: Response) => res.json({}));
      app.delete('/items/:id', (_req: Request, res: Response) => res.status(204).send());

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      expect(spec.paths['/items'].get).toBeDefined();
      expect(spec.paths['/items'].post).toBeDefined();
      expect(spec.paths['/items/:id'].put).toBeDefined();
      expect(spec.paths['/items/:id'].delete).toBeDefined();
    });

    it('should map path parameters consistently', () => {
      const app = express();
      app.get('/users/:userId/posts/:postId', (_req: Request, res: Response) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const path = spec.paths['/users/:userId/posts/:postId'];

      expect(path.get.parameters).toBeDefined();
      const paramNames = path.get.parameters.map((p: any) => p.name);
      expect(paramNames).toContain('userId');
      expect(paramNames).toContain('postId');
    });
  });

  describe('Request Body Schema Consistency', () => {
    it('should include request body for POST operations', () => {
      const createUserHandler = (_req: Request, res: Response) => res.status(201).json({});
      (createUserHandler as any).__openapi_metadata = {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
                required: ['name', 'email'],
              },
            },
          },
        },
      };

      const app = express();
      app.post('/users', createUserHandler);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const postOp = spec.paths['/users'].post;

      expect(postOp.requestBody).toBeDefined();
      expect(postOp.requestBody.required).toBe(true);
      expect(postOp.requestBody.content['application/json']).toBeDefined();
    });

    it('should preserve schema type definitions', () => {
      const handler = (_req: Request, res: Response) => res.status(201).json({});
      (handler as any).__openapi_metadata = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: { type: 'integer', minimum: 0 },
                  price: { type: 'number', format: 'float' },
                  active: { type: 'boolean' },
                },
              },
            },
          },
        },
      };

      const app = express();
      app.post('/items', handler);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const schema = spec.paths['/items'].post.requestBody?.content['application/json']?.schema;

      expect(schema?.properties?.count?.type).toBe('integer');
      expect(schema?.properties?.price?.type).toBe('number');
      expect(schema?.properties?.active?.type).toBe('boolean');
    });
  });

  describe('Response Schema Consistency', () => {
    it('should include response definitions', () => {
      const handler = (_req: Request, res: Response) => res.json({});
      (handler as any).__openapi_metadata = {
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Not found',
          },
        },
      };

      const app = express();
      app.get('/users/:id', handler);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const getOp = spec.paths['/users/:id'].get;

      expect(getOp.responses['200']).toBeDefined();
      expect(getOp.responses['200'].description).toBe('Success');
      expect(getOp.responses['404']).toBeDefined();
    });

    it('should preserve response status codes from metadata', () => {
      const handler = (_req: Request, res: Response) => res.status(201).json({});
      (handler as any).__openapi_metadata = {
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Bad Request' },
          '409': { description: 'Conflict' },
        },
      };

      const app = express();
      app.post('/resources', handler);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const responses = spec.paths['/resources'].post.responses;

      expect(responses['201']).toBeDefined();
      expect(responses['400']).toBeDefined();
      expect(responses['409']).toBeDefined();
    });
  });

  describe('Parameter Type Consistency', () => {
    it('should mark path parameters as required', () => {
      const app = express();
      app.get('/users/:id', (_req: Request, res: Response) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const params = spec.paths['/users/:id'].get.parameters;
      const idParam = params.find((p: any) => p.name === 'id');

      expect(idParam.required).toBe(true);
      expect(idParam.in).toBe('path');
    });

    it('should infer parameter types from naming conventions', () => {
      const app = express();
      app.get('/users/:userId', (_req: Request, res: Response) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const params = spec.paths['/users/:userId'].get.parameters;
      const userIdParam = params.find((p: any) => p.name === 'userId');

      // ID parameters should be treated as string or integer
      expect(userIdParam.schema).toBeDefined();
    });
  });

  describe('Security Requirements Consistency', () => {
    it('should include security configuration in generated spec', () => {
      const app = express();
      app.get('/protected', (_req: Request, res: Response) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
        },
      });

      const spec = generator.generate(routes);

      // Security schemes should be in components
      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
    });
  });

  describe('Tag Organization Consistency', () => {
    it('should include tags from metadata', () => {
      const usersHandler = (_req: Request, res: Response) => res.json([]);
      (usersHandler as any).__openapi_metadata = {
        tags: ['users', 'admin'],
      };

      const app = express();
      app.get('/users', usersHandler);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const getOp = spec.paths['/users'].get;

      expect(getOp.tags).toContain('users');
      expect(getOp.tags).toContain('admin');
    });
  });

  describe('Operation ID Consistency', () => {
    it('should generate unique operation IDs', () => {
      const app = express();
      app.get('/users', (_req: Request, res: Response) => res.json([]));
      app.get('/users/:id', (_req: Request, res: Response) => res.json({}));
      app.post('/users', (_req: Request, res: Response) => res.status(201).json({}));
      app.put('/users/:id', (_req: Request, res: Response) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      const operationIds = new Set<string>();
      for (const [, pathItem] of Object.entries(spec.paths)) {
        for (const method of ['get', 'post', 'put', 'delete']) {
          const op = (pathItem as any)?.[method];
          if (op?.operationId) {
            expect(operationIds.has(op.operationId)).toBe(false);
            operationIds.add(op.operationId);
          }
        }
      }
    });

    it('should generate operation IDs consistently', () => {
      const app = express();
      app.get('/users', (_req: Request, res: Response) => res.json([]));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // operationId should be generated automatically
      expect(spec.paths['/users'].get.operationId).toBeDefined();
    });
  });

  describe('Spec Regeneration Consistency', () => {
    it('should produce consistent output for same input', () => {
      const app = express();
      app.get('/users', (_req: Request, res: Response) => res.json([]));
      app.post('/users', (_req: Request, res: Response) => res.status(201).json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec1 = generator.generate(routes);
      const spec2 = generator.generate(routes);

      // Should produce same paths
      expect(Object.keys(spec1.paths)).toEqual(Object.keys(spec2.paths));
    });

    it('should preserve metadata across regeneration', () => {
      const handler = (_req: Request, res: Response) => res.json([]);
      (handler as any).__openapi_metadata = {
        summary: 'Get all items',
        tags: ['items'],
      };

      const app = express();
      app.get('/items', handler);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec1 = generator.generate(routes);
      const spec2 = generator.generate(routes);

      expect(spec1.paths['/items'].get.summary).toBe(spec2.paths['/items'].get.summary);
      expect(spec1.paths['/items'].get.tags).toEqual(spec2.paths['/items'].get.tags);
    });
  });
});
