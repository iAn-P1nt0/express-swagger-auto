/**
 * Tests for the examples command
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateExamples,
  previewExamples,
  formatExamplesPreview,
  setSeed,
} from '../../src/cli/examples';
import type { OpenAPIV3 } from 'openapi-types';

// Test OpenAPI spec with schemas
const testSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {
    '/users': {
      post: {
        summary: 'Create user',
        operationId: 'createUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  age: { type: 'integer', minimum: 18, maximum: 100 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
      get: {
        summary: 'List users',
        operationId: 'listUsers',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
    },
    '/products': {
      get: {
        summary: 'List products',
        operationId: 'listProducts',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          category: { type: 'string' },
          imageUrl: { type: 'string', format: 'uri' },
          rating: { type: 'number', minimum: 0, maximum: 5 },
          status: { type: 'string', enum: ['active', 'inactive', 'discontinued'] },
        },
      },
    },
  },
};

describe('Examples Command', () => {
  beforeEach(() => {
    // Reset with known seed for reproducibility
    setSeed(12345);
  });

  describe('generateExamples', () => {
    it('should generate examples for request bodies', () => {
      const { spec, generated } = generateExamples(testSpec, { seed: 12345 });
      
      const requestExamples = generated.filter(g => g.type === 'request');
      expect(requestExamples.length).toBeGreaterThan(0);
      
      const createUserRequest = requestExamples.find(
        g => g.path === '/users' && g.method === 'POST'
      );
      expect(createUserRequest).toBeDefined();
      expect(createUserRequest?.example).toBeDefined();
    });

    it('should generate examples for responses', () => {
      const { spec, generated } = generateExamples(testSpec, { seed: 12345 });
      
      const responseExamples = generated.filter(g => g.type === 'response');
      expect(responseExamples.length).toBeGreaterThan(0);
    });

    it('should add examples to modified spec', () => {
      const { spec } = generateExamples(testSpec, { seed: 12345 });
      
      // Check request body example
      const requestBody = spec.paths?.['/users']?.post?.requestBody as OpenAPIV3.RequestBodyObject;
      expect(requestBody?.content?.['application/json']?.example).toBeDefined();
    });

    it('should add examples to component schemas', () => {
      const { spec } = generateExamples(testSpec, { seed: 12345 });
      
      const userSchema = spec.components?.schemas?.User as OpenAPIV3.SchemaObject;
      expect(userSchema?.example).toBeDefined();
    });

    it('should not overwrite existing examples by default', () => {
      const specWithExample: OpenAPIV3.Document = {
        ...testSpec,
        paths: {
          '/users': {
            post: {
              ...testSpec.paths?.['/users']?.post,
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { name: { type: 'string' } } },
                    example: { name: 'Existing Example' },
                  },
                },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const { spec } = generateExamples(specWithExample, { seed: 12345, overwrite: false });
      
      const requestBody = spec.paths?.['/users']?.post?.requestBody as OpenAPIV3.RequestBodyObject;
      expect(requestBody?.content?.['application/json']?.example).toEqual({ name: 'Existing Example' });
    });

    it('should overwrite existing examples when overwrite is true', () => {
      const specWithExample: OpenAPIV3.Document = {
        ...testSpec,
        paths: {
          '/users': {
            post: {
              ...testSpec.paths?.['/users']?.post,
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { firstName: { type: 'string' } } },
                    example: { firstName: 'Existing' },
                  },
                },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const { spec } = generateExamples(specWithExample, { seed: 12345, overwrite: true });
      
      const requestBody = spec.paths?.['/users']?.post?.requestBody as OpenAPIV3.RequestBodyObject;
      expect(requestBody?.content?.['application/json']?.example).not.toEqual({ firstName: 'Existing' });
    });
  });

  describe('Field Pattern Matching', () => {
    it('should generate email format for email fields', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find the POST /users request which includes email
      const createUserRequest = generated.find(
        g => g.path === '/users' && g.method === 'POST' && g.type === 'request'
      );
      
      expect(createUserRequest).toBeDefined();
      const example = createUserRequest?.example as Record<string, unknown>;
      
      expect(typeof example.email).toBe('string');
      expect(example.email).toMatch(/@.*\./); // Basic email pattern
    });

    it('should generate UUID for id fields', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find a response that includes the User schema with id
      const createUserResponse = generated.find(
        g => g.path === '/users' && g.method === 'POST' && g.type === 'response'
      );
      
      expect(createUserResponse).toBeDefined();
      const example = createUserResponse?.example as Record<string, unknown>;
      
      expect(typeof example.id).toBe('string');
      expect(example.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate date-time for createdAt fields', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find a response that includes the User schema with createdAt
      const createUserResponse = generated.find(
        g => g.path === '/users' && g.method === 'POST' && g.type === 'response'
      );
      
      expect(createUserResponse).toBeDefined();
      const example = createUserResponse?.example as Record<string, unknown>;
      
      expect(typeof example.createdAt).toBe('string');
      // Should be ISO date format
      expect(example.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should generate boolean for isActive fields', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find a response that includes the User schema with isActive
      const createUserResponse = generated.find(
        g => g.path === '/users' && g.method === 'POST' && g.type === 'response'
      );
      
      expect(createUserResponse).toBeDefined();
      const example = createUserResponse?.example as Record<string, unknown>;
      
      expect(typeof example.isActive).toBe('boolean');
    });

    it('should generate number for price fields', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find products response
      const productsResponse = generated.find(
        g => g.path === '/products' && g.method === 'GET' && g.type === 'response'
      );
      
      expect(productsResponse).toBeDefined();
      const items = productsResponse?.example as unknown[];
      expect(Array.isArray(items)).toBe(true);
      
      const firstItem = items[0] as Record<string, unknown>;
      expect(typeof firstItem.price).toBe('number');
    });

    it('should generate URL for imageUrl fields', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find products response
      const productsResponse = generated.find(
        g => g.path === '/products' && g.method === 'GET' && g.type === 'response'
      );
      
      expect(productsResponse).toBeDefined();
      const items = productsResponse?.example as unknown[];
      const firstItem = items[0] as Record<string, unknown>;
      
      expect(typeof firstItem.imageUrl).toBe('string');
      expect(firstItem.imageUrl).toMatch(/^https?:\/\//);
    });

    it('should respect enum values for status fields', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find products response
      const productsResponse = generated.find(
        g => g.path === '/products' && g.method === 'GET' && g.type === 'response'
      );
      
      expect(productsResponse).toBeDefined();
      const items = productsResponse?.example as unknown[];
      const firstItem = items[0] as Record<string, unknown>;
      
      expect(['active', 'inactive', 'discontinued']).toContain(firstItem.status);
    });

    it('should respect minimum/maximum for rating fields', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find products response
      const productsResponse = generated.find(
        g => g.path === '/products' && g.method === 'GET' && g.type === 'response'
      );
      
      expect(productsResponse).toBeDefined();
      const items = productsResponse?.example as unknown[];
      const firstItem = items[0] as Record<string, unknown>;
      
      expect(typeof firstItem.rating).toBe('number');
      expect(firstItem.rating).toBeGreaterThanOrEqual(0);
      expect(firstItem.rating).toBeLessThanOrEqual(5);
    });
  });

  describe('Seed Reproducibility', () => {
    it('should generate same examples with same seed', () => {
      const { generated: first } = generateExamples(testSpec, { seed: 42 });
      const { generated: second } = generateExamples(testSpec, { seed: 42 });
      
      expect(first.length).toBe(second.length);
      
      // Compare first few examples, normalizing timestamps to avoid flakiness
      const normalizeTimestamps = (obj: unknown): unknown => {
        if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(obj)) {
          // Normalize milliseconds to avoid timing differences
          return obj.slice(0, -4) + '000Z';
        }
        if (Array.isArray(obj)) {
          return obj.map(normalizeTimestamps);
        }
        if (obj && typeof obj === 'object') {
          const result: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(obj)) {
            result[key] = normalizeTimestamps(value);
          }
          return result;
        }
        return obj;
      };
      
      for (let i = 0; i < Math.min(3, first.length); i++) {
        const normalized1 = normalizeTimestamps(first[i].example);
        const normalized2 = normalizeTimestamps(second[i].example);
        expect(JSON.stringify(normalized1)).toBe(JSON.stringify(normalized2));
      }
    });

    it('should generate different examples with different seeds', () => {
      const { generated: first } = generateExamples(testSpec, { seed: 42 });
      const { generated: second } = generateExamples(testSpec, { seed: 12345 });
      
      // At least some examples should be different
      let hasDifference = false;
      for (let i = 0; i < Math.min(first.length, second.length); i++) {
        if (JSON.stringify(first[i].example) !== JSON.stringify(second[i].example)) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });
  });

  describe('previewExamples', () => {
    it('should return examples without modifying spec', () => {
      const examples = previewExamples(testSpec, { seed: 12345 });
      
      expect(examples.length).toBeGreaterThan(0);
      
      // Original spec should not be modified
      const requestBody = testSpec.paths?.['/users']?.post?.requestBody as OpenAPIV3.RequestBodyObject;
      expect(requestBody?.content?.['application/json']?.example).toBeUndefined();
    });

    it('should return both request and response examples', () => {
      const examples = previewExamples(testSpec, { seed: 12345 });
      
      const requests = examples.filter(e => e.type === 'request');
      const responses = examples.filter(e => e.type === 'response');
      
      expect(requests.length).toBeGreaterThan(0);
      expect(responses.length).toBeGreaterThan(0);
    });
  });

  describe('formatExamplesPreview', () => {
    it('should format as JSON', () => {
      const examples = previewExamples(testSpec, { seed: 12345 });
      const output = formatExamplesPreview(examples, 'json');
      
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(examples.length);
    });

    it('should format as markdown', () => {
      const examples = previewExamples(testSpec, { seed: 12345 });
      const output = formatExamplesPreview(examples, 'markdown');
      
      expect(output).toContain('# Generated Examples');
      expect(output).toContain('## ');
      expect(output).toContain('```json');
    });

    it('should format as text', () => {
      const examples = previewExamples(testSpec, { seed: 12345 });
      const output = formatExamplesPreview(examples, 'text');
      
      expect(output).toContain('📝 Generated Examples');
      expect(output).toContain('📤 Request');
      expect(output).toContain('📥 Response');
    });
  });

  describe('$ref Resolution', () => {
    it('should resolve $ref to component schemas', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find a response that uses $ref
      const userResponse = generated.find(
        g => g.path === '/users' && g.method === 'POST' && g.type === 'response'
      );
      
      expect(userResponse).toBeDefined();
      expect(userResponse?.example).toBeDefined();
      
      const example = userResponse?.example as Record<string, unknown>;
      expect(example).toHaveProperty('id');
      expect(example).toHaveProperty('email');
    });

    it('should handle array of $ref items', () => {
      const { generated } = generateExamples(testSpec, { seed: 12345 });
      
      // Find list users response
      const listUsersResponse = generated.find(
        g => g.path === '/users' && g.method === 'GET' && g.type === 'response'
      );
      
      expect(listUsersResponse).toBeDefined();
      expect(Array.isArray(listUsersResponse?.example)).toBe(true);
      
      const items = listUsersResponse?.example as unknown[];
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('id');
    });
  });

  describe('Complex Schemas', () => {
    it('should handle nested objects', () => {
      const specWithNested: OpenAPIV3.Document = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/orders': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        customer: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                          },
                        },
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              productId: { type: 'string', format: 'uuid' },
                              quantity: { type: 'integer' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      };

      const { generated } = generateExamples(specWithNested, { seed: 12345 });
      
      const orderRequest = generated.find(g => g.path === '/orders');
      expect(orderRequest).toBeDefined();
      
      const example = orderRequest?.example as Record<string, unknown>;
      expect(example).toHaveProperty('customer');
      expect(example).toHaveProperty('items');
      expect(Array.isArray(example.items)).toBe(true);
    });

    it('should handle allOf schemas', () => {
      const specWithAllOf: OpenAPIV3.Document = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            ExtendedUser: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                  },
                },
                {
                  type: 'object',
                  properties: {
                    role: { type: 'string' },
                    permissions: { type: 'array', items: { type: 'string' } },
                  },
                },
              ],
            },
          },
        },
      };

      const { spec } = generateExamples(specWithAllOf, { seed: 12345 });
      
      const extendedUser = spec.components?.schemas?.ExtendedUser as OpenAPIV3.SchemaObject;
      expect(extendedUser.example).toBeDefined();
      
      const example = extendedUser.example as Record<string, unknown>;
      expect(example).toHaveProperty('id');
      expect(example).toHaveProperty('name');
      expect(example).toHaveProperty('role');
      expect(example).toHaveProperty('permissions');
    });
  });
});
