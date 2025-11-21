import { describe, it, expect } from 'vitest';
import { ZodAdapter } from './ZodAdapter';
import { z } from 'zod';

describe('ZodAdapter', () => {
  const adapter = new ZodAdapter();

  describe('detect', () => {
    it('should detect valid Zod schemas', () => {
      const schema = z.string();
      expect(adapter.detect(schema)).toBe(true);
    });

    it('should reject non-Zod schemas', () => {
      expect(adapter.detect(null)).toBe(false);
      expect(adapter.detect(undefined)).toBe(false);
      expect(adapter.detect({})).toBe(false);
      expect(adapter.detect('string')).toBe(false);
      expect(adapter.detect(123)).toBe(false);
    });
  });

  describe('convert - primitive types', () => {
    it('should convert ZodString to OpenAPI string schema', () => {
      const schema = z.string();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'string' });
    });

    it('should convert ZodString with email format', () => {
      const schema = z.string().email();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'string', format: 'email' });
    });

    it('should convert ZodString with uuid format', () => {
      const schema = z.string().uuid();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'string', format: 'uuid' });
    });

    it('should convert ZodString with url format', () => {
      const schema = z.string().url();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'string', format: 'uri' });
    });

    it('should convert ZodNumber to OpenAPI number schema', () => {
      const schema = z.number();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'number' });
    });

    it('should convert ZodNumber with int format', () => {
      const schema = z.number().int();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'number', format: 'int32' });
    });

    it('should convert ZodBoolean to OpenAPI boolean schema', () => {
      const schema = z.boolean();
      const result = adapter.convert(schema);

      expect(result).toEqual({ type: 'boolean' });
    });
  });

  describe('convert - complex types', () => {
    it('should convert ZodObject with required properties', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = adapter.convert(schema);

      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      });
    });

    it('should convert ZodObject with optional properties', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().optional(),
      });
      const result = adapter.convert(schema);

      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      });
    });

    it('should convert ZodArray to OpenAPI array schema', () => {
      const schema = z.array(z.string());
      const result = adapter.convert(schema);

      expect(result).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('should convert nested ZodArray', () => {
      const schema = z.array(z.object({ id: z.number() }));
      const result = adapter.convert(schema);

      expect(result).toEqual({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
          required: ['id'],
        },
      });
    });

    it('should convert ZodEnum to OpenAPI enum schema', () => {
      const schema = z.enum(['red', 'green', 'blue']);
      const result = adapter.convert(schema);

      expect(result).toEqual({
        type: 'string',
        enum: ['red', 'green', 'blue'],
      });
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid schema', () => {
      expect(() => adapter.convert({})).toThrow('Invalid Zod schema provided');
    });
  });
});
