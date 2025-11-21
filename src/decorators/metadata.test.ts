import { describe, it, expect } from 'vitest';
import { Route, Parameter, RequestBody, Response } from './metadata';

describe('Decorators', () => {
  describe('Route', () => {
    it('should attach metadata to handler', () => {
      class TestController {
        @Route({
          summary: 'Test endpoint',
          description: 'Test description',
          tags: ['test'],
        })
        testMethod(_req: any, _res: any) {
          // handler
        }
      }

      const controller = new TestController();
      const metadata = (controller.testMethod as any).__openapi_metadata;

      expect(metadata).toBeDefined();
      expect(metadata.summary).toBe('Test endpoint');
      expect(metadata.description).toBe('Test description');
      expect(metadata.tags).toEqual(['test']);
    });

    it('should work with empty options', () => {
      class TestController {
        @Route()
        testMethod(_req: any, _res: any) {
          // handler
        }
      }

      const controller = new TestController();
      const metadata = (controller.testMethod as any).__openapi_metadata;

      expect(metadata).toBeDefined();
    });
  });

  describe('Parameter', () => {
    it('should attach parameter metadata', () => {
      class TestController {
        @Parameter({
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })
        testMethod(_req: any, _res: any) {
          // handler
        }
      }

      const controller = new TestController();
      const metadata = (controller.testMethod as any).__openapi_metadata;

      expect(metadata).toBeDefined();
      expect(metadata.parameters).toHaveLength(1);
      expect(metadata.parameters[0].name).toBe('id');
      expect(metadata.parameters[0].in).toBe('path');
    });

    it('should support multiple parameters', () => {
      class TestController {
        @Parameter({
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })
        @Parameter({
          name: 'page',
          in: 'query',
          schema: { type: 'number' },
        })
        testMethod(_req: any, _res: any) {
          // handler
        }
      }

      const controller = new TestController();
      const metadata = (controller.testMethod as any).__openapi_metadata;

      expect(metadata.parameters).toHaveLength(2);
    });
  });

  describe('RequestBody', () => {
    it('should attach request body metadata', () => {
      class TestController {
        @RequestBody({
          description: 'User data',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        })
        testMethod(_req: any, _res: any) {
          // handler
        }
      }

      const controller = new TestController();
      const metadata = (controller.testMethod as any).__openapi_metadata;

      expect(metadata).toBeDefined();
      expect(metadata.requestBody).toBeDefined();
      expect(metadata.requestBody.description).toBe('User data');
      expect(metadata.requestBody.required).toBe(true);
    });
  });

  describe('Response', () => {
    it('should attach response metadata', () => {
      class TestController {
        @Response({
          statusCode: 200,
          description: 'Success',
          schema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
            },
          },
        })
        testMethod(_req: any, _res: any) {
          // handler
        }
      }

      const controller = new TestController();
      const metadata = (controller.testMethod as any).__openapi_metadata;

      expect(metadata).toBeDefined();
      expect(metadata.responses).toBeDefined();
      expect(metadata.responses[200]).toBeDefined();
      expect(metadata.responses[200].description).toBe('Success');
    });

    it('should support multiple response codes', () => {
      class TestController {
        @Response({
          statusCode: 200,
          description: 'Success',
        })
        @Response({
          statusCode: 404,
          description: 'Not found',
        })
        testMethod(_req: any, _res: any) {
          // handler
        }
      }

      const controller = new TestController();
      const metadata = (controller.testMethod as any).__openapi_metadata;

      expect(metadata.responses[200]).toBeDefined();
      expect(metadata.responses[404]).toBeDefined();
    });
  });

  describe('Combined decorators', () => {
    it('should support stacking multiple decorators', () => {
      class TestController {
        @Route({ summary: 'Get user', tags: ['users'] })
        @Parameter({ name: 'id', in: 'path', required: true, schema: { type: 'string' } })
        @Response({ statusCode: 200, description: 'User found' })
        @Response({ statusCode: 404, description: 'User not found' })
        testMethod(_req: any, _res: any) {
          // handler
        }
      }

      const controller = new TestController();
      const metadata = (controller.testMethod as any).__openapi_metadata;

      expect(metadata.summary).toBe('Get user');
      expect(metadata.tags).toEqual(['users']);
      expect(metadata.parameters).toHaveLength(1);
      expect(metadata.responses[200]).toBeDefined();
      expect(metadata.responses[404]).toBeDefined();
    });
  });
});
