/**
 * Tests for TypeInferenceEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypeInferenceEngine } from './TypeInferenceEngine';

describe('TypeInferenceEngine', () => {
  let engine: TypeInferenceEngine;

  beforeEach(() => {
    engine = new TypeInferenceEngine();
  });

  describe('primitive types', () => {
    it('should infer string type', () => {
      const result = engine.inferFromTypeString('string');
      expect(result.schema.type).toBe('string');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should infer number type', () => {
      const result = engine.inferFromTypeString('number');
      expect(result.schema.type).toBe('number');
    });

    it('should infer boolean type', () => {
      const result = engine.inferFromTypeString('boolean');
      expect(result.schema.type).toBe('boolean');
    });

    it('should infer Date type as string with date-time format', () => {
      const result = engine.inferFromTypeString('Date');
      expect(result.schema.type).toBe('string');
      expect(result.schema.format).toBe('date-time');
    });

    it('should infer bigint as integer with int64 format', () => {
      const result = engine.inferFromTypeString('bigint');
      expect(result.schema.type).toBe('integer');
      expect(result.schema.format).toBe('int64');
    });
  });

  describe('array types', () => {
    it('should infer Array<T> syntax', () => {
      const result = engine.inferFromTypeString('Array<string>');
      expect(result.schema.type).toBe('array');
      expect(result.schema.items?.type).toBe('string');
    });

    it('should infer T[] syntax', () => {
      const result = engine.inferFromTypeString('number[]');
      expect(result.schema.type).toBe('array');
      expect(result.schema.items?.type).toBe('number');
    });

    it('should handle nested arrays', () => {
      const result = engine.inferFromTypeString('string[][]');
      expect(result.schema.type).toBe('array');
      expect(result.schema.items?.type).toBe('array');
      expect(result.schema.items?.items?.type).toBe('string');
    });
  });

  describe('union types', () => {
    it('should handle nullable types', () => {
      const result = engine.inferFromTypeString('string | null');
      expect(result.schema.type).toBe('string');
      expect((result.schema as any).nullable).toBe(true);
    });

    it('should handle string literal unions as enum', () => {
      const result = engine.inferFromTypeString("'active' | 'inactive' | 'pending'");
      expect(result.schema.type).toBe('string');
      expect(result.schema.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('should handle general union types with oneOf', () => {
      const result = engine.inferFromTypeString('string | number');
      expect(result.schema.oneOf).toBeDefined();
      expect(result.schema.oneOf?.length).toBe(2);
    });
  });

  describe('intersection types', () => {
    it('should handle intersection types with allOf', () => {
      const result = engine.inferFromTypeString('User & Admin');
      expect(result.schema.allOf).toBeDefined();
      expect(result.schema.allOf?.length).toBe(2);
    });
  });

  describe('object literal types', () => {
    it('should parse simple object literal', () => {
      const result = engine.inferFromTypeString('{ name: string; age: number }');
      expect(result.schema.type).toBe('object');
      expect(result.schema.properties?.name?.type).toBe('string');
      expect(result.schema.properties?.age?.type).toBe('number');
      expect(result.schema.required).toContain('name');
      expect(result.schema.required).toContain('age');
    });

    it('should handle optional properties', () => {
      const result = engine.inferFromTypeString('{ name: string; email?: string }');
      expect(result.schema.properties?.name?.type).toBe('string');
      expect(result.schema.properties?.email?.type).toBe('string');
      expect(result.schema.required).toContain('name');
      expect(result.schema.required).not.toContain('email');
    });

    it('should handle empty object', () => {
      const result = engine.inferFromTypeString('{}');
      expect(result.schema.type).toBe('object');
    });
  });

  describe('tuple types', () => {
    it('should parse tuple types', () => {
      const result = engine.inferFromTypeString('[string, number]');
      expect(result.schema.type).toBe('array');
      expect(result.schema.minItems).toBe(2);
      expect(result.schema.maxItems).toBe(2);
    });
  });

  describe('generic types', () => {
    it('should unwrap Promise<T>', () => {
      const result = engine.inferFromTypeString('Promise<string>');
      expect(result.schema.type).toBe('string');
    });

    it('should handle Record<K, V>', () => {
      const result = engine.inferFromTypeString('Record<string, number>');
      expect(result.schema.type).toBe('object');
      expect(result.schema.additionalProperties?.type).toBe('number');
    });

    it('should handle Set<T> as array with uniqueItems', () => {
      const result = engine.inferFromTypeString('Set<string>');
      expect(result.schema.type).toBe('array');
      expect(result.schema.items?.type).toBe('string');
      expect(result.schema.uniqueItems).toBe(true);
    });

    it('should handle Map<K, V>', () => {
      const result = engine.inferFromTypeString('Map<string, User>');
      expect(result.schema.type).toBe('object');
      expect(result.schema.additionalProperties?.$ref).toBe('#/components/schemas/User');
    });
  });

  describe('utility types', () => {
    it('should handle Partial<T>', () => {
      const result = engine.inferFromTypeString('Partial<User>');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.schema.$ref).toBe('#/components/schemas/User');
    });
  });

  describe('references', () => {
    it('should create $ref for unknown types', () => {
      const result = engine.inferFromTypeString('CustomType');
      expect(result.schema.$ref).toBe('#/components/schemas/CustomType');
    });
  });

  describe('caching', () => {
    it('should cache parsed types', () => {
      engine.inferFromTypeString('string');
      engine.inferFromTypeString('string');
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('string');
    });

    it('should clear cache', () => {
      engine.inferFromTypeString('string');
      engine.clearCache();
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('typeDefinitionToSchema', () => {
    it('should convert enum type definition', () => {
      const schema = engine.typeDefinitionToSchema({
        name: 'status',
        type: 'string',
        enumValues: ['active', 'inactive'],
      });
      expect(schema.type).toBe('string');
      expect(schema.enum).toEqual(['active', 'inactive']);
    });

    it('should convert object type definition', () => {
      const schema = engine.typeDefinitionToSchema({
        name: 'User',
        type: 'object',
        properties: {
          name: { name: 'name', type: 'string' },
          age: { name: 'age', type: 'number', optional: true },
        },
      });
      expect(schema.type).toBe('object');
      expect(schema.properties?.name?.type).toBe('string');
      expect(schema.required).toContain('name');
      expect(schema.required).not.toContain('age');
    });

    it('should convert array type definition', () => {
      const schema = engine.typeDefinitionToSchema({
        name: 'tags',
        type: 'array',
        elementType: { name: 'tag', type: 'string' },
      });
      expect(schema.type).toBe('array');
      expect(schema.items?.type).toBe('string');
    });
  });
});
