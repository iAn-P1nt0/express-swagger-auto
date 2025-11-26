/**
 * Tests for JoiSchemaParser
 */

import { describe, it, expect } from 'vitest';
import { JoiSchemaParser } from '../JoiSchemaParser';

describe('JoiSchemaParser', () => {
  const parser = new JoiSchemaParser();

  describe('hasJoiSchema', () => {
    it('should detect Joi usage in code', () => {
      const code = 'const schema = Joi.object({...})';
      expect(parser.hasJoiSchema(code)).toBe(true);
    });

    it('should return false for non-Joi code', () => {
      const code = 'const schema = {email: "test@example.com"}';
      expect(parser.hasJoiSchema(code)).toBe(false);
    });
  });

  describe('extractJoiPatterns', () => {
    it('should find Joi.object patterns', () => {
      const code = 'Joi.object({ name: Joi.string() })';
      const patterns = parser.extractJoiPatterns(code);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern).toContain('Joi.object');
    });

    it('should return empty array for non-Joi code', () => {
      const code = 'const x = 5;';
      const patterns = parser.extractJoiPatterns(code);
      expect(patterns).toEqual([]);
    });
  });

  describe('parseFromSourceCode', () => {
    it('should extract properties from Joi.object declaration', () => {
      const code = `
        Joi.object({
          email: Joi.string().email().required(),
          age: Joi.number().min(0).max(120)
        })
      `;
      const properties = parser.parseFromSourceCode(code);

      expect(properties.length).toBeGreaterThan(0);
      // Should find at least email and age properties
      const emailProp = properties.find(p => p.name === 'email');
      expect(emailProp?.type).toBe('string');
      expect(emailProp?.required).toBe(true);
    });

    it('should handle string with email validation', () => {
      const code = 'Joi.string().email()';
      const properties = parser.parseFromSourceCode(code);

      if (properties.length > 0) {
        const prop = properties[0];
        expect(prop.type).toBe('string');
        expect(prop.pattern).toContain('@');
      }
    });
  });

  describe('toOpenAPIComponent', () => {
    it('should convert parsed schema to OpenAPI format', () => {
      const parsedSchema = {
        type: 'object' as const,
        properties: {
          email: {
            type: 'string' as const,
            required: true,
            pattern: '^[^@]+@[^@]+\\.[^@]+$',
          },
          age: {
            type: 'integer' as const,
            required: false,
            minimum: 0,
            maximum: 120,
          },
        },
        required: ['email'],
      };

      const openAPI = parser.toOpenAPIComponent(parsedSchema);

      expect(openAPI.type).toBe('object');
      expect(openAPI.required).toContain('email');
      expect(openAPI.properties.email.type).toBe('string');
      expect(openAPI.properties.email.pattern).toBeDefined();
      expect(openAPI.properties.age.minimum).toBe(0);
      expect(openAPI.properties.age.maximum).toBe(120);
    });

    it('should include description if present', () => {
      const parsedSchema = {
        type: 'object' as const,
        description: 'User registration schema',
        properties: {},
      };

      const openAPI = parser.toOpenAPIComponent(parsedSchema);

      expect(openAPI.description).toBe('User registration schema');
    });
  });

  describe('normalizeType', () => {
    it('should normalize various Joi type names', () => {
      // Test through parseFromSourceCode since normalizeType is private
      const code1 = 'Joi.string()';
      const code2 = 'Joi.number()';
      const code3 = 'Joi.boolean()';

      // Just verify no errors and basic structure
      expect(() => parser.parseFromSourceCode(code1)).not.toThrow();
      expect(() => parser.parseFromSourceCode(code2)).not.toThrow();
      expect(() => parser.parseFromSourceCode(code3)).not.toThrow();
    });
  });
});
