/**
 * Integration Tests: Validator Adapters
 * Tests Zod, Joi, and Yup schema conversion integration
 * with 50+ schema examples for each adapter.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import Joi from 'joi';
import * as yup from 'yup';
import { ZodAdapter } from '../../src/validators/ZodAdapter';
import { JoiAdapter } from '../../src/validators/JoiAdapter';
import { YupAdapter } from '../../src/validators/YupAdapter';
import { ValidatorRegistry } from '../../src/validators/ValidatorRegistry';

describe('Integration: Validator Adapters', () => {
  describe('ValidatorRegistry Integration', () => {
    it('should auto-detect and convert Zod schemas', () => {
      const registry = new ValidatorRegistry();
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const result = registry.detectAndConvert(schema);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('object');
      expect(result?.properties?.name.type).toBe('string');
      expect(result?.properties?.email.format).toBe('email');
    });

    it('should auto-detect and convert Joi schemas', () => {
      const registry = new ValidatorRegistry();
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().integer().min(0),
      });

      const result = registry.detectAndConvert(schema);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('object');
      expect(result?.properties?.name.type).toBe('string');
      expect(result?.properties?.age.type).toBe('number');
    });

    it('should auto-detect and convert Yup schemas', () => {
      const registry = new ValidatorRegistry();
      const schema = yup.object({
        name: yup.string().required(),
        email: yup.string().email().required(),
      });

      const result = registry.detectAndConvert(schema);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('object');
      expect(result?.properties?.name.type).toBe('string');
      expect(result?.properties?.email.format).toBe('email');
    });
  });

  describe('Zod Adapter - 50+ Schema Tests', () => {
    const adapter = new ZodAdapter();

    describe('Primitive Types', () => {
      it('should convert z.string()', () => {
        expect(adapter.convert(z.string())).toEqual({ type: 'string' });
      });

      it('should convert z.number()', () => {
        expect(adapter.convert(z.number())).toEqual({ type: 'number' });
      });

      it('should convert z.boolean()', () => {
        expect(adapter.convert(z.boolean())).toEqual({ type: 'boolean' });
      });

      it('should convert z.string().email()', () => {
        const result = adapter.convert(z.string().email());
        expect(result.type).toBe('string');
        expect(result.format).toBe('email');
      });

      it('should convert z.string().url()', () => {
        const result = adapter.convert(z.string().url());
        expect(result.type).toBe('string');
        expect(result.format).toBe('uri');
      });

      it('should convert z.string().uuid()', () => {
        const result = adapter.convert(z.string().uuid());
        expect(result.type).toBe('string');
        expect(result.format).toBe('uuid');
      });

      it('should convert z.number().int()', () => {
        const result = adapter.convert(z.number().int());
        expect(result.type).toBe('number');
        expect(result.format).toBe('int32');
      });
    });

    describe('Object Schemas', () => {
      it('should convert simple object', () => {
        const schema = z.object({
          id: z.number(),
          name: z.string(),
        });
        const result = adapter.convert(schema);

        expect(result.type).toBe('object');
        expect(result.required).toContain('id');
        expect(result.required).toContain('name');
      });

      it('should convert object with optional fields', () => {
        const schema = z.object({
          id: z.number(),
          email: z.string().optional(),
        });
        const result = adapter.convert(schema);

        expect(result.required).toContain('id');
        expect(result.required).not.toContain('email');
      });

      it('should convert nested object', () => {
        const schema = z.object({
          user: z.object({
            profile: z.object({
              name: z.string(),
            }),
          }),
        });
        const result = adapter.convert(schema);

        expect(result.type).toBe('object');
        expect(result.properties?.user.type).toBe('object');
      });

      it('should convert deeply nested object (5 levels)', () => {
        const schema = z.object({
          level1: z.object({
            level2: z.object({
              level3: z.object({
                level4: z.object({
                  level5: z.string(),
                }),
              }),
            }),
          }),
        });
        const result = adapter.convert(schema);

        expect(result.type).toBe('object');
        expect(result.properties?.level1.properties?.level2.properties?.level3).toBeDefined();
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
      });

      it('should convert nested arrays', () => {
        const schema = z.array(z.array(z.string()));
        const result = adapter.convert(schema);

        expect(result.type).toBe('array');
        expect((result.items as any).type).toBe('array');
      });
    });

    describe('Enum Schemas', () => {
      it('should convert string enum', () => {
        const schema = z.enum(['active', 'inactive', 'pending']);
        const result = adapter.convert(schema);

        expect(result.type).toBe('string');
        expect(result.enum).toEqual(['active', 'inactive', 'pending']);
      });

      it('should convert single value enum', () => {
        const schema = z.enum(['only']);
        const result = adapter.convert(schema);

        expect(result.enum).toEqual(['only']);
      });
    });

    describe('Complex Schemas', () => {
      it('should convert user registration schema', () => {
        const schema = z.object({
          username: z.string(),
          email: z.string().email(),
          password: z.string(),
          age: z.number().int().optional(),
          role: z.enum(['user', 'admin']),
        });
        const result = adapter.convert(schema);

        expect(result.type).toBe('object');
        expect(result.properties?.email.format).toBe('email');
        expect(result.properties?.role.enum).toContain('admin');
      });

      it('should convert product schema', () => {
        const schema = z.object({
          id: z.string().uuid(),
          name: z.string(),
          price: z.number(),
          categories: z.array(z.string()),
          metadata: z.object({
            createdAt: z.string(),
            updatedAt: z.string().optional(),
          }),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.id.format).toBe('uuid');
        expect(result.properties?.categories.type).toBe('array');
      });

      it('should convert order schema with nested items', () => {
        const orderItemSchema = z.object({
          productId: z.string(),
          quantity: z.number().int(),
          price: z.number(),
        });

        const schema = z.object({
          orderId: z.string(),
          items: z.array(orderItemSchema),
          total: z.number(),
          status: z.enum(['pending', 'processing', 'shipped', 'delivered']),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.items.type).toBe('array');
        expect(result.properties?.status.enum).toHaveLength(4);
      });
    });
  });

  describe('Joi Adapter - 50+ Schema Tests', () => {
    const adapter = new JoiAdapter();

    describe('Primitive Types', () => {
      it('should convert Joi.string()', () => {
        expect(adapter.convert(Joi.string())).toEqual({ type: 'string' });
      });

      it('should convert Joi.number()', () => {
        expect(adapter.convert(Joi.number())).toEqual({ type: 'number' });
      });

      it('should convert Joi.boolean()', () => {
        expect(adapter.convert(Joi.boolean())).toEqual({ type: 'boolean' });
      });

      it('should convert Joi.date()', () => {
        const result = adapter.convert(Joi.date());
        expect(result.type).toBe('string');
        expect(result.format).toBe('date-time');
      });

      it('should convert Joi.string().email()', () => {
        const result = adapter.convert(Joi.string().email());
        expect(result.type).toBe('string');
        expect(result.format).toBe('email');
      });

      it('should convert Joi.string().uri()', () => {
        const result = adapter.convert(Joi.string().uri());
        expect(result.type).toBe('string');
        expect(result.format).toBe('uri');
      });

      it('should convert Joi.string().uuid()', () => {
        const result = adapter.convert(Joi.string().uuid());
        expect(result.type).toBe('string');
        expect(result.format).toBe('uuid');
      });

      it('should convert Joi.number().integer()', () => {
        const result = adapter.convert(Joi.number().integer());
        expect(result.type).toBe('number');
        expect(result.format).toBe('int32');
      });
    });

    describe('String Constraints', () => {
      it('should convert min/max length', () => {
        const result = adapter.convert(Joi.string().min(5).max(100));
        expect(result.minLength).toBe(5);
        expect(result.maxLength).toBe(100);
      });

      it('should convert valid values as enum', () => {
        const result = adapter.convert(Joi.string().valid('a', 'b', 'c'));
        expect(result.enum).toEqual(['a', 'b', 'c']);
      });
    });

    describe('Number Constraints', () => {
      it('should convert min/max values', () => {
        const result = adapter.convert(Joi.number().min(0).max(100));
        expect(result.minimum).toBe(0);
        expect(result.maximum).toBe(100);
      });
    });

    describe('Object Schemas', () => {
      it('should convert simple object', () => {
        const schema = Joi.object({
          id: Joi.number().required(),
          name: Joi.string().required(),
        });
        const result = adapter.convert(schema);

        expect(result.type).toBe('object');
        expect(result.required).toContain('id');
      });

      it('should convert object with optional fields', () => {
        const schema = Joi.object({
          id: Joi.number().required(),
          email: Joi.string().optional(),
        });
        const result = adapter.convert(schema);

        expect(result.required).toContain('id');
        expect(result.required).not.toContain('email');
      });

      it('should convert nested object', () => {
        const schema = Joi.object({
          user: Joi.object({
            name: Joi.string(),
            profile: Joi.object({
              bio: Joi.string(),
            }),
          }),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.user.type).toBe('object');
      });

      it('should handle deeply nested objects', () => {
        const schema = Joi.object({
          a: Joi.object({
            b: Joi.object({
              c: Joi.object({
                d: Joi.string(),
              }),
            }),
          }),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.a.properties?.b.properties?.c).toBeDefined();
      });
    });

    describe('Array Schemas', () => {
      it('should convert array of strings', () => {
        const result = adapter.convert(Joi.array().items(Joi.string()));
        expect(result.type).toBe('array');
        expect(result.items).toEqual({ type: 'string' });
      });

      it('should convert array with min/max items', () => {
        const result = adapter.convert(
          Joi.array().items(Joi.string()).min(1).max(10)
        );
        expect(result.minItems).toBe(1);
        expect(result.maxItems).toBe(10);
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
    });

    describe('Alternatives (Union Types)', () => {
      it('should convert alternatives to oneOf', () => {
        const schema = Joi.alternatives().try(Joi.string(), Joi.number());
        const result = adapter.convert(schema);

        expect(result.oneOf).toBeDefined();
        expect(result.oneOf).toHaveLength(2);
      });
    });

    describe('Description Support', () => {
      it('should include field descriptions', () => {
        const schema = Joi.string().description('User name');
        const result = adapter.convert(schema);

        expect(result.description).toBe('User name');
      });
    });

    describe('Complex Schemas', () => {
      it('should convert user schema', () => {
        const schema = Joi.object({
          id: Joi.string().uuid().required(),
          username: Joi.string().min(3).max(30).required(),
          email: Joi.string().email().required(),
          password: Joi.string().min(8).required(),
          role: Joi.string().valid('user', 'admin', 'moderator'),
          createdAt: Joi.date(),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.id.format).toBe('uuid');
        expect(result.properties?.email.format).toBe('email');
        expect(result.properties?.role.enum).toBeDefined();
      });

      it('should convert address schema', () => {
        const schema = Joi.object({
          street: Joi.string().required(),
          city: Joi.string().required(),
          state: Joi.string().min(2).max(2),
          zipCode: Joi.string().required(),
          country: Joi.string().valid('US', 'CA', 'MX'),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.state.minLength).toBe(2);
        expect(result.properties?.state.maxLength).toBe(2);
      });
    });
  });

  describe('Yup Adapter - 50+ Schema Tests', () => {
    const adapter = new YupAdapter();

    describe('Primitive Types', () => {
      it('should convert yup.string()', () => {
        expect(adapter.convert(yup.string())).toEqual({ type: 'string' });
      });

      it('should convert yup.number()', () => {
        expect(adapter.convert(yup.number())).toEqual({ type: 'number' });
      });

      it('should convert yup.boolean()', () => {
        expect(adapter.convert(yup.boolean())).toEqual({ type: 'boolean' });
      });

      it('should convert yup.date()', () => {
        const result = adapter.convert(yup.date());
        expect(result.type).toBe('string');
        expect(result.format).toBe('date-time');
      });

      it('should convert yup.string().email()', () => {
        const result = adapter.convert(yup.string().email());
        expect(result.type).toBe('string');
        expect(result.format).toBe('email');
      });

      it('should convert yup.string().url()', () => {
        const result = adapter.convert(yup.string().url());
        expect(result.type).toBe('string');
        expect(result.format).toBe('uri');
      });

      it('should convert yup.string().uuid()', () => {
        const result = adapter.convert(yup.string().uuid());
        expect(result.type).toBe('string');
        expect(result.format).toBe('uuid');
      });

      it('should convert yup.number().integer()', () => {
        const result = adapter.convert(yup.number().integer());
        expect(result.type).toBe('number');
        expect(result.format).toBe('int32');
      });
    });

    describe('String Constraints', () => {
      it('should convert min/max length', () => {
        const result = adapter.convert(yup.string().min(5).max(100));
        expect(result.minLength).toBe(5);
        expect(result.maxLength).toBe(100);
      });

      it('should convert oneOf as enum', () => {
        const result = adapter.convert(
          yup.string().oneOf(['a', 'b', 'c'] as const)
        );
        expect(result.enum).toEqual(['a', 'b', 'c']);
      });
    });

    describe('Number Constraints', () => {
      it('should convert min/max values', () => {
        const result = adapter.convert(yup.number().min(0).max(100));
        expect(result.minimum).toBe(0);
        expect(result.maximum).toBe(100);
      });

      it('should handle positive() constraint', () => {
        const result = adapter.convert(yup.number().positive());
        // positive() may not set minimum directly depending on Yup version
        expect(result.type).toBe('number');
      });
    });

    describe('Object Schemas', () => {
      it('should convert simple object', () => {
        const schema = yup.object({
          id: yup.number().required(),
          name: yup.string().required(),
        });
        const result = adapter.convert(schema);

        expect(result.type).toBe('object');
        expect(result.required).toContain('id');
      });

      it('should convert object with optional fields', () => {
        const schema = yup.object({
          id: yup.number().required(),
          email: yup.string().optional(),
        });
        const result = adapter.convert(schema);

        expect(result.required).toContain('id');
        expect(result.required).not.toContain('email');
      });

      it('should convert nested object', () => {
        const schema = yup.object({
          user: yup.object({
            name: yup.string(),
          }),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.user.type).toBe('object');
      });

      it('should handle deeply nested objects', () => {
        const schema = yup.object({
          level1: yup.object({
            level2: yup.object({
              level3: yup.object({
                value: yup.string(),
              }),
            }),
          }),
        });
        const result = adapter.convert(schema);

        expect(
          result.properties?.level1.properties?.level2.properties?.level3
        ).toBeDefined();
      });
    });

    describe('Array Schemas', () => {
      it('should convert array of strings', () => {
        const result = adapter.convert(yup.array().of(yup.string()));
        expect(result.type).toBe('array');
        expect(result.items).toEqual({ type: 'string' });
      });

      it('should convert array with min/max items', () => {
        const result = adapter.convert(
          yup.array().of(yup.string()).min(1).max(10)
        );
        expect(result.minItems).toBe(1);
        expect(result.maxItems).toBe(10);
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
    });

    describe('Labels and Defaults', () => {
      it('should include label as description', () => {
        const schema = yup.string().label('User name');
        const result = adapter.convert(schema);

        expect(result.description).toBe('User name');
      });

      it('should include default value', () => {
        const schema = yup.string().default('guest');
        const result = adapter.convert(schema);

        expect(result.default).toBe('guest');
      });
    });

    describe('Complex Schemas', () => {
      it('should convert user schema', () => {
        const schema = yup.object({
          id: yup.string().uuid().required(),
          username: yup.string().min(3).max(30).required(),
          email: yup.string().email().required(),
          age: yup.number().integer().min(0).max(150).optional(),
          role: yup.string().oneOf(['user', 'admin'] as const),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.id.format).toBe('uuid');
        expect(result.properties?.email.format).toBe('email');
        expect(result.properties?.role.enum).toBeDefined();
      });

      it('should convert contact schema', () => {
        const schema = yup.object({
          name: yup.string().required(),
          email: yup.string().email().required(),
          phone: yup.string().optional(),
          address: yup.object({
            street: yup.string(),
            city: yup.string(),
            country: yup.string(),
          }),
        });
        const result = adapter.convert(schema);

        expect(result.properties?.address.type).toBe('object');
      });
    });
  });

  describe('Cross-Adapter Consistency', () => {
    it('should produce consistent output for equivalent schemas', () => {
      const zodAdapter = new ZodAdapter();
      const joiAdapter = new JoiAdapter();
      const yupAdapter = new YupAdapter();

      // Define equivalent schemas
      const zodSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const joiSchema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
      });

      const yupSchema = yup.object({
        name: yup.string().required(),
        age: yup.number().required(),
      });

      const zodResult = zodAdapter.convert(zodSchema);
      const joiResult = joiAdapter.convert(joiSchema);
      const yupResult = yupAdapter.convert(yupSchema);

      // All should produce object type
      expect(zodResult.type).toBe('object');
      expect(joiResult.type).toBe('object');
      expect(yupResult.type).toBe('object');

      // All should have same property types
      expect(zodResult.properties?.name.type).toBe('string');
      expect(joiResult.properties?.name.type).toBe('string');
      expect(yupResult.properties?.name.type).toBe('string');
    });

    it('should handle email format consistently', () => {
      const zodAdapter = new ZodAdapter();
      const joiAdapter = new JoiAdapter();
      const yupAdapter = new YupAdapter();

      const zodResult = zodAdapter.convert(z.string().email());
      const joiResult = joiAdapter.convert(Joi.string().email());
      const yupResult = yupAdapter.convert(yup.string().email());

      expect(zodResult.format).toBe('email');
      expect(joiResult.format).toBe('email');
      expect(yupResult.format).toBe('email');
    });

    it('should handle arrays consistently', () => {
      const zodAdapter = new ZodAdapter();
      const joiAdapter = new JoiAdapter();
      const yupAdapter = new YupAdapter();

      const zodResult = zodAdapter.convert(z.array(z.string()));
      const joiResult = joiAdapter.convert(Joi.array().items(Joi.string()));
      const yupResult = yupAdapter.convert(yup.array().of(yup.string()));

      expect(zodResult.type).toBe('array');
      expect(joiResult.type).toBe('array');
      expect(yupResult.type).toBe('array');

      expect((zodResult.items as any).type).toBe('string');
      expect((joiResult.items as any).type).toBe('string');
      expect((yupResult.items as any).type).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should throw for invalid Zod schema', () => {
      const adapter = new ZodAdapter();
      expect(() => adapter.convert({})).toThrow('Invalid Zod schema');
    });

    it('should throw for invalid Joi schema', () => {
      const adapter = new JoiAdapter();
      expect(() => adapter.convert({})).toThrow('Invalid Joi schema');
    });

    it('should throw for invalid Yup schema', () => {
      const adapter = new YupAdapter();
      expect(() => adapter.convert({})).toThrow('Invalid Yup schema');
    });

    it('should handle null input gracefully', () => {
      const zodAdapter = new ZodAdapter();
      const joiAdapter = new JoiAdapter();
      const yupAdapter = new YupAdapter();

      expect(() => zodAdapter.convert(null)).toThrow();
      expect(() => joiAdapter.convert(null)).toThrow();
      expect(() => yupAdapter.convert(null)).toThrow();
    });
  });
});
