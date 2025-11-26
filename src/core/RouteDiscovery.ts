import type { ExpressApp, RouteMetadata, OpenAPIParameter } from '../types';
import type { JsDocParser } from '../parsers/JsDocParser';
import type { JsDocMetadata } from '../parsers/JsDocTransformer';
import { MiddlewareAnalyzer, type MiddlewareMetadata } from './MiddlewareAnalyzer';
import { PathParameterExtractor, type PathParameter } from './PathParameterExtractor';
import { RouteMetadataEnricher, type EnrichedRouteMetadata } from './RouteMetadataEnricher';
import { SchemaExtractor } from '../schema/SchemaExtractor';

export interface RouteDiscoveryOptions {
  /**
   * Enable JSDoc comment parsing for route metadata
   * Requires sourceFiles to be specified
   */
  enableJsDocParsing?: boolean;

  /**
   * JSDoc parser instance (optional)
   * If not provided and enableJsDocParsing is true, a default parser will be used
   */
  jsDocParser?: JsDocParser;

  /**
   * Merge strategy for combining JSDoc and decorator metadata
   * - 'jsdoc-priority': JSDoc overrides decorator metadata
   * - 'decorator-priority': Decorator metadata overrides JSDoc
   * - 'merge': Deep merge both sources (default)
   */
  metadataMergeStrategy?: 'jsdoc-priority' | 'decorator-priority' | 'merge';

  /**
   * Enable middleware analysis for security detection
   */
  enableMiddlewareAnalysis?: boolean;

  /**
   * Enable path parameter extraction and normalization
   */
  enablePathParameterExtraction?: boolean;

  /**
   * Enable schema extraction from controllers
   */
  enableSchemaExtraction?: boolean;

  /**
   * Enable metadata enrichment (tags, operationId generation)
   */
  enableMetadataEnrichment?: boolean;

  /**
   * Custom tags to add to all routes
   */
  customTags?: string[];

  /**
   * Generate operationId automatically if not provided
   */
  generateOperationId?: boolean;
}

export class RouteDiscovery {
  private routes: RouteMetadata[] = [];
  private enrichedRoutes: EnrichedRouteMetadata[] = [];
  private visitedLayers = new Set<any>();
  private jsDocMetadataMap: Map<string, JsDocMetadata> = new Map();

  // Phase 1 & 2 analyzers
  private middlewareAnalyzer: MiddlewareAnalyzer;
  private pathParameterExtractor: PathParameterExtractor;
  private routeMetadataEnricher: RouteMetadataEnricher;
  private schemaExtractor: SchemaExtractor;
  private options: RouteDiscoveryOptions = {};

  constructor() {
    this.middlewareAnalyzer = new MiddlewareAnalyzer();
    this.pathParameterExtractor = new PathParameterExtractor();
    this.routeMetadataEnricher = new RouteMetadataEnricher();
    this.schemaExtractor = new SchemaExtractor();
  }

  discover(app: ExpressApp, options?: RouteDiscoveryOptions): RouteMetadata[] {
    this.routes = [];
    this.enrichedRoutes = [];
    this.visitedLayers.clear();
    this.jsDocMetadataMap.clear();
    this.options = options || {};

    // Parse JSDoc comments if enabled
    if (options?.enableJsDocParsing && options?.jsDocParser) {
      this.parseJsDocMetadata(options.jsDocParser);
    }

    this.extractRoutes(app);

    // If enrichment is enabled, return enriched routes
    if (this.shouldEnrichRoutes()) {
      return this.enrichedRoutes as unknown as RouteMetadata[];
    }

    return this.routes;
  }

  /**
   * Get enriched routes with full metadata
   */
  getEnrichedRoutes(): EnrichedRouteMetadata[] {
    return this.enrichedRoutes;
  }

  /**
   * Check if any enrichment option is enabled
   */
  private shouldEnrichRoutes(): boolean {
    return !!(
      this.options.enableMiddlewareAnalysis ||
      this.options.enablePathParameterExtraction ||
      this.options.enableSchemaExtraction ||
      this.options.enableMetadataEnrichment
    );
  }

  /**
   * Parse JSDoc comments and build metadata map
   */
  private parseJsDocMetadata(parser: JsDocParser): void {
    const parsedRoutes = parser.parse();

    for (const { metadata } of parsedRoutes) {
      if (metadata.method && metadata.path) {
        const key = this.makeRouteKey(metadata.method, metadata.path);
        this.jsDocMetadataMap.set(key, metadata);
      }
    }
  }

  /**
   * Create a unique key for route lookup
   */
  private makeRouteKey(method: string, path: string): string {
    return `${method.toUpperCase()}:${this.normalizePath(path)}`;
  }

  private extractRoutes(app: ExpressApp, basePath = ''): void {
    // Phase 2: Enhanced route extraction with nested router support
    // TODO(Phase 3): Extract middleware metadata and decorator information

    if (!app) {
      return;
    }

    // Support both app._router.stack and router.stack
    const stack = (app as any)._router?.stack || (app as any).stack;

    if (!Array.isArray(stack)) {
      return;
    }

    for (const layer of stack) {
      // Avoid infinite loops by tracking visited layers
      if (this.visitedLayers.has(layer)) {
        continue;
      }
      this.visitedLayers.add(layer);

      // Handle regular routes
      if (layer.route) {
        this.extractRoute(layer, basePath);
        continue;
      }

      // Handle nested routers
      if (layer.name === 'router' && layer.handle) {
        const nestedPath = this.extractPathFromLayer(layer);
        const fullBasePath = this.normalizePath(basePath + nestedPath);
        this.extractRoutes(layer.handle, fullBasePath);
        continue;
      }

      // Handle bound routers (app.use('/prefix', router))
      if (layer.handle && typeof layer.handle === 'function' && layer.handle.stack) {
        const nestedPath = this.extractPathFromLayer(layer);
        const fullBasePath = this.normalizePath(basePath + nestedPath);
        this.extractRoutes(layer.handle, fullBasePath);
      }
    }
  }

  private extractRoute(layer: any, basePath: string): void {
    const route = layer.route;
    if (!route) return;

    const methods = Object.keys(route.methods);

    for (const method of methods) {
      const fullPath = this.normalizePath(basePath + route.path);

      // Get all handlers from the route stack
      const handlers = route.stack || [];
      const primaryHandler = handlers[handlers.length - 1]?.handle || (() => {});

      // Extract decorator metadata from handler
      const decoratorMetadata = this.extractMetadataFromHandler(primaryHandler);

      // Get JSDoc metadata if available
      const routeKey = this.makeRouteKey(method, fullPath);
      const jsDocMetadata = this.jsDocMetadataMap.get(routeKey);

      // Merge metadata from both sources
      const mergedMetadata = this.mergeMetadata(decoratorMetadata, jsDocMetadata);

      const baseRoute: RouteMetadata = {
        method: method.toUpperCase(),
        path: fullPath,
        handler: primaryHandler,
        metadata: mergedMetadata,
      };

      this.routes.push(baseRoute);

      // Enrich route if any enrichment option is enabled
      if (this.shouldEnrichRoutes()) {
        const enrichedRoute = this.enrichRoute(baseRoute, layer, jsDocMetadata);
        this.enrichedRoutes.push(enrichedRoute);
      }
    }
  }

  /**
   * Enrich a route with Phase 1 & 2 analyzers
   */
  private enrichRoute(
    baseRoute: RouteMetadata,
    layer: any,
    jsDocMetadata?: JsDocMetadata
  ): EnrichedRouteMetadata {
    let middlewares: MiddlewareMetadata[] = [];
    let parameters: PathParameter[] = [];

    // Analyze middleware (Phase 1)
    if (this.options.enableMiddlewareAnalysis) {
      middlewares = this.middlewareAnalyzer.analyzeRouteMiddleware(layer);
    }

    // Extract path parameters (Phase 1)
    if (this.options.enablePathParameterExtraction) {
      const paramResult = this.pathParameterExtractor.extractPathParameters(baseRoute.path);
      parameters = paramResult.parameters;
    }

    // Extract schema from controller (Phase 2)
    if (this.options.enableSchemaExtraction) {
      const controllerCode = baseRoute.handler?.toString() || '';
      const routeSchema = this.schemaExtractor.extractRouteSchema(
        baseRoute.path,
        baseRoute.method,
        {
          controllerCode,
          jsDocComment: jsDocMetadata?.description,
        }
      );

      // Merge schema info into metadata
      if (routeSchema.schema && baseRoute.metadata) {
        if (routeSchema.schema.requestBody && !baseRoute.metadata.requestBody) {
          baseRoute.metadata.requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: routeSchema.schema.requestBody,
              },
            },
          };
        }
        if (routeSchema.schema.responses && !baseRoute.metadata.responses) {
          baseRoute.metadata.responses = {};
          for (const [code, response] of Object.entries(routeSchema.schema.responses)) {
            baseRoute.metadata.responses[code] = {
              description: response.description || `Response ${code}`,
            };
          }
        }
      }
    }

    // Enrich metadata (Phase 1)
    const enriched = this.routeMetadataEnricher.enrich(baseRoute, {
      middlewares,
      parameters,
      jsDocMetadata,
      customTags: this.options.customTags,
      generateOperationId: this.options.generateOperationId ?? true,
    });

    return enriched;
  }

  private extractPathFromLayer(layer: any): string {
    // Try to get path from layer.regexp
    if (layer.regexp) {
      const extracted = this.extractPathFromRegexp(layer.regexp);
      if (extracted) return extracted;
    }

    // Try to get path from layer.path
    if (typeof layer.path === 'string') {
      return layer.path;
    }

    return '';
  }

  private extractPathFromRegexp(regexp: RegExp): string {
    // Simplified path extraction from Express regex
    // TODO(Phase 2): Improve regex parsing for complex route patterns
    const str = regexp.toString();
    const match = str.match(/^\/\^\\\/(.+?)\\\//);
    return match ? `/${match[1].replace(/\\\//g, '/')}` : '';
  }

  private normalizePath(path: string): string {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  private extractMetadataFromHandler(handler: any): RouteMetadata['metadata'] {
    // Phase 1: Placeholder for metadata extraction
    // Phase 3: Extract decorator metadata from handler
    if (!handler || typeof handler !== 'function') {
      return undefined;
    }

    return (handler as any).__openapi_metadata;
  }

  /**
   * Merge decorator and JSDoc metadata
   * Phase 3: Combines metadata from multiple sources
   */
  private mergeMetadata(
    decoratorMetadata?: RouteMetadata['metadata'],
    jsDocMetadata?: JsDocMetadata
  ): RouteMetadata['metadata'] {
    // If neither source has metadata, return undefined
    if (!decoratorMetadata && !jsDocMetadata) {
      return undefined;
    }

    // If only one source, return it
    if (!decoratorMetadata) {
      return jsDocMetadata;
    }

    if (!jsDocMetadata) {
      return decoratorMetadata;
    }

    // Merge both sources
    // JSDoc metadata takes priority for documentation fields
    // Decorator metadata takes priority for structured data (parameters, responses)
    return {
      summary: jsDocMetadata.summary || decoratorMetadata.summary,
      description: jsDocMetadata.description || decoratorMetadata.description,
      tags: this.mergeTags(decoratorMetadata.tags, jsDocMetadata.tags),
      parameters: this.mergeParameters(decoratorMetadata.parameters, jsDocMetadata.parameters),
      requestBody: jsDocMetadata.requestBody || decoratorMetadata.requestBody,
      responses: this.mergeResponses(decoratorMetadata.responses, jsDocMetadata.responses),
    };
  }

  private mergeTags(decoratorTags?: string[], jsDocTags?: string[]): string[] | undefined {
    const allTags = [...(decoratorTags || []), ...(jsDocTags || [])];
    return allTags.length > 0 ? Array.from(new Set(allTags)) : undefined;
  }

  private mergeParameters(
    decoratorParams?: JsDocMetadata['parameters'],
    jsDocParams?: JsDocMetadata['parameters']
  ): JsDocMetadata['parameters'] {
    if (!decoratorParams && !jsDocParams) return undefined;
    if (!decoratorParams) return jsDocParams;
    if (!jsDocParams) return decoratorParams;

    // Merge parameters by name+location
    const paramMap = new Map<string, OpenAPIParameter>();

    for (const param of decoratorParams) {
      const key = `${param.name}:${param.in}`;
      paramMap.set(key, param);
    }

    for (const param of jsDocParams) {
      const key = `${param.name}:${param.in}`;
      if (!paramMap.has(key)) {
        paramMap.set(key, param);
      }
    }

    return Array.from(paramMap.values());
  }

  private mergeResponses(
    decoratorResponses?: JsDocMetadata['responses'],
    jsDocResponses?: JsDocMetadata['responses']
  ): JsDocMetadata['responses'] {
    if (!decoratorResponses && !jsDocResponses) return undefined;
    if (!decoratorResponses) return jsDocResponses;
    if (!jsDocResponses) return decoratorResponses;

    // JSDoc responses override decorator responses for same status code
    return {
      ...decoratorResponses,
      ...jsDocResponses,
    };
  }

  getRoutes(): RouteMetadata[] {
    return this.routes;
  }
}
