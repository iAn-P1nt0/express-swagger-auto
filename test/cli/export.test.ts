/**
 * Tests for the export command
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  exportToPostman,
  exportToInsomnia,
  exportToBruno,
  exportToHoppscotch,
  exportSpec,
  exportSpecWithEnv,
  getFileExtension,
  getEnvironmentFileExtension,
} from '../../src/cli/export';
import type { OpenAPIV3 } from 'openapi-types';

// Test OpenAPI spec
const testSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Test API',
    version: '1.0.0',
    description: 'A test API for export testing',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development server' },
  ],
  tags: [
    { name: 'users', description: 'User operations' },
    { name: 'posts', description: 'Post operations' },
  ],
  paths: {
    '/users': {
      get: {
        tags: ['users'],
        summary: 'List users',
        description: 'Get all users',
        operationId: 'listUsers',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
            description: 'Limit results',
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserList' },
              },
            },
          },
        },
      },
      post: {
        tags: ['users'],
        summary: 'Create user',
        description: 'Create a new user',
        operationId: 'createUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUser' },
              example: { name: 'John', email: 'john@example.com' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
        },
      },
    },
    '/users/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'User ID',
        },
      ],
      get: {
        tags: ['users'],
        summary: 'Get user by ID',
        operationId: 'getUser',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['users'],
        summary: 'Delete user',
        operationId: 'deleteUser',
        responses: {
          '204': { description: 'Deleted' },
        },
      },
    },
    '/posts': {
      get: {
        tags: ['posts'],
        summary: 'List posts',
        operationId: 'listPosts',
        responses: {
          '200': { description: 'Success' },
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
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
      CreateUser: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
      UserList: {
        type: 'array',
        items: { $ref: '#/components/schemas/User' },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

describe('Export Command', () => {
  describe('Postman Export', () => {
    it('should export valid Postman v2.1 collection', () => {
      const result = exportToPostman(testSpec, { format: 'postman' });
      
      expect(result.collection).toBeDefined();
      expect(result.collection.info.schema).toBe('https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
      expect(result.collection.info.name).toBe('Test API');
      expect(result.collection.info.description).toBe('A test API for export testing');
      expect(result.collection.info.version).toBe('1.0.0');
    });

    it('should group by tags by default', () => {
      const result = exportToPostman(testSpec, { format: 'postman', groupBy: 'tags' });
      
      const folderNames = result.collection.item.map(i => i.name);
      expect(folderNames).toContain('users');
      expect(folderNames).toContain('posts');
    });

    it('should include collection variables', () => {
      const result = exportToPostman(testSpec, { 
        format: 'postman',
        variables: { apiKey: 'test-key' },
      });
      
      expect(result.collection.variable).toBeDefined();
      expect(result.collection.variable).toContainEqual(
        expect.objectContaining({ key: 'baseUrl', value: 'http://localhost:3000' })
      );
      expect(result.collection.variable).toContainEqual(
        expect.objectContaining({ key: 'apiKey', value: 'test-key' })
      );
    });

    it('should include bearer auth when security scheme is defined', () => {
      const result = exportToPostman(testSpec, { format: 'postman' });
      
      expect(result.collection.auth).toBeDefined();
      expect(result.collection.auth?.type).toBe('bearer');
    });

    it('should include environment when requested', () => {
      const result = exportToPostman(testSpec, { 
        format: 'postman',
        includeEnv: true,
      });
      
      expect(result.environment).toBeDefined();
      expect(result.environment?.name).toBe('Test API Environment');
      expect(result.environment?.values).toContainEqual(
        expect.objectContaining({ key: 'baseUrl', value: 'http://localhost:3000' })
      );
    });

    it('should generate requests with correct structure', () => {
      const result = exportToPostman(testSpec, { format: 'postman' });
      
      // Find users folder
      const usersFolder = result.collection.item.find(i => i.name === 'users');
      expect(usersFolder).toBeDefined();
      expect(usersFolder?.item).toBeDefined();
      
      // Find list users request
      const listUsers = usersFolder?.item?.find(i => i.name === 'List users');
      expect(listUsers).toBeDefined();
      expect(listUsers?.request?.method).toBe('GET');
      expect(listUsers?.request?.url.host).toContain('{{baseUrl}}');
    });

    it('should include request body for POST requests', () => {
      const result = exportToPostman(testSpec, { format: 'postman' });
      
      const usersFolder = result.collection.item.find(i => i.name === 'users');
      const createUser = usersFolder?.item?.find(i => i.name === 'Create user');
      
      expect(createUser?.request?.body).toBeDefined();
      expect(createUser?.request?.body?.mode).toBe('raw');
      expect(createUser?.request?.body?.options?.raw?.language).toBe('json');
      
      // Check that example is included
      const bodyJson = JSON.parse(createUser?.request?.body?.raw || '{}');
      expect(bodyJson.name).toBe('John');
      expect(bodyJson.email).toBe('john@example.com');
    });

    it('should handle path parameters', () => {
      const result = exportToPostman(testSpec, { format: 'postman' });
      
      const usersFolder = result.collection.item.find(i => i.name === 'users');
      const getUser = usersFolder?.item?.find(i => i.name === 'Get user by ID');
      
      // Should have path variable
      expect(getUser?.request?.url.variable).toBeDefined();
      expect(getUser?.request?.url.variable).toContainEqual(
        expect.objectContaining({ key: 'id' })
      );
    });
  });

  describe('Insomnia Export', () => {
    it('should export valid Insomnia v4 format', () => {
      const result = exportToInsomnia(testSpec, { format: 'insomnia' });
      
      expect(result._type).toBe('export');
      expect(result.__export_format).toBe(4);
      expect(result.__export_source).toBe('express-swagger-auto');
      expect(result.resources).toBeDefined();
    });

    it('should create workspace resource', () => {
      const result = exportToInsomnia(testSpec, { format: 'insomnia' });
      
      const workspace = result.resources.find(r => r._type === 'workspace');
      expect(workspace).toBeDefined();
      expect(workspace?.name).toBe('Test API');
    });

    it('should create request groups for tags', () => {
      const result = exportToInsomnia(testSpec, { format: 'insomnia', groupBy: 'tags' });
      
      const groups = result.resources.filter(r => r._type === 'request_group');
      const groupNames = groups.map(g => g.name);
      
      expect(groupNames).toContain('users');
      expect(groupNames).toContain('posts');
    });

    it('should create request resources', () => {
      const result = exportToInsomnia(testSpec, { format: 'insomnia' });
      
      const requests = result.resources.filter(r => r._type === 'request');
      expect(requests.length).toBeGreaterThan(0);
      
      const listUsers = requests.find(r => r.name === 'List users');
      expect(listUsers).toBeDefined();
      expect(listUsers?.method).toBe('GET');
      expect(listUsers?.url).toContain('/users');
    });

    it('should include request body', () => {
      const result = exportToInsomnia(testSpec, { format: 'insomnia' });
      
      const requests = result.resources.filter(r => r._type === 'request');
      const createUser = requests.find(r => r.name === 'Create user');
      
      expect(createUser?.body).toBeDefined();
      expect(createUser?.body?.mimeType).toBe('application/json');
    });
  });

  describe('Bruno Export', () => {
    it('should export valid Bruno collection', () => {
      const result = exportToBruno(testSpec, { format: 'bruno' });
      
      expect(result.version).toBe('1');
      expect(result.type).toBe('collection');
      expect(result.name).toBe('Test API');
      expect(result.items).toBeDefined();
    });

    it('should create folders for tags', () => {
      const result = exportToBruno(testSpec, { format: 'bruno', groupBy: 'tags' });
      
      const folders = result.items.filter(i => i.type === 'folder');
      const folderNames = folders.map(f => f.name);
      
      expect(folderNames).toContain('users');
      expect(folderNames).toContain('posts');
    });

    it('should create http-request items', () => {
      const result = exportToBruno(testSpec, { format: 'bruno' });
      
      const usersFolder = result.items.find(i => i.name === 'users' && i.type === 'folder');
      expect(usersFolder?.items).toBeDefined();
      
      const requests = usersFolder?.items?.filter(i => i.type === 'http-request') || [];
      expect(requests.length).toBeGreaterThan(0);
    });

    it('should include params for path and query', () => {
      const result = exportToBruno(testSpec, { format: 'bruno' });
      
      const usersFolder = result.items.find(i => i.name === 'users' && i.type === 'folder');
      const getUser = usersFolder?.items?.find(i => i.request?.name === 'Get user by ID');
      
      expect(getUser?.request?.params).toBeDefined();
      expect(getUser?.request?.params).toContainEqual(
        expect.objectContaining({ name: 'id', type: 'path' })
      );
    });
  });

  describe('Hoppscotch Export', () => {
    it('should export valid Hoppscotch collection', () => {
      const result = exportToHoppscotch(testSpec, { format: 'hoppscotch' });
      
      expect(result.v).toBe(1);
      expect(result.name).toBe('Test API');
      expect(result.folders).toBeDefined();
      expect(result.requests).toBeDefined();
    });

    it('should create folders for tags', () => {
      const result = exportToHoppscotch(testSpec, { format: 'hoppscotch', groupBy: 'tags' });
      
      const folderNames = result.folders.map(f => f.name);
      expect(folderNames).toContain('users');
      expect(folderNames).toContain('posts');
    });

    it('should create request objects with correct structure', () => {
      const result = exportToHoppscotch(testSpec, { format: 'hoppscotch' });
      
      const usersFolder = result.folders.find(f => f.name === 'users');
      expect(usersFolder?.requests).toBeDefined();
      
      const listUsers = usersFolder?.requests.find(r => r.name === 'List users');
      expect(listUsers).toBeDefined();
      expect(listUsers?.method).toBe('GET');
      expect(listUsers?.endpoint).toContain('/users');
      expect(listUsers?.headers).toBeDefined();
      expect(listUsers?.params).toBeDefined();
    });
  });

  describe('exportSpec function', () => {
    it('should export to all supported formats', () => {
      const formats = ['postman', 'insomnia', 'bruno', 'hoppscotch'] as const;
      
      for (const format of formats) {
        const result = exportSpec(testSpec, format, { format });
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
      }
    });

    it('should throw for unsupported format', () => {
      expect(() => exportSpec(testSpec, 'invalid' as any, { format: 'invalid' as any }))
        .toThrow('Unsupported export format');
    });
  });

  describe('exportSpecWithEnv function', () => {
    it('should return environment for Postman format', () => {
      const result = exportSpecWithEnv(testSpec, 'postman', { 
        format: 'postman',
        includeEnv: true,
      });
      
      expect(result.collection).toBeDefined();
      expect(result.environment).toBeDefined();
    });

    it('should not return environment for other formats', () => {
      const result = exportSpecWithEnv(testSpec, 'insomnia', { 
        format: 'insomnia',
        includeEnv: true,
      });
      
      expect(result.collection).toBeDefined();
      expect(result.environment).toBeUndefined();
    });
  });

  describe('File extensions', () => {
    it('should return correct file extensions', () => {
      expect(getFileExtension('postman')).toBe('.postman_collection.json');
      expect(getFileExtension('insomnia')).toBe('.insomnia.json');
      expect(getFileExtension('bruno')).toBe('.bruno.json');
      expect(getFileExtension('hoppscotch')).toBe('.hoppscotch.json');
    });

    it('should return correct environment file extensions', () => {
      expect(getEnvironmentFileExtension('postman')).toBe('.postman_environment.json');
      expect(getEnvironmentFileExtension('insomnia')).toBe('.env.json');
    });
  });

  describe('Grouping strategies', () => {
    it('should group by paths', () => {
      const result = exportToPostman(testSpec, { format: 'postman', groupBy: 'paths' });
      
      const folderNames = result.collection.item.map(i => i.name);
      expect(folderNames).toContain('users');
      expect(folderNames).toContain('posts');
    });

    it('should not group when groupBy is none', () => {
      const result = exportToPostman(testSpec, { format: 'postman', groupBy: 'none' });
      
      // All items should be at root level (no folders)
      const hasItem = result.collection.item.every(i => i.request !== undefined);
      expect(hasItem).toBe(true);
    });
  });

  describe('Custom collection name', () => {
    it('should use custom name when provided', () => {
      const result = exportToPostman(testSpec, { 
        format: 'postman',
        name: 'My Custom API',
      });
      
      expect(result.collection.info.name).toBe('My Custom API');
    });
  });

  describe('Spec without servers', () => {
    it('should use default URL when no servers defined', () => {
      const specWithoutServers: OpenAPIV3.Document = {
        ...testSpec,
        servers: undefined,
      };
      
      const result = exportToPostman(specWithoutServers, { format: 'postman' });
      
      expect(result.collection.variable).toContainEqual(
        expect.objectContaining({ key: 'baseUrl', value: 'http://localhost:3000' })
      );
    });
  });
});
