/**
 * Tests for SchemaExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaExtractor } from '../SchemaExtractor';

describe('SchemaExtractor', () => {
  let extractor: SchemaExtractor;

  beforeEach(() => {
    extractor = new SchemaExtractor();
  });

  describe('detectValidationLibrary', () => {
    it('should detect Joi usage', () => {
      const code = 'const schema = Joi.object({});';
      expect(extractor.detectValidationLibrary(code)).toBe('joi');
    });

    it('should detect Yup usage', () => {
      const code = 'const schema = yup.object({});';
      expect(extractor.detectValidationLibrary(code)).toBe('yup');
    });

    it('should detect Zod usage', () => {
      const code = 'const schema = z.object({});';
      expect(extractor.detectValidationLibrary(code)).toBe('zod');
    });

    it('should return "none" for non-validator code', () => {
      const code = 'const obj = {};';
      expect(extractor.detectValidationLibrary(code)).toBe('none');
    });
  });

  describe('extractRouteSchema', () => {
    it('should extract schema with controller code', () => {
      const controllerCode = `
        (req, res) => {
          const { email, age } = req.body;
          res.json({ success: true });
        }
      `;

      const route = extractor.extractRouteSchema('/users', 'POST', {
        controllerCode,
      });

      expect(route.path).toBe('/users');
      expect(route.method).toBe('POST');
      expect(route.schema).toBeDefined();
      expect(route.confidence).toBeDefined();
    });

    it('should cache extracted schemas', () => {
      const controllerCode = '(req, res) => { res.json({}); }';

      const route1 = extractor.extractRouteSchema('/users', 'GET', {
        controllerCode,
      });

      const route2 = extractor.extractRouteSchema('/users', 'GET', {
        controllerCode,
      });

      // Should be the same instance due to caching
      expect(route1.schema).toBe(route2.schema);
    });

    it('should track sources used for schema extraction', () => {
      const controllerCode = '(req, res) => { res.json({}); }';
      const jsDocComment = '/** @returns {object} */';

      const route = extractor.extractRouteSchema('/users', 'GET', {
        controllerCode,
        jsDocComment,
      });

      expect(route.schema.source).toContain('controller');
      expect(route.schema.source).toContain('jsdoc');
    });
  });

  describe('generateExample', () => {
    it('should generate example values from schema', () => {
      const schema = {
        requestBody: {
          type: 'object' as const,
          properties: {
            email: { type: 'string' as const, format: 'email' },
            age: { type: 'number' as const },
            active: { type: 'boolean' as const },
          },
        },
        source: [] as any[],
      };

      const example = extractor.generateExample(schema);

      expect(example.email).toContain('@');
      expect(typeof example.age).toBe('number');
      expect(typeof example.active).toBe('boolean');
    });

    it('should handle enum values', () => {
      const schema = {
        requestBody: {
          type: 'object' as const,
          properties: {
            status: {
              type: 'string' as const,
              enum: ['active', 'inactive', 'pending'],
            },
          },
        },
        source: [] as any[],
      };

      const example = extractor.generateExample(schema);

      expect(['active', 'inactive', 'pending']).toContain(example.status);
    });

    it('should generate nested objects', () => {
      const schema = {
        requestBody: {
          type: 'object' as const,
          properties: {
            user: {
              type: 'object' as const,
              properties: {
                name: { type: 'string' as const },
                email: { type: 'string' as const },
              },
            },
          },
        },
        source: [] as any[],
      };

      const example = extractor.generateExample(schema);

      expect(example.user).toBeDefined();
      expect(example.user.name).toBeDefined();
      expect(example.user.email).toBeDefined();
    });

    it('should generate arrays', () => {
      const schema = {
        requestBody: {
          type: 'object' as const,
          properties: {
            tags: {
              type: 'array' as const,
              items: { type: 'string' as const },
            },
          },
        },
        source: [] as any[],
      };

      const example = extractor.generateExample(schema);

      expect(Array.isArray(example.tags)).toBe(true);
      expect(example.tags.length).toBeGreaterThan(0);
    });
  });

  describe('validateSchema', () => {
    it('should validate complete schema', () => {
      const schema = {
        requestBody: {
          type: 'object' as const,
          properties: { email: { type: 'string' as const } },
        },
        responses: {
          '200': { description: 'Success' },
        },
        source: ['joi', 'controller'] as any,
      };

      const validation = extractor.validateSchema(schema);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toEqual([]);
    });

    it('should warn about missing response schema', () => {
      const schema = {
        requestBody: {
          type: 'object' as const,
          properties: { email: { type: 'string' as const } },
        },
        source: ['controller'] as any,
      };

      const validation = extractor.validateSchema(schema);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(
        validation.warnings.some(w => w.includes('response'))
      ).toBe(true);
    });

    it('should warn about no schema sources', () => {
      const schema = {
        source: [] as any,
      };

      const validation = extractor.validateSchema(schema);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(
        validation.warnings.some(w => w.includes('sources'))
      ).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      const controllerCode = '(req, res) => { res.json({}); }';

      extractor.extractRouteSchema('/test', 'GET', { controllerCode });
      const statsBefore = extractor.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      extractor.clearCache();
      const statsAfter = extractor.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });

    it('should report cache statistics', () => {
      const controllerCode = '(req, res) => { res.json({}); }';

      extractor.extractRouteSchema('/users', 'GET', { controllerCode });
      extractor.extractRouteSchema('/posts', 'POST', { controllerCode });

      const stats = extractor.getCacheStats();

      expect(stats.size).toBeGreaterThanOrEqual(2);
      expect(stats.keys).toContain('GET:/users');
      expect(stats.keys).toContain('POST:/posts');
    });
  });
});
