/**
 * Configuration Loader for express-swagger-auto
 * Supports multiple config formats via cosmiconfig:
 * - .swagger-autorc (JSON/YAML)
 * - .swagger-autorc.json
 * - .swagger-autorc.yaml / .swagger-autorc.yml
 * - swagger-auto.config.js / swagger-auto.config.cjs / swagger-auto.config.mjs
 * - package.json "swaggerAuto" key
 */

import { cosmiconfig, CosmiconfigResult } from 'cosmiconfig';

export interface SwaggerAutoConfig {
  /** Entry point file for Express app */
  input?: string;
  /** Output path for OpenAPI spec */
  output?: string;
  /** Output format: 'json' or 'yaml' */
  format?: 'json' | 'yaml';
  /** Generation strategies to use */
  strategies?: Array<'jsdoc' | 'decorator' | 'runtime'>;
  /** API info configuration */
  info?: {
    title?: string;
    version?: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name?: string;
      url?: string;
    };
  };
  /** Server configuration */
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  /** Security configuration */
  security?: {
    /** Auto-detect security schemes from middleware */
    detect?: boolean;
    /** Security schemes to include */
    schemes?: Array<'bearer' | 'apiKey' | 'basic' | 'oauth2'>;
  };
  /** Validation settings */
  validation?: {
    /** Enable strict validation */
    strict?: boolean;
    /** Fail on warnings in CI mode */
    failOnWarnings?: boolean;
  };
  /** Watch mode settings */
  watch?: {
    /** Paths to watch */
    paths?: string[];
    /** Paths to ignore */
    ignored?: string[];
    /** Debounce time in ms */
    debounce?: number;
  };
  /** Route filtering */
  routes?: {
    /** Include paths matching these patterns */
    include?: string[];
    /** Exclude paths matching these patterns */
    exclude?: string[];
    /** Include only routes with these tags */
    tags?: string[];
  };
  /** CI mode settings */
  ci?: {
    /** Enable CI mode (no colors, JSON output) */
    enabled?: boolean;
    /** Output format for CI: 'text', 'json', 'sarif' */
    outputFormat?: 'text' | 'json' | 'sarif';
  };
}

export interface LoadConfigResult {
  config: SwaggerAutoConfig;
  filepath: string | null;
  isEmpty: boolean;
}

const MODULE_NAME = 'swagger-auto';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SwaggerAutoConfig = {
  input: './src/app.ts',
  output: './openapi.json',
  format: 'json',
  strategies: ['jsdoc', 'decorator'],
  info: {
    title: 'API',
    version: '1.0.0',
    description: '',
  },
  security: {
    detect: true,
  },
  validation: {
    strict: false,
    failOnWarnings: false,
  },
  watch: {
    paths: ['src/**', 'lib/**'],
    ignored: ['node_modules', '.git', 'dist', 'build', '**/*.test.ts', '**/*.spec.ts'],
    debounce: 500,
  },
  ci: {
    enabled: false,
    outputFormat: 'text',
  },
};

/**
 * ConfigLoader class for loading and merging configuration
 */
export class ConfigLoader {
  private explorer: ReturnType<typeof cosmiconfig>;

  constructor() {
    this.explorer = cosmiconfig(MODULE_NAME, {
      searchPlaces: [
        'package.json',
        `.${MODULE_NAME}rc`,
        `.${MODULE_NAME}rc.json`,
        `.${MODULE_NAME}rc.yaml`,
        `.${MODULE_NAME}rc.yml`,
        `.${MODULE_NAME}rc.js`,
        `.${MODULE_NAME}rc.cjs`,
        `.${MODULE_NAME}rc.mjs`,
        `${MODULE_NAME}.config.js`,
        `${MODULE_NAME}.config.cjs`,
        `${MODULE_NAME}.config.mjs`,
        `${MODULE_NAME}.config.ts`,
      ],
    });
  }

  /**
   * Load configuration from file or search for config file
   * @param configPath Optional explicit config file path
   * @param searchFrom Directory to search from (default: cwd)
   */
  async load(configPath?: string, searchFrom?: string): Promise<LoadConfigResult> {
    let result: CosmiconfigResult;

    try {
      if (configPath) {
        // Load from explicit path
        result = await this.explorer.load(configPath);
      } else {
        // Search for config file
        result = await this.explorer.search(searchFrom);
      }
    } catch (error) {
      // Return default config on error
      return {
        config: { ...DEFAULT_CONFIG },
        filepath: null,
        isEmpty: true,
      };
    }

    if (!result || result.isEmpty) {
      return {
        config: { ...DEFAULT_CONFIG },
        filepath: result?.filepath || null,
        isEmpty: true,
      };
    }

    // Merge with defaults
    const mergedConfig = this.mergeConfig(DEFAULT_CONFIG, result.config);

    return {
      config: mergedConfig,
      filepath: result.filepath,
      isEmpty: false,
    };
  }

  /**
   * Deep merge two config objects
   */
  private mergeConfig(base: SwaggerAutoConfig, override: Partial<SwaggerAutoConfig>): SwaggerAutoConfig {
    const merged = { ...base };

    for (const key of Object.keys(override) as Array<keyof SwaggerAutoConfig>) {
      const value = override[key];
      
      if (value === undefined) continue;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Deep merge objects
        merged[key] = {
          ...(base[key] as object || {}),
          ...(value as object),
        } as any;
      } else {
        // Override primitives and arrays
        merged[key] = value as any;
      }
    }

    return merged;
  }

  /**
   * Merge CLI options with config file settings
   * CLI options take precedence over config file
   */
  mergeWithCliOptions(config: SwaggerAutoConfig, cliOptions: Record<string, any>): SwaggerAutoConfig {
    const merged = { ...config };

    // Map CLI options to config properties
    if (cliOptions.input) merged.input = cliOptions.input;
    if (cliOptions.output) merged.output = cliOptions.output;
    if (cliOptions.format) merged.format = cliOptions.format;
    if (cliOptions.title) {
      merged.info = { ...merged.info, title: cliOptions.title };
    }
    if (cliOptions.version) {
      merged.info = { ...merged.info, version: cliOptions.version };
    }
    if (cliOptions.description) {
      merged.info = { ...merged.info, description: cliOptions.description };
    }
    if (cliOptions.strategies) {
      merged.strategies = cliOptions.strategies;
    }
    if (cliOptions.ci !== undefined) {
      merged.ci = { ...merged.ci, enabled: cliOptions.ci };
    }
    if (cliOptions.strict !== undefined) {
      merged.validation = { ...merged.validation, strict: cliOptions.strict };
    }
    if (cliOptions.includePaths) {
      merged.routes = { ...merged.routes, include: cliOptions.includePaths };
    }
    if (cliOptions.excludePaths) {
      merged.routes = { ...merged.routes, exclude: cliOptions.excludePaths };
    }
    if (cliOptions.tags) {
      merged.routes = { ...merged.routes, tags: cliOptions.tags };
    }

    return merged;
  }

  /**
   * Validate configuration
   */
  validate(config: SwaggerAutoConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate format
    if (config.format && !['json', 'yaml'].includes(config.format)) {
      errors.push(`Invalid format: ${config.format}. Must be 'json' or 'yaml'`);
    }

    // Validate strategies
    if (config.strategies) {
      const validStrategies = ['jsdoc', 'decorator', 'runtime'];
      for (const strategy of config.strategies) {
        if (!validStrategies.includes(strategy)) {
          errors.push(`Invalid strategy: ${strategy}. Must be one of: ${validStrategies.join(', ')}`);
        }
      }
    }

    // Validate CI output format
    if (config.ci?.outputFormat && !['text', 'json', 'sarif'].includes(config.ci.outputFormat)) {
      errors.push(`Invalid CI output format: ${config.ci.outputFormat}. Must be 'text', 'json', or 'sarif'`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear the config cache
   */
  clearCache(): void {
    this.explorer.clearCaches();
  }
}

/**
 * Singleton instance for convenience
 */
let configLoaderInstance: ConfigLoader | null = null;

export function getConfigLoader(): ConfigLoader {
  if (!configLoaderInstance) {
    configLoaderInstance = new ConfigLoader();
  }
  return configLoaderInstance;
}

/**
 * Load configuration (convenience function)
 */
export async function loadConfig(configPath?: string): Promise<LoadConfigResult> {
  return getConfigLoader().load(configPath);
}
