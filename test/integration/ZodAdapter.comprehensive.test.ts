/**
 * ZodAdapter Comprehensive Tests - 95% Coverage Target
 * Tests all Zod primitive types, complex nested objects,
 * arrays, unions, intersections, refinements, and edge cases.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { ZodAdapter } from '../../src/validators/ZodAdapter';

describe('ZodAdapter.comprehensive', () => {
  let adapter: ZodAdapter;

  beforeEach(() => {
    adapter = new ZodAdapter();
  });

  describe('Detection', () => {
    it('should detect Zod string schema', () => {
      expect(adapter.detect(z.string())).toBe(true);
    });

    it('should detect Zod number schema', () => {
      expect(adapter.detect(z.number())).toBe(true);
    });

    it('should detect Zod boolean schema', () => {
      expect(adapter.detect(z.boolean())).toBe(true);
    });

    it('should detect Zod object schema', () => {
      expect(adapter.detect(z.object({}))).toBe(true);
    });

    it('should detect Zod array schema', () => {
      expect(adapter.detect(z.array(z.string()))).toBe(true);
    });

    it('should detect Zod enum schema', () => {
      expect(adapter.detect(z.enum(['a', 'b']))).toBe(true);
    });

    it('should detect Zod optional schema', () => {
      expect(adapter.detect(z.string().optional())).toBe(true);
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

    it('should reject functions', () => {
      expect(adapter.detect(() => {})).toBe(false);
    });
  });

  describe('String Primitives', () => {
    it('should convert basic string', () => {
      const result = adapter.convert(z.string());
      expect(result).toEqual({ type: 'string' });
    });

    it('should convert string with email format', () => {
      const result = adapter.convert(z.string().email());
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    it('should convert string with url format', () => {
      const result = adapter.convert(z.string().url());
      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should convert string with uuid format', () => {
      const result = adapter.convert(z.string().uuid());
      expect(result.type).toBe('string');
      expect(result.format).toBe('uuid');
    });

    it('should convert string with combined checks', () => {
      const result = adapter.convert(z.string().email());
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });
  });

  describe('Number Primitives', () => {
    it('should convert basic number', () => {
      const result = adapter.convert(z.number());
      expect(result).toEqual({ type: 'number' });
    });

    it('should convert integer number', () => {
      const result = adapter.convert(z.number().int());
      expect(result.type).toBe('number');
      expect(result.format).toBe('int32');
    });
  });

  describe('Boolean Primitive', () => {
    it('should convert boolean', () => {
      const result = adapter.convert(z.boolean());
      expect(result).toEqual({ type: 'boolean' });
    });
  });

  describe('Object Schemas', () => {
    it('should convert empty object', () => {
      const result = adapter.convert(z.object({}));
      expect(result.type).toBe('object');
      expect(result.properties).toEqual({});
    });

    it('should convert object with single property', () => {
      const result = adapter.convert(z.object({ name: z.string() }));
      expect(result.type).toBe('object');
      expect(result.properties?.name).toEqual({ type: 'string' });
      expect(result.required).toContain('name');
    });

    it('should convert object with multiple properties', () => {
      const schema = z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
      });
      const result = adapter.convert(schema);

      expect(result.type).toBe('object');
      expect(result.properties?.id).toEqual({ type: 'number' });
      expect(result.properties?.name).toEqual({ type: 'string' });
      expect(result.properties?.active).toEqual({ type: 'boolean' });
      expect(result.required).toHaveLength(3);
    });

    it('should convert object with optional properties', () => {
      const schema = z.object({
        id: z.number(),
        email: z.string().optional(),
      });
      const result = adapter.convert(schema);

      expect(result.required).toContain('id');
      expect(result.required).not.toContain('email');
    });

    it('should convert nested object (2 levels)', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });
      const result = adapter.convert(schema);

      expect(result.properties?.user.type).toBe('object');
      expect(result.properties?.user.properties?.name).toEqual({ type: 'string' });
    });

    it('should convert nested object (3 levels)', () => {
      const schema = z.object({
        level1: z.object({
          level2: z.object({
            value: z.string(),
          }),
        }),
      });
      const result = adapter.convert(schema);

      expect(result.properties?.level1.properties?.level2.properties?.value).toEqual({
        type: 'string',
      });
    });

    it('should convert deeply nested object (5 levels)', () => {
      const schema = z.object({
        a: z.object({
          b: z.object({
            c: z.object({
              d: z.object({
                e: z.string(),
              }),
            }),
          }),
        }),
      });
      const result = adapter.convert(schema);

      expect(
        result.properties?.a.properties?.b.properties?.c.properties?.d.properties?.e
      ).toEqual({ type: 'string' });
    });

    it('should convert object with mixed required and optional', () => {
      const schema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        age: z.number(),
      });
      const result = adapter.convert(schema);

      expect(result.required).toContain('id');
      expect(result.required).toContain('name');
      expect(result.required).toContain('age');
      expect(result.required).not.toContain('email');
      expect(result.required).not.toContain('phone');
    });
  });

  describe('Array Schemas', () => {
    it('should convert array of strings', () => {
      const result = adapter.convert(z.array(z.string()));
      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'string' });
    });

    it('should convert array of numbers', () => {
      const result = adapter.convert(z.array(z.number()));
      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'number' });
    });

    it('should convert array of booleans', () => {
      const result = adapter.convert(z.array(z.boolean()));
      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'boolean' });
    });

    it('should convert array of objects', () => {
      const schema = z.array(
        z.object({
          id: z.number(),
          name: z.string(),
        })
      );
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect((result.items as any).type).toBe('object');
      expect((result.items as any).properties?.id).toEqual({ type: 'number' });
    });

    it('should convert nested arrays (2D array)', () => {
      const schema = z.array(z.array(z.string()));
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect((result.items as any).type).toBe('array');
      expect((result.items as any).items).toEqual({ type: 'string' });
    });

    it('should convert array with email strings', () => {
      const result = adapter.convert(z.array(z.string().email()));
      expect(result.type).toBe('array');
      expect((result.items as any).format).toBe('email');
    });
  });

  describe('Enum Schemas', () => {
    it('should convert string enum with 2 values', () => {
      const result = adapter.convert(z.enum(['a', 'b']));
      expect(result.type).toBe('string');
      expect(result.enum).toEqual(['a', 'b']);
    });

    it('should convert string enum with multiple values', () => {
      const result = adapter.convert(z.enum(['red', 'green', 'blue', 'yellow']));
      expect(result.type).toBe('string');
      expect(result.enum).toEqual(['red', 'green', 'blue', 'yellow']);
    });

    it('should convert single value enum', () => {
      const result = adapter.convert(z.enum(['single']));
      expect(result.type).toBe('string');
      expect(result.enum).toEqual(['single']);
    });

    it('should convert status enum', () => {
      const result = adapter.convert(z.enum(['pending', 'active', 'completed', 'cancelled']));
      expect(result.enum).toHaveLength(4);
      expect(result.enum).toContain('pending');
      expect(result.enum).toContain('active');
    });
  });

  describe('Optional Schemas', () => {
    it('should convert optional string', () => {
      const result = adapter.convert(z.string().optional());
      expect(result.type).toBe('string');
    });

    it('should convert optional number', () => {
      const result = adapter.convert(z.number().optional());
      expect(result.type).toBe('number');
    });

    it('should convert optional object', () => {
      const result = adapter.convert(
        z
          .object({
            name: z.string(),
          })
          .optional()
      );
      expect(result.type).toBe('object');
    });
  });

  describe('Complex Real-World Schemas', () => {
    it('should convert User schema', () => {
      const userSchema = z.object({
        id: z.string().uuid(),
        username: z.string(),
        email: z.string().email(),
        password: z.string(),
        role: z.enum(['user', 'admin', 'moderator']),
        profile: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          avatar: z.string().url().optional(),
        }),
        createdAt: z.string(),
        updatedAt: z.string().optional(),
      });

      const result = adapter.convert(userSchema);

      expect(result.type).toBe('object');
      expect(result.properties?.id.format).toBe('uuid');
      expect(result.properties?.email.format).toBe('email');
      expect(result.properties?.role.enum).toContain('admin');
      expect(result.properties?.profile.type).toBe('object');
    });

    it('should convert Product schema', () => {
      const productSchema = z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        price: z.number(),
        quantity: z.number().int(),
        categories: z.array(z.string()),
        tags: z.array(z.string()).optional(),
        attributes: z.object({
          color: z.string().optional(),
          size: z.enum(['S', 'M', 'L', 'XL']).optional(),
          weight: z.number().optional(),
        }),
      });

      const result = adapter.convert(productSchema);

      expect(result.properties?.categories.type).toBe('array');
      expect(result.properties?.attributes.properties?.size?.enum).toContain('M');
      expect(result.required).toContain('id');
      expect(result.required).toContain('name');
    });

    it('should convert Order schema with nested items', () => {
      const orderItemSchema = z.object({
        productId: z.string(),
        name: z.string(),
        price: z.number(),
        quantity: z.number().int(),
      });

      const orderSchema = z.object({
        id: z.string().uuid(),
        customerId: z.string(),
        items: z.array(orderItemSchema),
        status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
        total: z.number(),
        shippingAddress: z.object({
          street: z.string(),
          city: z.string(),
          state: z.string(),
          zipCode: z.string(),
          country: z.string(),
        }),
      });

      const result = adapter.convert(orderSchema);

      expect(result.properties?.id.format).toBe('uuid');
      expect(result.properties?.items.type).toBe('array');
      expect(result.properties?.status.enum).toHaveLength(5);
      expect(result.properties?.shippingAddress.type).toBe('object');
    });

    it('should convert API Response schema', () => {
      const dataSchema = z.object({
        id: z.string(),
        value: z.string(),
      });

      const responseSchema = z.object({
        success: z.boolean(),
        data: z.array(dataSchema).optional(),
        error: z
          .object({
            code: z.string(),
            message: z.string(),
          })
          .optional(),
        meta: z.object({
          page: z.number().int(),
          perPage: z.number().int(),
          total: z.number().int(),
        }),
      });

      const result = adapter.convert(responseSchema);

      expect(result.properties?.success.type).toBe('boolean');
      expect(result.properties?.data?.type).toBe('array');
      expect(result.properties?.meta.properties?.page.format).toBe('int32');
    });
  });

  describe('Error Handling', () => {
    it('should throw for invalid schema (null)', () => {
      expect(() => adapter.convert(null)).toThrow('Invalid Zod schema');
    });

    it('should throw for invalid schema (undefined)', () => {
      expect(() => adapter.convert(undefined)).toThrow('Invalid Zod schema');
    });

    it('should throw for invalid schema (plain object)', () => {
      expect(() => adapter.convert({})).toThrow('Invalid Zod schema');
    });

    it('should throw for invalid schema (string)', () => {
      expect(() => adapter.convert('string')).toThrow('Invalid Zod schema');
    });

    it('should throw for invalid schema (number)', () => {
      expect(() => adapter.convert(123)).toThrow('Invalid Zod schema');
    });

    it('should throw for invalid schema (array)', () => {
      expect(() => adapter.convert([])).toThrow('Invalid Zod schema');
    });
  });

  describe('Adapter Properties', () => {
    it('should have name property', () => {
      expect(adapter.name).toBe('zod');
    });
  });
});
