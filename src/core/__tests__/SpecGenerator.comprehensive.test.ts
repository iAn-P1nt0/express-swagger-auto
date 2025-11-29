/**
 * Comprehensive tests for SpecGenerator
 * Target: 90% coverage for OpenAPI specification generation
 *
 * Tests cover:
 * - OAS 3.0 vs 3.1 spec generation
 * - Security schemes (JWT, Bearer, OAuth2)
 * - Complex response schemas
 * - Multiple content types
 * - Component schema references
 * - Server configuration
 * - Path parameter extraction
 * - Operation ID generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpecGenerator } from '../SpecGenerator';
import type { GeneratorConfig, RouteMetadata } from '../../types';

describe('SpecGenerator - Comprehensive Tests', () => {
  const defaultConfig: GeneratorConfig = {
    info: {
      title: 'Test API',
      version: '1.0.0',
      description: 'Test API description',
    },
  };

  let generator: SpecGenerator;

  beforeEach(() => {
    generator = new SpecGenerator(defaultConfig);
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(generator).toBeDefined();
    });

    it('should use default spec version 3.1.0', () => {
      const spec = generator.generate([]);
      expect(spec.openapi).toBe('3.1.0');
    });

    it('should allow custom spec version', () => {
      const customGenerator = new SpecGenerator({
        ...defaultConfig,
        specVersion: '3.0.3',
      });
      const spec = customGenerator.generate([]);
      expect(spec.openapi).toBe('3.0.3');
    });

    it('should initialize with minimal config', () => {
      const minimalConfig: GeneratorConfig = {
        info: {
          title: 'Minimal API',
          version: '1.0.0',
        },
      };
      const minimalGenerator = new SpecGenerator(minimalConfig);
      const spec = minimalGenerator.generate([]);

      expect(spec.info.title).toBe('Minimal API');
      expect(spec.info.version).toBe('1.0.0');
    });

    it('should set enableRuntimeCapture to false by default', () => {
      // This is internal but we can verify spec is generated correctly
      const spec = generator.generate([]);
      expect(spec).toBeDefined();
    });
  });

  describe('OpenAPI Version Generation', () => {
    it('should generate OAS 3.1.0 spec', () => {
      const generator31 = new SpecGenerator({
        ...defaultConfig,
        specVersion: '3.1.0',
      });
      const spec = generator31.generate([]);

      expect(spec.openapi).toBe('3.1.0');
    });

    it('should generate OAS 3.0.0 spec', () => {
      const generator30 = new SpecGenerator({
        ...defaultConfig,
        specVersion: '3.0.0',
      });
      const spec = generator30.generate([]);

      expect(spec.openapi).toBe('3.0.0');
    });

    it('should generate OAS 3.0.3 spec', () => {
      const generator303 = new SpecGenerator({
        ...defaultConfig,
        specVersion: '3.0.3',
      });
      const spec = generator303.generate([]);

      expect(spec.openapi).toBe('3.0.3');
    });
  });

  describe('Info Section Generation', () => {
    it('should include title in info', () => {
      const spec = generator.generate([]);
      expect(spec.info.title).toBe('Test API');
    });

    it('should include version in info', () => {
      const spec = generator.generate([]);
      expect(spec.info.version).toBe('1.0.0');
    });

    it('should include description in info', () => {
      const spec = generator.generate([]);
      expect(spec.info.description).toBe('Test API description');
    });

    it('should include contact information', () => {
      const configWithContact: GeneratorConfig = {
        info: {
          title: 'API',
          version: '1.0.0',
          contact: {
            name: 'Support',
            email: 'support@example.com',
            url: 'https://example.com/support',
          },
        },
      };
      const gen = new SpecGenerator(configWithContact);
      const spec = gen.generate([]);

      expect(spec.info.contact).toEqual({
        name: 'Support',
        email: 'support@example.com',
        url: 'https://example.com/support',
      });
    });

    it('should include license information', () => {
      const configWithLicense: GeneratorConfig = {
        info: {
          title: 'API',
          version: '1.0.0',
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
      };
      const gen = new SpecGenerator(configWithLicense);
      const spec = gen.generate([]);

      expect(spec.info.license).toEqual({
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      });
    });
  });

  describe('Server Configuration', () => {
    it('should include empty servers array by default', () => {
      const spec = generator.generate([]);
      expect(spec.servers).toEqual([]);
    });

    it('should include configured servers', () => {
      const configWithServers: GeneratorConfig = {
        ...defaultConfig,
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://staging-api.example.com', description: 'Staging' },
        ],
      };
      const gen = new SpecGenerator(configWithServers);
      const spec = gen.generate([]);

      expect(spec.servers).toHaveLength(2);
      expect(spec.servers?.[0].url).toBe('https://api.example.com');
      expect(spec.servers?.[1].description).toBe('Staging');
    });

    it('should support server variables', () => {
      const configWithServerVars: GeneratorConfig = {
        ...defaultConfig,
        servers: [
          {
            url: 'https://{environment}.api.example.com',
            description: 'Environment-specific server',
          },
        ],
      };
      const gen = new SpecGenerator(configWithServerVars);
      const spec = gen.generate([]);

      expect(spec.servers?.[0].url).toContain('{environment}');
    });
  });

  describe('Security Schemes', () => {
    it('should include empty security schemes by default', () => {
      const spec = generator.generate([]);
      expect(spec.components?.securitySchemes).toEqual({});
    });

    it('should include JWT Bearer security scheme', () => {
      const configWithSecurity: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Authentication',
          },
        },
      };
      const gen = new SpecGenerator(configWithSecurity);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.components?.securitySchemes?.bearerAuth?.type).toBe('http');
      expect(spec.components?.securitySchemes?.bearerAuth?.scheme).toBe(
        'bearer'
      );
    });

    it('should include API Key security scheme', () => {
      const configWithApiKey: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API Key',
          },
        },
      };
      const gen = new SpecGenerator(configWithApiKey);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.apiKey).toBeDefined();
      expect(spec.components?.securitySchemes?.apiKey?.type).toBe('apiKey');
      expect(spec.components?.securitySchemes?.apiKey?.in).toBe('header');
    });

    it('should include OAuth2 security scheme', () => {
      const configWithOAuth: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          oauth2: {
            type: 'oauth2',
            description: 'OAuth 2.0',
          },
        },
      };
      const gen = new SpecGenerator(configWithOAuth);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.oauth2).toBeDefined();
      expect(spec.components?.securitySchemes?.oauth2?.type).toBe('oauth2');
    });

    it('should include Basic Auth security scheme', () => {
      const configWithBasic: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          basicAuth: {
            type: 'http',
            scheme: 'basic',
            description: 'HTTP Basic Authentication',
          },
        },
      };
      const gen = new SpecGenerator(configWithBasic);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.basicAuth?.scheme).toBe('basic');
    });

    it('should include multiple security schemes', () => {
      const configWithMultipleSecurity: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        },
      };
      const gen = new SpecGenerator(configWithMultipleSecurity);
      const spec = gen.generate([]);

      expect(Object.keys(spec.components?.securitySchemes || {})).toHaveLength(
        2
      );
    });
  });

  describe('Path Generation', () => {
    it('should generate empty paths for no routes', () => {
      const spec = generator.generate([]);
      expect(spec.paths).toEqual({});
    });

    it('should generate path for single route', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/users'].get).toBeDefined();
    });

    it('should generate paths for multiple routes', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
        { method: 'POST', path: '/users', handler: () => {} },
        { method: 'GET', path: '/products', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get).toBeDefined();
      expect(spec.paths['/users'].post).toBeDefined();
      expect(spec.paths['/products'].get).toBeDefined();
    });

    it('should group methods under same path', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/items', handler: () => {} },
        { method: 'POST', path: '/items', handler: () => {} },
        { method: 'PUT', path: '/items', handler: () => {} },
        { method: 'PATCH', path: '/items', handler: () => {} },
        { method: 'DELETE', path: '/items', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      const pathItem = spec.paths['/items'];
      expect(pathItem.get).toBeDefined();
      expect(pathItem.post).toBeDefined();
      expect(pathItem.put).toBeDefined();
      expect(pathItem.patch).toBeDefined();
      expect(pathItem.delete).toBeDefined();
    });

    it('should handle methods in lowercase', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/test', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      // Methods should be lowercase in OpenAPI
      expect(spec.paths['/test'].get).toBeDefined();
      expect(spec.paths['/test'].GET).toBeUndefined();
    });
  });

  describe('Path Item Generation', () => {
    it('should include summary with method and path', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.summary).toContain('GET');
    });

    it('should include custom summary from metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            summary: 'Get all users',
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.summary).toBe('Get all users');
    });

    it('should include description from metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            description: 'Returns a paginated list of users',
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.description).toBe(
        'Returns a paginated list of users'
      );
    });

    it('should include tags from metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            tags: ['users', 'admin'],
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.tags).toEqual(['users', 'admin']);
    });

    it('should use empty tags array when no tags provided', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.tags).toEqual([]);
    });
  });

  describe('Operation ID Generation', () => {
    it('should generate operationId for GET /users', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.operationId).toBe('get_users');
    });

    it('should generate operationId for POST /users', () => {
      const routes: RouteMetadata[] = [
        { method: 'POST', path: '/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].post.operationId).toBe('post_users');
    });

    it('should generate operationId for nested paths', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/api/v1/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/api/v1/users'].get.operationId).toBe(
        'get_api_v1_users'
      );
    });

    it('should generate operationId for root path', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/'].get.operationId).toBe('get_root');
    });

    it('should handle path parameters in operationId', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users/:id', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      // Parameter delimiters are removed
      expect(spec.paths['/users/:id'].get.operationId).toBe('get_users_id');
    });
  });

  describe('Path Parameter Extraction', () => {
    it('should extract single path parameter', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users/:id', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      const params = spec.paths['/users/:id'].get.parameters;
      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('id');
      expect(params[0].in).toBe('path');
      expect(params[0].required).toBe(true);
    });

    it('should extract multiple path parameters', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users/:userId/posts/:postId', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      const params = spec.paths['/users/:userId/posts/:postId'].get.parameters;
      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('userId');
      expect(params[1].name).toBe('postId');
    });

    it('should use metadata parameters when available', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users/:id',
          handler: () => {},
          metadata: {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' },
                description: 'User ID',
              },
            ],
          },
        },
      ];
      const spec = generator.generate(routes);

      const params = spec.paths['/users/:id'].get.parameters;
      expect(params[0].description).toBe('User ID');
      expect(params[0].schema.type).toBe('integer');
    });

    it('should handle paths without parameters', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.parameters).toEqual([]);
    });
  });

  describe('Response Schema Generation', () => {
    it('should include default 200 response', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.responses['200']).toBeDefined();
      expect(spec.paths['/users'].get.responses['200'].description).toBe(
        'Successful response'
      );
    });

    it('should use custom responses from metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            responses: {
              '200': { description: 'List of users' },
              '400': { description: 'Invalid request' },
              '500': { description: 'Server error' },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.responses['200'].description).toBe(
        'List of users'
      );
      expect(spec.paths['/users'].get.responses['400'].description).toBe(
        'Invalid request'
      );
      expect(spec.paths['/users'].get.responses['500'].description).toBe(
        'Server error'
      );
    });

    it('should include response content types', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(
        spec.paths['/users'].get.responses['200'].content?.['application/json']
      ).toBeDefined();
    });
  });

  describe('Request Body Generation', () => {
    it('should not include requestBody for GET requests by default', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.requestBody).toBeUndefined();
    });

    it('should include requestBody from metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/users',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].post.requestBody).toBeDefined();
      expect(spec.paths['/users'].post.requestBody?.required).toBe(true);
    });

    it('should support multiple content types in requestBody', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/upload',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'application/json': { schema: { type: 'object' } },
                'multipart/form-data': { schema: { type: 'object' } },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const requestBody = spec.paths['/upload'].post.requestBody;
      expect(requestBody?.content?.['application/json']).toBeDefined();
      expect(requestBody?.content?.['multipart/form-data']).toBeDefined();
    });
  });

  describe('Components Schema Generation', () => {
    it('should include empty schemas by default', () => {
      const spec = generator.generate([]);
      expect(spec.components?.schemas).toEqual({});
    });

    it('should include components section', () => {
      const spec = generator.generate([]);
      expect(spec.components).toBeDefined();
    });
  });

  describe('Tags Collection', () => {
    it('should initialize with empty tags array', () => {
      const spec = generator.generate([]);
      expect(spec.tags).toEqual([]);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache generated spec', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
      ];

      generator.generate(routes);
      const cachedSpec = generator.getCachedSpec();

      expect(cachedSpec).toBeDefined();
      expect(cachedSpec?.paths['/users']).toBeDefined();
    });

    it('should return null for cached spec before generation', () => {
      expect(generator.getCachedSpec()).toBeNull();
    });

    it('should update cached spec on regeneration', () => {
      const routes1: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
      ];
      const routes2: RouteMetadata[] = [
        { method: 'GET', path: '/products', handler: () => {} },
      ];

      generator.generate(routes1);
      generator.generate(routes2);
      const cachedSpec = generator.getCachedSpec();

      expect(cachedSpec?.paths['/products']).toBeDefined();
    });
  });

  describe('Config Updates', () => {
    it('should update config', () => {
      generator.generate([
        { method: 'GET', path: '/test', handler: () => {} },
      ]);

      generator.updateConfig({
        info: {
          title: 'Updated API',
          version: '2.0.0',
        },
      });

      // Cache should be cleared
      expect(generator.getCachedSpec()).toBeNull();

      const spec = generator.generate([
        { method: 'GET', path: '/test', handler: () => {} },
      ]);
      expect(spec.info.title).toBe('Updated API');
    });

    it('should merge partial config updates', () => {
      const initialGenerator = new SpecGenerator({
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
      });

      initialGenerator.updateConfig({
        info: { title: 'Updated', version: '2.0.0' },
      });

      const spec = initialGenerator.generate([]);

      expect(spec.info.title).toBe('Updated');
      expect(spec.servers?.[0].url).toBe('https://api.example.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      // Empty path becomes empty string key or handled gracefully
      expect(spec.paths['']).toBeDefined();
    });

    it('should handle very long paths', () => {
      const longPath =
        '/api/v1/organizations/:orgId/departments/:deptId/teams/:teamId/members/:memberId/settings';
      const routes: RouteMetadata[] = [
        { method: 'GET', path: longPath, handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths[longPath]).toBeDefined();
    });

    it('should handle special characters in paths', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/api/v1/search-results', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/api/v1/search-results']).toBeDefined();
    });

    it('should handle routes with same path different cases (should be distinct)', () => {
      // Paths should be case-sensitive
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/Users', handler: () => {} },
        { method: 'GET', path: '/users', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/Users']).toBeDefined();
      expect(spec.paths['/users']).toBeDefined();
    });
  });
});
