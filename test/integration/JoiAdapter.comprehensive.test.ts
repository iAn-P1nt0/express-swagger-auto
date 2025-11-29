/**
 * JoiAdapter Comprehensive Tests - 95% Coverage Target
 * Tests all Joi types, validators, complex validation rules,
 * conditional validation, and edge cases.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Joi from 'joi';
import { JoiAdapter } from '../../src/validators/JoiAdapter';

describe('JoiAdapter.comprehensive', () => {
  let adapter: JoiAdapter;

  beforeEach(() => {
    adapter = new JoiAdapter();
  });

  describe('Detection', () => {
    it('should detect Joi string schema', () => {
      expect(adapter.detect(Joi.string())).toBe(true);
    });

    it('should detect Joi number schema', () => {
      expect(adapter.detect(Joi.number())).toBe(true);
    });

    it('should detect Joi boolean schema', () => {
      expect(adapter.detect(Joi.boolean())).toBe(true);
    });

    it('should detect Joi object schema', () => {
      expect(adapter.detect(Joi.object({}))).toBe(true);
    });

    it('should detect Joi array schema', () => {
      expect(adapter.detect(Joi.array())).toBe(true);
    });

    it('should detect Joi date schema', () => {
      expect(adapter.detect(Joi.date())).toBe(true);
    });

    it('should detect Joi alternatives schema', () => {
      expect(adapter.detect(Joi.alternatives())).toBe(true);
    });

    it('should reject null', () => {
      expect(adapter.detect(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(adapter.detect(undefined)).toBe(false);
    });

    it('should reject plain objects', () => {
      expect(adapter.detect({})).toBe(false);
    });

    it('should reject strings', () => {
      expect(adapter.detect('string')).toBe(false);
    });

    it('should reject numbers', () => {
      expect(adapter.detect(123)).toBe(false);
    });

    it('should reject arrays', () => {
      expect(adapter.detect([])).toBe(false);
    });
  });

  describe('String Types', () => {
    it('should convert basic string', () => {
      const result = adapter.convert(Joi.string());
      expect(result).toEqual({ type: 'string' });
    });

    it('should convert string with email', () => {
      const result = adapter.convert(Joi.string().email());
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    it('should convert string with uri', () => {
      const result = adapter.convert(Joi.string().uri());
      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should convert string with uuid', () => {
      const result = adapter.convert(Joi.string().uuid());
      expect(result.type).toBe('string');
      expect(result.format).toBe('uuid');
    });

    it('should convert string with guid (alias for uuid)', () => {
      const result = adapter.convert(Joi.string().guid());
      expect(result.format).toBe('uuid');
    });

    it('should convert string with min length', () => {
      const result = adapter.convert(Joi.string().min(5));
      expect(result.minLength).toBe(5);
    });

    it('should convert string with max length', () => {
      const result = adapter.convert(Joi.string().max(100));
      expect(result.maxLength).toBe(100);
    });

    it('should convert string with min and max length', () => {
      const result = adapter.convert(Joi.string().min(3).max(50));
      expect(result.minLength).toBe(3);
      expect(result.maxLength).toBe(50);
    });

    it('should convert string with valid values (enum)', () => {
      const result = adapter.convert(Joi.string().valid('a', 'b', 'c'));
      expect(result.enum).toEqual(['a', 'b', 'c']);
    });

    it('should convert string with description', () => {
      const result = adapter.convert(Joi.string().description('User name'));
      expect(result.description).toBe('User name');
    });
  });

  describe('Number Types', () => {
    it('should convert basic number', () => {
      const result = adapter.convert(Joi.number());
      expect(result).toEqual({ type: 'number' });
    });

    it('should convert integer number', () => {
      const result = adapter.convert(Joi.number().integer());
      expect(result.format).toBe('int32');
    });

    it('should convert number with min', () => {
      const result = adapter.convert(Joi.number().min(0));
      expect(result.minimum).toBe(0);
    });

    it('should convert number with max', () => {
      const result = adapter.convert(Joi.number().max(100));
      expect(result.maximum).toBe(100);
    });

    it('should convert number with min and max', () => {
      const result = adapter.convert(Joi.number().min(1).max(10));
      expect(result.minimum).toBe(1);
      expect(result.maximum).toBe(10);
    });

    it('should convert number with description', () => {
      const result = adapter.convert(Joi.number().description('User age'));
      expect(result.description).toBe('User age');
    });

    it('should convert integer with constraints', () => {
      const result = adapter.convert(Joi.number().integer().min(1).max(100));
      expect(result.format).toBe('int32');
      expect(result.minimum).toBe(1);
      expect(result.maximum).toBe(100);
    });
  });

  describe('Boolean Type', () => {
    it('should convert boolean', () => {
      const result = adapter.convert(Joi.boolean());
      expect(result).toEqual({ type: 'boolean' });
    });
  });

  describe('Date Type', () => {
    it('should convert date', () => {
      const result = adapter.convert(Joi.date());
      expect(result.type).toBe('string');
      expect(result.format).toBe('date-time');
    });
  });

  describe('Object Schemas', () => {
    it('should convert empty object', () => {
      const result = adapter.convert(Joi.object({}));
      expect(result.type).toBe('object');
      expect(result.properties).toEqual({});
    });

    it('should convert object with required properties', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
      });
      const result = adapter.convert(schema);

      expect(result.type).toBe('object');
      expect(result.required).toContain('name');
      expect(result.required).toContain('age');
    });

    it('should convert object with optional properties', () => {
      const schema = Joi.object({
        id: Joi.number().required(),
        email: Joi.string().optional(),
      });
      const result = adapter.convert(schema);

      expect(result.required).toContain('id');
      expect(result.required).not.toContain('email');
    });

    it('should convert nested object (2 levels)', () => {
      const schema = Joi.object({
        user: Joi.object({
          name: Joi.string(),
        }),
      });
      const result = adapter.convert(schema);

      expect(result.properties?.user.type).toBe('object');
      expect(result.properties?.user.properties?.name).toEqual({ type: 'string' });
    });

    it('should convert nested object (3 levels)', () => {
      const schema = Joi.object({
        level1: Joi.object({
          level2: Joi.object({
            value: Joi.string(),
          }),
        }),
      });
      const result = adapter.convert(schema);

      expect(
        result.properties?.level1.properties?.level2.properties?.value
      ).toEqual({ type: 'string' });
    });

    it('should convert deeply nested object (5 levels)', () => {
      const schema = Joi.object({
        a: Joi.object({
          b: Joi.object({
            c: Joi.object({
              d: Joi.object({
                e: Joi.string(),
              }),
            }),
          }),
        }),
      });
      const result = adapter.convert(schema);

      expect(
        result.properties?.a.properties?.b.properties?.c.properties?.d
          .properties?.e
      ).toEqual({ type: 'string' });
    });

    it('should convert object with description', () => {
      const schema = Joi.object({
        name: Joi.string(),
      }).description('User object');
      const result = adapter.convert(schema);

      expect(result.description).toBe('User object');
    });
  });

  describe('Array Schemas', () => {
    it('should convert empty array', () => {
      const result = adapter.convert(Joi.array());
      expect(result.type).toBe('array');
      expect(result.items).toEqual({});
    });

    it('should convert array of strings', () => {
      const result = adapter.convert(Joi.array().items(Joi.string()));
      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'string' });
    });

    it('should convert array of numbers', () => {
      const result = adapter.convert(Joi.array().items(Joi.number()));
      expect(result.items).toEqual({ type: 'number' });
    });

    it('should convert array of objects', () => {
      const schema = Joi.array().items(
        Joi.object({
          id: Joi.number(),
          name: Joi.string(),
        })
      );
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect((result.items as any).type).toBe('object');
    });

    it('should convert array with min items', () => {
      const result = adapter.convert(Joi.array().items(Joi.string()).min(1));
      expect(result.minItems).toBe(1);
    });

    it('should convert array with max items', () => {
      const result = adapter.convert(Joi.array().items(Joi.string()).max(10));
      expect(result.maxItems).toBe(10);
    });

    it('should convert array with min and max items', () => {
      const result = adapter.convert(
        Joi.array().items(Joi.string()).min(1).max(100)
      );
      expect(result.minItems).toBe(1);
      expect(result.maxItems).toBe(100);
    });

    it('should convert nested arrays', () => {
      const schema = Joi.array().items(Joi.array().items(Joi.string()));
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect((result.items as any).type).toBe('array');
    });
  });

  describe('Alternatives (Union Types)', () => {
    it('should convert alternatives to oneOf', () => {
      const schema = Joi.alternatives().try(Joi.string(), Joi.number());
      const result = adapter.convert(schema);

      expect(result.oneOf).toBeDefined();
      expect(result.oneOf).toHaveLength(2);
    });

    it('should convert alternatives with multiple types', () => {
      const schema = Joi.alternatives().try(
        Joi.string(),
        Joi.number(),
        Joi.boolean()
      );
      const result = adapter.convert(schema);

      expect(result.oneOf).toHaveLength(3);
    });

    it('should convert alternatives with objects', () => {
      const schema = Joi.alternatives().try(
        Joi.object({ type: Joi.string().valid('a'), value: Joi.string() }),
        Joi.object({ type: Joi.string().valid('b'), count: Joi.number() })
      );
      const result = adapter.convert(schema);

      expect(result.oneOf).toHaveLength(2);
      expect((result.oneOf as any)[0].type).toBe('object');
    });

    it('should handle empty alternatives', () => {
      const schema = Joi.alternatives();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'object' });
    });
  });

  describe('Complex Real-World Schemas', () => {
    it('should convert User schema', () => {
      const userSchema = Joi.object({
        id: Joi.string().uuid().required(),
        username: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        role: Joi.string().valid('user', 'admin', 'moderator'),
        profile: Joi.object({
          firstName: Joi.string().optional(),
          lastName: Joi.string().optional(),
          avatar: Joi.string().uri().optional(),
        }),
        createdAt: Joi.date(),
        updatedAt: Joi.date().optional(),
      });

      const result = adapter.convert(userSchema);

      expect(result.type).toBe('object');
      expect(result.properties?.id.format).toBe('uuid');
      expect(result.properties?.email.format).toBe('email');
      expect(result.properties?.password.minLength).toBe(8);
      expect(result.properties?.role.enum).toContain('admin');
      expect(result.properties?.profile.type).toBe('object');
      expect(result.properties?.createdAt.format).toBe('date-time');
    });

    it('should convert Product schema', () => {
      const productSchema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().min(1).max(200).required(),
        description: Joi.string().max(5000).optional(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().integer().min(0).required(),
        categories: Joi.array().items(Joi.string()).required(),
        tags: Joi.array().items(Joi.string()).optional(),
        metadata: Joi.object({
          sku: Joi.string().optional(),
          weight: Joi.number().optional(),
          dimensions: Joi.object({
            width: Joi.number(),
            height: Joi.number(),
            depth: Joi.number(),
          }).optional(),
        }),
      });

      const result = adapter.convert(productSchema);

      expect(result.properties?.name.minLength).toBe(1);
      expect(result.properties?.name.maxLength).toBe(200);
      expect(result.properties?.price.minimum).toBe(0);
      expect(result.properties?.quantity.format).toBe('int32');
      expect(result.properties?.categories.type).toBe('array');
    });

    it('should convert Address schema', () => {
      const addressSchema = Joi.object({
        street: Joi.string().required().description('Street address'),
        street2: Joi.string().optional(),
        city: Joi.string().required(),
        state: Joi.string().min(2).max(2),
        zipCode: Joi.string().required(),
        country: Joi.string().valid('US', 'CA', 'MX', 'UK'),
      });

      const result = adapter.convert(addressSchema);

      expect(result.properties?.street.description).toBe('Street address');
      expect(result.properties?.state.minLength).toBe(2);
      expect(result.properties?.state.maxLength).toBe(2);
      expect(result.properties?.country.enum).toContain('US');
    });

    it('should convert API Response schema', () => {
      const responseSchema = Joi.object({
        success: Joi.boolean().required(),
        data: Joi.alternatives()
          .try(
            Joi.object().unknown(),
            Joi.array().items(Joi.object().unknown())
          )
          .optional(),
        error: Joi.object({
          code: Joi.string().required(),
          message: Joi.string().required(),
          details: Joi.array().items(Joi.string()).optional(),
        }).optional(),
        pagination: Joi.object({
          page: Joi.number().integer().min(1).required(),
          perPage: Joi.number().integer().min(1).max(100).required(),
          total: Joi.number().integer().min(0).required(),
          totalPages: Joi.number().integer().min(0).required(),
        }).optional(),
      });

      const result = adapter.convert(responseSchema);

      expect(result.properties?.success.type).toBe('boolean');
      expect(result.properties?.data?.oneOf).toBeDefined();
      expect(result.properties?.error?.properties?.code.type).toBe('string');
      expect(result.properties?.pagination?.properties?.page.format).toBe('int32');
    });
  });

  describe('Error Handling', () => {
    it('should throw for invalid schema (null)', () => {
      expect(() => adapter.convert(null)).toThrow('Invalid Joi schema');
    });

    it('should throw for invalid schema (undefined)', () => {
      expect(() => adapter.convert(undefined)).toThrow('Invalid Joi schema');
    });

    it('should throw for invalid schema (plain object)', () => {
      expect(() => adapter.convert({})).toThrow('Invalid Joi schema');
    });

    it('should throw for invalid schema (string)', () => {
      expect(() => adapter.convert('string')).toThrow('Invalid Joi schema');
    });

    it('should throw for invalid schema (number)', () => {
      expect(() => adapter.convert(123)).toThrow('Invalid Joi schema');
    });
  });

  describe('Adapter Properties', () => {
    it('should have name property', () => {
      expect(adapter.name).toBe('joi');
    });
  });
});
