/**
 * Enriches basic route metadata with additional information from:
 * - JSDoc comments
 * - Middleware analysis
 * - Path parameter extraction
 * - Custom decorators/tags
 */

import type { RouteMetadata } from '../types';
import type { MiddlewareMetadata } from './MiddlewareAnalyzer';
import type { PathParameter } from './PathParameterExtractor';
import type { JsDocMetadata } from '../parsers/JsDocTransformer';

export interface EnrichedRouteMetadata extends RouteMetadata {
  middlewares: MiddlewareMetadata[];
  parameters: PathParameter[];
  isProtected: boolean;
  securitySchemes: Array<{
    type: string;
    description: string;
  }>;
  tags: string[];
  operationId: string;
  deprecated: boolean;
  examples: Record<string, any>;
  description?: string;
  summary?: string;
}

export class RouteMetadataEnricher {
  /**
   * Enrich route metadata with additional information
   */
  enrich(
    route: RouteMetadata,
    options: {
      middlewares?: MiddlewareMetadata[];
      parameters?: PathParameter[];
      jsDocMetadata?: JsDocMetadata;
      customTags?: string[];
      generateOperationId?: boolean;
    } = {}
  ): EnrichedRouteMetadata {
    const enriched: EnrichedRouteMetadata = {
      ...route,
      middlewares: options.middlewares || [],
      parameters: options.parameters || [],
      isProtected: this.isProtected(options.middlewares),
      securitySchemes: this.extractSecuritySchemes(options.middlewares),
      tags: this.generateTags(route, options),
      operationId: options.generateOperationId
        ? this.generateOperationId(route)
        : this.extractOperationId(route, options.jsDocMetadata),
      deprecated: this.isDeprecated(route, options.jsDocMetadata),
      examples: this.generateExamples(route, options),
    };

    // Merge JSDoc metadata if available
    if (options.jsDocMetadata) {
      enriched.description = options.jsDocMetadata.description || enriched.description;
      enriched.summary = options.jsDocMetadata.summary || enriched.summary;

      if (options.jsDocMetadata.tags) {
        enriched.tags = [
          ...enriched.tags,
          ...options.jsDocMetadata.tags.filter(t => !enriched.tags.includes(t)),
        ];
      }

      if (options.jsDocMetadata.deprecated) {
        enriched.deprecated = true;
      }
    }

    return enriched;
  }

  /**
   * Determine if route is protected based on middlewares
   */
  private isProtected(middlewares: MiddlewareMetadata[] | undefined): boolean {
    if (!middlewares) return false;
    return middlewares.some(m => m.type === 'auth');
  }

  /**
   * Extract security schemes from middlewares
   */
  private extractSecuritySchemes(
    middlewares: MiddlewareMetadata[] | undefined
  ): Array<{
    type: string;
    description: string;
  }> {
    if (!middlewares) return [];

    return middlewares
      .filter(m => m.type === 'auth' && m.security)
      .map(m => ({
        type: m.security!.type,
        description: m.security!.description,
      }));
  }

  /**
   * Generate tags for the route based on path and metadata
   */
  private generateTags(
    route: RouteMetadata,
    options: {
      customTags?: string[];
      jsDocMetadata?: JsDocMetadata;
    }
  ): string[] {
    const tags: Set<string> = new Set();

    // Add custom tags
    if (options.customTags) {
      options.customTags.forEach(tag => tags.add(tag));
    }

    // Extract tag from JSDoc
    if (options.jsDocMetadata?.tags) {
      options.jsDocMetadata.tags.forEach(tag => tags.add(tag));
    }

    // Generate tag from path (first segment)
    const pathParts = route.path.split('/').filter(p => p && p !== ':' && !p.startsWith('{'));
    if (pathParts.length > 0) {
      const firstSegment = pathParts[0];
      // Skip common prefixes like "api", "v1", "v2"
      if (!/^(api|v\d+)$/i.test(firstSegment)) {
        const tag = this.pathSegmentToTag(firstSegment);
        tags.add(tag);
      } else if (pathParts.length > 1) {
        // Use second segment if first is a version or api prefix
        const tag = this.pathSegmentToTag(pathParts[1]);
        tags.add(tag);
      }
    }

    // Add method as secondary tag for operations
    tags.add(this.methodToTag(route.method));

    return Array.from(tags);
  }

  /**
   * Convert path segment to readable tag
   */
  private pathSegmentToTag(segment: string): string {
    // Convert kebab-case and snake_case to Title Case
    return segment
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Convert HTTP method to tag
   */
  private methodToTag(method: string): string {
    const tags: Record<string, string> = {
      GET: 'Retrieve',
      POST: 'Create',
      PUT: 'Update',
      PATCH: 'Modify',
      DELETE: 'Delete',
      HEAD: 'Check',
      OPTIONS: 'Options',
    };

    return tags[method.toUpperCase()] || method;
  }

  /**
   * Generate operationId from route
   */
  private generateOperationId(route: RouteMetadata): string {
    const method = route.method.toLowerCase();
    const pathParts = route.path
      .split('/')
      .filter(p => p && !p.startsWith(':') && !p.startsWith('{'))
      .slice(-2); // Take last 2 parts for conciseness

    const pathName = pathParts.map(this.capitalize).join('');

    return `${method}${pathName}`;
  }

  /**
   * Extract operationId from JSDoc if available
   */
  private extractOperationId(
    route: RouteMetadata,
    jsDocMetadata: JsDocMetadata | undefined
  ): string {
    if (jsDocMetadata?.operationId) {
      return jsDocMetadata.operationId;
    }
    return this.generateOperationId(route);
  }

  /**
   * Check if route is deprecated
   */
  private isDeprecated(
    route: RouteMetadata,
    jsDocMetadata: JsDocMetadata | undefined
  ): boolean {
    if (jsDocMetadata?.deprecated) {
      return true;
    }

    // Check path for deprecation indicators
    return /deprecated|v\d+\/deprecated/i.test(route.path);
  }

  /**
   * Generate example requests/responses
   */
  private generateExamples(
    route: RouteMetadata,
    options: {
      jsDocMetadata?: JsDocMetadata;
    }
  ): Record<string, any> {
    const examples: Record<string, any> = {};

    // Use JSDoc examples if available
    if (options.jsDocMetadata?.examples) {
      return options.jsDocMetadata.examples;
    }

    // Generate basic examples based on route
    examples.success = {
      description: 'Successful response',
      value: this.generateExampleResponse(route),
    };

    if (route.method !== 'GET') {
      examples.request = {
        description: 'Example request',
        value: this.generateExampleRequest(route),
      };
    }

    return examples;
  }

  /**
   * Generate example response based on method and path
   */
  private generateExampleResponse(route: RouteMetadata): Record<string, any> {
    switch (route.method.toUpperCase()) {
      case 'GET':
        return {
          status: 'success',
          data: this.generateResourceExample(route.path),
        };
      case 'POST':
        return {
          status: 'success',
          message: 'Resource created successfully',
          data: this.generateResourceExample(route.path),
        };
      case 'PUT':
      case 'PATCH':
        return {
          status: 'success',
          message: 'Resource updated successfully',
        };
      case 'DELETE':
        return {
          status: 'success',
          message: 'Resource deleted successfully',
        };
      default:
        return { status: 'success' };
    }
  }

  /**
   * Generate example request based on path and method
   */
  private generateExampleRequest(route: RouteMetadata): Record<string, any> {
    if (route.method.toUpperCase() === 'GET') {
      return {};
    }

    return {
      name: 'Example Request',
      description: 'Example payload for ' + route.method.toUpperCase(),
      // This would be enhanced with actual schema information
    };
  }

  /**
   * Generate example resource based on path
   */
  private generateResourceExample(path: string): Record<string, any> {
    const resource: Record<string, any> = {
      id: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add fields based on path
    if (/user/i.test(path)) {
      resource.name = 'John Doe';
      resource.email = 'john@example.com';
    } else if (/product/i.test(path)) {
      resource.name = 'Product Name';
      resource.price = 99.99;
    } else if (/order/i.test(path)) {
      resource.orderNumber = 'ORD-001';
      resource.total = 199.99;
    } else if (/post/i.test(path)) {
      resource.title = 'Example Post';
      resource.content = 'Post content here...';
    }

    return resource;
  }

  /**
   * Merge multiple metadata sources with priority handling
   */
  mergeMetadata(
    base: EnrichedRouteMetadata,
    additional: Partial<EnrichedRouteMetadata>,
    priority: 'base' | 'additional' = 'additional'
  ): EnrichedRouteMetadata {
    if (priority === 'base') {
      // Base takes priority - only add additional fields that don't exist in base
      const result = { ...base } as EnrichedRouteMetadata;
      for (const [key, value] of Object.entries(additional)) {
        if (!(key in base)) {
          (result as any)[key] = value;
        }
      }
      return result;
    }

    // Additional takes priority
    return {
      ...base,
      ...additional,
    };
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Validate enriched metadata completeness
   */
  validate(metadata: EnrichedRouteMetadata): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (!metadata.description && !metadata.summary) {
      warnings.push(`Route ${metadata.method} ${metadata.path} has no description`);
    }

    if (metadata.isProtected && metadata.securitySchemes.length === 0) {
      warnings.push(
        `Route ${metadata.method} ${metadata.path} is marked protected but has no security schemes`
      );
    }

    if (metadata.tags.length === 0) {
      warnings.push(`Route ${metadata.method} ${metadata.path} has no tags`);
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }
}
