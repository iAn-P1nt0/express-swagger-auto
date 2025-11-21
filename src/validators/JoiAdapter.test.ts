import { describe, it, expect } from 'vitest';
import { JoiAdapter } from './JoiAdapter';
import Joi from 'joi';

describe('JoiAdapter', () => {
  const adapter = new JoiAdapter();

  describe('detect', () => {
    it('should detect valid Joi schemas', () => {
      const schema = Joi.string();
      expect(adapter.detect(schema)).toBe(true);
    });

    it('should reject non-Joi schemas', () => {
      expect(adapter.detect(null)).toBe(false);
      expect(adapter.detect(undefined)).toBe(false);
      expect(adapter.detect({})).toBe(false);
      expect(adapter.detect('string')).toBe(false);
    });
  });

  describe('convert - primitive types', () => {
    it('should convert Joi string to OpenAPI string schema', () => {
      const schema = Joi.string();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'string' });
    });

    it('should convert Joi string with email', () => {
      const schema = Joi.string().email();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    it('should convert Joi string with uri', () => {
      const schema = Joi.string().uri();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should convert Joi string with uuid', () => {
      const schema = Joi.string().uuid();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uuid');
    });

    it('should convert Joi string with length constraints', () => {
      const schema = Joi.string().min(5).max(100);
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(100);
    });

    it('should convert Joi number to OpenAPI number schema', () => {
      const schema = Joi.number();
      const result = adapter.convert(schema);

      expect(result.type).toBe('number');
    });

    it('should convert Joi number with integer', () => {
      const schema = Joi.number().integer();
      const result = adapter.convert(schema);

      expect(result.type).toBe('number');
      expect(result.format).toBe('int32');
    });

    it('should convert Joi number with min/max', () => {
      const schema = Joi.number().min(0).max(100);
      const result = adapter.convert(schema);

      expect(result.type).toBe('number');
      expect(result.minimum).toBe(0);
      expect(result.maximum).toBe(100);
    });

    it('should convert Joi boolean to OpenAPI boolean schema', () => {
      const schema = Joi.boolean();
      const result = adapter.convert(schema);

      expect(result.type).toBe('boolean');
    });

    it('should convert Joi date to OpenAPI date-time schema', () => {
      const schema = Joi.date();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.format).toBe('date-time');
    });
  });

  describe('convert - complex types', () => {
    it('should convert Joi object with required fields', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
      });
      const result = adapter.convert(schema);

      expect(result.type).toBe('object');
      expect(result.properties).toBeDefined();
      expect(result.properties!.name).toEqual({ type: 'string' });
      expect(result.properties!.age).toEqual({ type: 'number' });
      expect(result.required).toEqual(['name', 'age']);
    });

    it('should convert Joi object with optional fields', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().optional(),
      });
      const result = adapter.convert(schema);

      expect(result.type).toBe('object');
      expect(result.required).toEqual(['name']);
    });

    it('should convert Joi array to OpenAPI array schema', () => {
      const schema = Joi.array().items(Joi.string());
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'string' });
    });

    it('should convert nested Joi array', () => {
      const schema = Joi.array().items(
        Joi.object({
          id: Joi.number().required(),
          name: Joi.string().required(),
        })
      );
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect(result.items).toBeDefined();
      expect((result.items as any).type).toBe('object');
      expect((result.items as any).properties.id).toEqual({ type: 'number' });
    });

    it('should convert Joi array with min/max items', () => {
      const schema = Joi.array().items(Joi.string()).min(1).max(10);
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect(result.minItems).toBe(1);
      expect(result.maxItems).toBe(10);
    });

    it('should convert Joi string enum', () => {
      const schema = Joi.string().valid('red', 'green', 'blue');
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.enum).toEqual(['red', 'green', 'blue']);
    });

    it('should convert Joi alternatives to oneOf', () => {
      const schema = Joi.alternatives().try(Joi.string(), Joi.number());
      const result = adapter.convert(schema);

      expect(result.oneOf).toBeDefined();
      expect(result.oneOf).toHaveLength(2);
    });
  });

  describe('convert - with descriptions', () => {
    it('should include description from Joi schema', () => {
      const schema = Joi.string().description('User name');
      const result = adapter.convert(schema);

      expect(result.description).toBe('User name');
    });

    it('should include description in object fields', () => {
      const schema = Joi.object({
        name: Joi.string().description('Full name'),
      });
      const result = adapter.convert(schema);

      expect(result.properties!.name.description).toBe('Full name');
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid schema', () => {
      expect(() => adapter.convert({})).toThrow('Invalid Joi schema provided');
    });
  });
});
