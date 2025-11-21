import { describe, it, expect, beforeEach } from 'vitest';
import { ValidatorRegistry } from './ValidatorRegistry';
import { ZodAdapter } from './ZodAdapter';
import { JoiAdapter } from './JoiAdapter';
import { YupAdapter } from './YupAdapter';
import { z } from 'zod';
import Joi from 'joi';
import * as yup from 'yup';

describe('ValidatorRegistry', () => {
  let registry: ValidatorRegistry;

  beforeEach(() => {
    registry = new ValidatorRegistry();
    registry.reset();
  });

  describe('registration', () => {
    it('should have built-in adapters registered by default', () => {
      expect(registry.hasAdapter('zod')).toBe(true);
      expect(registry.hasAdapter('joi')).toBe(true);
      expect(registry.hasAdapter('yup')).toBe(true);
    });

    it('should register custom adapter', () => {
      const customAdapter = {
        name: 'custom',
        detect: () => false,
        convert: () => ({ type: 'object' }),
      };

      registry.register(customAdapter);
      expect(registry.hasAdapter('custom')).toBe(true);
    });

    it('should unregister adapter', () => {
      const result = registry.unregister('zod');
      expect(result).toBe(true);
      expect(registry.hasAdapter('zod')).toBe(false);
    });

    it('should return false when unregistering non-existent adapter', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });

    it('should get adapter by name', () => {
      const adapter = registry.getAdapter('zod');
      expect(adapter).toBeInstanceOf(ZodAdapter);
    });

    it('should return undefined for non-existent adapter', () => {
      const adapter = registry.getAdapter('nonexistent');
      expect(adapter).toBeUndefined();
    });

    it('should get all adapters', () => {
      const adapters = registry.getAllAdapters();
      expect(adapters).toHaveLength(3);
    });

    it('should warn when overwriting existing adapter', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const zodAdapter = new ZodAdapter();
      registry.register(zodAdapter);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Validator adapter "zod" is already registered. Overwriting.'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('detectAndConvert', () => {
    it('should detect and convert Zod schema', () => {
      const schema = z.string();
      const result = registry.detectAndConvert(schema);

      expect(result).toBeDefined();
      expect(result!.type).toBe('string');
    });

    it('should detect and convert Joi schema', () => {
      const schema = Joi.string();
      const result = registry.detectAndConvert(schema);

      expect(result).toBeDefined();
      expect(result!.type).toBe('string');
    });

    it('should detect and convert Yup schema', () => {
      const schema = yup.string();
      const result = registry.detectAndConvert(schema);

      expect(result).toBeDefined();
      expect(result!.type).toBe('string');
    });

    it('should return null for unknown schema', () => {
      const schema = { unknown: 'schema' };
      const result = registry.detectAndConvert(schema);

      expect(result).toBeNull();
    });

    it('should use correct adapter based on detection', () => {
      const zodSchema = z.object({
        name: z.string(),
      });

      const joiSchema = Joi.object({
        age: Joi.number(),
      });

      const zodResult = registry.detectAndConvert(zodSchema);
      const joiResult = registry.detectAndConvert(joiSchema);

      expect(zodResult).toBeDefined();
      expect(zodResult!.properties!.name).toBeDefined();

      expect(joiResult).toBeDefined();
      expect(joiResult!.properties!.age).toBeDefined();
    });
  });

  describe('clear and reset', () => {
    it('should clear all adapters', () => {
      registry.clear();
      expect(registry.getAllAdapters()).toHaveLength(0);
    });

    it('should reset to built-in adapters', () => {
      registry.clear();
      expect(registry.getAllAdapters()).toHaveLength(0);

      registry.reset();
      expect(registry.getAllAdapters()).toHaveLength(3);
      expect(registry.hasAdapter('zod')).toBe(true);
      expect(registry.hasAdapter('joi')).toBe(true);
      expect(registry.hasAdapter('yup')).toBe(true);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = ValidatorRegistry.getInstance();
      const instance2 = ValidatorRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
