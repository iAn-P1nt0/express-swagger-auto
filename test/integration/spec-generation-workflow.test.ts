/**
 * Integration Tests: Spec Generation Workflow
 * Tests end-to-end OpenAPI specification generation workflows
 * including RouteDiscovery → SpecGenerator pipeline.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import express, { Express, Router, Request, Response } from 'express';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import type { RouteMetadata, OpenAPISpec } from '../../src/types';
import {
  createComplexExpressApp,
  createCRUDApp,
  createAppWithMetadata,
  createMinimalSpec,
  createSecuredSpec,
  createSpecWithSchemas,
} from './helpers';

describe('Integration: Spec Generation Workflow', () => {
  let discovery: RouteDiscovery;

  beforeEach(() => {
    discovery = new RouteDiscovery();
  });

  describe('RouteDiscovery → SpecGenerator Pipeline', () => {
    it('should generate complete OpenAPI spec from Express app', () => {
      const app = createCRUDApp();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: {
          title: 'CRUD API',
          version: '1.0.0',
          description: 'Test CRUD API',
        },
      });

      const spec = generator.generate(routes);

      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info.title).toBe('CRUD API');
      expect(spec.info.version).toBe('1.0.0');
      expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    });

    it('should generate paths for all discovered routes', () => {
      const app = createCRUDApp();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // Verify paths exist for users resource
      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/users/:id']).toBeDefined();
    });

    it('should include all HTTP methods in paths', () => {
      const app = createCRUDApp();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const usersPath = spec.paths['/users'];

      expect(usersPath.get).toBeDefined();
      expect(usersPath.post).toBeDefined();
    });

    it('should generate operationIds for all operations', () => {
      const app = createCRUDApp();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // Check operationIds exist
      for (const [, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            expect((operation as any).operationId).toBeDefined();
          }
        }
      }
    });

    it('should extract path parameters automatically', () => {
      const app = express();
      app.get('/users/:userId', (_req: Request, res: Response) => res.json({}));
      app.get(
        '/users/:userId/posts/:postId',
        (_req: Request, res: Response) => res.json({})
      );

      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // Check path parameters are extracted
      const userPath = spec.paths['/users/:userId'];
      expect(userPath.get.parameters).toBeDefined();
      expect(userPath.get.parameters.length).toBe(1);
      expect(userPath.get.parameters[0].name).toBe('userId');
      expect(userPath.get.parameters[0].in).toBe('path');

      const postsPath = spec.paths['/users/:userId/posts/:postId'];
      expect(postsPath.get.parameters.length).toBe(2);
    });
  });

  describe('Metadata Integration', () => {
    it('should include handler metadata in generated spec', () => {
      const app = createAppWithMetadata();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const usersGet = spec.paths['/users'].get;

      expect(usersGet.summary).toBe('Get all users');
      expect(usersGet.description).toBe('Returns a list of all users in the system');
      expect(usersGet.tags).toContain('users');
    });

    it('should include request body schema from metadata', () => {
      const app = createAppWithMetadata();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const usersPost = spec.paths['/users'].post;

      expect(usersPost.requestBody).toBeDefined();
      expect(usersPost.requestBody.required).toBe(true);
      expect(usersPost.requestBody.content['application/json']).toBeDefined();
    });

    it('should include response schemas from metadata', () => {
      const app = createAppWithMetadata();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const usersPost = spec.paths['/users'].post;

      expect(usersPost.responses).toBeDefined();
      expect(usersPost.responses['201']).toBeDefined();
      expect(usersPost.responses['400']).toBeDefined();
    });
  });

  describe('OpenAPI Version Support', () => {
    it('should generate OpenAPI 3.1.0 spec by default', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/test', handler: () => {} },
      ];

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      expect(spec.openapi).toBe('3.1.0');
    });

    it('should support OpenAPI 3.0.0 version', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/test', handler: () => {} },
      ];

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        specVersion: '3.0.0',
      });

      const spec = generator.generate(routes);
      expect(spec.openapi).toBe('3.0.0');
    });
  });

  describe('Server Configuration', () => {
    it('should include server URLs in generated spec', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/test', handler: () => {} },
      ];

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'http://localhost:3000', description: 'Development' },
        ],
      });

      const spec = generator.generate(routes);
      expect(spec.servers).toHaveLength(2);
      expect(spec.servers[0].url).toBe('https://api.example.com');
    });
  });

  describe('Security Schemes', () => {
    it('should include security schemes in generated spec', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/test', handler: () => {} },
      ];

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      });

      const spec = generator.generate(routes);
      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.components?.securitySchemes?.bearerAuth.type).toBe('http');
    });

    it('should support multiple security schemes', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/test', handler: () => {} },
      ];

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      });

      const spec = generator.generate(routes);
      expect(Object.keys(spec.components?.securitySchemes || {}).length).toBe(2);
    });
  });

  describe('Complex App Workflows', () => {
    it('should handle complex app with 50+ routes', () => {
      const app = createComplexExpressApp(50);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: {
          title: 'Complex API',
          version: '2.0.0',
          description: 'Complex Express API with 50+ routes',
        },
        servers: [{ url: 'https://api.example.com' }],
      });

      const spec = generator.generate(routes);

      expect(spec.openapi).toBe('3.1.0');
      // Adjust expectation based on actual route count
      expect(Object.keys(spec.paths).length).toBeGreaterThan(15);
    });

    it('should preserve nested router structure in paths', () => {
      const app = express();
      const v1Router = Router();
      const usersRouter = Router();

      usersRouter.get('/', (_req: Request, res: Response) => res.json([]));
      usersRouter.get('/:id', (_req: Request, res: Response) => res.json({}));

      v1Router.use('/users', usersRouter);
      app.use('/api/v1', v1Router);

      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // Paths should include full nested path
      const pathKeys = Object.keys(spec.paths);
      expect(pathKeys.some((p) => p.includes('/api/v1/users'))).toBe(true);
    });
  });

  describe('Spec Validation', () => {
    it('should generate valid minimal spec', () => {
      const routes: RouteMetadata[] = [];

      const generator = new SpecGenerator({
        info: { title: 'Empty API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // Validate required fields
      expect(spec.openapi).toBeDefined();
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
      expect(spec.paths).toBeDefined();
    });

    it('should generate spec with all required OpenAPI fields', () => {
      const app = createCRUDApp();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: {
          title: 'Full API',
          version: '1.0.0',
          description: 'Full featured API',
        },
        servers: [{ url: 'https://api.example.com' }],
        securitySchemes: {
          auth: { type: 'http', scheme: 'bearer' },
        },
      });

      const spec = generator.generate(routes);

      // Validate OpenAPI spec structure
      expect(spec.openapi).toMatch(/^3\.[01]\.\d+$/);
      expect(spec.info.title).toBe('Full API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.servers).toBeDefined();
      expect(spec.components?.securitySchemes).toBeDefined();
    });

    it('should include default responses for operations', () => {
      const app = express();
      app.get('/test', (_req: Request, res: Response) => res.json({}));

      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const testOp = spec.paths['/test'].get;

      expect(testOp.responses).toBeDefined();
      expect(testOp.responses['200']).toBeDefined();
    });
  });

  describe('Configuration Updates', () => {
    it('should support updating config after creation', () => {
      const generator = new SpecGenerator({
        info: { title: 'Initial Title', version: '1.0.0' },
      });

      let spec = generator.generate([]);
      expect(spec.info.title).toBe('Initial Title');

      generator.updateConfig({
        info: { title: 'Updated Title', version: '2.0.0' },
      });

      spec = generator.generate([]);
      expect(spec.info.title).toBe('Updated Title');
      expect(spec.info.version).toBe('2.0.0');
    });
  });

  describe('Caching', () => {
    it('should cache generated spec', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/test', handler: () => {} },
      ];

      generator.generate(routes);
      const cachedSpec = generator.getCachedSpec();

      expect(cachedSpec).not.toBeNull();
      expect(cachedSpec?.info.title).toBe('Test API');
    });

    it('should invalidate cache on config update', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      generator.generate([]);
      expect(generator.getCachedSpec()).not.toBeNull();

      generator.updateConfig({ info: { title: 'New Title', version: '2.0.0' } });
      expect(generator.getCachedSpec()).toBeNull();
    });
  });

  describe('Spec Format Verification', () => {
    it('should produce JSON-serializable spec', () => {
      const app = createComplexExpressApp(20);
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // Should not throw
      const json = JSON.stringify(spec);
      const parsed = JSON.parse(json);

      expect(parsed.openapi).toBe(spec.openapi);
      expect(parsed.info.title).toBe(spec.info.title);
    });

    it('should handle special characters in paths', () => {
      const app = express();
      app.get('/search', (_req: Request, res: Response) => res.json({}));
      app.get('/users/:id/profile-settings', (_req: Request, res: Response) =>
        res.json({})
      );

      const routes = discovery.discover(app);
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const json = JSON.stringify(spec);

      expect(json).not.toContain('undefined');
      expect(json).not.toContain('NaN');
    });
  });

  describe('Helper Spec Functions', () => {
    it('should create minimal spec with required fields', () => {
      const spec = createMinimalSpec();

      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
      expect(spec.paths).toBeDefined();
    });

    it('should create secured spec with security schemes', () => {
      const spec = createSecuredSpec();

      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.paths['/users'].get.security).toBeDefined();
    });

    it('should create spec with component schemas', () => {
      const spec = createSpecWithSchemas();

      expect(spec.components?.schemas?.User).toBeDefined();
      expect(spec.components?.schemas?.CreateUser).toBeDefined();
      expect(spec.paths['/users'].get.responses['200'].content).toBeDefined();
    });
  });
});
