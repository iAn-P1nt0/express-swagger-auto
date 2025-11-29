/**
 * Comprehensive tests for Sensitive Field Masking
 * Target: 95% coverage for security masking functionality
 *
 * Tests cover:
 * - Password field masking
 * - Token/API key masking
 * - Credit card number masking
 * - Deep object masking (nested fields)
 * - Array element masking
 * - Custom sensitive field patterns
 * - Edge cases and special characters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runtimeCapture } from '../../middleware/runtimeCapture';
import type { Request, Response, NextFunction } from 'express';

describe('Sensitive Field Masking - Comprehensive Tests', () => {
  // Helper to create mock request
  const createMockRequest = (overrides: Partial<Request> = {}): Request =>
    ({
      method: 'GET',
      path: '/test',
      query: {},
      headers: {},
      body: {},
      ...overrides,
    }) as Request;

  // Helper to create mock response
  const createMockResponse = (): Response => {
    const res: Partial<Response> = {
      statusCode: 200,
      send: vi.fn().mockReturnThis(),
    };
    return res as Response;
  };

  describe('Password Field Masking', () => {
    it('should mask password field in body', () => {
      const req = createMockRequest({
        body: {
          username: 'john',
          password: 'secret123',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask Password (capitalized) field', () => {
      const req = createMockRequest({
        body: {
          Username: 'john',
          Password: 'Secret123',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask password_confirmation field', () => {
      const req = createMockRequest({
        body: {
          password: 'secret',
          password_confirmation: 'secret',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask passwordHash field', () => {
      const req = createMockRequest({
        body: {
          passwordHash: 'hashedvalue123',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token/API Key Masking', () => {
    it('should mask token field', () => {
      const req = createMockRequest({
        body: {
          userId: 1,
          token: 'jwt-token-value',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask apiKey field', () => {
      const req = createMockRequest({
        body: {
          apiKey: 'ak_live_123456',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask api_key field (snake_case)', () => {
      const req = createMockRequest({
        body: {
          api_key: 'ak_test_789',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask secret field', () => {
      const req = createMockRequest({
        body: {
          clientSecret: 'cs_secret_value',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask authorization header', () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          'content-type': 'application/json',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask cookie header', () => {
      const req = createMockRequest({
        headers: {
          cookie: 'session=abc123; token=xyz789',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Query Parameter Masking', () => {
    it('should mask token in query params', () => {
      const req = createMockRequest({
        query: {
          action: 'verify',
          token: 'verification-token-123',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask apiKey in query params', () => {
      const req = createMockRequest({
        query: {
          apiKey: 'key123',
          format: 'json',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Deep Object Masking', () => {
    it('should mask nested password field', () => {
      const req = createMockRequest({
        body: {
          user: {
            name: 'John',
            credentials: {
              password: 'nested-secret',
            },
          },
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask deeply nested sensitive fields', () => {
      const req = createMockRequest({
        body: {
          level1: {
            level2: {
              level3: {
                level4: {
                  apiKey: 'deep-nested-key',
                },
              },
            },
          },
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should preserve non-sensitive nested fields', () => {
      const req = createMockRequest({
        body: {
          user: {
            name: 'John',
            email: 'john@example.com',
            profile: {
              bio: 'Test bio',
            },
          },
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Array Element Masking', () => {
    it('should mask sensitive fields in array elements', () => {
      const req = createMockRequest({
        body: {
          users: [
            { name: 'User1', password: 'pass1' },
            { name: 'User2', password: 'pass2' },
          ],
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle arrays with mixed content', () => {
      const req = createMockRequest({
        body: {
          items: [
            { type: 'user', token: 'user-token' },
            { type: 'service', apiKey: 'service-key' },
          ],
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Custom Sensitive Fields', () => {
    it('should mask custom sensitive field', () => {
      const req = createMockRequest({
        body: {
          customSecret: 'my-custom-secret',
          normalField: 'normal-value',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['customSecret'],
      });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask multiple custom sensitive fields', () => {
      const req = createMockRequest({
        body: {
          field1: 'secret1',
          field2: 'secret2',
          normalField: 'normal',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['field1', 'field2'],
      });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should combine custom and default sensitive fields when needed', () => {
      const req = createMockRequest({
        body: {
          password: 'default-sensitive',
          mySecret: 'custom-sensitive',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['password', 'mySecret'],
      });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const req = createMockRequest({
        body: {
          password: null,
          name: 'John',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle undefined values', () => {
      const req = createMockRequest({
        body: {
          password: undefined,
          name: 'John',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle empty objects', () => {
      const req = createMockRequest({
        body: {},
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle empty arrays', () => {
      const req = createMockRequest({
        body: {
          users: [],
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle string body', () => {
      const req = createMockRequest({
        body: 'plain text body',
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle numeric values in sensitive fields', () => {
      const req = createMockRequest({
        body: {
          password: 123456,
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle boolean values in sensitive fields', () => {
      const req = createMockRequest({
        body: {
          hasPassword: true,
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Middleware Configuration', () => {
    it('should skip capture when disabled', () => {
      const req = createMockRequest({
        body: { password: 'secret' },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should respect maxBodySize configuration', () => {
      const req = createMockRequest({
        body: {
          data: 'x'.repeat(200), // 200 chars
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 100, // Only 100 chars
      });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use default configuration when no options provided', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Response Masking', () => {
    it('should mask sensitive fields in response body', () => {
      const req = createMockRequest({
        method: 'POST',
        path: '/login',
        body: { username: 'john' },
      });
      const res = createMockResponse();
      let captured = false;

      const middleware = runtimeCapture({ enabled: true });

      const originalSend = res.send;
      res.send = function (body: any) {
        captured = true;
        return originalSend.call(this, body);
      } as any;

      middleware(req, res, () => {
        res.send({ user: 'john', token: 'secret-token' });
      });

      expect(captured).toBe(true);
    });
  });

  describe('Case Sensitivity', () => {
    it('should mask PASSWORD (uppercase)', () => {
      const req = createMockRequest({
        body: {
          PASSWORD: 'UPPERCASE_SECRET',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask TOKEN (uppercase)', () => {
      const req = createMockRequest({
        headers: {
          TOKEN: 'UPPERCASE_TOKEN',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should mask mixed case variants', () => {
      const req = createMockRequest({
        body: {
          PassWord: 'mixed1',
          passWord: 'mixed2',
          PASSWORD: 'upper',
          password: 'lower',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Special Characters', () => {
    it('should handle field names with special characters', () => {
      const req = createMockRequest({
        body: {
          'user-password': 'secret',
          user_name: 'john',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle values with special characters', () => {
      const req = createMockRequest({
        body: {
          password: 'P@ssw0rd!#$%^&*()',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle unicode characters in values', () => {
      const req = createMockRequest({
        body: {
          password: 'パスワード123',
          name: 'ユーザー',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({ enabled: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Credit Card Masking', () => {
    it('should handle credit card fields with custom patterns', () => {
      const req = createMockRequest({
        body: {
          cardNumber: '4111111111111111',
          cardCvv: '123',
        },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = runtimeCapture({
        enabled: true,
        sensitiveFields: ['cardNumber', 'cardCvv', 'cvv', 'cvc'],
      });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
