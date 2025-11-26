/**
 * Tests for PathParameterExtractor
 */

import { describe, it, expect } from 'vitest';
import { PathParameterExtractor } from '../PathParameterExtractor';

describe('PathParameterExtractor', () => {
  const extractor = new PathParameterExtractor();

  describe('extractPathParameters', () => {
    it('should extract single path parameter', () => {
      const result = extractor.extractPathParameters('/users/:id');

      expect(result.normalized).toBe('/users/{id}');
      expect(result.parameters.length).toBe(1);
      expect(result.parameters[0].name).toBe('id');
      expect(result.parameters[0].in).toBe('path');
      expect(result.parameters[0].required).toBe(true);
    });

    it('should extract multiple path parameters', () => {
      const result = extractor.extractPathParameters(
        '/users/:userId/posts/:postId'
      );

      expect(result.normalized).toBe('/users/{userId}/posts/{postId}');
      expect(result.parameters.length).toBe(2);
      expect(result.parameters[0].name).toBe('userId');
      expect(result.parameters[1].name).toBe('postId');
    });

    it('should infer parameter type for ID fields', () => {
      const result = extractor.extractPathParameters('/items/:itemId');

      const param = result.parameters[0];
      expect(param.schema.type).toBe('integer');
    });

    it('should infer string type for slug parameters', () => {
      const result = extractor.extractPathParameters('/posts/:slug');

      const param = result.parameters[0];
      expect(param.schema.type).toBe('string');
    });

    it('should generate pattern for numeric IDs', () => {
      const result = extractor.extractPathParameters('/users/:userId');

      const param = result.parameters[0];
      expect(param.schema.pattern).toBe('^[0-9]+$');
    });

    it('should generate pattern for slugs', () => {
      const result = extractor.extractPathParameters('/articles/:slug');

      const param = result.parameters[0];
      expect(param.schema.pattern).toBe('^[a-z0-9-]+$');
    });

    it('should generate pattern for UUIDs', () => {
      const result = extractor.extractPathParameters('/resources/:uuid');

      const param = result.parameters[0];
      expect(param.schema.pattern).toContain('0-9a-f');
    });

    it('should avoid duplicate parameters', () => {
      const result = extractor.extractPathParameters('/items/:id/sub/:id');

      expect(result.parameters.length).toBe(1);
      expect(result.parameters[0].name).toBe('id');
    });
  });

  describe('normalizePath', () => {
    it('should convert Express path to OpenAPI format', () => {
      const normalized = extractor.normalizePath('/users/:id');
      expect(normalized).toBe('/users/{id}');
    });

    it('should handle multiple parameters', () => {
      const normalized = extractor.normalizePath(
        '/users/:userId/posts/:postId'
      );
      expect(normalized).toBe('/users/{userId}/posts/{postId}');
    });

    it('should handle paths without parameters', () => {
      const normalized = extractor.normalizePath('/users');
      expect(normalized).toBe('/users');
    });

    it('should return empty string for non-string input', () => {
      const normalized = extractor.normalizePath('');
      expect(normalized).toBe('');
    });
  });

  describe('extractQueryParameters', () => {
    it('should extract query parameters from JSDoc', () => {
      const doc = `
        @query {string} filter - Filter criteria
        @query {number} limit - Result limit
        @query {boolean} active - Filter by active status
      `;

      const params = extractor.extractQueryParameters(doc);

      expect(params.length).toBeGreaterThan(0);
      const filterParam = params.find(p => p.name === 'filter');
      expect(filterParam).toBeDefined();
      expect(filterParam?.in).toBe('query');
      expect(filterParam?.required).toBe(false);
    });

    it('should return empty array for no query parameters', () => {
      const doc = 'Some regular documentation';
      const params = extractor.extractQueryParameters(doc);

      expect(params).toEqual([]);
    });

    it('should handle undefined doc string', () => {
      const params = extractor.extractQueryParameters(undefined);
      expect(params).toEqual([]);
    });
  });

  describe('combineParameters', () => {
    it('should combine path and query parameters', () => {
      const pathParams = [
        {
          name: 'id',
          in: 'path' as const,
          required: true,
          schema: { type: 'integer' as const },
          description: 'Item ID',
        },
      ];

      const queryParams = [
        {
          name: 'filter',
          in: 'query' as const,
          required: false,
          schema: { type: 'string' as const },
          description: 'Filter criteria',
        },
      ];

      const combined = extractor.combineParameters(pathParams, queryParams);

      expect(combined.length).toBe(2);
      expect(combined[0].in).toBe('path');
      expect(combined[1].in).toBe('query');
    });

    it('should avoid duplicate parameters', () => {
      const pathParams = [
        {
          name: 'id',
          in: 'path' as const,
          required: true,
          schema: { type: 'integer' as const },
          description: 'Item ID',
        },
      ];

      const queryParams = [
        {
          name: 'id',
          in: 'path' as const,
          required: true,
          schema: { type: 'integer' as const },
          description: 'Item ID',
        },
      ];

      const combined = extractor.combineParameters(pathParams, queryParams);

      expect(combined.length).toBe(1);
    });
  });

  describe('toOpenAPIParameter', () => {
    it('should convert path parameter to OpenAPI format', () => {
      const param = {
        name: 'userId',
        in: 'path' as const,
        required: true,
        schema: {
          type: 'integer' as const,
          pattern: '^[0-9]+$',
        },
        description: 'User ID',
      };

      const openAPIParam = extractor.toOpenAPIParameter(param);

      expect(openAPIParam.name).toBe('userId');
      expect(openAPIParam.in).toBe('path');
      expect(openAPIParam.required).toBe(true);
      expect(openAPIParam.schema?.type).toBe('integer');
      expect(openAPIParam.schema?.pattern).toBe('^[0-9]+$');
    });

    it('should add style and explode for query parameters', () => {
      const param = {
        name: 'tags',
        in: 'query' as const,
        required: false,
        schema: { type: 'string' as const },
        description: 'Filter tags',
      };

      const openAPIParam = extractor.toOpenAPIParameter(param);

      expect(openAPIParam.style).toBe('form');
      expect(openAPIParam.explode).toBe(true);
    });

    it('should include enum values if present', () => {
      const param = {
        name: 'status',
        in: 'query' as const,
        required: false,
        schema: {
          type: 'string' as const,
          enum: ['active', 'inactive', 'pending'],
        },
        description: 'Status filter',
      };

      const openAPIParam = extractor.toOpenAPIParameter(param);

      expect(openAPIParam.schema?.enum).toEqual([
        'active',
        'inactive',
        'pending',
      ]);
    });
  });
});
