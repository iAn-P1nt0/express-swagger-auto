/**
 * Security Detector - Automatically detect security schemes from Express middleware and decorators
 *
 * Detects:
 * - JWT/Bearer tokens in Authorization header
 * - API keys in headers, query params, or cookies
 * - OAuth2 flows
 * - Basic authentication
 */

import type { OpenAPISecurityScheme } from '../types';

export interface SecurityScheme {
  name: string;
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description: string;
  scheme?: string;
  in?: 'header' | 'query' | 'cookie';
  bearerFormat?: string;
}

export class SecurityDetector {
  private detectedSchemes: Map<string, OpenAPISecurityScheme> = new Map();
  private patterns = {
    jwt: /bearer|jwt|token/i,
    apiKey: /api[_-]?key|x-api-key/i,
    oauth: /oauth|oauth2|openid/i,
    basic: /basic/i,
  };

  /**
   * Detect security schemes from middleware chain
   */
  detectFromMiddleware(middlewareChain: any[]): Map<string, OpenAPISecurityScheme> {
    const detected = new Map<string, OpenAPISecurityScheme>();

    for (const middleware of middlewareChain) {
      if (!middleware) continue;

      const name = middleware.name || middleware.toString();

      // Detect JWT/Bearer
      if (this.patterns.jwt.test(name)) {
        detected.set('bearerAuth', {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token authentication',
        });
      }

      // Detect API Key
      if (this.patterns.apiKey.test(name)) {
        detected.set('apiKeyAuth', {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key authentication',
        });
      }

      // Detect OAuth2
      if (this.patterns.oauth.test(name)) {
        detected.set('oauth2', {
          type: 'oauth2',
          description: 'OAuth 2.0 authentication',
        });
      }

      // Detect Basic Auth
      if (this.patterns.basic.test(name)) {
        detected.set('basicAuth', {
          type: 'http',
          scheme: 'basic',
          description: 'HTTP Basic authentication',
        });
      }
    }

    return detected;
  }

  /**
   * Detect security schemes from route metadata
   */
  detectFromMetadata(metadata: any): Map<string, OpenAPISecurityScheme> {
    const detected = new Map<string, OpenAPISecurityScheme>();

    if (!metadata) return detected;

    // Check for security field in metadata
    if (metadata.security) {
      if (typeof metadata.security === 'string') {
        // Parse security string like "bearer", "api-key", etc.
        const scheme = this.parseSecurityString(metadata.security);
        if (scheme) {
          detected.set(scheme.name, scheme as OpenAPISecurityScheme);
        }
      } else if (Array.isArray(metadata.security)) {
        metadata.security.forEach((sec: any) => {
          const scheme = this.parseSecurityScheme(sec);
          if (scheme) {
            detected.set(scheme.name, scheme as OpenAPISecurityScheme);
          }
        });
      }
    }

    // Check for authentication headers in parameters
    if (metadata.parameters && Array.isArray(metadata.parameters)) {
      for (const param of metadata.parameters) {
        const paramName = param.name || '';
        const lowerName = paramName.toLowerCase();

        if (lowerName === 'authorization') {
          detected.set('bearerAuth', {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Bearer token',
          });
        }

        if (lowerName.includes('api') && lowerName.includes('key')) {
          detected.set('apiKeyAuth', {
            type: 'apiKey',
            name: paramName,
            in: param.in || 'header',
            description: 'API Key authentication',
          });
        }

        if (lowerName.includes('token') && !lowerName.includes('bearer')) {
          detected.set('tokenAuth', {
            type: 'apiKey',
            name: paramName,
            in: param.in || 'header',
            description: 'Token authentication',
          });
        }
      }
    }

    return detected;
  }

  /**
   * Detect security schemes from HTTP headers used in routes
   */
  detectFromHeaders(headerNames: string[]): Map<string, OpenAPISecurityScheme> {
    const detected = new Map<string, OpenAPISecurityScheme>();

    for (const header of headerNames) {
      const lowerHeader = header.toLowerCase();

      // Authorization header
      if (lowerHeader === 'authorization') {
        detected.set('bearerAuth', {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer token authentication',
        });
      }

      // API Key headers
      if (lowerHeader === 'x-api-key' || lowerHeader === 'api-key') {
        detected.set('apiKeyAuth', {
          type: 'apiKey',
          name: header,
          in: 'header',
          description: 'API key authentication',
        });
      }

      // Token headers
      if (lowerHeader.includes('token')) {
        detected.set('tokenAuth', {
          type: 'apiKey',
          name: header,
          in: 'header',
          description: 'Token authentication',
        });
      }
    }

    return detected;
  }

  /**
   * Comprehensive security detection
   */
  detect(
    middleware?: any[],
    metadata?: any,
    headers?: string[]
  ): Map<string, OpenAPISecurityScheme> {
    const allDetected = new Map<string, OpenAPISecurityScheme>();

    // Merge detections from all sources
    if (middleware) {
      this.detectFromMiddleware(middleware).forEach((scheme, name) => {
        allDetected.set(name, scheme);
      });
    }

    if (metadata) {
      this.detectFromMetadata(metadata).forEach((scheme, name) => {
        allDetected.set(name, scheme);
      });
    }

    if (headers) {
      this.detectFromHeaders(headers).forEach((scheme, name) => {
        allDetected.set(name, scheme);
      });
    }

    return allDetected;
  }

  /**
   * Parse security scheme from string representation
   */
  private parseSecurityString(security: string): SecurityScheme | null {
    const lower = security.toLowerCase();

    if (lower.includes('bearer') || lower.includes('jwt')) {
      return {
        name: 'bearerAuth',
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token',
      };
    }

    if (lower.includes('api') && lower.includes('key')) {
      return {
        name: 'apiKeyAuth',
        type: 'apiKey',
        in: 'header',
        description: 'API Key authentication',
      };
    }

    if (lower.includes('oauth')) {
      return {
        name: 'oauth2',
        type: 'oauth2',
        description: 'OAuth 2.0 authentication',
      };
    }

    if (lower.includes('basic')) {
      return {
        name: 'basicAuth',
        type: 'http',
        scheme: 'basic',
        description: 'HTTP Basic authentication',
      };
    }

    return null;
  }

  /**
   * Parse security scheme from object
   */
  private parseSecurityScheme(scheme: any): SecurityScheme | null {
    if (typeof scheme !== 'object' || !scheme) {
      return null;
    }

    if (scheme.type === 'http' && scheme.scheme) {
      return {
        name: `${scheme.scheme}Auth`,
        type: 'http',
        scheme: scheme.scheme,
        description: scheme.description || `${scheme.scheme.toUpperCase()} authentication`,
      };
    }

    if (scheme.type === 'apiKey') {
      return {
        name: 'apiKeyAuth',
        type: 'apiKey',
        in: scheme.in || 'header',
        description: scheme.description || 'API Key authentication',
      };
    }

    return null;
  }

  /**
   * Get all detected schemes
   */
  getDetected(): Map<string, OpenAPISecurityScheme> {
    return new Map(this.detectedSchemes);
  }

  /**
   * Clear detected schemes
   */
  clear(): void {
    this.detectedSchemes.clear();
  }
}

/**
 * Convenience function for security detection
 */
export function detectSecurity(
  middleware?: any[],
  metadata?: any,
  headers?: string[]
): Record<string, OpenAPISecurityScheme> {
  const detector = new SecurityDetector();
  const schemes = detector.detect(middleware, metadata, headers);

  const result: Record<string, OpenAPISecurityScheme> = {};
  schemes.forEach((scheme, name) => {
    result[name] = scheme;
  });

  return result;
}
