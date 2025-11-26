/**
 * Orchestrates schema extraction from Joi validators, controllers, and TypeScript definitions
 * Combines insights from multiple sources to build comprehensive request/response schemas
 */

import { JoiSchemaParser } from './JoiSchemaParser';
import { ControllerAnalyzer, type ControllerSchema } from './ControllerAnalyzer';

export interface ExtractedSchema {
  requestBody?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    description?: string;
  };
  responses?: {
    [statusCode: string]: {
      description: string;
      schema?: Record<string, any>;
    };
  };
  source: ('joi' | 'controller' | 'typescript' | 'jsdoc')[];
}

export interface RouteSchema {
  path: string;
  method: string;
  schema: ExtractedSchema;
  confidence: 'high' | 'medium' | 'low';
}

export class SchemaExtractor {
  private joiParser: JoiSchemaParser;
  private controllerAnalyzer: ControllerAnalyzer;
  private schemaCache: Map<string, ExtractedSchema> = new Map();

  constructor() {
    this.joiParser = new JoiSchemaParser();
    this.controllerAnalyzer = new ControllerAnalyzer();
  }

  /**
   * Extract schema for a complete route with all available sources
   */
  extractRouteSchema(
    path: string,
    method: string,
    options: {
      middlewares?: any[];
      controllerCode?: string;
      jsDocComment?: string;
      joiSchemas?: any[];
    } = {}
  ): RouteSchema {
    const cacheKey = `${method}:${path}`;

    if (this.schemaCache.has(cacheKey)) {
      return {
        path,
        method,
        schema: this.schemaCache.get(cacheKey)!,
        confidence: 'high',
      };
    }

    const schema: ExtractedSchema = {
      source: [],
    };

    // Extract from Joi schemas in middleware
    if (options.joiSchemas && options.joiSchemas.length > 0) {
      const joiSchema = this.extractFromJoiMiddleware(options.joiSchemas);
      if (joiSchema) {
        Object.assign(schema, joiSchema);
        schema.source.push('joi');
      }
    }

    // Extract from controller code
    if (options.controllerCode) {
      const controllerSchema = this.controllerAnalyzer.analyzeController(
        options.controllerCode
      );
      this.mergeSchemas(schema, controllerSchema);
      schema.source.push('controller');
    }

    // Extract from JSDoc
    if (options.jsDocComment) {
      const jsDocSchema = this.controllerAnalyzer.extractJsDocSchema(
        options.jsDocComment
      );
      this.mergeSchemas(schema, jsDocSchema);
      schema.source.push('jsdoc');
    }

    // Determine confidence level based on sources
    const confidence = this.calculateConfidence(schema);

    // Cache the result
    this.schemaCache.set(cacheKey, schema);

    return {
      path,
      method,
      schema,
      confidence,
    };
  }

  /**
   * Extract schema from Joi validation middleware
   */
  private extractFromJoiMiddleware(joiSchemas: any[]): ExtractedSchema | null {
    const extracted: ExtractedSchema = {
      source: ['joi'],
    };

    for (const joiSchema of joiSchemas) {
      if (!joiSchema) continue;

      const parsed = this.joiParser.parseSchema(joiSchema);
      if (parsed) {
        extracted.requestBody = {
          type: parsed.type || 'object',
          description: parsed.description,
        };

        if (parsed.properties) {
          extracted.requestBody.properties = {};
          for (const [key, prop] of Object.entries(parsed.properties)) {
            extracted.requestBody.properties[key] = this.joiPropToSchema(prop);
          }
        }

        if (parsed.required) {
          extracted.requestBody.required = parsed.required;
        }

        return extracted;
      }
    }

    return null;
  }

  /**
   * Convert Joi property to OpenAPI schema
   */
  private joiPropToSchema(prop: any): Record<string, any> {
    const schema: Record<string, any> = {
      type: prop.type || 'string',
    };

    if (prop.description) {
      schema.description = prop.description;
    }

    if (prop.pattern) {
      schema.pattern = prop.pattern;
    }

    if (prop.enum) {
      schema.enum = prop.enum;
    }

    if (prop.minLength !== undefined) {
      schema.minLength = prop.minLength;
    }

    if (prop.maxLength !== undefined) {
      schema.maxLength = prop.maxLength;
    }

    if (prop.minimum !== undefined) {
      schema.minimum = prop.minimum;
    }

    if (prop.maximum !== undefined) {
      schema.maximum = prop.maximum;
    }

    return schema;
  }

  /**
   * Merge two schema objects intelligently
   */
  private mergeSchemas(target: ExtractedSchema, source: ControllerSchema): void {
    // Merge request body
    if (source.requestBody) {
      if (!target.requestBody) {
        target.requestBody = source.requestBody;
      } else if (source.requestBody.properties) {
        // Merge properties from source
        if (!target.requestBody.properties) {
          target.requestBody.properties = {};
        }

        // Properties from source override target (since source is more specific)
        for (const [key, prop] of Object.entries(source.requestBody.properties)) {
          target.requestBody.properties[key] = prop;
        }
      }

      // Merge required fields
      if (source.requestBody.required) {
        if (!target.requestBody.required) {
          target.requestBody.required = source.requestBody.required;
        } else {
          // Union required fields (source required overrides target)
          target.requestBody.required = Array.from(
            new Set([
              ...target.requestBody.required,
              ...source.requestBody.required,
            ])
          );
        }
      }
    }

    // Merge responses
    if (source.responses) {
      if (!target.responses) {
        target.responses = {};
      }

      for (const [status, response] of Object.entries(source.responses)) {
        if (!target.responses[status]) {
          target.responses[status] = response;
        } else if (response.schema) {
          // Merge schema if available in source
          target.responses[status].schema = response.schema;
        }
      }
    }
  }

  /**
   * Calculate confidence level based on available sources
   */
  private calculateConfidence(
    schema: ExtractedSchema
  ): 'high' | 'medium' | 'low' {
    const sources = schema.source.length;
    const hasRequestBody = !!schema.requestBody;
    const hasResponses = !!schema.responses && Object.keys(schema.responses).length > 0;

    if (sources >= 2 && hasRequestBody && hasResponses) {
      return 'high';
    }

    if (sources >= 1 && (hasRequestBody || hasResponses)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extract schemas from all middleware in a stack
   */
  extractFromMiddlewareStack(middlewares: any[]): ExtractedSchema | null {
    const joiSchemas: any[] = [];

    for (const middleware of middlewares) {
      if (!middleware) continue;

      // Check if middleware is a Joi schema
      if (this.joiParser.isJoiSchema(middleware)) {
        joiSchemas.push(middleware);
      }

      // Check if middleware has a schema property (common pattern)
      if (middleware.schema && this.joiParser.isJoiSchema(middleware.schema)) {
        joiSchemas.push(middleware.schema);
      }
    }

    if (joiSchemas.length === 0) {
      return null;
    }

    return this.extractFromJoiMiddleware(joiSchemas) || null;
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.schemaCache.size,
      keys: Array.from(this.schemaCache.keys()),
    };
  }

  /**
   * Detect validation libraries used in middleware
   */
  detectValidationLibrary(code: string): 'joi' | 'yup' | 'zod' | 'none' {
    if (/joi\.object|joi\.string|joi\./i.test(code)) {
      return 'joi';
    }

    if (/yup\.object|yup\.string|yup\./i.test(code)) {
      return 'yup';
    }

    if (/zod\.object|z\.string|z\./i.test(code)) {
      return 'zod';
    }

    return 'none';
  }

  /**
   * Generate example payload from schema
   */
  generateExample(schema: ExtractedSchema): Record<string, any> {
    if (!schema.requestBody || !schema.requestBody.properties) {
      return { example: 'example value' };
    }

    const example: Record<string, any> = {};

    for (const [key, prop] of Object.entries(schema.requestBody.properties)) {
      example[key] = this.generateExampleValue(prop);
    }

    return example;
  }

  /**
   * Generate example value for a schema property
   */
  private generateExampleValue(prop: Record<string, any>): any {
    const type = prop.type || 'string';

    switch (type) {
      case 'string':
        if (prop.enum && prop.enum.length > 0) {
          return prop.enum[0];
        }
        if (prop.format === 'email') {
          return 'user@example.com';
        }
        return 'example string';

      case 'number':
      case 'integer':
        return prop.minimum || prop.minimum === 0 ? prop.minimum : 1;

      case 'boolean':
        return true;

      case 'array':
        if (prop.items) {
          return [this.generateExampleValue(prop.items)];
        }
        return [];

      case 'object':
        if (prop.properties) {
          const obj: Record<string, any> = {};
          for (const [key, subProp] of Object.entries(prop.properties)) {
            obj[key] = this.generateExampleValue(subProp as any);
          }
          return obj;
        }
        return {};

      default:
        return null;
    }
  }

  /**
   * Validate extracted schema for completeness
   */
  validateSchema(schema: ExtractedSchema): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (schema.source.length === 0) {
      warnings.push('No schema sources detected');
    }

    if (!schema.requestBody && !schema.responses) {
      warnings.push('Neither request body nor response schema detected');
    }

    if (!schema.responses) {
      warnings.push('No response schema detected');
    }

    if (schema.requestBody && !schema.requestBody.properties) {
      warnings.push('Request body has no properties');
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }
}
