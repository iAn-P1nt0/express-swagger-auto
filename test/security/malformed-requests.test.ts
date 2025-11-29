/**
 * Malformed Requests Edge Case Tests
 *
 * Tests for handling invalid inputs and edge cases
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
import { malformedDataFixtures, largePayloadGenerators } from './fixtures';

describe('Malformed Requests - Edge Case Tests', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRequest = createSecurityMockRequest();
    mockResponse = createSecurityMockResponse();
    nextFn = createTrackedNext();
  });

  describe('Missing Required Fields', () => {
    it('should handle request with no body', () => {
      mockRequest = createSecurityMockRequest({
        body: undefined,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle request with null body', () => {
      mockRequest = createSecurityMockRequest({
        body: null,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle request with empty body', () => {
      mockRequest = createSecurityMockRequest({
        body: {},
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle request with missing query', () => {
      mockRequest = createSecurityMockRequest({
        query: undefined,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle request with missing headers', () => {
      mockRequest = createSecurityMockRequest({
        headers: undefined,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Invalid JSON Syntax', () => {
    it.each(malformedDataFixtures.invalidJson.slice(0, 5))(
      'should handle invalid JSON: %s',
      (invalidJson) => {
        mockRequest = createSecurityMockRequest({
          body: invalidJson, // String that looks like invalid JSON
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
      }
    );

    it('should handle body that cannot be serialized', () => {
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;

      mockRequest = createSecurityMockRequest({
        body: circularObj,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Invalid YAML Syntax', () => {
    it('should handle malformed YAML-like strings', () => {
      const yamlStrings = malformedDataFixtures.invalidYaml;

      yamlStrings.forEach((yamlStr) => {
        mockRequest = createSecurityMockRequest({
          body: yamlStr,
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
        (nextFn as any).mockClear();
      });
    });
  });

  describe('Extremely Large Payloads (>10MB)', () => {
    it('should handle large string payload', () => {
      const largeString = largePayloadGenerators.generateLargeString(1000000);

      mockRequest = createSecurityMockRequest({
        body: { data: largeString },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 1024 * 100, // 100KB limit
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle large array payload', () => {
      const largeArray = largePayloadGenerators.generateLargeArray(10000);

      mockRequest = createSecurityMockRequest({
        body: { items: largeArray },
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 1024 * 100,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle large object payload', () => {
      const largeObject = largePayloadGenerators.generateLargeObject(5000);

      mockRequest = createSecurityMockRequest({
        body: largeObject,
      });

      const middleware = runtimeCapture({
        enabled: true,
        maxBodySize: 1024 * 100,
      });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Empty Request Bodies', () => {
    it('should handle undefined body', () => {
      mockRequest = createSecurityMockRequest({
        body: undefined,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle empty object body', () => {
      mockRequest = createSecurityMockRequest({
        body: {},
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle empty array body', () => {
      mockRequest = createSecurityMockRequest({
        body: [],
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle empty string body', () => {
      mockRequest = createSecurityMockRequest({
        body: '',
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Null vs Undefined Values', () => {
    it('should handle null values in body', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          name: null,
          age: null,
          active: null,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle undefined values in body', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          name: undefined,
          age: undefined,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle mixed null and undefined', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          nullValue: null,
          undefinedValue: undefined,
          validValue: 'valid',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Boolean as String ("true" vs true)', () => {
    it('should handle string "true"', () => {
      mockRequest = createSecurityMockRequest({
        body: { active: 'true' },
        query: { enabled: 'true' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle string "false"', () => {
      mockRequest = createSecurityMockRequest({
        body: { active: 'false' },
        query: { enabled: 'false' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle boolean true', () => {
      mockRequest = createSecurityMockRequest({
        body: { active: true },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle mixed boolean representations', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          boolTrue: true,
          boolFalse: false,
          stringTrue: 'true',
          stringFalse: 'false',
          intTrue: 1,
          intFalse: 0,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Number as String ("123" vs 123)', () => {
    it('should handle string numbers', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          id: '123',
          amount: '99.99',
          count: '0',
        },
        query: {
          page: '1',
          limit: '10',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle numeric values', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          id: 123,
          amount: 99.99,
          count: 0,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle mixed number representations', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          stringNum: '123',
          intNum: 123,
          floatNum: 123.45,
          stringFloat: '123.45',
          scientific: 1e10,
          stringScientific: '1e10',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Array vs Object Confusion', () => {
    it('should handle array where object expected', () => {
      mockRequest = createSecurityMockRequest({
        body: [1, 2, 3],
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle object where array expected', () => {
      mockRequest = createSecurityMockRequest({
        body: { '0': 'a', '1': 'b', '2': 'c' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle array-like objects', () => {
      mockRequest = createSecurityMockRequest({
        body: { length: 3, '0': 'a', '1': 'b', '2': 'c' },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Invalid Enum Values', () => {
    it('should handle invalid enum value', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          status: 'INVALID_STATUS',
          type: 'unknown_type',
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle null/undefined for enum fields', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          status: null,
          type: undefined,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Edge Case Values', () => {
    it.each(malformedDataFixtures.edgeCaseValues.filter((v) => v !== undefined))(
      'should handle edge case value: %s',
      (edgeValue) => {
        mockRequest = createSecurityMockRequest({
          body: { value: edgeValue },
        });

        const middleware = runtimeCapture({ enabled: true });
        middleware(mockRequest, mockResponse, nextFn);

        expect(nextFn).toHaveBeenCalled();
        (nextFn as any).mockClear();
      }
    );

    it('should handle NaN', () => {
      mockRequest = createSecurityMockRequest({
        body: { value: NaN },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle Infinity', () => {
      mockRequest = createSecurityMockRequest({
        body: { positive: Infinity, negative: -Infinity },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle MAX_SAFE_INTEGER', () => {
      mockRequest = createSecurityMockRequest({
        body: {
          max: Number.MAX_SAFE_INTEGER,
          min: Number.MIN_SAFE_INTEGER,
          maxValue: Number.MAX_VALUE,
          minValue: Number.MIN_VALUE,
        },
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Deeply Nested Structures', () => {
    it('should handle 10-level deep nesting', () => {
      const deepObj = largePayloadGenerators.generateDeeplyNested(10);

      mockRequest = createSecurityMockRequest({
        body: deepObj,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle 20-level deep nesting', () => {
      const deepObj = largePayloadGenerators.generateDeeplyNested(20);

      mockRequest = createSecurityMockRequest({
        body: deepObj,
      });

      const middleware = runtimeCapture({ enabled: true });
      middleware(mockRequest, mockResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Route Discovery Edge Cases', () => {
    it('should handle app with no routes', () => {
      const app = express();
      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes).toEqual([]);
    });

    it('should handle app with only middleware', () => {
      const app = express();
      app.use((req, res, next) => next());
      app.use(express.json());

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('Spec Generation Edge Cases', () => {
    it('should handle empty routes array', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const spec = generator.generate([]);

      expect(spec.openapi).toBe('3.1.0');
      expect(spec.paths).toEqual({});
    });

    it('should handle route with minimal data', () => {
      const generator = new SpecGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      });

      const routes = [
        {
          method: 'get' as const,
          path: '/test',
          handler: () => {},
        },
      ];

      const spec = generator.generate(routes);

      expect(spec.paths['/test']).toBeDefined();
    });
  });
});
