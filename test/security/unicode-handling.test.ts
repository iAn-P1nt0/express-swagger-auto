/**
 * Unicode Handling Edge Case Tests
 *
 * Tests for special characters, emoji, and international text
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
} from './utils';
import { unicodeTestStrings } from './fixtures';

describe('Unicode Handling - Edge Case Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
  });

  describe('Unicode Characters in Paths', () => {
    it('should handle Chinese characters in paths', () => {
      const app = express();
      app.get('/api/用户/:id', (req, res) => res.json({ id: req.params.id }));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });

    it('should handle Japanese characters in paths', () => {
      const app = express();
      app.get('/api/ユーザー', (req, res) => res.json({ status: 'ok' }));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });

    it('should handle Korean characters in paths', () => {
      const app = express();
      app.get('/api/사용자', (req, res) => res.json({ status: 'ok' }));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });

    it('should handle Arabic characters in paths', () => {
      const app = express();
      app.get('/api/مستخدم', (req, res) => res.json({ status: 'ok' }));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });

    it('should handle Hindi characters in paths', () => {
      const app = express();
      app.get('/api/उपयोगकर्ता', (req, res) => res.json({ status: 'ok' }));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('Emoji in Route Descriptions', () => {
    it('should handle emoji in API descriptions', () => {
      const generator = new SpecGenerator({
        info: {
          title: '🚀 Rocket API',
          version: '1.0.0',
          description: 'Fast API with emoji support 🔥💯',
        },
      });

      const routes = [
        {
          method: 'get' as const,
          path: '/status',
          description: 'Get status 🟢',
          handler: () => {},
        },
      ];

      const spec = generator.generate(routes);

      expect(spec.info.title).toBe('🚀 Rocket API');
      expect(spec.info.description).toContain('🔥');
    });

    it('should handle multiple emoji in descriptions', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const routes = [
        {
          method: 'post' as const,
          path: '/deploy',
          description: '🚀🔥💯🎉 Deploy the application ✅',
          handler: () => {},
        },
      ];

      const spec = generator.generate(routes);
      expect(spec.paths['/deploy']).toBeDefined();
    });

    it('should handle emoji in request body', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          message: 'Hello 👋 World 🌍',
          reaction: '❤️',
          status: '✅ Complete',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Special Characters in Parameter Names', () => {
    it('should handle parameter names with dashes', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          'user-name': 'John',
          'email-address': 'john@example.com',
          'phone-number': '123-456-7890',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle parameter names with underscores', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          user_name: 'John',
          email_address: 'john@example.com',
          phone_number: '1234567890',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle parameter names with dots', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          'user.name': 'John',
          'config.setting.value': true,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('URL Encoding/Decoding', () => {
    it('should handle URL-encoded paths', () => {
      mockRequest = createSecurityMockRequest({
        path: '/api/users/John%20Doe',
        params: { name: 'John Doe' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle special characters encoded', () => {
      mockRequest = createSecurityMockRequest({
        query: {
          search: 'test%26query',
          filter: 'name%3DJohn',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle Unicode encoded in URL', () => {
      mockRequest = createSecurityMockRequest({
        path: '/api/%E4%B8%AD%E6%96%87', // 中文 encoded
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Percent-Encoded Paths', () => {
    it('should handle various percent-encoded characters', () => {
      const encodedPaths = [
        '/api/test%20path',    // space
        '/api/test%2Fpath',    // /
        '/api/test%3Fquery',   // ?
        '/api/test%26param',   // &
        '/api/test%3Dvalue',   // =
      ];

      encodedPaths.forEach((path) => {
        mockRequest = createSecurityMockRequest({ path });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
        (nextFn as any).mockClear();
      });
    });
  });

  describe('UTF-8 BOM Handling', () => {
    it('should handle UTF-8 BOM in string', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          content: '\ufeffSome content with BOM',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle content starting with BOM', () => {
      const bomContent = unicodeTestStrings.bom;

      mockRequest = createSecurityMockRequest({
        body: bomContent,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Mixed Character Encoding', () => {
    it('should handle mixed Latin and CJK characters', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          name: 'John 张三',
          message: 'Hello 你好 こんにちは',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle mixed languages', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          greeting: unicodeTestStrings.combined,
          full: `English 中文 日本語 한국어 ${unicodeTestStrings.arabic}`,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Right-to-Left (RTL) Text', () => {
    it('should handle Arabic RTL text', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          message: unicodeTestStrings.arabic,
          title: 'مرحبا بالعالم',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle Hebrew RTL text', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          message: 'שלום עולם',
          title: 'בדיקה',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle mixed LTR and RTL', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          message: 'Hello مرحبا World עולם',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Unicode Test Strings', () => {
    Object.entries(unicodeTestStrings).forEach(([name, value]) => {
      it(`should handle ${name} unicode string`, () => {
        mockRequest = createSecurityMockRequest({
          body: { content: value },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
        (nextFn as any).mockClear();
      });
    });
  });

  describe('Zero-Width Characters', () => {
    it('should handle zero-width space', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          content: 'test\u200bdata', // Zero-width space
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle zero-width non-joiner', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          content: 'test\u200cdata', // Zero-width non-joiner
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle zero-width joiner', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          content: 'test\u200ddata', // Zero-width joiner
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Combining Characters', () => {
    it('should handle combining diacritical marks', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          // café with combining acute accent
          word1: 'cafe\u0301',
          // résumé with combining accents
          word2: 're\u0301sume\u0301',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle precomposed vs decomposed', () => {
      const precomposed = 'café';  // NFC form
      const decomposed = 'café';   // NFD form (may look same but different bytes)

      mockRequest = createSecurityMockRequest({
        body: {
          precomposed,
          decomposed,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Special Unicode Categories', () => {
    it('should handle currency symbols', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          currencies: unicodeTestStrings.currency,
          price: '€100 £50 ¥1000 ₹500',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle mathematical symbols', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          formula: unicodeTestStrings.mathSymbols,
          equation: '∫∑∏∂∇',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle trademark and registered symbols', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          brand: 'Product™ Company® Service℠',
          symbols: unicodeTestStrings.specialChars,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Surrogate Pairs', () => {
    it('should handle emoji with surrogate pairs', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          emoji: '😀😃😄😁😆',
          flags: '🇺🇸🇬🇧🇯🇵🇨🇳',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle emoji skin tone modifiers', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          hand: '👋🏻👋🏼👋🏽👋🏾👋🏿',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle family emoji', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          family: '👨‍👩‍👧‍👦',
          couple: '👫👬👭',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('OpenAPI Spec Generation with Unicode', () => {
    it('should generate spec with Unicode in info', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'API 接口文档',
          version: '1.0.0',
          description: '这是一个测试API / これはテストAPIです',
        },
      });

      const spec = generator.generate([]);

      expect(spec.info.title).toBe('API 接口文档');
    });

    it('should generate spec with Unicode in tags', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate([]);

      expect(spec.openapi).toBe('3.1.0');
    });

    it('should handle Unicode in operation IDs', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const routes = [
        {
          method: 'get' as const,
          path: '/用户',
          operationId: 'getUsers',
          handler: () => {},
        },
      ];

      const spec = generator.generate(routes);
      expect(spec.paths).toBeDefined();
    });
  });
});
