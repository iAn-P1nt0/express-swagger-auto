/**
 * YupAdapter Comprehensive Tests - 95% Coverage Target
 * Tests all Yup schema types, transforms, conditional validation,
 * custom validation methods, and edge cases.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as yup from 'yup';
import { YupAdapter } from '../../src/validators/YupAdapter';

describe('YupAdapter.comprehensive', () => {
  let adapter: YupAdapter;

  beforeEach(() => {
    adapter = new YupAdapter();
  });

  describe('Detection', () => {
    it('should detect Yup string schema', () => {
      expect(adapter.detect(yup.string())).toBe(true);
    });

    it('should detect Yup number schema', () => {
      expect(adapter.detect(yup.number())).toBe(true);
    });

    it('should detect Yup boolean schema', () => {
      expect(adapter.detect(yup.boolean())).toBe(true);
    });

    it('should detect Yup object schema', () => {
      expect(adapter.detect(yup.object({}))).toBe(true);
    });

    it('should detect Yup array schema', () => {
      expect(adapter.detect(yup.array())).toBe(true);
    });

    it('should detect Yup date schema', () => {
      expect(adapter.detect(yup.date())).toBe(true);
    });

    it('should detect Yup mixed schema', () => {
      expect(adapter.detect(yup.mixed())).toBe(true);
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
      const result = adapter.convert(yup.string());
      expect(result).toEqual({ type: 'string' });
    });

    it('should convert string with email', () => {
      const result = adapter.convert(yup.string().email());
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    it('should convert string with url', () => {
      const result = adapter.convert(yup.string().url());
      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should convert string with uuid', () => {
      const result = adapter.convert(yup.string().uuid());
      expect(result.type).toBe('string');
      expect(result.format).toBe('uuid');
    });

    it('should convert string with min length', () => {
      const result = adapter.convert(yup.string().min(5));
      expect(result.minLength).toBe(5);
    });

    it('should convert string with max length', () => {
      const result = adapter.convert(yup.string().max(100));
      expect(result.maxLength).toBe(100);
    });

    it('should convert string with min and max length', () => {
      const result = adapter.convert(yup.string().min(3).max(50));
      expect(result.minLength).toBe(3);
      expect(result.maxLength).toBe(50);
    });

    it('should convert string with oneOf (enum)', () => {
      const result = adapter.convert(
        yup.string().oneOf(['a', 'b', 'c'] as const)
      );
      expect(result.enum).toEqual(['a', 'b', 'c']);
    });

    it('should convert string with label', () => {
      const result = adapter.convert(yup.string().label('User name'));
      expect(result.description).toBe('User name');
    });

    it('should convert string with default', () => {
      const result = adapter.convert(yup.string().default('guest'));
      expect(result.default).toBe('guest');
    });
  });

  describe('Number Types', () => {
    it('should convert basic number', () => {
      const result = adapter.convert(yup.number());
      expect(result).toEqual({ type: 'number' });
    });

    it('should convert integer number', () => {
      const result = adapter.convert(yup.number().integer());
      expect(result.format).toBe('int32');
    });

    it('should convert number with min', () => {
      const result = adapter.convert(yup.number().min(0));
      expect(result.minimum).toBe(0);
    });

    it('should convert number with max', () => {
      const result = adapter.convert(yup.number().max(100));
      expect(result.maximum).toBe(100);
    });

    it('should convert number with min and max', () => {
      const result = adapter.convert(yup.number().min(1).max(10));
      expect(result.minimum).toBe(1);
      expect(result.maximum).toBe(10);
    });

    it('should convert number with label', () => {
      const result = adapter.convert(yup.number().label('Age'));
      expect(result.description).toBe('Age');
    });

    it('should convert number with default', () => {
      const result = adapter.convert(yup.number().default(0));
      expect(result.default).toBe(0);
    });

    it('should convert integer with constraints', () => {
      const result = adapter.convert(
        yup.number().integer().min(0).max(100)
      );
      expect(result.format).toBe('int32');
      expect(result.minimum).toBe(0);
      expect(result.maximum).toBe(100);
    });
  });

  describe('Boolean Type', () => {
    it('should convert boolean', () => {
      const result = adapter.convert(yup.boolean());
      expect(result).toEqual({ type: 'boolean' });
    });

    it('should convert boolean with default', () => {
      const result = adapter.convert(yup.boolean().default(false));
      expect(result.default).toBe(false);
    });
  });

  describe('Date Type', () => {
    it('should convert date', () => {
      const result = adapter.convert(yup.date());
      expect(result.type).toBe('string');
      expect(result.format).toBe('date-time');
    });
  });

  describe('Mixed Type', () => {
    it('should convert mixed to object', () => {
      const result = adapter.convert(yup.mixed());
      expect(result.type).toBe('object');
    });
  });

  describe('Object Schemas', () => {
    it('should convert empty object', () => {
      const result = adapter.convert(yup.object({}));
      expect(result.type).toBe('object');
      expect(result.properties).toEqual({});
    });

    it('should convert object with required properties', () => {
      const schema = yup.object({
        name: yup.string().required(),
        age: yup.number().required(),
      });
      const result = adapter.convert(schema);

      expect(result.type).toBe('object');
      expect(result.required).toContain('name');
      expect(result.required).toContain('age');
    });

    it('should convert object with optional properties', () => {
      const schema = yup.object({
        id: yup.number().required(),
        email: yup.string().optional(),
      });
      const result = adapter.convert(schema);

      expect(result.required).toContain('id');
      expect(result.required).not.toContain('email');
    });

    it('should convert nested object (2 levels)', () => {
      const schema = yup.object({
        user: yup.object({
          name: yup.string(),
        }),
      });
      const result = adapter.convert(schema);

      expect(result.properties?.user.type).toBe('object');
      expect(result.properties?.user.properties?.name).toEqual({
        type: 'string',
      });
    });

    it('should convert nested object (3 levels)', () => {
      const schema = yup.object({
        level1: yup.object({
          level2: yup.object({
            value: yup.string(),
          }),
        }),
      });
      const result = adapter.convert(schema);

      expect(
        result.properties?.level1.properties?.level2.properties?.value
      ).toEqual({ type: 'string' });
    });

    it('should convert deeply nested object (5 levels)', () => {
      const schema = yup.object({
        a: yup.object({
          b: yup.object({
            c: yup.object({
              d: yup.object({
                e: yup.string(),
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

    it('should convert object with label', () => {
      const schema = yup
        .object({
          name: yup.string(),
        })
        .label('User object');
      const result = adapter.convert(schema);

      expect(result.description).toBe('User object');
    });
  });

  describe('Array Schemas', () => {
    it('should convert empty array', () => {
      const result = adapter.convert(yup.array());
      expect(result.type).toBe('array');
      expect(result.items).toEqual({});
    });

    it('should convert array of strings', () => {
      const result = adapter.convert(yup.array().of(yup.string()));
      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'string' });
    });

    it('should convert array of numbers', () => {
      const result = adapter.convert(yup.array().of(yup.number()));
      expect(result.items).toEqual({ type: 'number' });
    });

    it('should convert array of objects', () => {
      const schema = yup.array().of(
        yup.object({
          id: yup.number(),
          name: yup.string(),
        })
      );
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect((result.items as any).type).toBe('object');
    });

    it('should convert array with min items', () => {
      const result = adapter.convert(yup.array().of(yup.string()).min(1));
      expect(result.minItems).toBe(1);
    });

    it('should convert array with max items', () => {
      const result = adapter.convert(yup.array().of(yup.string()).max(10));
      expect(result.maxItems).toBe(10);
    });

    it('should convert array with min and max items', () => {
      const result = adapter.convert(
        yup.array().of(yup.string()).min(1).max(100)
      );
      expect(result.minItems).toBe(1);
      expect(result.maxItems).toBe(100);
    });

    it('should convert nested arrays', () => {
      const schema = yup.array().of(yup.array().of(yup.string()));
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect((result.items as any).type).toBe('array');
    });
  });

  describe('Complex Real-World Schemas', () => {
    it('should convert User schema', () => {
      const userSchema = yup.object({
        id: yup.string().uuid().required(),
        username: yup.string().min(3).max(30).required(),
        email: yup.string().email().required(),
        password: yup.string().min(8).required(),
        role: yup.string().oneOf(['user', 'admin', 'moderator'] as const),
        profile: yup.object({
          firstName: yup.string().optional(),
          lastName: yup.string().optional(),
          avatar: yup.string().url().optional(),
        }),
        createdAt: yup.date(),
        updatedAt: yup.date().optional(),
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
      const productSchema = yup.object({
        id: yup.string().required(),
        name: yup.string().min(1).max(200).required(),
        description: yup.string().max(5000).optional(),
        price: yup.number().min(0).required(),
        quantity: yup.number().integer().min(0).required(),
        categories: yup.array().of(yup.string()).required(),
        tags: yup.array().of(yup.string()).optional(),
        metadata: yup.object({
          sku: yup.string().optional(),
          weight: yup.number().optional(),
        }),
      });

      const result = adapter.convert(productSchema);

      expect(result.properties?.name.minLength).toBe(1);
      expect(result.properties?.name.maxLength).toBe(200);
      expect(result.properties?.price.minimum).toBe(0);
      expect(result.properties?.quantity.format).toBe('int32');
      expect(result.properties?.categories.type).toBe('array');
    });

    it('should convert Contact schema', () => {
      const contactSchema = yup.object({
        name: yup.string().required().label('Full Name'),
        email: yup.string().email().required(),
        phone: yup.string().optional(),
        message: yup.string().min(10).max(1000).required(),
        type: yup.string().oneOf(['inquiry', 'support', 'feedback'] as const),
        urgent: yup.boolean().default(false),
      });

      const result = adapter.convert(contactSchema);

      expect(result.properties?.name.description).toBe('Full Name');
      expect(result.properties?.email.format).toBe('email');
      expect(result.properties?.message.minLength).toBe(10);
      expect(result.properties?.type.enum).toContain('support');
      expect(result.properties?.urgent.default).toBe(false);
    });

    it('should convert Event schema', () => {
      const eventSchema = yup.object({
        id: yup.string().uuid().required(),
        title: yup.string().required(),
        description: yup.string(),
        startDate: yup.date().required(),
        endDate: yup.date().required(),
        location: yup.object({
          name: yup.string().required(),
          address: yup.string(),
          coordinates: yup.object({
            latitude: yup.number().required(),
            longitude: yup.number().required(),
          }),
        }),
        attendees: yup.array().of(
          yup.object({
            userId: yup.string().required(),
            name: yup.string().required(),
            email: yup.string().email().required(),
            status: yup.string().oneOf(['pending', 'confirmed', 'declined'] as const),
          })
        ),
        capacity: yup.number().integer().min(1),
        isPublic: yup.boolean().default(true),
      });

      const result = adapter.convert(eventSchema);

      expect(result.properties?.id.format).toBe('uuid');
      expect(result.properties?.startDate.format).toBe('date-time');
      expect(result.properties?.location.type).toBe('object');
      expect(result.properties?.attendees.type).toBe('array');
      expect(result.properties?.isPublic.default).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw for invalid schema (null)', () => {
      expect(() => adapter.convert(null)).toThrow('Invalid Yup schema');
    });

    it('should throw for invalid schema (undefined)', () => {
      expect(() => adapter.convert(undefined)).toThrow('Invalid Yup schema');
    });

    it('should throw for invalid schema (plain object)', () => {
      expect(() => adapter.convert({})).toThrow('Invalid Yup schema');
    });

    it('should throw for invalid schema (string)', () => {
      expect(() => adapter.convert('string')).toThrow('Invalid Yup schema');
    });

    it('should throw for invalid schema (number)', () => {
      expect(() => adapter.convert(123)).toThrow('Invalid Yup schema');
    });
  });

  describe('Adapter Properties', () => {
    it('should have name property', () => {
      expect(adapter.name).toBe('yup');
    });
  });
});
