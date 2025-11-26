/**
 * Tests for MiddlewareAnalyzer
 */

import { describe, it, expect } from 'vitest';
import { MiddlewareAnalyzer } from '../MiddlewareAnalyzer';

describe('MiddlewareAnalyzer', () => {
  const analyzer = new MiddlewareAnalyzer();

  describe('isRouteProtected', () => {
    it('should detect protected routes with auth middleware', () => {
      const middlewares = [
        {
          name: 'AuthGuard',
          type: 'auth' as const,
          description: 'Authentication guard',
        },
      ];

      expect(analyzer.isRouteProtected(middlewares)).toBe(true);
    });

    it('should return false for unprotected routes', () => {
      const middlewares = [
        {
          name: 'cors',
          type: 'cors' as const,
          description: 'CORS middleware',
        },
      ];

      expect(analyzer.isRouteProtected(middlewares)).toBe(false);
    });

    it('should return false for empty middleware list', () => {
      expect(analyzer.isRouteProtected([])).toBe(false);
    });
  });

  describe('extractSecuritySchemes', () => {
    it('should extract JWT security scheme', () => {
      const middlewares = [
        {
          name: 'JWTAuth',
          type: 'auth' as const,
          description: 'JWT authentication',
          security: {
            type: 'jwt' as const,
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token',
          },
        },
      ];

      const schemes = analyzer.extractSecuritySchemes(middlewares);

      expect(schemes.length).toBe(1);
      expect(schemes[0].type).toBe('jwt');
      expect(schemes[0].scheme).toBe('bearer');
      expect(schemes[0].bearerFormat).toBe('JWT');
    });

    it('should extract bearer token security scheme', () => {
      const middlewares = [
        {
          name: 'BearerAuth',
          type: 'auth' as const,
          description: 'Bearer token auth',
          security: {
            type: 'bearer' as const,
            scheme: 'bearer',
            description: 'Bearer token',
          },
        },
      ];

      const schemes = analyzer.extractSecuritySchemes(middlewares);

      expect(schemes.length).toBe(1);
      expect(schemes[0].type).toBe('bearer');
    });

    it('should extract API key security scheme', () => {
      const middlewares = [
        {
          name: 'ApiKeyAuth',
          type: 'auth' as const,
          description: 'API key authentication',
          security: {
            type: 'api-key' as const,
            scheme: 'api-key',
            description: 'API Key',
          },
        },
      ];

      const schemes = analyzer.extractSecuritySchemes(middlewares);

      expect(schemes.length).toBe(1);
      expect(schemes[0].type).toBe('api-key');
    });

    it('should return empty array for non-auth middleware', () => {
      const middlewares = [
        {
          name: 'cors',
          type: 'cors' as const,
          description: 'CORS',
        },
      ];

      const schemes = analyzer.extractSecuritySchemes(middlewares);

      expect(schemes).toEqual([]);
    });
  });

  describe('createSecuritySummary', () => {
    it('should summarize security requirements', () => {
      const middlewares = [
        {
          name: 'AuthGuard',
          type: 'auth' as const,
          description: 'Authentication',
          security: {
            type: 'jwt' as const,
            scheme: 'bearer',
            description: 'JWT',
          },
          parameters: [
            {
              name: 'Authorization',
              in: 'header' as const,
              required: true,
              description: 'Bearer token',
            },
          ],
        },
      ];

      const summary = analyzer.createSecuritySummary(middlewares);

      expect(summary.requiresAuth).toBe(true);
      expect(summary.authTypes).toContain('jwt');
      expect(summary.parameters.length).toBeGreaterThan(0);
      expect(summary.parameters[0].name).toBe('Authorization');
    });

    it('should handle no auth middleware', () => {
      const middlewares = [
        {
          name: 'logging',
          type: 'logging' as const,
          description: 'Request logging',
        },
      ];

      const summary = analyzer.createSecuritySummary(middlewares);

      expect(summary.requiresAuth).toBe(false);
      expect(summary.authTypes).toEqual([]);
    });
  });
});
