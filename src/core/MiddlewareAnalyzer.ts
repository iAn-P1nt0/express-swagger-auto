/**
 * Analyzes middleware stack to extract security and documentation metadata
 * Particularly useful for detecting authentication guards and custom middleware
 */

export interface MiddlewareMetadata {
  name: string;
  type: 'auth' | 'validation' | 'error-handler' | 'logging' | 'cors' | 'custom' | 'unknown';
  description: string;
  security?: {
    type: 'jwt' | 'bearer' | 'api-key' | 'custom';
    scheme: string;
    bearerFormat?: string;
    description: string;
  };
  parameters?: Array<{
    name: string;
    in: 'header' | 'query' | 'cookie';
    required: boolean;
    description: string;
  }>;
}

export interface RouteMiddlewareInfo {
  path: string;
  method: string;
  middlewares: MiddlewareMetadata[];
  isProtected: boolean;
  securitySchemes: Array<{
    type: string;
    description: string;
  }>;
}

export class MiddlewareAnalyzer {
  /**
   * Analyze middleware chain for a route
   */
  analyzeRouteMiddleware(
    routeLayer: any,
    _basePath: string = ''
  ): MiddlewareMetadata[] {
    const middlewares: MiddlewareMetadata[] = [];

    if (!routeLayer.route) {
      return middlewares;
    }

    // Analyze route-level middleware stack
    const stack = routeLayer.route.stack || [];
    for (const layer of stack) {
      const middleware = this.analyzeMiddleware(layer);
      if (middleware) {
        middlewares.push(middleware);
      }
    }

    return middlewares;
  }

  /**
   * Analyze individual middleware function
   */
  private analyzeMiddleware(layer: any): MiddlewareMetadata | null {
    const name = layer.name || 'anonymous';
    const fnString = layer.handle?.toString() || '';

    // Detect common middleware patterns
    if (this.isAuthGuard(name, fnString)) {
      return this.createAuthMiddleware(name, fnString);
    }

    if (this.isValidationMiddleware(name, fnString)) {
      return this.createValidationMiddleware(name, fnString);
    }

    if (this.isErrorHandler(name, fnString)) {
      return {
        name,
        type: 'error-handler',
        description: 'Error handling middleware',
      };
    }

    if (this.isLoggingMiddleware(name, fnString)) {
      return {
        name,
        type: 'logging',
        description: 'Request logging middleware',
      };
    }

    if (this.isCorsMiddleware(name, fnString)) {
      return {
        name,
        type: 'cors',
        description: 'CORS (Cross-Origin Resource Sharing) middleware',
      };
    }

    // Return unknown middleware with basic info
    if (name !== 'router' && name !== 'bound dispatch') {
      return {
        name,
        type: 'unknown',
        description: `Custom middleware: ${name}`,
      };
    }

    return null;
  }

  /**
   * Detect if middleware is an authentication guard
   */
  private isAuthGuard(name: string, fnString: string): boolean {
    const authPatterns = [
      /AuthGuard/i,
      /authenticate/i,
      /authorize/i,
      /jwt/i,
      /bearer/i,
      /oauth/i,
      /passport/i,
      /auth\s*\(/i,
    ];

    return (
      authPatterns.some(pattern => pattern.test(name)) ||
      authPatterns.some(pattern => pattern.test(fnString))
    );
  }

  /**
   * Create auth middleware metadata with security scheme info
   */
  private createAuthMiddleware(name: string, fnString: string): MiddlewareMetadata {
    let securityType: 'jwt' | 'bearer' | 'api-key' | 'custom' = 'custom';
    let bearerFormat = 'JWT';
    let description = 'Authentication required';

    if (/jwt/i.test(fnString) || /jwt/i.test(name)) {
      securityType = 'jwt';
      bearerFormat = 'JWT';
      description = 'JWT (JSON Web Token) authentication';
    } else if (/bearer/i.test(fnString) || /bearer/i.test(name)) {
      securityType = 'bearer';
      bearerFormat = 'Bearer';
      description = 'Bearer token authentication';
    } else if (/api[_-]?key/i.test(fnString) || /api[_-]?key/i.test(name)) {
      securityType = 'api-key';
      description = 'API Key authentication';
    }

    return {
      name,
      type: 'auth',
      description: `${name} (${description})`,
      security: {
        type: securityType,
        scheme: name.toLowerCase(),
        bearerFormat,
        description,
      },
      parameters: this.extractSecurityParameters(securityType),
    };
  }

  /**
   * Extract security parameters (e.g., Authorization header)
   */
  private extractSecurityParameters(
    securityType: 'jwt' | 'bearer' | 'api-key' | 'custom'
  ): MiddlewareMetadata['parameters'] {
    switch (securityType) {
      case 'jwt':
      case 'bearer':
        return [
          {
            name: 'Authorization',
            in: 'header',
            required: true,
            description: `${securityType.toUpperCase()} token in format: "${securityType.toUpperCase()} <token>"`,
          },
        ];
      case 'api-key':
        return [
          {
            name: 'X-API-Key',
            in: 'header',
            required: true,
            description: 'API Key for authentication',
          },
        ];
      default:
        return [];
    }
  }

  /**
   * Detect validation middleware
   */
  private isValidationMiddleware(name: string, fnString: string): boolean {
    return /validate|joi|yup|zod|schema|check/i.test(name) ||
           /validate|joi|yup|zod|schema|check/i.test(fnString);
  }

  /**
   * Create validation middleware metadata
   */
  private createValidationMiddleware(
    name: string,
    fnString: string
  ): MiddlewareMetadata {
    let description = 'Input validation middleware';

    if (/joi/i.test(fnString) || /joi/i.test(name)) {
      description = 'Joi schema validation';
    } else if (/yup/i.test(fnString) || /yup/i.test(name)) {
      description = 'Yup schema validation';
    } else if (/zod/i.test(fnString) || /zod/i.test(name)) {
      description = 'Zod schema validation';
    }

    return {
      name,
      type: 'validation',
      description,
    };
  }

  /**
   * Detect error handler middleware
   */
  private isErrorHandler(name: string, fnString: string): boolean {
    // Express error handlers have 4 parameters (err, req, res, next)
    return (
      /error|exception|catch/i.test(name) ||
      /\(err,\s*req,\s*res/i.test(fnString) ||
      /\(\s*err\s*,/.test(fnString)
    );
  }

  /**
   * Detect logging middleware
   */
  private isLoggingMiddleware(name: string, fnString: string): boolean {
    return /log|morgan|winston|bunyan|pino/i.test(name) ||
           /morgan|winston|bunyan|pino/i.test(fnString);
  }

  /**
   * Detect CORS middleware
   */
  private isCorsMiddleware(name: string, fnString: string): boolean {
    return /cors/i.test(name) || /cors/i.test(fnString);
  }

  /**
   * Determine if a route is protected based on middleware analysis
   */
  isRouteProtected(middlewares: MiddlewareMetadata[]): boolean {
    return middlewares.some(m => m.type === 'auth');
  }

  /**
   * Extract security schemes from middlewares
   */
  extractSecuritySchemes(
    middlewares: MiddlewareMetadata[]
  ): Array<{
    name: string;
    type: string;
    description: string;
    scheme?: string;
    bearerFormat?: string;
  }> {
    return middlewares
      .filter(m => m.type === 'auth' && m.security)
      .map(m => ({
        name: m.name,
        type: m.security!.type,
        description: m.description,
        scheme: m.security?.scheme,
        bearerFormat: m.security?.bearerFormat,
      }));
  }

  /**
   * Create a summary of route protection requirements
   */
  createSecuritySummary(middlewares: MiddlewareMetadata[]): {
    requiresAuth: boolean;
    authTypes: string[];
    parameters: MiddlewareMetadata['parameters'];
  } {
    const authMiddlewares = middlewares.filter(m => m.type === 'auth');

    return {
      requiresAuth: authMiddlewares.length > 0,
      authTypes: authMiddlewares.map(m => m.security?.type || 'unknown'),
      parameters: authMiddlewares.flatMap(m => m.parameters || []),
    };
  }
}
