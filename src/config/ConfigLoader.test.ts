import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader, DEFAULT_CONFIG, SwaggerAutoConfig } from './ConfigLoader';

// Mock fs for testing
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;

  beforeEach(() => {
    configLoader = new ConfigLoader();
    vi.clearAllMocks();
  });

  afterEach(() => {
    configLoader.clearCache();
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_CONFIG.input).toBe('./src/app.ts');
      expect(DEFAULT_CONFIG.output).toBe('./openapi.json');
      expect(DEFAULT_CONFIG.format).toBe('json');
      expect(DEFAULT_CONFIG.strategies).toEqual(['jsdoc', 'decorator']);
      expect(DEFAULT_CONFIG.ci?.enabled).toBe(false);
    });
  });

  describe('mergeWithCliOptions', () => {
    it('should override config with CLI options', () => {
      const config: SwaggerAutoConfig = {
        input: './src/app.ts',
        output: './openapi.json',
        format: 'json',
        info: {
          title: 'Config Title',
          version: '1.0.0',
        },
      };

      const cliOptions = {
        input: './custom/entry.ts',
        output: './custom/api.yaml',
        format: 'yaml',
        title: 'CLI Title',
      };

      const merged = configLoader.mergeWithCliOptions(config, cliOptions);

      expect(merged.input).toBe('./custom/entry.ts');
      expect(merged.output).toBe('./custom/api.yaml');
      expect(merged.format).toBe('yaml');
      expect(merged.info?.title).toBe('CLI Title');
    });

    it('should preserve config values when CLI options not provided', () => {
      const config: SwaggerAutoConfig = {
        input: './src/app.ts',
        strategies: ['jsdoc', 'runtime'],
        info: {
          title: 'My API',
          version: '2.0.0',
          description: 'Test description',
        },
      };

      const cliOptions = {
        output: './output.json',
      };

      const merged = configLoader.mergeWithCliOptions(config, cliOptions);

      expect(merged.input).toBe('./src/app.ts');
      expect(merged.output).toBe('./output.json');
      expect(merged.strategies).toEqual(['jsdoc', 'runtime']);
      expect(merged.info?.title).toBe('My API');
      expect(merged.info?.description).toBe('Test description');
    });

    it('should handle CI mode options', () => {
      const config: SwaggerAutoConfig = {
        ci: { enabled: false, outputFormat: 'text' },
      };

      const cliOptions = {
        ci: true,
      };

      const merged = configLoader.mergeWithCliOptions(config, cliOptions);

      expect(merged.ci?.enabled).toBe(true);
    });

    it('should handle route filtering options', () => {
      const config: SwaggerAutoConfig = {};

      const cliOptions = {
        includePaths: ['/api/*', '/v1/*'],
        excludePaths: ['/internal/*'],
        tags: ['public', 'users'],
      };

      const merged = configLoader.mergeWithCliOptions(config, cliOptions);

      expect(merged.routes?.include).toEqual(['/api/*', '/v1/*']);
      expect(merged.routes?.exclude).toEqual(['/internal/*']);
      expect(merged.routes?.tags).toEqual(['public', 'users']);
    });
  });

  describe('validate', () => {
    it('should validate valid config', () => {
      const config: SwaggerAutoConfig = {
        format: 'yaml',
        strategies: ['jsdoc', 'decorator'],
        ci: { outputFormat: 'json' },
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const config: SwaggerAutoConfig = {
        format: 'xml' as any,
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid format: xml. Must be 'json' or 'yaml'");
    });

    it('should reject invalid strategy', () => {
      const config: SwaggerAutoConfig = {
        strategies: ['jsdoc', 'invalid-strategy' as any],
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid strategy: invalid-strategy');
    });

    it('should reject invalid CI output format', () => {
      const config: SwaggerAutoConfig = {
        ci: { outputFormat: 'html' as any },
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid CI output format: html');
    });

    it('should collect multiple errors', () => {
      const config: SwaggerAutoConfig = {
        format: 'xml' as any,
        strategies: ['invalid' as any],
        ci: { outputFormat: 'html' as any },
      };

      const result = configLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });

  describe('load', () => {
    it('should return default config when no config file found', async () => {
      const result = await configLoader.load();

      expect(result.isEmpty).toBe(true);
      expect(result.config.input).toBe(DEFAULT_CONFIG.input);
      expect(result.config.output).toBe(DEFAULT_CONFIG.output);
    });
  });
});
