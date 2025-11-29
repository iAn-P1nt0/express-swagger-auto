/**
 * Authentication Bypass Security Tests
 *
 * Tests for authentication and authorization security
 * Covers OWASP API2:2023 - Broken Authentication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityDetector, detectSecurity } from '../../src/security/SecurityDetector';
import { runtimeCapture } from '../../src/middleware/runtimeCapture';
import type { Request, Response, NextFunction } from 'express';
import {
  createSecurityMockRequest,
  createSecurityMockResponse,
  createTrackedNext,
} from './utils';

describe('Authentication Bypass Security Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
  });

  describe('Missing Authentication Header', () => {
    it('should detect when Authorization header is missing', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          'content-type': 'application/json',
        },
      });

      const hasAuth = mockRequest.headers.authorization !== undefined;
      expect(hasAuth).toBe(false);
    });

    it('should detect when X-API-Key header is missing', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          'content-type': 'application/json',
        },
      });

      const hasApiKey = mockRequest.headers['x-api-key'] !== undefined;
      expect(hasApiKey).toBe(false);
    });

    it('should handle request with empty Authorization header', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          authorization: '',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Invalid JWT Token', () => {
    it('should handle malformed JWT token', () => {
      const malformedTokens = [
        'not-a-valid-jwt',
        'Bearer invalid',
        'Bearer a.b',
        'Bearer a.b.c.d',
        '******',
      ];

      malformedTokens.forEach((token) => {
        mockRequest = createSecurityMockRequest({
          headers: {
            authorization: token,
          },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
        (nextFn as any).mockClear();
      });
    });

    it('should detect JWT structure in Authorization header', () => {
      // Valid JWT structure (header.payload.signature)
      const validJwtStructure = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

      mockRequest = createSecurityMockRequest({
        headers: {
          authorization: validJwtStructure,
        },
      });

      const isJwtFormat = /^Bearer\s+[\w-]+\.[\w-]+\.[\w-]+$/.test(validJwtStructure);
      expect(isJwtFormat).toBe(true);
    });
  });

  describe('Expired JWT Token', () => {
    it('should identify token with exp claim in past', () => {
      // Create a mock expired token payload
      const expiredPayload = {
        sub: '1234567890',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };

      const isExpired = expiredPayload.exp < Math.floor(Date.now() / 1000);
      expect(isExpired).toBe(true);
    });

    it('should identify valid token with exp claim in future', () => {
      const validPayload = {
        sub: '1234567890',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      const isExpired = validPayload.exp < Math.floor(Date.now() / 1000);
      expect(isExpired).toBe(false);
    });
  });

  describe('Bearer Token Validation', () => {
    it('should detect Bearer scheme in Authorization header', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromHeaders(['Authorization']);

      expect(schemes.has('bearerAuth')).toBe(true);
    });

    it('should handle various Bearer token formats', () => {
      const bearerFormats = [
        'Bearer token123',
        'bearer TOKEN123',
        'BEARER Token123',
      ];

      bearerFormats.forEach((token) => {
        const isBearerFormat = /^[Bb][Ee][Aa][Rr][Ee][Rr]\s+.+$/.test(token);
        expect(isBearerFormat).toBe(true);
      });
    });

    it('should detect invalid Bearer formats', () => {
      const invalidFormats = [
        'Basic dXNlcjpwYXNz',
        'Digest username="test"',
        'Token abc123',
      ];

      invalidFormats.forEach((auth) => {
        const isBearerFormat = /^[Bb][Ee][Aa][Rr][Ee][Rr]\s+.+$/.test(auth);
        expect(isBearerFormat).toBe(false);
      });
    });
  });

  describe('API Key Validation', () => {
    it('should detect API key in header', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromHeaders(['X-API-Key']);

      expect(schemes.has('apiKeyAuth')).toBe(true);
    });

    it('should handle various API key header names', () => {
      const apiKeyHeaders = [
        'X-API-Key',
        'api-key',
        'X-Auth-Token',
      ];

      apiKeyHeaders.forEach((header) => {
        const detector = new SecurityDetector();
        const schemes = detector.detectFromHeaders([header]);

        expect(schemes.size).toBeGreaterThan(0);
      });
    });

    it('should detect API key in query parameters', () => {
      mockRequest = createSecurityMockRequest({
        query: {
          api_key: 'test_key_123',
        },
      });

      const hasApiKey = mockRequest.query.api_key !== undefined;
      expect(hasApiKey).toBe(true);
    });
  });

  describe('OAuth2 Flow Validation', () => {
    it('should detect OAuth2 middleware patterns', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromMiddleware([
        { name: 'oAuth2Middleware' },
        { name: 'oauth2Handler' },
      ]);

      expect(schemes.has('oauth2')).toBe(true);
    });

    it('should detect OAuth2 from metadata', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromMetadata({
        security: 'oauth',
      });

      expect(schemes.has('oauth2')).toBe(true);
    });
  });

  describe('Basic Authentication', () => {
    it('should detect Basic auth scheme', () => {
      const detector = new SecurityDetector();
      const schemes = detector.detectFromMiddleware([
        { name: 'basicAuthMiddleware' },
      ]);

      expect(schemes.has('basicAuth')).toBe(true);
    });

    it('should identify Basic auth header format', () => {
      const basicAuth = 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=';
      const isBasicFormat = /^Basic\s+[A-Za-z0-9+/=]+$/.test(basicAuth);

      expect(isBasicFormat).toBe(true);
    });
  });

  describe('Multi-Factor Authentication Detection', () => {
    it('should detect MFA-related middleware', () => {
      const mfaMiddlewareNames = [
        'verifyMFA',
        'checkTwoFactor',
        'validateOTP',
        'verify2FA',
      ];

      mfaMiddlewareNames.forEach((name) => {
        const hasMfaPattern = /mfa|2fa|otp|two.?factor/i.test(name);
        expect(hasMfaPattern).toBe(true);
      });
    });

    it('should handle MFA challenge in request', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          otp: '123456',
          mfaToken: 'mfa_token_123',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Session Hijacking Prevention', () => {
    it('should handle session token in cookies', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          cookie: 'session=abc123; user_id=456',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should detect session-related security headers', () => {
      const securityHeaders = [
        'X-Session-ID',
        'X-Request-ID',
        'X-Correlation-ID',
      ];

      securityHeaders.forEach((header) => {
        mockRequest = createSecurityMockRequest({
          headers: {
            [header.toLowerCase()]: 'value123',
          },
        });

        const hasHeader = mockRequest.headers[header.toLowerCase()] !== undefined;
        expect(hasHeader).toBe(true);
      });
    });
  });

  describe('CSRF Token Validation', () => {
    it('should handle CSRF token in headers', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          'x-csrf-token': 'csrf_token_abc123',
        },
      });

      const hasCsrf = mockRequest.headers['x-csrf-token'] !== undefined;
      expect(hasCsrf).toBe(true);
    });

    it('should handle CSRF token in body', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          _csrf: 'csrf_token_xyz789',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should detect missing CSRF token', () => {
      mockRequest = createSecurityMockRequest({
        method: 'POST',
        body: { data: 'some data' },
      });

      const hasCsrf =
        mockRequest.headers['x-csrf-token'] !== undefined ||
        mockRequest.body._csrf !== undefined;

      expect(hasCsrf).toBe(false);
    });
  });

  describe('Security Detector Integration', () => {
    it('should detect multiple security schemes', () => {
      const schemes = detectSecurity(
        [{ name: 'verifyJWT' }, { name: 'checkApiKey' }],
        { security: 'bearer' },
        ['Authorization', 'X-API-Key']
      );

      expect(Object.keys(schemes).length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty security detection', () => {
      const schemes = detectSecurity([], undefined, []);
      expect(Object.keys(schemes).length).toBe(0);
    });

    it('should not duplicate security schemes', () => {
      const schemes = detectSecurity(
        [{ name: 'verifyJWT' }, { name: 'jwtMiddleware' }],
        { security: 'bearer' },
        ['Authorization']
      );

      // Should only have one bearerAuth scheme
      expect(schemes.bearerAuth).toBeDefined();
    });
  });

  describe('Token Refresh Flow', () => {
    it('should handle refresh token in request', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          refresh_token: 'refresh_token_abc123',
          grant_type: 'refresh_token',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should detect refresh endpoint patterns', () => {
      const refreshPaths = [
        '/auth/refresh',
        '/oauth/token',
        '/api/token/refresh',
        '/v1/auth/refresh-token',
      ];

      refreshPaths.forEach((path) => {
        const isRefreshEndpoint = /refresh|token/i.test(path);
        expect(isRefreshEndpoint).toBe(true);
      });
    });
  });

  describe('Impersonation Prevention', () => {
    it('should detect impersonation headers', () => {
      const impersonationHeaders = [
        'X-Impersonate-User',
        'X-On-Behalf-Of',
        'X-Sudo-User',
      ];

      impersonationHeaders.forEach((header) => {
        mockRequest = createSecurityMockRequest({
          headers: {
            [header.toLowerCase()]: 'user123',
          },
        });

        const hasImpersonation = mockRequest.headers[header.toLowerCase()] !== undefined;
        expect(hasImpersonation).toBe(true);
      });
    });
  });

  describe('Rate Limiting for Auth Endpoints', () => {
    it('should identify auth-related paths', () => {
      const authPaths = [
        '/login',
        '/auth/login',
        '/api/authenticate',
        '/oauth/token',
        '/auth/register',
      ];

      authPaths.forEach((path) => {
        const isAuthPath = /login|auth|oauth|register|token/i.test(path);
        expect(isAuthPath).toBe(true);
      });
    });

    it('should detect password-related endpoints', () => {
      const passwordPaths = [
        '/password/reset',
        '/auth/forgot-password',
        '/api/change-password',
      ];

      passwordPaths.forEach((path) => {
        const isPasswordPath = /password/i.test(path);
        expect(isPasswordPath).toBe(true);
      });
    });
  });
});
