import type { ExpressApp, RouteMetadata } from '../types';

export class RouteDiscovery {
  private routes: RouteMetadata[] = [];
  private visitedLayers = new Set<any>();

  discover(app: ExpressApp): RouteMetadata[] {
    this.routes = [];
    this.visitedLayers.clear();
    this.extractRoutes(app);
    return this.routes;
  }

  private extractRoutes(app: ExpressApp, basePath = ''): void {
    // Phase 2: Enhanced route extraction with nested router support
    // TODO(Phase 3): Extract middleware metadata and decorator information

    if (!app || typeof app !== 'object') {
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

      this.routes.push({
        method: method.toUpperCase(),
        path: fullPath,
        handler: primaryHandler,
        metadata: this.extractMetadataFromHandler(primaryHandler),
      });
    }
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
    // TODO(Phase 3): Extract decorator metadata from handler
    // TODO(Phase 3): Parse JSDoc comments from handler source
    if (!handler || typeof handler !== 'function') {
      return undefined;
    }

    return (handler as any).__openapi_metadata;
  }

  getRoutes(): RouteMetadata[] {
    return this.routes;
  }
}
