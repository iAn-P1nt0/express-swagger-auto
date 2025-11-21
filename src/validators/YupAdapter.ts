import type { ValidatorAdapter, OpenAPISchema } from '../types';

export class YupAdapter implements ValidatorAdapter {
  name = 'yup';

  detect(schema: unknown): boolean {
    // Phase 2: Yup schema detection
    return (
      schema !== null &&
      typeof schema === 'object' &&
      '__isYupSchema__' in schema &&
      (schema as any).__isYupSchema__ === true
    );
  }

  convert(schema: unknown): OpenAPISchema {
    // Phase 2: Yup to OpenAPI conversion
    if (!this.detect(schema)) {
      throw new Error('Invalid Yup schema provided');
    }

    const yupSchema = schema as any;
    const description = yupSchema.describe();

    return this.convertDescription(description);
  }

  private convertDescription(desc: any): OpenAPISchema {
    let schema: OpenAPISchema = {};

    switch (desc.type) {
      case 'string':
        schema = this.convertString(desc);
        break;
      case 'number':
        schema = this.convertNumber(desc);
        break;
      case 'boolean':
        schema.type = 'boolean';
        break;
      case 'date':
        schema.type = 'string';
        schema.format = 'date-time';
        break;
      case 'object':
        schema = this.convertObject(desc);
        break;
      case 'array':
        schema = this.convertArray(desc);
        break;
      case 'mixed':
        // Mixed type - try to infer or default to object
        schema.type = 'object';
        break;
      default:
        schema.type = 'object';
        schema.description = `Unsupported Yup type: ${desc.type}`;
    }

    // Add meta description (if not already set)
    if (!schema.description) {
      if (desc.meta?.description) {
        schema.description = desc.meta.description;
      } else if (desc.label) {
        schema.description = desc.label;
      }
    }

    // Add default value
    if (desc.default !== undefined) {
      schema.default = desc.default;
    }

    return schema;
  }

  private convertString(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = { type: 'string' };

    // Check for email test
    if (desc.tests) {
      for (const test of desc.tests) {
        if (test.name === 'email') {
          schema.format = 'email';
        } else if (test.name === 'url') {
          schema.format = 'uri';
        } else if (test.name === 'uuid') {
          schema.format = 'uuid';
        } else if (test.name === 'matches' && test.params?.regex) {
          schema.pattern = test.params.regex.toString().slice(1, -1);
        } else if (test.name === 'min') {
          schema.minLength = test.params?.min;
        } else if (test.name === 'max') {
          schema.maxLength = test.params?.max;
        }
      }
    }

    // Check for oneOf (enum) - only add if not empty
    if (desc.oneOf && Array.isArray(desc.oneOf) && desc.oneOf.length > 0) {
      schema.enum = desc.oneOf;
    }

    if (desc.meta?.description) {
      schema.description = desc.meta.description;
    } else if (desc.label) {
      schema.description = desc.label;
    }

    return schema;
  }

  private convertNumber(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = { type: 'number' };

    if (desc.tests) {
      for (const test of desc.tests) {
        if (test.name === 'integer') {
          schema.format = 'int32';
        } else if (test.name === 'min') {
          schema.minimum = test.params?.min;
        } else if (test.name === 'max') {
          schema.maximum = test.params?.max;
        } else if (test.name === 'positive') {
          schema.minimum = 0;
        }
      }
    }

    if (desc.meta?.description) {
      schema.description = desc.meta.description;
    } else if (desc.label) {
      schema.description = desc.label;
    }

    return schema;
  }

  private convertObject(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = {
      type: 'object',
      properties: {},
    };

    const fields = desc.fields || {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(fields)) {
      const fieldDesc = value as any;
      schema.properties![key] = this.convertDescription(fieldDesc);

      // Check if field is required (not optional and not nullable)
      if (!fieldDesc.optional && !fieldDesc.nullable) {
        required.push(key);
      }
    }

    if (required.length > 0) {
      schema.required = required;
    }

    if (desc.meta?.description) {
      schema.description = desc.meta.description;
    } else if (desc.label) {
      schema.description = desc.label;
    }

    return schema;
  }

  private convertArray(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = {
      type: 'array',
    };

    // Get inner type
    if (desc.innerType) {
      schema.items = this.convertDescription(desc.innerType);
    } else {
      schema.items = {};
    }

    // Handle array constraints from tests
    if (desc.tests) {
      for (const test of desc.tests) {
        if (test.name === 'min') {
          schema.minItems = test.params?.min;
        } else if (test.name === 'max') {
          schema.maxItems = test.params?.max;
        }
      }
    }

    if (desc.meta?.description) {
      schema.description = desc.meta.description;
    } else if (desc.label) {
      schema.description = desc.label;
    }

    return schema;
  }
}
