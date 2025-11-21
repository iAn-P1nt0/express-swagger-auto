import { describe, it, expect } from 'vitest';
import { YupAdapter } from './YupAdapter';
import * as yup from 'yup';

describe('YupAdapter', () => {
  const adapter = new YupAdapter();

  describe('detect', () => {
    it('should detect valid Yup schemas', () => {
      const schema = yup.string();
      expect(adapter.detect(schema)).toBe(true);
    });

    it('should reject non-Yup schemas', () => {
      expect(adapter.detect(null)).toBe(false);
      expect(adapter.detect(undefined)).toBe(false);
      expect(adapter.detect({})).toBe(false);
      expect(adapter.detect('string')).toBe(false);
    });
  });

  describe('convert - primitive types', () => {
    it('should convert Yup string to OpenAPI string schema', () => {
      const schema = yup.string();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
    });

    it('should convert Yup string with email', () => {
      const schema = yup.string().email();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    it('should convert Yup string with url', () => {
      const schema = yup.string().url();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should convert Yup string with uuid', () => {
      const schema = yup.string().uuid();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uuid');
    });

    it('should convert Yup string with length constraints', () => {
      const schema = yup.string().min(5).max(100);
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(100);
    });

    it('should convert Yup number to OpenAPI number schema', () => {
      const schema = yup.number();
      const result = adapter.convert(schema);

      expect(result.type).toBe('number');
    });

    it('should convert Yup number with integer', () => {
      const schema = yup.number().integer();
      const result = adapter.convert(schema);

      expect(result.type).toBe('number');
      expect(result.format).toBe('int32');
    });

    it('should convert Yup number with min/max', () => {
      const schema = yup.number().min(0).max(100);
      const result = adapter.convert(schema);

      expect(result.type).toBe('number');
      expect(result.minimum).toBe(0);
      expect(result.maximum).toBe(100);
    });

    it('should convert Yup boolean to OpenAPI boolean schema', () => {
      const schema = yup.boolean();
      const result = adapter.convert(schema);

      expect(result.type).toBe('boolean');
    });

    it('should convert Yup date to OpenAPI date-time schema', () => {
      const schema = yup.date();
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.format).toBe('date-time');
    });
  });

  describe('convert - complex types', () => {
    it('should convert Yup object with required fields', () => {
      const schema = yup.object({
        name: yup.string().required(),
        age: yup.number().required(),
      });
      const result = adapter.convert(schema);

      expect(result.type).toBe('object');
      expect(result.properties).toBeDefined();
      expect(result.properties!.name.type).toBe('string');
      expect(result.properties!.age.type).toBe('number');
      expect(result.required).toEqual(['name', 'age']);
    });

    it('should convert Yup object with optional fields', () => {
      const schema = yup.object({
        name: yup.string().required(),
        email: yup.string().optional(),
      });
      const result = adapter.convert(schema);

      expect(result.type).toBe('object');
      expect(result.required).toEqual(['name']);
    });

    it('should convert Yup array to OpenAPI array schema', () => {
      const schema = yup.array().of(yup.string());
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'string' });
    });

    it('should convert nested Yup array', () => {
      const schema = yup.array().of(
        yup.object({
          id: yup.number().required(),
          name: yup.string().required(),
        })
      );
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect(result.items).toBeDefined();
      expect((result.items as any).type).toBe('object');
    });

    it('should convert Yup array with min/max items', () => {
      const schema = yup.array().of(yup.string()).min(1).max(10);
      const result = adapter.convert(schema);

      expect(result.type).toBe('array');
      expect(result.minItems).toBe(1);
      expect(result.maxItems).toBe(10);
    });

    it('should convert Yup string enum', () => {
      const schema = yup.string().oneOf(['red', 'green', 'blue'] as const);
      const result = adapter.convert(schema);

      expect(result.type).toBe('string');
      expect(result.enum).toEqual(['red', 'green', 'blue']);
    });
  });

  describe('convert - with labels', () => {
    it('should include label as description from Yup schema', () => {
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

  describe('error handling', () => {
    it('should throw error for invalid schema', () => {
      expect(() => adapter.convert({})).toThrow('Invalid Yup schema provided');
    });
  });
});
