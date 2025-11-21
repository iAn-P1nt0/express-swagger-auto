import type { ValidatorAdapter, OpenAPISchema } from '../types';

export class JoiAdapter implements ValidatorAdapter {
  name = 'joi';

  detect(schema: unknown): boolean {
    // Phase 2: Joi schema detection
    return (
      schema !== null &&
      typeof schema === 'object' &&
      'isJoi' in schema &&
      (schema as any).isJoi === true
    );
  }

  convert(schema: unknown): OpenAPISchema {
    // Phase 2: Joi to OpenAPI conversion
    if (!this.detect(schema)) {
      throw new Error('Invalid Joi schema provided');
    }

    const joiSchema = schema as any;
    const describe = joiSchema.describe();

    return this.convertDescription(describe);
  }

  private convertDescription(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = {};

    // Handle type
    switch (desc.type) {
      case 'string':
        return this.convertString(desc);
      case 'number':
        return this.convertNumber(desc);
      case 'boolean':
        schema.type = 'boolean';
        break;
      case 'object':
        return this.convertObject(desc);
      case 'array':
        return this.convertArray(desc);
      case 'date':
        schema.type = 'string';
        schema.format = 'date-time';
        break;
      case 'alternatives':
        return this.convertAlternatives(desc);
      default:
        schema.type = 'object';
        schema.description = `Unsupported Joi type: ${desc.type}`;
    }

    // Add common properties
    if (desc.flags?.description) {
      schema.description = desc.flags.description;
    }

    if (desc.examples && desc.examples.length > 0) {
      schema.example = desc.examples[0];
    }

    return schema;
  }

  private convertString(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = { type: 'string' };

    // Check for format rules
    const rules = desc.rules || [];
    for (const rule of rules) {
      if (rule.name === 'email') {
        schema.format = 'email';
      } else if (rule.name === 'uri') {
        schema.format = 'uri';
      } else if (rule.name === 'uuid') {
        schema.format = 'uuid';
      } else if (rule.name === 'pattern') {
        schema.pattern = rule.args?.regex?.toString().slice(1, -1);
      } else if (rule.name === 'min') {
        schema.minLength = rule.args?.limit;
      } else if (rule.name === 'max') {
        schema.maxLength = rule.args?.limit;
      }
    }

    // Check for valid values (enum)
    if (desc.allow && Array.isArray(desc.allow)) {
      schema.enum = desc.allow;
    }

    if (desc.flags?.description) {
      schema.description = desc.flags.description;
    }

    return schema;
  }

  private convertNumber(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = { type: 'number' };

    const rules = desc.rules || [];
    for (const rule of rules) {
      if (rule.name === 'integer') {
        schema.format = 'int32';
      } else if (rule.name === 'min') {
        schema.minimum = rule.args?.limit;
      } else if (rule.name === 'max') {
        schema.maximum = rule.args?.limit;
      }
    }

    if (desc.flags?.description) {
      schema.description = desc.flags.description;
    }

    return schema;
  }

  private convertObject(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = {
      type: 'object',
      properties: {},
    };

    const keys = desc.keys || {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(keys)) {
      const keyDesc = value as any;
      schema.properties![key] = this.convertDescription(keyDesc);

      // Check if required
      if (!keyDesc.flags?.presence || keyDesc.flags.presence === 'required') {
        required.push(key);
      }
    }

    if (required.length > 0) {
      schema.required = required;
    }

    if (desc.flags?.description) {
      schema.description = desc.flags.description;
    }

    return schema;
  }

  private convertArray(desc: any): OpenAPISchema {
    const schema: OpenAPISchema = {
      type: 'array',
    };

    // Get items schema
    if (desc.items && desc.items.length > 0) {
      schema.items = this.convertDescription(desc.items[0]);
    } else {
      schema.items = {};
    }

    // Handle array constraints
    const rules = desc.rules || [];
    for (const rule of rules) {
      if (rule.name === 'min') {
        schema.minItems = rule.args?.limit;
      } else if (rule.name === 'max') {
        schema.maxItems = rule.args?.limit;
      }
    }

    if (desc.flags?.description) {
      schema.description = desc.flags.description;
    }

    return schema;
  }

  private convertAlternatives(desc: any): OpenAPISchema {
    const matches = desc.matches || [];

    if (matches.length === 0) {
      return { type: 'object' };
    }

    const oneOf = matches.map((match: any) => {
      if (match.schema) {
        return this.convertDescription(match.schema);
      }
      return {};
    });

    return { oneOf };
  }
}
