import { Block } from 'comment-parser';
import { OpenAPIParameter, OpenAPIResponse, OpenAPIRequestBody } from '../types';

export interface TransformOptions {
  defaultTags?: string[];
  strictMode?: boolean; // Throw on invalid JSDoc
}

export interface JsDocMetadata {
  method?: string;
  path?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  responses?: Record<string, OpenAPIResponse>;
  requestBody?: OpenAPIRequestBody;
  security?: Array<Record<string, string[]>>;
}

/**
 * Transforms JSDoc comments into OpenAPI RouteMetadata
 * Phase 3: JSDoc parser implementation
 *
 * Supported JSDoc tags:
 * - @openapi - Marks comment as OpenAPI documentation
 * - @route METHOD /path - Route method and path
 * - @summary - Short description
 * - @description - Long description
 * - @tags tag1, tag2 - OpenAPI tags
 * - @param {type} name.location[.required] - description
 * - @response statusCode - description
 * - @bodyContent {contentType} schemaName
 * - @security schemeName[]
 */
export class JsDocTransformer {
  private options: Required<TransformOptions>;

  constructor(options: TransformOptions = {}) {
    this.options = {
      defaultTags: options.defaultTags ?? [],
      strictMode: options.strictMode ?? false,
    };
  }

  /**
   * Transform a JSDoc comment block into JsDocMetadata
   */
  transform(comment: Block): JsDocMetadata | null {
    try {
      const metadata: JsDocMetadata = {};

      // Extract route method and path from @route tag
      const routeTag = comment.tags.find((t) => t.tag === 'route');
      if (routeTag) {
        // comment-parser puts first word in name, rest in description
        const routeString = `${routeTag.name} ${routeTag.description}`.trim();
        const [method, path] = this.parseRouteTag(routeString);
        if (method && path) {
          metadata.method = method;
          metadata.path = path;
        }
      }

      // Extract summary
      const summaryTag = comment.tags.find((t) => t.tag === 'summary');
      if (summaryTag) {
        // Combine name and description for full summary text
        const fullSummary = `${summaryTag.name} ${summaryTag.description}`.trim();
        metadata.summary = fullSummary;
      } else if (comment.description) {
        // Use main description as summary if no @summary tag
        metadata.summary = comment.description.split('\n')[0];
      }

      // Extract description
      const descTag = comment.tags.find((t) => t.tag === 'description');
      if (descTag) {
        // Combine name and description for full description text
        const fullDescription = `${descTag.name} ${descTag.description}`.trim();
        metadata.description = fullDescription;
      } else if (comment.description) {
        metadata.description = comment.description;
      }

      // Extract tags
      const tagsTag = comment.tags.find((t) => t.tag === 'tags');
      if (tagsTag) {
        // Combine name and description to get all tags
        const tagString = `${tagsTag.name} ${tagsTag.description}`.trim();
        metadata.tags = tagString.split(',').map((t) => t.trim()).filter(Boolean);
      } else if (this.options.defaultTags.length > 0) {
        metadata.tags = this.options.defaultTags;
      }

      // Extract parameters
      const paramTags = comment.tags.filter((t) => t.tag === 'param' || t.tag === 'parameter');
      if (paramTags.length > 0) {
        metadata.parameters = paramTags.map((tag) => this.parseParameterTag(tag));
      }

      // Extract responses
      const responseTags = comment.tags.filter((t) => t.tag === 'response' || t.tag === 'returns');
      if (responseTags.length > 0) {
        metadata.responses = {};
        for (const tag of responseTags) {
          const [statusCode, response] = this.parseResponseTag(tag);
          if (statusCode) {
            metadata.responses[statusCode] = response;
          }
        }
      }

      // Extract request body
      const bodyTag = comment.tags.find((t) => t.tag === 'bodyContent' || t.tag === 'requestBody');
      if (bodyTag) {
        metadata.requestBody = this.parseBodyTag(bodyTag);
      }

      // Extract security
      const securityTags = comment.tags.filter((t) => t.tag === 'security');
      if (securityTags.length > 0) {
        metadata.security = securityTags.map((tag) => {
          const schemeName = tag.name || tag.description || '';
          return { [schemeName]: [] };
        });
      }

      // Return null if no useful metadata extracted
      if (Object.keys(metadata).length === 0) {
        return null;
      }

      return metadata;
    } catch (error) {
      if (this.options.strictMode) {
        throw error;
      }
      console.error('[JsDocTransformer] Failed to transform comment:', error);
      return null;
    }
  }

  /**
   * Parse @route tag: "GET /users" or "/users" (assumes GET)
   */
  private parseRouteTag(routeString: string): [string, string] {
    const trimmed = routeString.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 1) {
      // Assume GET if no method specified
      return ['GET', parts[0]];
    }

    const method = parts[0].toUpperCase();
    const path = parts[1];

    return [method, path];
  }

  /**
   * Parse @param tag: {type} name.in.required - description
   * Examples:
   * - {string} id.path.required - User ID
   * - {number} [limit=10].query - Results limit (optional with default)
   * - {string} email.body - User email
   */
  private parseParameterTag(tag: Block['tags'][0]): OpenAPIParameter {
    const param: OpenAPIParameter = {
      name: '',
      in: 'query', // default
    };

    // Parse name and location from tag.name
    // Format: "name.location.required" or "[name=default].location"
    let nameStr = tag.name || '';

    // Extract location suffix first (e.g., ".query", ".path.required")
    let locationSuffix = '';
    const lastDotMatch = nameStr.match(/\.([a-z]+(?:\.[a-z]+)?)$/);
    if (lastDotMatch) {
      locationSuffix = lastDotMatch[1];
      nameStr = nameStr.substring(0, nameStr.length - lastDotMatch[0].length);
    }

    // Check for optional parameter with default: [name=default]
    const optionalMatch = nameStr.match(/^\[([^=\]]+)(?:=([^\]]+))?\]$/);
    if (optionalMatch) {
      param.name = optionalMatch[1];
      if (optionalMatch[2]) {
        param.schema = { default: this.parseValue(optionalMatch[2]) };
      }
    } else {
      param.name = nameStr;
    }

    // Parse location suffix
    if (locationSuffix) {
      const parts = locationSuffix.split('.');
      const location = parts[0].toLowerCase();
      if (['path', 'query', 'header', 'cookie'].includes(location)) {
        param.in = location as 'path' | 'query' | 'header' | 'cookie';
      }

      if (parts.includes('required')) {
        param.required = true;
      }
    }

    // Parse type from tag.type
    if (tag.type) {
      param.schema = param.schema || {};
      param.schema.type = this.mapJsDocType(tag.type);
    }

    // Parse description (remove leading dash if present)
    if (tag.description) {
      param.description = tag.description.replace(/^-\s*/, '').trim();
    }

    return param;
  }

  /**
   * Parse @response tag: statusCode - description
   * Example: 200 - User found successfully
   */
  private parseResponseTag(tag: Block['tags'][0]): [string, OpenAPIResponse] {
    const statusCode = tag.name || '200';
    // Remove leading dash if present
    const description = (tag.description || `Response ${statusCode}`).replace(/^-\s*/, '').trim();

    const response: OpenAPIResponse = { description };

    return [statusCode, response];
  }

  /**
   * Parse @bodyContent tag: {contentType} schemaName
   * Example: {application/json} CreateUserSchema
   */
  private parseBodyTag(tag: Block['tags'][0]): JsDocMetadata['requestBody'] {
    const contentType = tag.type || 'application/json';
    const schemaName = tag.name || tag.description || '';

    return {
      required: true,
      content: {
        [contentType]: {
          schema: schemaName ? { $ref: `#/components/schemas/${schemaName}` } : {},
        },
      },
    };
  }

  /**
   * Map JSDoc type to OpenAPI type
   */
  private mapJsDocType(jsDocType: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      integer: 'integer',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
      any: 'object',
      '*': 'object',
    };

    return typeMap[jsDocType.toLowerCase()] || 'string';
  }

  /**
   * Parse default value string to appropriate type
   */
  private parseValue(valueStr: string): any {
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
      return parseFloat(valueStr);
    }

    // Try to parse as boolean
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;

    // Try to parse as null
    if (valueStr === 'null') return null;

    // Return as string
    return valueStr;
  }

  /**
   * Merge multiple metadata objects (for combining decorators with JSDoc)
   */
  mergeMetadata(base: JsDocMetadata, override: JsDocMetadata): JsDocMetadata {
    return {
      ...base,
      ...override,
      parameters: [
        ...(base.parameters || []),
        ...(override.parameters || []),
      ],
      responses: {
        ...base.responses,
        ...override.responses,
      },
      tags: Array.from(new Set([
        ...(base.tags || []),
        ...(override.tags || []),
      ])),
    };
  }
}
