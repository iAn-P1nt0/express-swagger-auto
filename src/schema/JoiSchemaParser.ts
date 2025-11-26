/**
 * Parses Joi validation schemas and converts them to OpenAPI schema definitions
 * Handles common Joi validations: string, number, boolean, object, array, etc.
 */

export interface JoiSchemaProperty {
  name?: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
  description?: string;
  required: boolean;
  pattern?: string;
  enum?: Array<string | number>;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: JoiSchemaProperty;
  properties?: Record<string, JoiSchemaProperty>;
}

export interface ParsedJoiSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, JoiSchemaProperty>;
  required?: string[];
  description?: string;
}

export class JoiSchemaParser {
  /**
   * Parse a Joi schema to extract validation information
   */
  parseSchema(joiSchema: any): ParsedJoiSchema | null {
    if (!joiSchema) return null;

    // Check if it's a Joi schema object
    if (!this.isJoiSchema(joiSchema)) {
      return null;
    }

    const parsed = this.extractSchemaStructure(joiSchema);
    return parsed;
  }

  /**
   * Check if an object is a Joi schema
   */
  isJoiSchema(obj: any): boolean {
    if (!obj) return false;

    // Joi schemas have a _type property and describe method
    return (
      typeof obj === 'object' &&
      (obj._type !== undefined || obj.describe !== undefined)
    );
  }

  /**
   * Extract schema structure from Joi schema
   */
  private extractSchemaStructure(joiSchema: any): ParsedJoiSchema {
    try {
      // Use describe() method if available (Joi v17+)
      if (typeof joiSchema.describe === 'function') {
        return this.describeSchema(joiSchema.describe());
      }

      // Fallback for older Joi versions - try to parse from _type and _flags
      return this.parseFallbackSchema(joiSchema);
    } catch (error) {
      // Return a generic object schema if parsing fails
      return { type: 'object' };
    }
  }

  /**
   * Fallback parser for older Joi versions that don't have describe()
   */
  private parseFallbackSchema(joiSchema: any): ParsedJoiSchema {
    const type = this.normalizeType(joiSchema._type || 'object');
    return {
      type: type as any,
      description: joiSchema._description,
    };
  }

  /**
   * Convert Joi describe() output to schema
   */
  private describeSchema(description: any): ParsedJoiSchema {
    if (!description) {
      return { type: 'object' };
    }

    const type = this.normalizeType(description.type);

    const result: ParsedJoiSchema = { type: type as any };

    if (description.description) {
      result.description = description.description;
    }

    // Handle object with properties
    if (description.type === 'object' && description.keys) {
      const properties: Record<string, JoiSchemaProperty> = {};
      const required: string[] = [];

      for (const [key, keySchema] of Object.entries(description.keys)) {
        const prop = this.describeProperty(keySchema as any);
        properties[key] = prop;
        if (prop.required) {
          required.push(key);
        }
      }

      result.properties = properties;
      if (required.length > 0) {
        result.required = required;
      }
    }

    // Handle array items
    if (description.type === 'array' && description.items) {
      const itemsArray = Array.isArray(description.items)
        ? description.items
        : [description.items];

      if (itemsArray.length > 0) {
        result.properties = {
          items: this.describeProperty(itemsArray[0]),
        };
      }
    }

    // Handle enums
    if (description.allow && Array.isArray(description.allow)) {
      result.properties = {
        enum: {
          type: 'string',
          enum: description.allow,
          required: true,
        },
      };
    }

    return result;
  }

  /**
   * Convert a single property description to JoiSchemaProperty
   */
  private describeProperty(description: any): JoiSchemaProperty {
    const type = this.normalizeType(description.type);

    const property: JoiSchemaProperty = {
      type: type as any,
      required: description.presence === 'required' || description.flags?.presence === 'required',
    };

    // Add common validations
    if (description.description) {
      property.description = description.description;
    }

    if (description.pattern) {
      property.pattern = description.pattern;
    }

    if (description.rules && Array.isArray(description.rules)) {
      for (const rule of description.rules) {
        this.applyRule(property, rule);
      }
    }

    // Handle string-specific rules
    if (description.type === 'string') {
      if (description.minLength !== undefined) {
        property.minLength = description.minLength;
      }
      if (description.maxLength !== undefined) {
        property.maxLength = description.maxLength;
      }
    }

    // Handle number-specific rules
    if (description.type === 'number') {
      if (description.min !== undefined) {
        property.minimum = description.min;
      }
      if (description.max !== undefined) {
        property.maximum = description.max;
      }
    }

    return property;
  }

  /**
   * Apply a Joi rule to a property
   */
  private applyRule(property: JoiSchemaProperty, rule: any): void {
    if (!rule) return;

    const name = rule.name || '';

    switch (name) {
      case 'email':
        property.pattern = '^[^@]+@[^@]+\\.[^@]+$';
        break;
      case 'uri':
      case 'url':
        property.pattern = '^https?://';
        break;
      case 'uuid':
        property.pattern = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        break;
      case 'length':
        if (rule.args?.limit !== undefined) {
          property.minLength = rule.args.limit;
          property.maxLength = rule.args.limit;
        }
        break;
      case 'min':
        if (rule.args?.limit !== undefined) {
          if (property.type === 'string') {
            property.minLength = rule.args.limit;
          } else if (property.type === 'number' || property.type === 'integer') {
            property.minimum = rule.args.limit;
          }
        }
        break;
      case 'max':
        if (rule.args?.limit !== undefined) {
          if (property.type === 'string') {
            property.maxLength = rule.args.limit;
          } else if (property.type === 'number' || property.type === 'integer') {
            property.maximum = rule.args.limit;
          }
        }
        break;
      case 'valid':
      case 'allow':
        if (rule.args?.values !== undefined) {
          property.enum = rule.args.values;
        }
        break;
      case 'regex':
        if (rule.args?.pattern !== undefined) {
          // Extract pattern from regex
          const pattern = rule.args.pattern;
          if (pattern instanceof RegExp) {
            property.pattern = pattern.source;
          } else if (typeof pattern === 'string') {
            property.pattern = pattern;
          }
        }
        break;
    }
  }

  /**
   * Normalize Joi type names to JSON Schema types
   */
  private normalizeType(joiType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'string',
      'object': 'object',
      'array': 'array',
      'binary': 'string',
      'alternatives': 'string',
      'any': 'string',
    };

    return typeMap[joiType] || 'string';
  }

  /**
   * Parse Joi schema from source code string
   * Useful for extracting schema from router middleware declarations
   */
  parseFromSourceCode(sourceCode: string, _schemaVarName: string = 'schema'): JoiSchemaProperty[] {
    const properties: JoiSchemaProperty[] = [];

    // Pattern to find Joi.object() declarations
    const objectPattern = /Joi\.object\(\s*\{([^}]+)\}\s*\)/g;
    let match;

    while ((match = objectPattern.exec(sourceCode)) !== null) {
      const objectContent = match[1];
      const props = this.parseObjectContent(objectContent);
      properties.push(...props);
    }

    return properties;
  }

  /**
   * Parse object content from Joi.object({ ... })
   */
  private parseObjectContent(content: string): JoiSchemaProperty[] {
    const properties: JoiSchemaProperty[] = [];

    // Split by comma and process each property
    const lines = content.split(',').map(l => l.trim()).filter(l => l);

    for (const line of lines) {
      const prop = this.parsePropertyLine(line);
      if (prop) {
        properties.push(prop);
      }
    }

    return properties;
  }

  /**
   * Parse a single property declaration like: fieldName: Joi.string().required()
   */
  private parsePropertyLine(line: string): JoiSchemaProperty | null {
    // Match: name: Joi.type()...
    const match = /(\w+)\s*:\s*Joi\.(\w+)\(\)(.*)/.exec(line);
    if (!match) return null;

    const [, name, joiType, modifiers] = match;
    const type = this.normalizeType(joiType);
    const required = /\.required\(\)/.test(modifiers);
    const hasEmail = /\.email\(\)/.test(modifiers);

    const property: JoiSchemaProperty = {
      name,
      type: type as any,
      required,
    };

    if (hasEmail) {
      property.pattern = '^[^@]+@[^@]+\\.[^@]+$';
    }

    const minMatch = /\.min\((\d+)\)/.exec(modifiers);
    if (minMatch) {
      const minValue = parseInt(minMatch[1], 10);
      if (type === 'string') {
        property.minLength = minValue;
      } else if (type === 'number' || type === 'integer') {
        property.minimum = minValue;
      }
    }

    const maxMatch = /\.max\((\d+)\)/.exec(modifiers);
    if (maxMatch) {
      const maxValue = parseInt(maxMatch[1], 10);
      if (type === 'string') {
        property.maxLength = maxValue;
      } else if (type === 'number' || type === 'integer') {
        property.maximum = maxValue;
      }
    }

    return property;
  }

  /**
   * Convert parsed Joi schema to OpenAPI component schema format
   */
  toOpenAPIComponent(parsedSchema: ParsedJoiSchema): Record<string, any> {
    const schema: Record<string, any> = {
      type: parsedSchema.type,
    };

    if (parsedSchema.description) {
      schema.description = parsedSchema.description;
    }

    if (parsedSchema.properties) {
      schema.properties = {};
      for (const [key, prop] of Object.entries(parsedSchema.properties)) {
        schema.properties[key] = this.propertyToOpenAPI(prop);
      }
    }

    if (parsedSchema.required && parsedSchema.required.length > 0) {
      schema.required = parsedSchema.required;
    }

    return schema;
  }

  /**
   * Convert a single property to OpenAPI format
   */
  private propertyToOpenAPI(prop: JoiSchemaProperty): Record<string, any> {
    const schema: Record<string, any> = {
      type: prop.type,
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

    // Handle array items
    if (prop.type === 'array' && prop.items) {
      schema.items = this.propertyToOpenAPI(prop.items);
    }

    // Handle nested objects
    if (prop.type === 'object' && prop.properties) {
      schema.properties = {};
      for (const [key, nestedProp] of Object.entries(prop.properties)) {
        schema.properties[key] = this.propertyToOpenAPI(nestedProp);
      }
    }

    return schema;
  }

  /**
   * Detect if source code contains Joi schema usage
   */
  hasJoiSchema(sourceCode: string): boolean {
    return /Joi\s*\./.test(sourceCode) || /joi\(\)/.test(sourceCode);
  }

  /**
   * Extract all Joi.object patterns from source code
   */
  extractJoiPatterns(sourceCode: string): Array<{
    pattern: string;
    start: number;
    end: number;
  }> {
    const patterns: Array<{
      pattern: string;
      start: number;
      end: number;
    }> = [];

    const regex = /Joi\.object\s*\(\s*\{[^}]+\}\s*\)/g;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      patterns.push({
        pattern: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return patterns;
  }
}
