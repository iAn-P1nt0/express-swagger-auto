import type {
  OpenAPISpec,
  GeneratorConfig,
  RouteMetadata,
  OpenAPIPath,
} from '../types';

export class SpecGenerator {
  private config: GeneratorConfig;
  private cachedSpec: OpenAPISpec | null = null;

  constructor(config: GeneratorConfig) {
    this.config = {
      specVersion: '3.1.0',
      enableRuntimeCapture: false,
      ...config,
    };
  }

  generate(routes: RouteMetadata[]): OpenAPISpec {
    // Phase 1: Basic spec generation with paths and info
    // TODO(Phase 2): Add component schema extraction and refs
    // TODO(Phase 3): Include examples and enhanced type inference
    // TODO(Phase 4): Implement caching and watch mode optimization

    const spec: OpenAPISpec = {
      openapi: this.config.specVersion || '3.1.0',
      info: this.config.info,
      servers: this.config.servers || [],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: this.config.securitySchemes || {},
      },
      tags: [],
    };

    const pathsMap = this.groupRoutesByPath(routes);

    for (const [path, methods] of pathsMap.entries()) {
      spec.paths[path] = {};

      for (const [method, route] of methods.entries()) {
        spec.paths[path][method] = this.createPathItem(route);
      }
    }

    this.cachedSpec = spec;
    return spec;
  }

  private groupRoutesByPath(
    routes: RouteMetadata[]
  ): Map<string, Map<string, RouteMetadata>> {
    const pathsMap = new Map<string, Map<string, RouteMetadata>>();

    for (const route of routes) {
      if (!pathsMap.has(route.path)) {
        pathsMap.set(route.path, new Map());
      }

      pathsMap.get(route.path)!.set(route.method.toLowerCase(), route);
    }

    return pathsMap;
  }

  private createPathItem(route: RouteMetadata): OpenAPIPath {
    // Phase 1: Basic path item with minimal fields
    // TODO(Phase 2): Add parameter extraction from path params
    // TODO(Phase 3): Enhance with decorator and JSDoc metadata

    const pathItem: OpenAPIPath = {
      summary: route.metadata?.summary || `${route.method} ${route.path}`,
      description: route.metadata?.description,
      operationId: this.generateOperationId(route),
      tags: route.metadata?.tags || [],
      parameters: route.metadata?.parameters || this.extractPathParameters(route.path),
      responses: route.metadata?.responses || {
        '200': {
          description: 'Successful response',
        },
      },
    };

    if (route.metadata?.requestBody) {
      pathItem.requestBody = route.metadata.requestBody;
    }

    return pathItem;
  }

  private generateOperationId(route: RouteMetadata): string {
    const pathSegments = route.path
      .split('/')
      .filter(Boolean)
      .map((seg) => seg.replace(/[^a-zA-Z0-9]/g, ''))
      .join('_');

    return `${route.method.toLowerCase()}_${pathSegments || 'root'}`;
  }

  private extractPathParameters(path: string): any[] {
    // TODO(Phase 2): Robust path parameter extraction with type inference
    const paramRegex = /:(\w+)/g;
    const params: any[] = [];
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push({
        name: match[1],
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    }

    return params;
  }

  getCachedSpec(): OpenAPISpec | null {
    return this.cachedSpec;
  }

  updateConfig(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config };
    this.cachedSpec = null;
  }
}
