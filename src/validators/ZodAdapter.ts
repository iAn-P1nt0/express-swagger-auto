import type { ValidatorAdapter, OpenAPISchema } from '../types';

export class ZodAdapter implements ValidatorAdapter {
  name = 'zod';

  detect(schema: unknown): boolean {
    // Phase 2: Minimal Zod detection
    // TODO(Phase 2): Robust detection for all Zod schema types
    return (
      schema !== null &&
      typeof schema === 'object' &&
      '_def' in schema &&
      typeof (schema as any)._def === 'object'
    );
  }

  convert(schema: unknown): OpenAPISchema {
    // Phase 2: Basic Zod to OpenAPI conversion
    // TODO(Phase 2): Complete implementation with all Zod types
    // TODO(Phase 2): Handle nested schemas, unions, intersections
    // TODO(Phase 3): Extract examples and descriptions from Zod metadata

    if (!this.detect(schema)) {
      throw new Error('Invalid Zod schema provided');
    }

    const zodSchema = schema as any;
    const typeName = zodSchema._def.typeName;

    switch (typeName) {
      case 'ZodString':
        return this.convertZodString(zodSchema);
      case 'ZodNumber':
        return this.convertZodNumber(zodSchema);
      case 'ZodBoolean':
        return { type: 'boolean' };
      case 'ZodObject':
        return this.convertZodObject(zodSchema);
      case 'ZodArray':
        return this.convertZodArray(zodSchema);
      case 'ZodEnum':
        return this.convertZodEnum(zodSchema);
      case 'ZodOptional':
        return this.convert(zodSchema._def.innerType);
      default:
        return { type: 'object', description: `Unsupported Zod type: ${typeName}` };
    }
  }

  private convertZodString(zodSchema: any): OpenAPISchema {
    const schema: OpenAPISchema = { type: 'string' };

    const checks = zodSchema._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'email') {
        schema.format = 'email';
      } else if (check.kind === 'uuid') {
        schema.format = 'uuid';
      } else if (check.kind === 'url') {
        schema.format = 'uri';
      }
    }

    return schema;
  }

  private convertZodNumber(zodSchema: any): OpenAPISchema {
    const schema: OpenAPISchema = { type: 'number' };

    const checks = zodSchema._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'int') {
        schema.format = 'int32';
      }
    }

    return schema;
  }

  private convertZodObject(zodSchema: any): OpenAPISchema {
    const shape = zodSchema._def.shape?.() || {};
    const properties: Record<string, OpenAPISchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = this.convert(value);

      if (!this.isOptional(value as any)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    };
  }

  private convertZodArray(zodSchema: any): OpenAPISchema {
    const itemsSchema = zodSchema._def.type;
    return {
      type: 'array',
      items: this.convert(itemsSchema),
    };
  }

  private convertZodEnum(zodSchema: any): OpenAPISchema {
    const values = zodSchema._def.values || [];
    return {
      type: 'string',
      enum: values,
    };
  }

  private isOptional(zodSchema: any): boolean {
    return zodSchema._def.typeName === 'ZodOptional';
  }
}
