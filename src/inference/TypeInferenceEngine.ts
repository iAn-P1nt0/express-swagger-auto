/**
 * TypeScript Type Inference Engine
 * Extracts OpenAPI schemas from TypeScript types and interfaces
 */

import type { OpenAPISchema } from '../types';

export interface TypeDefinition {
  name: string;
  type: string;
  properties?: Record<string, TypeDefinition>;
  elementType?: TypeDefinition;
  optional?: boolean;
  description?: string;
  enumValues?: (string | number)[];
}

export interface InferenceResult {
  schema: OpenAPISchema;
  confidence: number;
  source: 'typescript' | 'jsdoc' | 'runtime' | 'validator';
  warnings: string[];
}

export interface TypeInferenceOptions {
  /** Include examples in schema output */
  includeExamples?: boolean;
  /** Maximum depth for nested type resolution */
  maxDepth?: number;
  /** Custom type mappings */
  typeOverrides?: Record<string, OpenAPISchema>;
}

/**
 * Infers OpenAPI schemas from TypeScript types
 * Can be used with or without the TypeScript compiler
 */
export class TypeInferenceEngine {
  private options: Required<TypeInferenceOptions>;
  private typeCache: Map<string, OpenAPISchema> = new Map();
  private primitiveTypeMap: Record<string, OpenAPISchema> = {
    'string': { type: 'string' },
    'number': { type: 'number' },
    'boolean': { type: 'boolean' },
    'Date': { type: 'string', format: 'date-time' },
    'null': { type: 'string', nullable: true },
    'undefined': { type: 'string' },
    'any': { },
    'unknown': { },
    'void': { },
    'never': { },
    'object': { type: 'object' },
    'bigint': { type: 'integer', format: 'int64' },
    'symbol': { type: 'string' },
  };

  constructor(options: TypeInferenceOptions = {}) {
    this.options = {
      includeExamples: options.includeExamples ?? true,
      maxDepth: options.maxDepth ?? 10,
      typeOverrides: options.typeOverrides ?? {},
    };
  }

  /**
   * Infer schema from a TypeScript type string
   */
  inferFromTypeString(typeStr: string): InferenceResult {
    const warnings: string[] = [];
    const trimmed = typeStr.trim();

    // Check cache first
    const cached = this.typeCache.get(trimmed);
    if (cached) {
      return {
        schema: cached,
        confidence: 0.9,
        source: 'typescript',
        warnings: [],
      };
    }

    // Parse and convert the type
    const schema = this.parseTypeString(trimmed, 0, warnings);
    
    // Cache the result
    this.typeCache.set(trimmed, schema);

    return {
      schema,
      confidence: this.calculateConfidence(schema, warnings),
      source: 'typescript',
      warnings,
    };
  }

  /**
   * Parse a TypeScript type string into OpenAPI schema
   */
  private parseTypeString(
    typeStr: string, 
    depth: number,
    warnings: string[]
  ): OpenAPISchema {
    if (depth > this.options.maxDepth) {
      warnings.push(`Maximum type depth (${this.options.maxDepth}) exceeded`);
      return { type: 'object' };
    }

    const trimmed = typeStr.trim();

    // Check for custom overrides
    if (this.options.typeOverrides[trimmed]) {
      return this.options.typeOverrides[trimmed];
    }

    // Check primitive types
    if (this.primitiveTypeMap[trimmed]) {
      return { ...this.primitiveTypeMap[trimmed] };
    }

    // Handle array types
    const arrayMatch = this.matchArrayType(trimmed);
    if (arrayMatch) {
      return {
        type: 'array',
        items: this.parseTypeString(arrayMatch, depth + 1, warnings),
      };
    }

    // Handle union types
    if (trimmed.includes('|')) {
      return this.parseUnionType(trimmed, depth, warnings);
    }

    // Handle intersection types
    if (trimmed.includes('&')) {
      return this.parseIntersectionType(trimmed, depth, warnings);
    }

    // Handle object literal types
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return this.parseObjectLiteralType(trimmed, depth, warnings);
    }

    // Handle tuple types
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return this.parseTupleType(trimmed, depth, warnings);
    }

    // Handle generic types like Promise<T>, Response<T>
    const genericMatch = this.matchGenericType(trimmed);
    if (genericMatch) {
      return this.parseGenericType(genericMatch.base, genericMatch.args, depth, warnings);
    }

    // Handle Record<K, V>
    const recordMatch = /^Record<\s*([^,]+)\s*,\s*(.+)\s*>$/.exec(trimmed);
    if (recordMatch) {
      return {
        type: 'object',
        additionalProperties: this.parseTypeString(recordMatch[2], depth + 1, warnings),
      };
    }

    // Handle Partial<T>, Required<T>, etc.
    if (/^(Partial|Required|Readonly|Pick|Omit)</.test(trimmed)) {
      warnings.push(`Utility type ${trimmed.split('<')[0]} simplified to base type`);
      const innerType = this.extractGenericArg(trimmed);
      if (innerType) {
        return this.parseTypeString(innerType, depth + 1, warnings);
      }
    }

    // Default to reference (for interfaces/types not defined inline)
    return {
      $ref: `#/components/schemas/${trimmed}`,
    };
  }

  /**
   * Match array type syntax
   */
  private matchArrayType(typeStr: string): string | null {
    // Array<T>
    const genericMatch = /^Array<(.+)>$/.exec(typeStr);
    if (genericMatch) {
      return genericMatch[1];
    }

    // T[]
    if (typeStr.endsWith('[]')) {
      return typeStr.slice(0, -2);
    }

    return null;
  }

  /**
   * Parse union types (A | B | C)
   */
  private parseUnionType(
    typeStr: string, 
    depth: number,
    warnings: string[]
  ): OpenAPISchema {
    const types = this.splitTypeUnion(typeStr);
    
    // Check for literal union (string enums)
    const literals = types.filter(t => t.startsWith("'") || t.startsWith('"'));
    if (literals.length === types.length) {
      const enumValues = literals.map(l => l.slice(1, -1));
      return {
        type: 'string',
        enum: enumValues,
      };
    }

    // Check for nullable type (T | null | undefined)
    const nonNullTypes = types.filter(t => t !== 'null' && t !== 'undefined');
    const isNullable = types.includes('null') || types.includes('undefined');

    if (nonNullTypes.length === 1) {
      const schema = this.parseTypeString(nonNullTypes[0], depth + 1, warnings);
      if (isNullable) {
        schema.nullable = true;
      }
      return schema;
    }

    // General union type
    return {
      oneOf: types
        .filter(t => t !== 'null' && t !== 'undefined')
        .map(t => this.parseTypeString(t, depth + 1, warnings)),
    };
  }

  /**
   * Parse intersection types (A & B)
   */
  private parseIntersectionType(
    typeStr: string,
    depth: number,
    warnings: string[]
  ): OpenAPISchema {
    const types = this.splitTypeIntersection(typeStr);
    
    return {
      allOf: types.map(t => this.parseTypeString(t, depth + 1, warnings)),
    };
  }

  /**
   * Parse object literal types { name: string; age: number }
   */
  private parseObjectLiteralType(
    typeStr: string,
    depth: number,
    warnings: string[]
  ): OpenAPISchema {
    const content = typeStr.slice(1, -1).trim();
    if (!content) {
      return { type: 'object' };
    }

    const properties: Record<string, OpenAPISchema> = {};
    const required: string[] = [];

    // Split by semicolon or comma, handling nested structures
    const members = this.splitObjectMembers(content);

    for (const member of members) {
      const match = /^(\w+)(\??):\s*(.+)$/.exec(member.trim());
      if (match) {
        const [, name, optional, type] = match;
        properties[name] = this.parseTypeString(type, depth + 1, warnings);
        if (!optional) {
          required.push(name);
        }
      }
    }

    const schema: OpenAPISchema = {
      type: 'object',
      properties,
    };

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  }

  /**
   * Parse tuple types [string, number]
   */
  private parseTupleType(
    typeStr: string,
    depth: number,
    warnings: string[]
  ): OpenAPISchema {
    const content = typeStr.slice(1, -1).trim();
    const elements = this.splitTupleElements(content);

    return {
      type: 'array',
      items: {
        oneOf: elements.map(e => this.parseTypeString(e, depth + 1, warnings)),
      },
      minItems: elements.length,
      maxItems: elements.length,
    };
  }

  /**
   * Match generic type pattern
   */
  private matchGenericType(typeStr: string): { base: string; args: string[] } | null {
    const match = /^(\w+)<(.+)>$/.exec(typeStr);
    if (!match) return null;

    const base = match[1];
    const argsStr = match[2];
    
    // Split generic arguments handling nested generics
    const args = this.splitGenericArgs(argsStr);

    return { base, args };
  }

  /**
   * Parse generic types like Promise<T>, Response<T>
   */
  private parseGenericType(
    base: string,
    args: string[],
    depth: number,
    warnings: string[]
  ): OpenAPISchema {
    // Handle common generics
    switch (base) {
      case 'Promise':
      case 'Awaited':
        if (args.length > 0) {
          return this.parseTypeString(args[0], depth + 1, warnings);
        }
        break;

      case 'Response':
        // Express Response<T> - extract T as the body type
        if (args.length > 0) {
          return this.parseTypeString(args[0], depth + 1, warnings);
        }
        break;

      case 'Map':
        if (args.length >= 2) {
          return {
            type: 'object',
            additionalProperties: this.parseTypeString(args[1], depth + 1, warnings),
          };
        }
        break;

      case 'Set':
        if (args.length > 0) {
          return {
            type: 'array',
            items: this.parseTypeString(args[0], depth + 1, warnings),
            uniqueItems: true,
          };
        }
        break;

      case 'Record':
        // Record<K, V> - object with additionalProperties of type V
        if (args.length >= 2) {
          return {
            type: 'object',
            additionalProperties: this.parseTypeString(args[1], depth + 1, warnings),
          };
        }
        break;

      case 'Partial':
      case 'Required':
      case 'Readonly':
        // Utility types - simplify to base type with warning
        if (args.length > 0) {
          warnings.push(`Utility type ${base}<${args[0]}> simplified to base type`);
          return this.parseTypeString(args[0], depth + 1, warnings);
        }
        break;

      case 'Pick':
      case 'Omit':
        // Pick/Omit - simplify to base type with warning
        if (args.length > 0) {
          warnings.push(`Utility type ${base}<${args.join(', ')}> simplified to base type`);
          return this.parseTypeString(args[0], depth + 1, warnings);
        }
        break;

      case 'Array':
        // Array<T> - convert to array schema
        if (args.length > 0) {
          return {
            type: 'array',
            items: this.parseTypeString(args[0], depth + 1, warnings),
          };
        }
        break;
    }

    // Default: return reference with generic args as note
    warnings.push(`Generic type ${base}<${args.join(', ')}> simplified`);
    return {
      $ref: `#/components/schemas/${base}`,
    };
  }

  /**
   * Extract first generic argument
   */
  private extractGenericArg(typeStr: string): string | null {
    const start = typeStr.indexOf('<');
    const end = typeStr.lastIndexOf('>');
    if (start === -1 || end === -1) return null;
    return typeStr.slice(start + 1, end);
  }

  /**
   * Split union types accounting for nested generics
   */
  private splitTypeUnion(typeStr: string): string[] {
    return this.splitByDelimiter(typeStr, '|');
  }

  /**
   * Split intersection types accounting for nested generics
   */
  private splitTypeIntersection(typeStr: string): string[] {
    return this.splitByDelimiter(typeStr, '&');
  }

  /**
   * Split by delimiter, respecting nesting
   */
  private splitByDelimiter(str: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '<' || char === '(' || char === '[' || char === '{') {
        depth++;
        current += char;
      } else if (char === '>' || char === ')' || char === ']' || char === '}') {
        depth--;
        current += char;
      } else if (depth === 0 && str.slice(i).startsWith(delimiter)) {
        if (current.trim()) {
          result.push(current.trim());
        }
        current = '';
        i += delimiter.length - 1;
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      result.push(current.trim());
    }

    return result;
  }

  /**
   * Split object members (properties)
   */
  private splitObjectMembers(content: string): string[] {
    return this.splitByDelimiter(content, ';')
      .flatMap(s => this.splitByDelimiter(s, ','))
      .filter(s => s.trim());
  }

  /**
   * Split tuple elements
   */
  private splitTupleElements(content: string): string[] {
    return this.splitByDelimiter(content, ',');
  }

  /**
   * Split generic arguments
   */
  private splitGenericArgs(argsStr: string): string[] {
    return this.splitByDelimiter(argsStr, ',');
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(schema: OpenAPISchema, warnings: string[]): number {
    let confidence = 1.0;

    // Reduce confidence for warnings
    confidence -= warnings.length * 0.1;

    // Reduce confidence for references (incomplete resolution)
    if (schema.$ref) {
      confidence -= 0.2;
    }

    // Reduce confidence for empty schemas
    if (!schema.type && !schema.$ref && !schema.oneOf && !schema.allOf) {
      confidence -= 0.3;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Clear type cache
   */
  clearCache(): void {
    this.typeCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.typeCache.size,
      keys: Array.from(this.typeCache.keys()),
    };
  }

  /**
   * Convert TypeDefinition to OpenAPI schema
   */
  typeDefinitionToSchema(typeDef: TypeDefinition): OpenAPISchema {
    if (typeDef.enumValues) {
      return {
        type: 'string',
        enum: typeDef.enumValues,
      };
    }

    if (typeDef.properties) {
      const properties: Record<string, OpenAPISchema> = {};
      const required: string[] = [];

      for (const [key, prop] of Object.entries(typeDef.properties)) {
        properties[key] = this.typeDefinitionToSchema(prop);
        if (!prop.optional) {
          required.push(key);
        }
      }

      const schema: OpenAPISchema = {
        type: 'object',
        properties,
      };

      if (required.length > 0) {
        schema.required = required;
      }

      return schema;
    }

    if (typeDef.elementType) {
      return {
        type: 'array',
        items: this.typeDefinitionToSchema(typeDef.elementType),
      };
    }

    const result = this.inferFromTypeString(typeDef.type);
    return result.schema;
  }
}
