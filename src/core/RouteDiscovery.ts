import type { ExpressApp, RouteMetadata } from '../types';

export class RouteDiscovery {
  private routes: RouteMetadata[] = [];

  discover(app: ExpressApp): RouteMetadata[] {
    this.routes = [];
    this.extractRoutes(app);
    return this.routes;
  }

  private extractRoutes(app: ExpressApp, basePath = ''): void {
    // Phase 1: Minimal route extraction from Express router stack
    // TODO(Phase 2): Add nested router traversal with proper path composition
    // TODO(Phase 3): Extract middleware metadata and decorator information

    if (!app || typeof app !== 'object') {
      return;
    }

    const stack = (app as any)._router?.stack || (app as any).stack;

    if (!Array.isArray(stack)) {
      return;
    }

    for (const layer of stack) {
      if (!layer.route) {
        if (layer.name === 'router' && layer.handle?.stack) {
          const path = layer.regexp
            ? this.extractPathFromRegexp(layer.regexp)
            : '';
          this.extractRoutes(layer.handle, basePath + path);
        }
        continue;
      }

      const route = layer.route;
      const methods = Object.keys(route.methods);

      for (const method of methods) {
        const fullPath = this.normalizePath(basePath + route.path);

        this.routes.push({
          method: method.toUpperCase(),
          path: fullPath,
          handler: route.stack[0]?.handle || (() => {}),
          metadata: this.extractMetadataFromHandler(route.stack[0]?.handle),
        });
      }
    }
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
