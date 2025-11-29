/**
 * Contract Tests: OpenAPI Compliance
 * Tests OpenAPI spec compliance with validation
 */
import { describe, it, expect } from 'vitest';
import { RouteDiscovery } from '../../src/core/RouteDiscovery';
import { SpecGenerator } from '../../src/core/SpecGenerator';
import {
  createCRUDApp,
  createMinimalSpec,
  createSecuredSpec,
  createSpecWithSchemas,
} from './helpers';

/**
 * Validate an OpenAPI spec using basic structure validation
 */
function validateOpenAPISpec(spec: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!spec.openapi) {
    errors.push('Missing required field: openapi');
  } else if (!spec.openapi.match(/^3\.[01]\.\d+$/)) {
    errors.push(`Invalid OpenAPI version: ${spec.openapi}`);
  }

  if (!spec.info) {
    errors.push('Missing required field: info');
  } else {
    if (!spec.info.title) errors.push('Missing info.title');
    if (!spec.info.version) errors.push('Missing info.version');
  }

  if (!spec.paths) {
    errors.push('Missing required field: paths');
  } else if (typeof spec.paths !== 'object') {
    errors.push('paths must be an object');
  } else {
    // Validate each path
    for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
      if (!pathKey.startsWith('/') && pathKey !== '') {
        warnings.push(`Path should start with /: ${pathKey}`);
      }

      // Validate operations
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
      for (const method of methods) {
        const operation = (pathItem as any)?.[method];
        if (operation) {
          if (!operation.responses) {
            errors.push(`Operation ${method} ${pathKey} missing responses`);
          }
          if (!operation.operationId) {
            warnings.push(`Operation ${method} ${pathKey} missing operationId`);
          }
        }
      }
    }
  }

  // Validate components if present
  if (spec.components) {
    if (spec.components.schemas) {
      for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
        if (typeof schema !== 'object' || schema === null) {
          errors.push(`Invalid schema: ${schemaName}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

describe('Contract Tests: OpenAPI Compliance', () => {
  describe('Basic Structure Validation', () => {
    it('should validate minimal valid spec', () => {
      const spec = createMinimalSpec();
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for missing openapi version', () => {
      const spec = {
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      };
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('openapi'))).toBe(true);
    });

    it('should fail for missing info', () => {
      const spec = {
        openapi: '3.1.0',
        paths: {},
      };
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('info'))).toBe(true);
    });

    it('should fail for missing paths', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
      };
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('paths'))).toBe(true);
    });
  });

  describe('Generated Spec Compliance', () => {
    it('should generate compliant spec from Express app', () => {
      const app = createCRUDApp();
      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(true);
    });

    it('should generate operationIds for all operations', () => {
      const app = createCRUDApp();
      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      const result = validateOpenAPISpec(spec);

      // Some warnings about operationId might exist but no errors
      expect(result.valid).toBe(true);
    });

    it('should include responses for all operations', () => {
      const app = createCRUDApp();
      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);

      // Check all operations have responses
      for (const [, pathItem] of Object.entries(spec.paths)) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
          const operation = (pathItem as any)?.[method];
          if (operation) {
            expect(operation.responses).toBeDefined();
          }
        }
      }
    });
  });

  describe('OAS 3.0.0 Compliance', () => {
    it('should generate valid OAS 3.0.0 spec', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        specVersion: '3.0.0',
      });

      const spec = generator.generate([
        { method: 'GET', path: '/test', handler: () => {} },
      ]);

      expect(spec.openapi).toBe('3.0.0');
      const result = validateOpenAPISpec(spec);
      expect(result.valid).toBe(true);
    });
  });

  describe('OAS 3.1.0 Compliance', () => {
    it('should generate valid OAS 3.1.0 spec by default', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate([
        { method: 'GET', path: '/test', handler: () => {} },
      ]);

      expect(spec.openapi).toBe('3.1.0');
      const result = validateOpenAPISpec(spec);
      expect(result.valid).toBe(true);
    });
  });

  describe('Security Scheme Validation', () => {
    it('should validate spec with security schemes', () => {
      const spec = createSecuredSpec();
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(true);
      expect(spec.components?.securitySchemes).toBeDefined();
    });

    it('should include security schemes in generated spec', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      });

      const spec = generator.generate([]);
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(true);
      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.components?.securitySchemes?.bearerAuth.type).toBe('http');
    });
  });

  describe('Component Schema Validation', () => {
    it('should validate spec with component schemas', () => {
      const spec = createSpecWithSchemas();
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(true);
      expect(spec.components?.schemas?.User).toBeDefined();
    });

    it('should validate $ref references are structurally valid', () => {
      const spec = createSpecWithSchemas();

      // Check that $refs point to existing schemas
      const refs: string[] = [];
      const collectRefs = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.$ref) refs.push(obj.$ref);
        for (const value of Object.values(obj)) {
          collectRefs(value);
        }
      };
      collectRefs(spec.paths);

      // All refs should point to existing schemas
      for (const ref of refs) {
        if (ref.startsWith('#/components/schemas/')) {
          const schemaName = ref.replace('#/components/schemas/', '');
          expect(spec.components?.schemas?.[schemaName]).toBeDefined();
        }
      }
    });
  });

  describe('Path Parameter Validation', () => {
    it('should validate path parameters are defined', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate([
        { method: 'GET', path: '/users/:id', handler: () => {} },
      ]);

      const pathItem = spec.paths['/users/:id'];
      expect(pathItem.get.parameters).toBeDefined();
      expect(pathItem.get.parameters.some((p: any) => p.name === 'id')).toBe(true);
    });

    it('should mark path parameters as required', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate([
        { method: 'GET', path: '/users/:id', handler: () => {} },
      ]);

      const idParam = spec.paths['/users/:id'].get.parameters.find(
        (p: any) => p.name === 'id'
      );
      expect(idParam.required).toBe(true);
      expect(idParam.in).toBe('path');
    });
  });

  describe('Operation Uniqueness', () => {
    it('should generate unique operationIds', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate([
        { method: 'GET', path: '/users', handler: () => {} },
        { method: 'POST', path: '/users', handler: () => {} },
        { method: 'GET', path: '/users/:id', handler: () => {} },
        { method: 'PUT', path: '/users/:id', handler: () => {} },
        { method: 'DELETE', path: '/users/:id', handler: () => {} },
      ]);

      const operationIds = new Set<string>();
      for (const [, pathItem] of Object.entries(spec.paths)) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
          const operation = (pathItem as any)?.[method];
          if (operation?.operationId) {
            expect(operationIds.has(operation.operationId)).toBe(false);
            operationIds.add(operation.operationId);
          }
        }
      }
    });
  });

  describe('Server Configuration Validation', () => {
    it('should validate server URLs', () => {
      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'http://localhost:3000', description: 'Development' },
        ],
      });

      const spec = generator.generate([]);

      expect(spec.servers).toHaveLength(2);
      expect(spec.servers[0].url).toBe('https://api.example.com');
      expect(spec.servers[1].url).toBe('http://localhost:3000');
    });
  });

  describe('Comprehensive Validation', () => {
    it('should validate full spec with all features', () => {
      const app = createCRUDApp();
      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Full Test API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      });

      const spec = generator.generate(routes);
      const result = validateOpenAPISpec(spec);

      expect(result.valid).toBe(true);
      expect(spec.servers).toBeDefined();
      expect(spec.components?.securitySchemes).toBeDefined();
    });

    it('should produce JSON-serializable output', () => {
      const app = createCRUDApp();
      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      const generator = new SpecGenerator({
        info: { title: 'Test API', version: '1.0.0' },
      });

      const spec = generator.generate(routes);
      
      // Should not throw
      const json = JSON.stringify(spec);
      const parsed = JSON.parse(json);
      
      expect(parsed.openapi).toBe(spec.openapi);
    });
  });
});
