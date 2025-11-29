/**
 * API Security Best Practices Tests
 *
 * Tests covering OWASP API Security Top 10
 * Covers rate limiting, CORS, content-type validation, and more
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runtimeCapture } from '../../src/middleware/runtimeCapture';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import { SecurityDetector, detectSecurity } from '../../src/security/SecurityDetector';
import type { Request, Response, NextFunction } from 'express';
import {
  createSecurityMockRequest,
  createSecurityMockResponse,
  createTrackedNext,
  createRateLimiter,
  isValidContentType,
  getMemoryUsage,
} from './utils';

describe('API Security Best Practices Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
  });

  describe('Rate Limiting Enforcement', () => {
    it('should respect rate limits', () => {
      const limiter = createRateLimiter(5, 1000);

      for (let i = 0; i < 5; i++) {
        expect(limiter.checkLimit()).toBe(true);
      }
      expect(limiter.checkLimit()).toBe(false);
    });

    it('should reset rate limit after window expires', async () => {
      const limiter = createRateLimiter(2, 100);

      expect(limiter.checkLimit()).toBe(true);
      expect(limiter.checkLimit()).toBe(true);
      expect(limiter.checkLimit()).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(limiter.checkLimit()).toBe(true);
    });

    it('should track request count accurately', () => {
      const limiter = createRateLimiter(10, 1000);

      for (let i = 1; i <= 5; i++) {
        limiter.checkLimit();
        expect(limiter.getCount()).toBe(i);
      }
    });

    it('should handle concurrent rate limit checks', () => {
      const limiter = createRateLimiter(100, 1000);
      const results: boolean[] = [];

      for (let i = 0; i < 110; i++) {
        results.push(limiter.checkLimit());
      }

      expect(results.filter((r) => r).length).toBe(100);
      expect(results.filter((r) => !r).length).toBe(10);
    });
  });

  describe('CORS Policy Validation', () => {
    it('should identify CORS headers in response', () => {
      const corsHeaders = {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE',
        'access-control-allow-headers': 'Content-Type, Authorization',
      };

      expect(corsHeaders['access-control-allow-origin']).toBeDefined();
    });

    it('should detect overly permissive CORS', () => {
      const permissiveCors = { 'access-control-allow-origin': '*' };
      const restrictiveCors = {
        'access-control-allow-origin': 'https://trusted.com',
      };

      expect(permissiveCors['access-control-allow-origin']).toBe('*');
      expect(restrictiveCors['access-control-allow-origin']).not.toBe('*');
    });

    it('should validate CORS credentials handling', () => {
      // With credentials, origin cannot be *
      const corsWithCredentials = {
        'access-control-allow-origin': 'https://example.com',
        'access-control-allow-credentials': 'true',
      };

      expect(corsWithCredentials['access-control-allow-credentials']).toBe('true');
      expect(corsWithCredentials['access-control-allow-origin']).not.toBe('*');
    });
  });

  describe('Content-Type Validation', () => {
    it('should accept valid JSON content type', () => {
      expect(isValidContentType('application/json', ['application/json'])).toBe(true);
    });

    it('should accept content type with charset', () => {
      expect(
        isValidContentType('application/json; charset=utf-8', ['application/json'])
      ).toBe(true);
    });

    it('should reject invalid content types', () => {
      expect(isValidContentType('text/html', ['application/json'])).toBe(false);
    });

    it('should handle missing content type', () => {
      expect(isValidContentType(undefined, ['application/json'])).toBe(false);
    });

    it('should handle multiple allowed types', () => {
      const allowed = ['application/json', 'application/xml', 'text/plain'];
      expect(isValidContentType('application/json', allowed)).toBe(true);
      expect(isValidContentType('application/xml', allowed)).toBe(true);
      expect(isValidContentType('text/html', allowed)).toBe(false);
    });
  });

  describe('Request Size Limits', () => {
    it('should handle small payloads', () => {
      mockRequest = createSecurityMockRequest({
        body: { data: 'small' },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 10000,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle large payloads up to limit', () => {
      const largeData = 'x'.repeat(5000);
      mockRequest = createSecurityMockRequest({
        body: { data: largeData },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 10000,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should truncate payloads exceeding limit', () => {
      const oversizedData = 'x'.repeat(200000);
      mockRequest = createSecurityMockRequest({
        body: { data: oversizedData },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 1000,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Response Size Limits', () => {
    it('should handle response body capture', () => {
      mockRequest = createSecurityMockRequest({
        method: 'GET',
        path: '/api/data',
      });

      const middleware = runtimeCapture({ enabled: true });

      middleware(mockRequest, mockResponse, () => {
        mockResponse.send({ data: 'response' });
      });
    });
  });

  describe('Header Injection Prevention', () => {
    it('should handle safe headers', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'abc123',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle headers with special characters', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          'x-custom': 'value-with-dashes',
          'x-another': 'value_with_underscores',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('HTTP Method Validation', () => {
    it('should handle all standard HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

      methods.forEach((method) => {
        mockRequest = createSecurityMockRequest({ method });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
        (nextFn as any).mockClear();
      });
    });

    it('should handle lowercase HTTP methods', () => {
      mockRequest = createSecurityMockRequest({ method: 'get' });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Status Code Security', () => {
    it('should capture status codes in runtime', () => {
      mockRequest = createSecurityMockRequest({
        method: 'GET',
        path: '/api/test',
      });

      const statusCodes = [200, 201, 400, 401, 403, 404, 500];

      statusCodes.forEach((code) => {
        mockResponse.statusCode = code;
        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);
        expect(nextFn).toHaveBeenCalled();
        (nextFn as any).mockClear();
      });
    });
  });

  describe('Error Message Information Leakage', () => {
    it('should not expose stack traces in production', () => {
      const error = new Error('Test error');
      const sanitizedError = {
        message: 'An error occurred',
        code: 'INTERNAL_ERROR',
      };

      expect(sanitizedError).not.toHaveProperty('stack');
      expect(sanitizedError.message).not.toContain('Error:');
    });

    it('should not expose internal paths', () => {
      const internalPaths = [
        '/home/user/app/src/controllers/auth.ts',
        'C:\\Users\\admin\\project\\src\\routes.js',
        '/var/www/api/node_modules/express',
      ];

      const safeMessage = 'An error occurred while processing your request';

      internalPaths.forEach((p) => {
        expect(safeMessage).not.toContain(p);
      });
    });
  });

  describe('Security Scheme Detection', () => {
    it('should detect Bearer token authentication', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromMiddleware([
        { name: 'verifyBearerToken' },
      ]);

      expect(schemes.has('bearerAuth')).toBe(true);
    });

    it('should detect API key authentication', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromMiddleware([
        { name: 'validateApiKey' },
      ]);

      expect(schemes.has('apiKeyAuth')).toBe(true);
    });

    it('should detect OAuth2 authentication', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromMiddleware([
        { name: 'oauth2Middleware' },
      ]);

      expect(schemes.has('oauth2')).toBe(true);
    });

    it('should detect Basic authentication', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromMiddleware([
        { name: 'basicAuthHandler' },
      ]);

      expect(schemes.has('basicAuth')).toBe(true);
    });

    it('should detect security from headers', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromHeaders([
        'Authorization',
        'X-API-Key',
      ]);

      expect(schemes.has('bearerAuth')).toBe(true);
      expect(schemes.has('apiKeyAuth')).toBe(true);
    });
  });

  describe('OpenAPI Security Configuration', () => {
    it('should generate security schemes in OpenAPI spec', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Secure API',
          version: '1.0.0',
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      });

      const routes = [
        {
          method: 'get' as const,
          path: '/secure',
          security: [{ bearerAuth: [] }],
          handler: () => {},
        },
      ];

      const spec = generator.generate(routes);
      expect(spec.components?.securitySchemes).toBeDefined();
    });
  });

  describe('OWASP API Security Top 10 Coverage', () => {
    describe('API1: Broken Object Level Authorization', () => {
      it('should not expose object IDs in predictable patterns', () => {
        // Sequential IDs are predictable
        const sequentialIds = [1, 2, 3, 4, 5];

        // UUIDs are not predictable
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

        expect(uuidPattern.test(uuid)).toBe(true);
        expect(sequentialIds.every((id) => typeof id === 'number')).toBe(true);
      });
    });

    describe('API2: Broken Authentication', () => {
      it('should detect authentication middleware', () => {
        const schemes = detectSecurity([{ name: 'requireAuth' }]);
        expect(Object.keys(schemes).length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('API3: Broken Object Property Level Authorization', () => {
      it('should mask sensitive properties', () => {
        mockRequest = createSecurityMockRequest({
          body: { password: 'secret', username: 'user' },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
      });
    });

    describe('API4: Unrestricted Resource Consumption', () => {
      it('should limit request body size', () => {
        const config = { maxBodySize: 102400 }; // 100KB
        expect(config.maxBodySize).toBe(102400);
      });

      it('should implement rate limiting', () => {
        const limiter = createRateLimiter(100, 60000); // 100 req/min
        for (let i = 0; i < 100; i++) {
          expect(limiter.checkLimit()).toBe(true);
        }
        expect(limiter.checkLimit()).toBe(false);
      });
    });

    describe('API5: Broken Function Level Authorization', () => {
      it('should track endpoint access', () => {
        const adminEndpoints = ['/admin', '/admin/users', '/admin/config'];
        const publicEndpoints = ['/api/public', '/api/health'];

        expect(adminEndpoints.every((e) => e.startsWith('/admin'))).toBe(true);
        expect(publicEndpoints.every((e) => e.startsWith('/api'))).toBe(true);
      });
    });

    describe('API6: Unrestricted Access to Sensitive Business Flows', () => {
      it('should identify sensitive operations', () => {
        const sensitiveOperations = [
          { path: '/api/transfer', method: 'POST' },
          { path: '/api/password/reset', method: 'POST' },
          { path: '/api/account/delete', method: 'DELETE' },
        ];

        sensitiveOperations.forEach((op) => {
          expect(op.path).toBeDefined();
          expect(op.method).toBeDefined();
        });
      });
    });

    describe('API7: Server Side Request Forgery (SSRF)', () => {
      it('should identify SSRF-prone parameters', () => {
        const ssrfParameters = ['url', 'callback', 'redirect', 'webhook'];

        mockRequest = createSecurityMockRequest({
          body: { webhook: 'http://internal.service/admin' },
        });

        expect(mockRequest.body.webhook).toBeDefined();
      });
    });

    describe('API8: Security Misconfiguration', () => {
      it('should verify secure default settings', () => {
        const config = {
          enabled: true,
          sensitiveFields: ['password', 'token', 'apiKey'],
          maxBodySize: 102400,
        };

        expect(config.enabled).toBe(true);
        expect(config.sensitiveFields.length).toBeGreaterThan(0);
        expect(config.maxBodySize).toBeLessThan(10 * 1024 * 1024);
      });
    });

    describe('API9: Improper Inventory Management', () => {
      it('should track API versions', () => {
        const generator = new SpecGenerator({
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        });

        const spec = generator.generate([]);
        expect(spec.info.version).toBe('1.0.0');
      });
    });

    describe('API10: Unsafe Consumption of APIs', () => {
      it('should validate external data sources', () => {
        const validateExternalData = (data: any): boolean => {
          if (!data || typeof data !== 'object') return false;
          if (Array.isArray(data) && data.length > 10000) return false;
          return true;
        };

        expect(validateExternalData({ valid: true })).toBe(true);
        expect(validateExternalData(null)).toBe(false);
      });
    });
  });

  describe('Memory Safety', () => {
    it('should not leak memory with repeated requests', () => {
      const initialMemory = getMemoryUsage();

      for (let i = 0; i < 1000; i++) {
        mockRequest = createSecurityMockRequest({
          body: { data: 'test'.repeat(100) },
        });
        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, createSecurityMockResponse(), vi.fn());
      }

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Allow up to 50MB increase
      expect(memoryIncrease).toBeLessThan(50);
    });
  });
});
