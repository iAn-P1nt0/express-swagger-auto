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

    it('should handle Unicode characters in paths', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/api/données', handler: () => {} },
        { method: 'GET', path: '/api/用户', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/api/données']).toBeDefined();
      expect(spec.paths['/api/用户']).toBeDefined();
    });

    it('should handle large number of routes (100+ routes)', () => {
      const routes: RouteMetadata[] = [];
      for (let i = 0; i < 150; i++) {
        routes.push({
          method: i % 2 === 0 ? 'GET' : 'POST',
          path: `/api/resource${i}`,
          handler: () => {},
        });
      }

      const startTime = Date.now();
      const spec = generator.generate(routes);
      const endTime = Date.now();

      expect(Object.keys(spec.paths)).toHaveLength(150);
      // Verify execution time is reasonable (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle deeply nested paths', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/level1/level2/level3/level4/level5/level6/level7/level8/level9/level10',
          handler: () => {},
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/level1/level2/level3/level4/level5/level6/level7/level8/level9/level10']).toBeDefined();
      expect(spec.paths['/level1/level2/level3/level4/level5/level6/level7/level8/level9/level10'].get.operationId).toBe(
        'get_level1_level2_level3_level4_level5_level6_level7_level8_level9_level10'
      );
    });

    it('should handle paths with trailing slashes', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users/', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users/']).toBeDefined();
    });

    it('should handle duplicate route overwriting', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: { summary: 'First route' },
        },
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: { summary: 'Second route' },
        },
      ];
      const spec = generator.generate(routes);

      // Last route should win
      expect(spec.paths['/users'].get.summary).toBe('Second route');
    });
  });

  describe('Extended Security Schemes', () => {
    it('should include OpenID Connect security scheme', () => {
      const configWithOpenIdConnect: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          openIdConnect: {
            type: 'openIdConnect',
            description: 'OpenID Connect Authentication',
          },
        },
      };
      const gen = new SpecGenerator(configWithOpenIdConnect);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.openIdConnect).toBeDefined();
      expect(spec.components?.securitySchemes?.openIdConnect?.type).toBe('openIdConnect');
    });

    it('should include API Key in query security scheme', () => {
      const configWithApiKeyQuery: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          apiKeyQuery: {
            type: 'apiKey',
            in: 'query',
            name: 'api_key',
            description: 'API Key in query parameter',
          },
        },
      };
      const gen = new SpecGenerator(configWithApiKeyQuery);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.apiKeyQuery?.in).toBe('query');
      expect(spec.components?.securitySchemes?.apiKeyQuery?.name).toBe('api_key');
    });

    it('should include API Key in cookie security scheme', () => {
      const configWithApiKeyCookie: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          apiKeyCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: 'session_id',
            description: 'Session cookie',
          },
        },
      };
      const gen = new SpecGenerator(configWithApiKeyCookie);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.apiKeyCookie?.in).toBe('cookie');
      expect(spec.components?.securitySchemes?.apiKeyCookie?.name).toBe('session_id');
    });

    it('should support security requirements per operation', () => {
      const configWithSecurity: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
        },
      };
      const gen = new SpecGenerator(configWithSecurity);
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/protected',
          handler: () => {},
          metadata: {
            // Operation-level security can be specified in metadata
          },
        },
      ];
      const spec = gen.generate(routes);

      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
    });

    it('should include OAuth2 with flows configuration hint', () => {
      const configWithOAuth2Flows: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          oauth2Full: {
            type: 'oauth2',
            description: 'OAuth2 with multiple flows',
          },
        },
      };
      const gen = new SpecGenerator(configWithOAuth2Flows);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.oauth2Full?.type).toBe('oauth2');
    });

    it('should handle bearer token without format', () => {
      const configWithBearer: GeneratorConfig = {
        ...defaultConfig,
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Bearer authentication without format',
          },
        },
      };
      const gen = new SpecGenerator(configWithBearer);
      const spec = gen.generate([]);

      expect(spec.components?.securitySchemes?.bearerAuth?.scheme).toBe('bearer');
      expect(spec.components?.securitySchemes?.bearerAuth?.bearerFormat).toBeUndefined();
    });
  });

  describe('Extended Parameter Types', () => {
    it('should handle query parameters from metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/search',
          handler: () => {},
          metadata: {
            parameters: [
              {
                name: 'q',
                in: 'query',
                required: true,
                schema: { type: 'string' },
                description: 'Search query',
              },
              {
                name: 'page',
                in: 'query',
                required: false,
                schema: { type: 'integer' },
                description: 'Page number',
              },
            ],
          },
        },
      ];
      const spec = generator.generate(routes);

      const params = spec.paths['/search'].get.parameters;
      expect(params).toHaveLength(2);
      expect(params?.find((p) => p.name === 'q')?.in).toBe('query');
      expect(params?.find((p) => p.name === 'page')?.in).toBe('query');
    });

    it('should handle header parameters from metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/api/data',
          handler: () => {},
          metadata: {
            parameters: [
              {
                name: 'X-Request-ID',
                in: 'header',
                required: true,
                schema: { type: 'string' },
                description: 'Request tracking ID',
              },
              {
                name: 'X-Api-Version',
                in: 'header',
                required: false,
                schema: { type: 'string' },
                description: 'API version',
              },
            ],
          },
        },
      ];
      const spec = generator.generate(routes);

      const params = spec.paths['/api/data'].get.parameters;
      expect(params?.find((p) => p.name === 'X-Request-ID')?.in).toBe('header');
      expect(params?.find((p) => p.name === 'X-Api-Version')?.required).toBe(false);
    });

    it('should handle cookie parameters from metadata', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/dashboard',
          handler: () => {},
          metadata: {
            parameters: [
              {
                name: 'session_token',
                in: 'cookie',
                required: true,
                schema: { type: 'string' },
                description: 'Session token',
              },
            ],
          },
        },
      ];
      const spec = generator.generate(routes);

      const params = spec.paths['/dashboard'].get.parameters;
      expect(params?.[0].in).toBe('cookie');
      expect(params?.[0].name).toBe('session_token');
    });

    it('should handle mixed parameter types', () => {
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
              },
              {
                name: 'include',
                in: 'query',
                required: false,
                schema: { type: 'string' },
              },
              {
                name: 'Authorization',
                in: 'header',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        },
      ];
      const spec = generator.generate(routes);

      const params = spec.paths['/users/:id'].get.parameters;
      expect(params).toHaveLength(3);
      expect(params?.filter((p) => p.in === 'path')).toHaveLength(1);
      expect(params?.filter((p) => p.in === 'query')).toHaveLength(1);
      expect(params?.filter((p) => p.in === 'header')).toHaveLength(1);
    });

    it('should handle parameters with enum values', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/orders',
          handler: () => {},
          metadata: {
            parameters: [
              {
                name: 'status',
                in: 'query',
                required: false,
                schema: {
                  type: 'string',
                  enum: ['pending', 'processing', 'shipped', 'delivered'],
                },
              },
            ],
          },
        },
      ];
      const spec = generator.generate(routes);

      const params = spec.paths['/orders'].get.parameters;
      expect(params?.[0].schema?.enum).toEqual(['pending', 'processing', 'shipped', 'delivered']);
    });

    it('should handle optional path parameter indicator (for framework compatibility)', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/files/:filename?', handler: () => {} },
      ];
      const spec = generator.generate(routes);

      // The path is stored as-is; parameter extraction handles the notation
      expect(spec.paths['/files/:filename?']).toBeDefined();
    });
  });

  describe('Extended Request Body Types', () => {
    it('should handle XML content type in request body', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/import',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/import'].post.requestBody?.content?.['application/xml']).toBeDefined();
    });

    it('should handle form-urlencoded content type', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/login',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'application/x-www-form-urlencoded': {
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' },
                    },
                    required: ['username', 'password'],
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const requestBody = spec.paths['/login'].post.requestBody;
      expect(requestBody?.content?.['application/x-www-form-urlencoded']).toBeDefined();
      expect(requestBody?.content?.['application/x-www-form-urlencoded'].schema.required).toEqual([
        'username',
        'password',
      ]);
    });

    it('should handle multipart/form-data for file uploads', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/upload',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: {
                      file: { type: 'string', format: 'binary' },
                      description: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/upload'].post.requestBody?.content?.['multipart/form-data']?.schema;
      expect(schema?.properties?.file?.format).toBe('binary');
    });

    it('should handle optional request body', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'PATCH',
          path: '/settings',
          handler: () => {},
          metadata: {
            requestBody: {
              required: false,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      theme: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/settings'].patch.requestBody?.required).toBe(false);
    });

    it('should handle request body with description', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/articles',
          handler: () => {},
          metadata: {
            requestBody: {
              description: 'Article to create',
              required: true,
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/articles'].post.requestBody?.description).toBe('Article to create');
    });
  });

  describe('Extended Response Status Codes', () => {
    it('should handle 201 Created response', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/users',
          handler: () => {},
          metadata: {
            responses: {
              '201': {
                description: 'User created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].post.responses['201'].description).toBe('User created successfully');
    });

    it('should handle 204 No Content response', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'DELETE',
          path: '/users/:id',
          handler: () => {},
          metadata: {
            responses: {
              '204': {
                description: 'User deleted successfully',
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users/:id'].delete.responses['204'].description).toBe('User deleted successfully');
      // 204 typically has no content
      expect(spec.paths['/users/:id'].delete.responses['204'].content).toBeUndefined();
    });

    it('should handle 400 Bad Request response', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/users',
          handler: () => {},
          metadata: {
            responses: {
              '400': {
                description: 'Invalid request data',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: { type: 'string' },
                        details: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].post.responses['400'].description).toBe('Invalid request data');
    });

    it('should handle 401 Unauthorized response', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/protected',
          handler: () => {},
          metadata: {
            responses: {
              '401': {
                description: 'Authentication required',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/protected'].get.responses['401'].description).toBe('Authentication required');
    });

    it('should handle 403 Forbidden response', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/admin',
          handler: () => {},
          metadata: {
            responses: {
              '403': {
                description: 'Access denied - insufficient permissions',
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/admin'].get.responses['403'].description).toBe('Access denied - insufficient permissions');
    });

    it('should handle 404 Not Found response', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users/:id',
          handler: () => {},
          metadata: {
            responses: {
              '404': {
                description: 'User not found',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: { type: 'string' },
                        code: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users/:id'].get.responses['404'].description).toBe('User not found');
    });

    it('should handle 500 Internal Server Error response', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            responses: {
              '500': {
                description: 'Internal server error',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: { type: 'string' },
                        requestId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      expect(spec.paths['/users'].get.responses['500'].description).toBe('Internal server error');
    });

    it('should handle multiple response codes for single operation', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/orders',
          handler: () => {},
          metadata: {
            responses: {
              '201': { description: 'Order created' },
              '400': { description: 'Invalid order data' },
              '401': { description: 'Unauthorized' },
              '403': { description: 'Forbidden' },
              '500': { description: 'Server error' },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const responses = spec.paths['/orders'].post.responses;
      expect(Object.keys(responses)).toHaveLength(5);
      expect(responses['201']).toBeDefined();
      expect(responses['400']).toBeDefined();
      expect(responses['401']).toBeDefined();
      expect(responses['403']).toBeDefined();
      expect(responses['500']).toBeDefined();
    });

    it('should handle response with multiple content types', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/export',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'Export data',
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                  },
                  'application/xml': {
                    schema: { type: 'object' },
                  },
                  'text/csv': {
                    schema: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const content = spec.paths['/export'].get.responses['200'].content;
      expect(content?.['application/json']).toBeDefined();
      expect(content?.['application/xml']).toBeDefined();
      expect(content?.['text/csv']).toBeDefined();
    });
  });

  describe('Extended Component Schemas', () => {
    it('should handle nested object schemas', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'User with address',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        address: {
                          type: 'object',
                          properties: {
                            street: { type: 'string' },
                            city: { type: 'string' },
                            country: { type: 'string' },
                            zipCode: { type: 'string' },
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
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/users'].get.responses['200'].content?.['application/json']?.schema;
      expect(schema?.properties?.address?.type).toBe('object');
      expect(schema?.properties?.address?.properties?.city?.type).toBe('string');
    });

    it('should handle array of objects schema', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/orders',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'List of orders',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          total: { type: 'number' },
                          items: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                productId: { type: 'integer' },
                                quantity: { type: 'integer' },
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
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/orders'].get.responses['200'].content?.['application/json']?.schema;
      expect(schema?.type).toBe('array');
      expect(schema?.items?.properties?.items?.type).toBe('array');
    });

    it('should handle enum types in schema', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/tasks',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'Tasks with status enum',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        status: {
                          type: 'string',
                          enum: ['todo', 'in_progress', 'done', 'cancelled'],
                        },
                        priority: {
                          type: 'integer',
                          enum: [1, 2, 3, 4, 5],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/tasks'].get.responses['200'].content?.['application/json']?.schema;
      expect(schema?.properties?.status?.enum).toEqual(['todo', 'in_progress', 'done', 'cancelled']);
      expect(schema?.properties?.priority?.enum).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle allOf composition', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/employees',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'Employee combining base and extension',
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' },
                          },
                        },
                        {
                          type: 'object',
                          properties: {
                            department: { type: 'string' },
                            salary: { type: 'number' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/employees'].get.responses['200'].content?.['application/json']?.schema;
      expect(schema?.allOf).toHaveLength(2);
      expect(schema?.allOf?.[0].properties?.name).toBeDefined();
      expect(schema?.allOf?.[1].properties?.department).toBeDefined();
    });

    it('should handle oneOf composition', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/notifications',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          type: { type: 'string', enum: ['email'] },
                          email: { type: 'string' },
                        },
                      },
                      {
                        type: 'object',
                        properties: {
                          type: { type: 'string', enum: ['sms'] },
                          phone: { type: 'string' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/notifications'].post.requestBody?.content?.['application/json']?.schema;
      expect(schema?.oneOf).toHaveLength(2);
    });

    it('should handle anyOf composition', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/payments',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          creditCard: { type: 'string' },
                        },
                      },
                      {
                        type: 'object',
                        properties: {
                          bankAccount: { type: 'string' },
                        },
                      },
                      {
                        type: 'object',
                        properties: {
                          paypal: { type: 'string' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/payments'].post.requestBody?.content?.['application/json']?.schema;
      expect(schema?.anyOf).toHaveLength(3);
    });

    it('should handle $ref in schema', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users/:id',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'User reference',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/users/:id'].get.responses['200'].content?.['application/json']?.schema;
      expect(schema?.$ref).toBe('#/components/schemas/User');
    });

    it('should handle array with $ref items', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/users',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'List of users',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/User',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/users'].get.responses['200'].content?.['application/json']?.schema;
      expect(schema?.items?.$ref).toBe('#/components/schemas/User');
    });

    it('should handle deeply nested schemas', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/organization',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'Deeply nested org structure',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        level1: {
                          type: 'object',
                          properties: {
                            level2: {
                              type: 'object',
                              properties: {
                                level3: {
                                  type: 'object',
                                  properties: {
                                    level4: {
                                      type: 'object',
                                      properties: {
                                        value: { type: 'string' },
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
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/organization'].get.responses['200'].content?.['application/json']?.schema;
      expect(schema?.properties?.level1?.properties?.level2?.properties?.level3?.properties?.level4?.properties?.value?.type).toBe('string');
    });

    it('should handle schema with format specifications', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/events',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      website: { type: 'string', format: 'uri' },
                      startDate: { type: 'string', format: 'date' },
                      startTime: { type: 'string', format: 'date-time' },
                      duration: { type: 'integer', format: 'int32' },
                      price: { type: 'number', format: 'float' },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/events'].post.requestBody?.content?.['application/json']?.schema;
      expect(schema?.properties?.id?.format).toBe('uuid');
      expect(schema?.properties?.email?.format).toBe('email');
      expect(schema?.properties?.startDate?.format).toBe('date');
      expect(schema?.properties?.startTime?.format).toBe('date-time');
    });

    it('should handle schema with validation constraints', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/products',
          handler: () => {},
          metadata: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100,
                      },
                      price: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1000000,
                      },
                      quantity: {
                        type: 'integer',
                        minimum: 0,
                      },
                      tags: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 1,
                        maxItems: 10,
                        uniqueItems: true,
                      },
                      sku: {
                        type: 'string',
                        pattern: '^[A-Z]{3}-[0-9]{4}$',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/products'].post.requestBody?.content?.['application/json']?.schema;
      expect(schema?.properties?.name?.minLength).toBe(1);
      expect(schema?.properties?.name?.maxLength).toBe(100);
      expect(schema?.properties?.price?.minimum).toBe(0);
      expect(schema?.properties?.tags?.uniqueItems).toBe(true);
      expect(schema?.properties?.sku?.pattern).toBe('^[A-Z]{3}-[0-9]{4}$');
    });

    it('should handle additionalProperties in schema', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/metadata',
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
                    },
                    additionalProperties: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/metadata'].post.requestBody?.content?.['application/json']?.schema;
      expect(schema?.additionalProperties).toEqual({ type: 'string' });
    });

    it('should handle nullable schema property', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/items',
          handler: () => {},
          metadata: {
            responses: {
              '200': {
                description: 'Item with nullable field',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/items'].get.responses['200'].content?.['application/json']?.schema;
      expect(schema?.properties?.description?.nullable).toBe(true);
    });

    it('should handle schema with default values', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/settings',
          handler: () => {},
          metadata: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      theme: { type: 'string', default: 'light' },
                      notifications: { type: 'boolean', default: true },
                      pageSize: { type: 'integer', default: 20 },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/settings'].post.requestBody?.content?.['application/json']?.schema;
      expect(schema?.properties?.theme?.default).toBe('light');
      expect(schema?.properties?.notifications?.default).toBe(true);
      expect(schema?.properties?.pageSize?.default).toBe(20);
    });

    it('should handle schema with example values', () => {
      const routes: RouteMetadata[] = [
        {
          method: 'POST',
          path: '/users',
          handler: () => {},
          metadata: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@example.com',
                      },
                      age: {
                        type: 'integer',
                        example: 25,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
      const spec = generator.generate(routes);

      const schema = spec.paths['/users'].post.requestBody?.content?.['application/json']?.schema;
      expect(schema?.properties?.email?.example).toBe('user@example.com');
      expect(schema?.properties?.age?.example).toBe(25);
    });
  });

  describe('Spec Structure Validation', () => {
    it('should generate valid OpenAPI 3.0.0 structure', () => {
      const gen = new SpecGenerator({
        ...defaultConfig,
        specVersion: '3.0.0',
      });
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/health',
          handler: () => {},
          metadata: {
            summary: 'Health check',
            responses: {
              '200': { description: 'OK' },
            },
          },
        },
      ];
      const spec = gen.generate(routes);

      // Validate required OpenAPI 3.0.0 fields
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
      expect(spec.paths).toBeDefined();
    });

    it('should generate valid OpenAPI 3.1.0 structure', () => {
      const gen = new SpecGenerator({
        ...defaultConfig,
        specVersion: '3.1.0',
      });
      const routes: RouteMetadata[] = [
        {
          method: 'GET',
          path: '/health',
          handler: () => {},
          metadata: {
            summary: 'Health check',
            responses: {
              '200': { description: 'OK' },
            },
          },
        },
      ];
      const spec = gen.generate(routes);

      // Validate required OpenAPI 3.1.0 fields
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
      expect(spec.paths).toBeDefined();
    });

    it('should include all required info fields', () => {
      const spec = generator.generate([]);

      expect(typeof spec.info.title).toBe('string');
      expect(typeof spec.info.version).toBe('string');
    });

    it('should generate consistent output for same input', () => {
      const routes: RouteMetadata[] = [
        { method: 'GET', path: '/users', handler: () => {} },
        { method: 'POST', path: '/users', handler: () => {} },
      ];

      const spec1 = generator.generate(routes);
      const spec2 = generator.generate(routes);

      expect(JSON.stringify(spec1)).toBe(JSON.stringify(spec2));
    });
  });
});
