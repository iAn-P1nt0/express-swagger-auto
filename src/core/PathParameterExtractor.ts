/**
 * Extracts path parameters, query parameters, and other route segments
 * Converts Express path patterns to OpenAPI parameter definitions
 */

export interface PathParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: {
    type: 'string' | 'number' | 'integer' | 'boolean';
    pattern?: string;
    enum?: Array<string | number>;
  };
  description: string;
}

export interface ParsedPath {
  normalized: string;
  parameters: PathParameter[];
  isRegex: boolean;
  pattern: string;
}

export class PathParameterExtractor {
  /**
   * Extract parameters from an Express path pattern
   * Handles :id, :slug, /users/:userId/posts/:postId, etc.
   */
  extractPathParameters(path: string | RegExp): ParsedPath {
    // Check if path is a regex pattern
    if (path instanceof RegExp) {
      const pattern = path.source;
      // Try to extract parameters from regex
      return this.extractFromRegex(pattern);
    }

    const normalized = this.normalizePath(path);
    const parameters: PathParameter[] = [];

    // Extract named parameters like :id, :userId, etc.
    const paramPattern = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = paramPattern.exec(path)) !== null) {
      const paramName = match[1];

      // Avoid duplicates
      if (!parameters.find(p => p.name === paramName)) {
        parameters.push(
          this.createPathParameter(paramName, path)
        );
      }
    }

    return {
      normalized,
      parameters,
      isRegex: false,
      pattern: path,
    };
  }

  /**
   * Create a PathParameter for a given parameter name
   */
  private createPathParameter(paramName: string, _path: string): PathParameter {
    const type = this.inferParameterType(paramName);
    const pattern = this.inferParameterPattern(paramName);

    return {
      name: paramName,
      in: 'path',
      required: true,
      schema: {
        type,
        pattern,
      },
      description: this.generateParameterDescription(paramName),
    };
  }

  /**
   * Infer parameter type based on naming conventions
   */
  private inferParameterType(
    paramName: string
  ): 'string' | 'number' | 'integer' | 'boolean' {
    // Check for ID patterns
    if (/id$/i.test(paramName) || /Id$/i.test(paramName)) {
      return 'integer';
    }

    // Check for numeric patterns
    if (/count|page|limit|offset|size/i.test(paramName)) {
      return 'integer';
    }

    // Check for boolean patterns
    if (/enabled|disabled|active|inactive|deleted|archived/i.test(paramName)) {
      return 'boolean';
    }

    // Default to string
    return 'string';
  }

  /**
   * Infer regex pattern for parameter validation
   */
  private inferParameterPattern(paramName: string): string | undefined {
    // UUID pattern
    if (/uuid|guid/i.test(paramName)) {
      return '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    }

    // Numeric ID pattern
    if (/id$/i.test(paramName)) {
      return '^[0-9]+$';
    }

    // Slug pattern (alphanumeric with hyphens)
    if (/slug|name/i.test(paramName)) {
      return '^[a-z0-9-]+$';
    }

    // Email pattern
    if (/email|mail/i.test(paramName)) {
      return '^[^@]+@[^@]+\\.[^@]+$';
    }

    return undefined;
  }

  /**
   * Generate human-readable parameter description
   */
  private generateParameterDescription(paramName: string): string {
    // Convert camelCase to readable description
    const readableName = paramName
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();

    return `The ${readableName} identifier`;
  }

  /**
   * Extract parameters from regex pattern
   */
  private extractFromRegex(pattern: string): ParsedPath {
    const parameters: PathParameter[] = [];

    // Try to extract named groups like (?<id>\d+)
    const namedGroupPattern = /\(\?<([a-zA-Z_][a-zA-Z0-9_]*)>([^)]+)\)/g;
    let match;

    while ((match = namedGroupPattern.exec(pattern)) !== null) {
      const [, paramName, regexPattern] = match;
      parameters.push({
        name: paramName,
        in: 'path',
        required: true,
        schema: {
          type: this.inferTypeFromRegex(regexPattern),
          pattern: regexPattern,
        },
        description: this.generateParameterDescription(paramName),
      });
    }

    return {
      normalized: pattern,
      parameters,
      isRegex: true,
      pattern,
    };
  }

  /**
   * Infer parameter type from regex pattern
   */
  private inferTypeFromRegex(
    pattern: string
  ): 'string' | 'number' | 'integer' | 'boolean' {
    if (/^\d+$/.test(pattern) || /\\d/.test(pattern)) {
      return 'integer';
    }
    return 'string';
  }

  /**
   * Normalize Express path to OpenAPI path
   * Converts /users/:id/posts/:postId to /users/{id}/posts/{postId}
   */
  normalizePath(path: string): string {
    if (typeof path === 'string') {
      return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
    }
    return '';
  }

  /**
   * Extract query parameters from request documentation
   * Note: This would typically come from JSDoc or controller analysis
   */
  extractQueryParameters(
    docString: string | undefined
  ): PathParameter[] {
    if (!docString) return [];

    const queryParams: PathParameter[] = [];
    const queryPattern = /@query\s+{([^}]+)}\s+(\w+)\s*-?\s*(.+?)(?=@|\n|$)/g;
    let match;

    while ((match = queryPattern.exec(docString)) !== null) {
      const [, type, name, description] = match;
      queryParams.push({
        name,
        in: 'query',
        required: false,
        schema: {
          type: this.normalizeType(type) as any,
        },
        description: description.trim(),
      });
    }

    return queryParams;
  }

  /**
   * Normalize type names from various formats
   */
  private normalizeType(type: string): string {
    const typeMap: Record<string, string> = {
      int: 'integer',
      int32: 'integer',
      int64: 'integer',
      number: 'number',
      float: 'number',
      double: 'number',
      bool: 'boolean',
      str: 'string',
      text: 'string',
      uuid: 'string',
    };

    const normalized = type.toLowerCase().trim();
    return typeMap[normalized] || normalized;
  }

  /**
   * Combine path and query parameters for a complete parameter list
   */
  combineParameters(
    pathParams: PathParameter[],
    queryParams: PathParameter[]
  ): PathParameter[] {
    return [...pathParams, ...queryParams].reduce((acc, param) => {
      // Avoid duplicates
      if (!acc.find(p => p.name === param.name && p.in === param.in)) {
        acc.push(param);
      }
      return acc;
    }, [] as PathParameter[]);
  }

  /**
   * Convert PathParameter to OpenAPI Parameter format
   */
  toOpenAPIParameter(param: PathParameter): {
    name: string;
    in: string;
    required: boolean;
    description: string;
    schema?: Record<string, any>;
    style?: string;
    explode?: boolean;
  } {
    const openAPIParam: any = {
      name: param.name,
      in: param.in,
      required: param.required,
      description: param.description,
    };

    if (param.schema) {
      openAPIParam.schema = {
        type: param.schema.type,
      };

      if (param.schema.pattern) {
        openAPIParam.schema.pattern = param.schema.pattern;
      }

      if (param.schema.enum) {
        openAPIParam.schema.enum = param.schema.enum;
      }
    }

    // Add style for query parameters (allow comma-separated arrays)
    if (param.in === 'query') {
      openAPIParam.style = 'form';
      openAPIParam.explode = true;
    }

    return openAPIParam;
  }
}
