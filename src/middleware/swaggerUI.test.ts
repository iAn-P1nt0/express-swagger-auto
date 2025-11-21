import { describe, it, expect } from 'vitest';
import { createSwaggerUIMiddleware } from './swaggerUI';
import type { OpenAPISpec } from '../types';

describe('swaggerUI', () => {
  const mockSpec: OpenAPISpec = {
    openapi: '3.1.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {
      '/test': {
        get: {
          summary: 'Test endpoint',
          responses: {
            '200': {
              description: 'Success',
            },
          },
        },
      },
    },
  };

  it('should create middleware with default route prefix', () => {
    const router = createSwaggerUIMiddleware({ spec: mockSpec });

    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });

  it('should create middleware with custom route prefix', () => {
    const router = createSwaggerUIMiddleware({
      spec: mockSpec,
      routePrefix: '/docs',
    });

    expect(router).toBeDefined();
  });

  it('should create middleware with custom CSS', () => {
    const router = createSwaggerUIMiddleware({
      spec: mockSpec,
      customCss: '.swagger-ui { background: #fff; }',
    });

    expect(router).toBeDefined();
  });

  it('should create middleware with custom site title', () => {
    const router = createSwaggerUIMiddleware({
      spec: mockSpec,
      customSiteTitle: 'My Custom API Docs',
    });

    expect(router).toBeDefined();
  });
});
