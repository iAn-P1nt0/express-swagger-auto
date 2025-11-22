import type { RuntimeSnapshot } from './SnapshotStorage';
import type { OpenAPISchema } from '../types';

/**
 * ExampleMerger combines multiple runtime snapshots to build comprehensive OpenAPI schemas
 * Phase 3: Enhanced schema inference with example values and optional field detection
 */
export class ExampleMerger {
  /**
   * Merge multiple snapshots for a route into a single comprehensive schema
   */
  mergeSnapshots(snapshots: RuntimeSnapshot[]): {
    requestSchema?: OpenAPISchema;
    responseSchema?: OpenAPISchema;
  } {
    if (snapshots.length === 0) {
      return {};
    }

    // Separate request and response schemas
    const requestSchemas = snapshots
      .map((s) => s.requestSchema)
      .filter((s): s is NonNullable<typeof s> => s != null);

    const responseSchemas = snapshots
      .map((s) => s.responseSchema)
      .filter((s): s is NonNullable<typeof s> => s != null);

    return {
      requestSchema: requestSchemas.length > 0 ? this.mergeSchemas(requestSchemas) : undefined,
      responseSchema: responseSchemas.length > 0 ? this.mergeSchemas(responseSchemas) : undefined,
    };
  }

  /**
   * Merge multiple schemas into one comprehensive schema with examples
   */
  private mergeSchemas(schemas: any[]): OpenAPISchema {
    if (schemas.length === 0) {
      return {};
    }

    if (schemas.length === 1) {
      return this.enrichSchemaWithExamples(schemas[0]);
    }

    // Group by type
    const types = new Set(schemas.map((s) => s.type).filter(Boolean));

    // If all same type, merge properties/items
    if (types.size === 1) {
      const type = Array.from(types)[0];

      if (type === 'object') {
        return this.mergeObjectSchemas(schemas);
      }

      if (type === 'array') {
        return this.mergeArraySchemas(schemas);
      }

      // Primitive types - collect examples
      return this.mergePrimitiveSchemas(schemas, type);
    }

    // Multiple types - create oneOf
    return {
      oneOf: schemas.map((s) => this.enrichSchemaWithExamples(s)),
    };
  }

  /**
   * Merge object schemas, making fields optional if they don't appear in all snapshots
   */
  private mergeObjectSchemas(schemas: any[]): OpenAPISchema {
    const allProperties = new Map<string, any[]>();
    const totalSchemas = schemas.length;

    // Collect all property schemas across snapshots
    for (const schema of schemas) {
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (!allProperties.has(key)) {
            allProperties.set(key, []);
          }
          allProperties.get(key)!.push(propSchema);
        }
      }
    }

    // Merge each property
    const mergedProperties: Record<string, OpenAPISchema> = {};
    const required: string[] = [];

    for (const [key, propSchemas] of allProperties.entries()) {
      mergedProperties[key] = this.mergeSchemas(propSchemas);

      // Mark as required only if present in ALL snapshots
      if (propSchemas.length === totalSchemas) {
        required.push(key);
      }
    }

    const result: OpenAPISchema = {
      type: 'object',
      properties: mergedProperties,
    };

    if (required.length > 0) {
      result.required = required;
    }

    return result;
  }

  /**
   * Merge array schemas by merging item schemas
   */
  private mergeArraySchemas(schemas: any[]): OpenAPISchema {
    const itemSchemas = schemas
      .map((s) => s.items)
      .filter((items): items is NonNullable<typeof items> => items != null);

    if (itemSchemas.length === 0) {
      return { type: 'array' };
    }

    return {
      type: 'array',
      items: this.mergeSchemas(itemSchemas),
    };
  }

  /**
   * Merge primitive type schemas and detect enum patterns
   */
  private mergePrimitiveSchemas(schemas: any[], type: string): OpenAPISchema {
    const examples = new Set<any>();

    // Collect all example values
    for (const schema of schemas) {
      if (schema.example !== undefined) {
        examples.add(schema.example);
      }
    }

    const result: OpenAPISchema = { type };

    // Detect enum pattern for strings (if we have 2-10 distinct values)
    if (type === 'string' && examples.size >= 2 && examples.size <= 10) {
      result.enum = Array.from(examples).sort();
    } else if (examples.size > 0) {
      // Add first example as representative
      result.example = Array.from(examples)[0];
    }

    // Detect number constraints
    if (type === 'number' && examples.size > 0) {
      const numbers = Array.from(examples) as number[];
      result.minimum = Math.min(...numbers);
      result.maximum = Math.max(...numbers);
    }

    return result;
  }

  /**
   * Add example values to schema based on inferred type
   */
  private enrichSchemaWithExamples(schema: any): OpenAPISchema {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const enriched = { ...schema };

    // Add examples for primitives if not already present
    if (!enriched.example && !enriched.enum) {
      switch (enriched.type) {
        case 'string':
          enriched.example = 'example';
          break;
        case 'number':
          enriched.example = 42;
          break;
        case 'integer':
          enriched.example = 1;
          break;
        case 'boolean':
          enriched.example = true;
          break;
      }
    }

    // Recursively enrich object properties
    if (enriched.type === 'object' && enriched.properties) {
      enriched.properties = Object.fromEntries(
        Object.entries(enriched.properties).map(([key, value]) => [
          key,
          this.enrichSchemaWithExamples(value),
        ])
      );
    }

    // Recursively enrich array items
    if (enriched.type === 'array' && enriched.items) {
      enriched.items = this.enrichSchemaWithExamples(enriched.items);
    }

    return enriched;
  }

  /**
   * Detect common patterns in runtime data and enhance schema
   */
  detectPatterns(snapshots: RuntimeSnapshot[]): {
    optionalFields: string[];
    requiredFields: string[];
    enumCandidates: Map<string, Set<any>>;
  } {
    const fieldOccurrences = new Map<string, number>();
    const fieldValues = new Map<string, Set<any>>();
    const totalSnapshots = snapshots.length;

    for (const snapshot of snapshots) {
      this.collectFieldInfo(snapshot.requestSchema, fieldOccurrences, fieldValues);
      this.collectFieldInfo(snapshot.responseSchema, fieldOccurrences, fieldValues);
    }

    const optionalFields: string[] = [];
    const requiredFields: string[] = [];
    const enumCandidates = new Map<string, Set<any>>();

    for (const [field, count] of fieldOccurrences.entries()) {
      if (count === totalSnapshots) {
        requiredFields.push(field);
      } else {
        optionalFields.push(field);
      }

      // Check if field is enum candidate
      const values = fieldValues.get(field);
      if (values && values.size >= 2 && values.size <= 10) {
        enumCandidates.set(field, values);
      }
    }

    return { optionalFields, requiredFields, enumCandidates };
  }

  /**
   * Recursively collect field occurrence and value information
   */
  private collectFieldInfo(
    schema: any,
    occurrences: Map<string, number>,
    values: Map<string, Set<any>>,
    prefix = ''
  ): void {
    if (!schema || typeof schema !== 'object') {
      return;
    }

    if (schema.type === 'object' && schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        occurrences.set(fullPath, (occurrences.get(fullPath) || 0) + 1);

        // Collect value if primitive with example
        if (propSchema && typeof propSchema === 'object' && 'example' in propSchema) {
          if (!values.has(fullPath)) {
            values.set(fullPath, new Set());
          }
          values.get(fullPath)!.add((propSchema as any).example);
        }

        // Recurse for nested objects
        this.collectFieldInfo(propSchema, occurrences, values, fullPath);
      }
    } else if (schema.type === 'array' && schema.items) {
      this.collectFieldInfo(schema.items, occurrences, values, `${prefix}[]`);
    }
  }
}
