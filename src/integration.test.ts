import { describe, it, expect } from 'vitest';
import { RouteDiscovery } from './core/RouteDiscovery';
import { SpecGenerator } from './core/SpecGenerator';
import type { RouteMetadata } from './types';

describe('Integration Tests', () => {
  describe('RouteDiscovery and SpecGenerator Integration', () => {
    it('should generate spec from manual route metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
        },
        {
          method: 'POST',
          path: '/users',
          handler: () => {},
        },
      ];

      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate(routes);

      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info.title).toBe('Test API');
      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/users'].get).toBeDefined();
      expect(spec.paths['/users'].post).toBeDefined();
    });

    it('should extract path parameters from routes', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users/:id',
          handler: () => {},
        },
        {
          method: 'GET',
          path: '/posts/:postId/comments/:commentId',
          handler: () => {},
        },
      ];

      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate(routes);

      const userPath = spec.paths['/users/:id'].get;
      expect(userPath.parameters).toBeDefined();
      expect(userPath.parameters).toHaveLength(1);
      expect(userPath.parameters![0].name).toBe('id');
      expect(userPath.parameters![0].in).toBe('path');

      const commentPath = spec.paths['/posts/:postId/comments/:commentId'].get;
      expect(commentPath.parameters).toHaveLength(2);
    });

    it('should generate operation IDs automatically', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
        },
        {
          method: 'POST',
          path: '/posts/:id',
          handler: () => {},
        },
      ];

      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.operationId).toBeDefined();
      expect(spec.paths['/posts/:id'].post.operationId).toBeDefined();
      expect(spec.paths['/users'].get.operationId).toContain('get');
      expect(spec.paths['/posts/:id'].post.operationId).toContain('post');
    });

    it('should include default responses', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/test',
          handler: () => {},
        },
      ];

      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate(routes);

      expect(spec.paths['/test'].get.responses).toBeDefined();
      expect(spec.paths['/test'].get.responses['200']).toBeDefined();
    });

    it('should use route metadata when provided', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            summary: 'Get all users',
            description: 'Returns a list of users',
            tags: ['users'],
          },
        },
      ];

      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.summary).toBe('Get all users');
      expect(spec.paths['/users'].get.description).toBe('Returns a list of users');
      expect(spec.paths['/users'].get.tags).toEqual(['users']);
    });
  });

  describe('OpenAPI Spec Configuration', () => {
    it('should support OpenAPI 3.0.0', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        specVersion: '3.0.0',
      });

      const spec = generator.generate([]);
      expect(spec.openapi).toBe('3.0.0');
    });

    it('should include servers configuration', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production server',
          },
          {
            url: 'http://localhost:3000',
            description: 'Development server',
          },
        ],
      });

      const spec = generator.generate([]);
      expect(spec.servers).toHaveLength(2);
      expect(spec.servers![0].url).toBe('https://api.example.com');
    });

    it('should include security schemes', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      });

      const spec = generator.generate([]);
      expect(spec.components?.securitySchemes).toBeDefined();
      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
    });
  });
});
