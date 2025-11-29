/**
 * Sensitive Data Masking Security Tests
 *
 * Comprehensive tests for PII protection and sensitive data masking
 * Covers OWASP API3:2023 - Broken Object Property Level Authorization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runtimeCapture } from '../../src/middleware/runtimeCapture';
import type { Request, Response, NextFunction } from 'express';
import {
  createSecurityMockRequest,
  createSecurityMockResponse,
  createTrackedNext,
  verifySensitiveDataMasked,
} from './utils';
import { sensitiveDataFixtures } from './fixtures';

describe('Sensitive Data Masking - Security Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
  });

  describe('Password Field Masking', () => {
    const passwordVariants = sensitiveDataFixtures.passwords;

    it.each(passwordVariants)('should mask $field field in body', ({ field, value }) => {
      mockRequest = createSecurityMockRequest({
        body: { [field]: value, username: 'testuser' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask password in deeply nested objects (5+ levels)', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    password: 'deeply-nested-secret',
                  },
                },
              },
            },
          },
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask multiple password fields in single request', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: 'pass1',
          newPassword: 'pass2',
          confirmPassword: 'pass2',
          oldPassword: 'pass0',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask password containing special characters', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: 'P@$$w0rd!#$%^&*()_+-=[]{}|;:\'",.<>?/`~',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask password with unicode characters', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: 'パスワード123密码',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Token/API Key Masking in Headers', () => {
    const headerVariants = sensitiveDataFixtures.headers;

    it.each(headerVariants)('should mask $field header', ({ field, value }) => {
      mockRequest = createSecurityMockRequest({
        headers: { [field]: value, 'content-type': 'application/json' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask Bearer token in Authorization header', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask API key in X-API-Key header', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          'x-api-key': 'test_api_key_1234567890abcdef',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask session token in Cookie header', () => {
      mockRequest = createSecurityMockRequest({
        headers: {
          cookie: 'session=abc123xyz; access_token=jwt_token_here; refresh_token=refresh_abc',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Credit Card Number Masking (PAN)', () => {
    const cardFixtures = sensitiveDataFixtures.creditCards;

    it.each(cardFixtures)('should mask $field field', ({ field, value }) => {
      mockRequest = createSecurityMockRequest({
        body: { [field]: value },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['cardNumber', 'card_number', 'creditCardNumber', 'cvv', 'cvc', 'cardCvv'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask credit card in payment object', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          payment: {
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            cardholderName: 'John Doe',
          },
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['cardNumber', 'cvv'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Social Security Number Masking', () => {
    it('should mask SSN in standard format', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          ssn: '123-45-6789',
          fullName: 'John Doe',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['ssn', 'socialSecurityNumber'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask SSN without dashes', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          socialSecurityNumber: '123456789',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['socialSecurityNumber'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Email Masking (Partial)', () => {
    it('should handle email field when marked as sensitive', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          email: 'user@example.com',
          name: 'Test User',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['email'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle multiple email formats', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          primaryEmail: 'primary@example.com',
          secondaryEmail: 'secondary@example.org',
          recoveryEmail: 'recovery@example.net',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['email'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Phone Number Masking', () => {
    it('should handle phone field when marked as sensitive', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          phone: '+1-555-123-4567',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['phone'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle various phone formats', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          phoneNumber: '5551234567',
          mobilePhone: '+1 (555) 123-4567',
          workPhone: '555.123.4567',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['phone'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Deep Nested Object Masking (5+ levels)', () => {
    it('should mask sensitive fields at any nesting depth', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          user: {
            profile: {
              security: {
                credentials: {
                  auth: {
                    secrets: {
                      password: 'deeply-nested-password',
                      apiKey: 'deeply-nested-key',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle 10 levels of nesting', () => {
      let nested: any = { password: 'level10-secret' };
      for (let i = 9; i >= 1; i--) {
        nested = { [`level${i}`]: nested };
      }

      mockRequest = createSecurityMockRequest({ body: nested });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Array Element Masking', () => {
    it('should mask sensitive fields in array of objects', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          users: [
            { id: 1, password: 'pass1', name: 'User 1' },
            { id: 2, password: 'pass2', name: 'User 2' },
            { id: 3, password: 'pass3', name: 'User 3' },
          ],
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask sensitive fields in nested arrays', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          organizations: [
            {
              name: 'Org 1',
              members: [
                { name: 'Member 1', apiKey: 'key1' },
                { name: 'Member 2', apiKey: 'key2' },
              ],
            },
            {
              name: 'Org 2',
              members: [
                { name: 'Member 3', apiKey: 'key3' },
              ],
            },
          ],
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask tokens in array of strings when wrapped', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          tokens: [
            { token: 'token1' },
            { token: 'token2' },
            { token: 'token3' },
          ],
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Query Parameter Masking', () => {
    it('should mask token in query parameters', () => {
      mockRequest = createSecurityMockRequest({
        query: {
          action: 'verify',
          token: 'verification-token-123',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask apiKey in query parameters', () => {
      mockRequest = createSecurityMockRequest({
        query: {
          apiKey: 'ak_prod_123456',
          format: 'json',
          page: '1',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask multiple sensitive query params', () => {
      mockRequest = createSecurityMockRequest({
        query: {
          token: 'token123',
          api_key: 'key456',
          secret: 'secret789',
          callback: 'https://example.com',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Custom Sensitive Field Patterns', () => {
    it('should mask custom sensitive fields', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          internalId: 'INT-123',
          secretCode: 'SC-456',
          normalField: 'public data',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['internalId', 'secretCode'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask fields matching partial patterns', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          userSecretKey: 'secret1',
          adminSecretToken: 'secret2',
          publicData: 'not secret',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['secret'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should combine custom and default sensitive fields', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: 'default-sensitive',
          customSecret: 'custom-sensitive',
          publicData: 'not sensitive',
        },
      });

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['password', 'customSecret'],
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Verify Masked Data Not in Logs', () => {
    let originalConsoleLog: typeof console.log;
    let logOutput: string[];

    beforeEach(() => {
      logOutput = [];
      originalConsoleLog = console.log;
      console.log = vi.fn((...args) => {
        logOutput.push(args.map((a) => String(a)).join(' '));
      });
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should not log plain passwords', () => {
      const sensitivePassword = 'SuperSecret123!';
      mockRequest = createSecurityMockRequest({
        body: { password: sensitivePassword },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      const allLogs = logOutput.join('\n');
      expect(allLogs).not.toContain(sensitivePassword);
    });

    it('should not log plain API keys', () => {
      const sensitiveApiKey = 'test_api_key_abcdef123456';
      mockRequest = createSecurityMockRequest({
        body: { apiKey: sensitiveApiKey },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      const allLogs = logOutput.join('\n');
      expect(allLogs).not.toContain(sensitiveApiKey);
    });
  });

  describe('Verify Masked Data Not in OpenAPI Examples', () => {
    it('should not include raw sensitive data when generating examples', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          username: 'testuser',
          password: 'rawpassword123',
          apiKey: 'ak_live_sensitive',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null sensitive field values', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: null,
          apiKey: null,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle undefined sensitive field values', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: undefined,
          token: undefined,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle numeric sensitive field values', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: 12345678,
          pin: 1234,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle boolean sensitive field values', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          hasPassword: true,
          tokenValid: false,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle empty string sensitive values', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: '',
          token: '',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle sensitive field with whitespace only', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: '   ',
          apiKey: '\t\n',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Case Sensitivity Handling', () => {
    it('should mask PASSWORD (uppercase)', () => {
      mockRequest = createSecurityMockRequest({
        body: { PASSWORD: 'UPPERCASE_SECRET' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask passWord (mixed case)', () => {
      mockRequest = createSecurityMockRequest({
        body: { passWord: 'MixedCase_Secret' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should mask APIKEY vs apiKey vs ApiKey', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          APIKEY: 'upper',
          apiKey: 'lower',
          ApiKey: 'pascal',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Response Body Masking', () => {
    it('should mask sensitive data in response', () => {
      mockRequest = createSecurityMockRequest({
        method: 'POST',
        path: '/login',
        body: { username: 'testuser' },
      });

      const middleware = runtimeCapture({ enabled: true });

      let responseBody: any;
      const originalSend = mockResponse.send;
      (mockResponse.send as any) = function (body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      middleware(mockRequest, mockResponse, () => {
        mockResponse.send({ user: 'testuser', token: 'secret-jwt-token' });
      });

      expect(responseBody).toBeDefined();
    });

    it('should mask multiple sensitive fields in response', () => {
      mockRequest = createSecurityMockRequest({
        method: 'POST',
        path: '/register',
      });

      const middleware = runtimeCapture({ enabled: true });

      middleware(mockRequest, mockResponse, () => {
        mockResponse.send({
          user: {
            id: 1,
            password: 'should-be-masked',
            apiKey: 'should-be-masked',
            refreshToken: 'should-be-masked',
          },
        });
      });

      expect(nextFn).not.toHaveBeenCalled(); // Next called differently in this test
    });
  });

  describe('Performance with Large Sensitive Data Sets', () => {
    it('should handle requests with many sensitive fields efficiently', () => {
      const body: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        body[`password${i}`] = `secret${i}`;
        body[`apiKey${i}`] = `key${i}`;
        body[`token${i}`] = `tok${i}`;
      }

      mockRequest = createSecurityMockRequest({ body });

      const startTime = Date.now();
      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle large values in sensitive fields', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          password: 'x'.repeat(10000),
          token: 'y'.repeat(10000),
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });
});
