import { describe, it, expect } from 'vitest';
import {
  calculateStats,
  formatStatsText,
  formatStatsMarkdown,
  ApiStats,
} from '../../src/cli/stats';

describe('Stats Calculator', () => {
  const minimalSpec = {
    openapi: '3.0.0',
    info: { title: 'Minimal API', version: '1.0.0' },
    paths: {},
  };

  const fullSpec = {
    openapi: '3.1.0',
    info: {
      title: 'Full API',
      version: '2.0.0',
      description: 'A comprehensive API',
    },
    paths: {
      '/users': {
        get: {
          operationId: 'getUsers',
          summary: 'List users',
          description: 'Get all users',
          tags: ['users'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UserList' },
                  example: { users: [] },
                },
              },
            },
            '401': { description: 'Unauthorized' },
          },
        },
        post: {
          operationId: 'createUser',
          summary: 'Create user',
          tags: ['users'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateUser' },
              },
            },
          },
          responses: {
            '201': { description: 'Created' },
            '400': { description: 'Bad Request' },
          },
        },
      },
      '/users/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true }],
        get: {
          operationId: 'getUser',
          summary: 'Get user by ID',
          description: 'Get a single user',
          tags: ['users'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Success' },
            '404': { description: 'Not Found' },
          },
        },
        put: {
          operationId: 'updateUser',
          summary: 'Update user',
          tags: ['users'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Updated' },
          },
        },
        delete: {
          operationId: 'deleteUser',
          summary: 'Delete user',
          tags: ['users', 'admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '204': { description: 'Deleted' },
          },
        },
      },
      '/products': {
        get: {
          operationId: 'getProducts',
          summary: 'List products',
          tags: ['products'],
          responses: {
            '200': { description: 'Success' },
          },
        },
      },
      '/auth/login': {
        post: {
          operationId: 'login',
          summary: 'Login',
          tags: ['auth'],
          responses: {
            '200': { description: 'Success' },
          },
        },
      },
    },
    components: {
      schemas: {
        User: { type: 'object', properties: { id: { type: 'string' } } },
        UserList: { type: 'array', items: { $ref: '#/components/schemas/User' } },
        CreateUser: { type: 'object', properties: { name: { type: 'string' } } },
      },
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
    security: [{ bearerAuth: [] }],
  };

  describe('calculateStats', () => {
    it('should handle minimal spec', () => {
      const stats = calculateStats(minimalSpec);

      expect(stats.title).toBe('Minimal API');
      expect(stats.version).toBe('1.0.0');
      expect(stats.openapi).toBe('3.0.0');
      expect(stats.operations.total).toBe(0);
      expect(stats.paths.total).toBe(0);
    });

    it('should count operations correctly', () => {
      const stats = calculateStats(fullSpec);

      expect(stats.operations.total).toBe(7);
      expect(stats.operations.byMethod.get).toBe(3);
      expect(stats.operations.byMethod.post).toBe(2);
      expect(stats.operations.byMethod.put).toBe(1);
      expect(stats.operations.byMethod.delete).toBe(1);
    });

    it('should analyze paths correctly', () => {
      const stats = calculateStats(fullSpec);

      expect(stats.paths.total).toBe(4);
      expect(stats.paths.maxDepth).toBe(2);
      expect(stats.paths.avgDepth).toBeGreaterThan(0);
    });

    it('should count schemas correctly', () => {
      const stats = calculateStats(fullSpec);

      expect(stats.schemas.components).toBe(3);
      expect(stats.schemas.referenced).toBeGreaterThan(0);
    });

    it('should count parameters correctly', () => {
      const stats = calculateStats(fullSpec);

      expect(stats.parameters.query).toBe(2);
      expect(stats.parameters.path).toBe(1);
      expect(stats.parameters.total).toBeGreaterThan(0);
    });

    it('should analyze documentation coverage', () => {
      const stats = calculateStats(fullSpec);

      expect(stats.documentation.summaries.count).toBe(7);
      expect(stats.documentation.summaries.percentage).toBe(100);
      expect(stats.documentation.descriptions.count).toBeGreaterThan(0);
      expect(stats.documentation.examples.count).toBeGreaterThan(0);
    });

    it('should analyze security coverage', () => {
      const stats = calculateStats(fullSpec);

      // All operations should inherit global security
      expect(stats.security.coverage).toBe(100);
      expect(stats.security.protectedOperations).toBe(7);
      expect(stats.security.schemes).toContain('bearerAuth');
      expect(stats.security.schemes).toContain('apiKey');
    });

    it('should count tags correctly', () => {
      const stats = calculateStats(fullSpec);

      expect(stats.tags['users']).toBe(5);
      expect(stats.tags['products']).toBe(1);
      expect(stats.tags['auth']).toBe(1);
      expect(stats.tags['admin']).toBe(1);
    });

    it('should analyze response codes', () => {
      const stats = calculateStats(fullSpec);

      expect(stats.responses.total).toBeGreaterThan(0);
      expect(stats.responses.byStatusCode['200']).toBeGreaterThan(0);
      expect(stats.responses.byStatusCode['201']).toBe(1);
      expect(stats.responses.byStatusCode['401']).toBe(1);
      expect(stats.responses.byStatusCode['404']).toBe(1);
    });
  });

  describe('formatStatsText', () => {
    it('should format stats as text', () => {
      const stats = calculateStats(fullSpec);
      const text = formatStatsText(stats);

      expect(text).toContain('Full API');
      expect(text).toContain('v2.0.0');
      expect(text).toContain('Operations');
      expect(text).toContain('Paths');
      expect(text).toContain('Schemas');
      expect(text).toContain('Documentation Coverage');
      expect(text).toContain('Security');
      expect(text).toContain('Tags');
    });

    it('should include progress bars', () => {
      const stats = calculateStats(fullSpec);
      const text = formatStatsText(stats);

      // Progress bar characters
      expect(text).toContain('█');
    });

    it('should show method distribution', () => {
      const stats = calculateStats(fullSpec);
      const text = formatStatsText(stats);

      expect(text).toContain('GET');
      expect(text).toContain('POST');
      expect(text).toContain('PUT');
      expect(text).toContain('DELETE');
    });
  });

  describe('formatStatsMarkdown', () => {
    it('should format stats as markdown', () => {
      const stats = calculateStats(fullSpec);
      const md = formatStatsMarkdown(stats);

      expect(md).toContain('# API Statistics');
      expect(md).toContain('Full API');
      expect(md).toContain('## Operations');
      expect(md).toContain('| Method | Count | Percentage |');
      expect(md).toContain('## Paths');
      expect(md).toContain('## Documentation Coverage');
      expect(md).toContain('## Security');
      expect(md).toContain('## Tags');
    });

    it('should produce valid markdown tables', () => {
      const stats = calculateStats(fullSpec);
      const md = formatStatsMarkdown(stats);

      // Check table structure
      const lines = md.split('\n');
      const tableHeaderLines = lines.filter((l) => l.includes('|') && l.includes('---'));
      expect(tableHeaderLines.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle spec without components', () => {
      const specWithoutComponents = {
        openapi: '3.0.0',
        info: { title: 'No Components', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const stats = calculateStats(specWithoutComponents);
      expect(stats.schemas.components).toBe(0);
      expect(stats.security.schemes).toHaveLength(0);
    });

    it('should handle spec without security', () => {
      const specWithoutSecurity = {
        openapi: '3.0.0',
        info: { title: 'No Security', version: '1.0.0' },
        paths: {
          '/public': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const stats = calculateStats(specWithoutSecurity);
      expect(stats.security.coverage).toBe(0);
      expect(stats.security.protectedOperations).toBe(0);
    });

    it('should handle spec with no tags', () => {
      const specWithoutTags = {
        openapi: '3.0.0',
        info: { title: 'No Tags', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const stats = calculateStats(specWithoutTags);
      expect(Object.keys(stats.tags)).toHaveLength(0);
    });

    it('should handle deeply nested paths', () => {
      const specWithDeepPaths = {
        openapi: '3.0.0',
        info: { title: 'Deep Paths', version: '1.0.0' },
        paths: {
          '/a/b/c/d/e': {
            get: { responses: { '200': { description: 'OK' } } },
          },
          '/x': {
            get: { responses: { '200': { description: 'OK' } } },
          },
        },
      };

      const stats = calculateStats(specWithDeepPaths);
      expect(stats.paths.maxDepth).toBe(5);
      expect(stats.paths.avgDepth).toBe(3);
    });
  });
});
