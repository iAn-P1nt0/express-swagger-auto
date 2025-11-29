/**
 * Contract Tests: Backward Compatibility
 * Tests for breaking change detection, versioning validation,
 * deprecated endpoint tracking, and migration path validation
 */
import { describe, it, expect } from 'vitest';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

interface BreakingChange {
  type: 'path-removed' | 'method-removed' | 'schema-changed' | 'parameter-changed' | 'response-changed';
  path: string;
  description: string;
  severity: 'breaking' | 'warning' | 'info';
}

interface CompatibilityResult {
  compatible: boolean;
  breakingChanges: BreakingChange[];
  warnings: BreakingChange[];
  addedPaths: string[];
  removedPaths: string[];
  addedMethods: Array<{ path: string; method: string }>;
  removedMethods: Array<{ path: string; method: string }>;
}

/**
 * Compare two OpenAPI specs for backward compatibility
 */
function checkBackwardCompatibility(oldSpec: OpenAPISpec, newSpec: OpenAPISpec): CompatibilityResult {
  const breakingChanges: BreakingChange[] = [];
  const warnings: BreakingChange[] = [];
  const addedPaths: string[] = [];
  const removedPaths: string[] = [];
  const addedMethods: Array<{ path: string; method: string }> = [];
  const removedMethods: Array<{ path: string; method: string }> = [];
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  const oldPaths = Object.keys(oldSpec.paths || {});
  const newPaths = Object.keys(newSpec.paths || {});

  // Check for removed paths
  for (const path of oldPaths) {
    if (!newPaths.includes(path)) {
      removedPaths.push(path);
      breakingChanges.push({
        type: 'path-removed',
        path,
        description: `Path ${path} was removed`,
        severity: 'breaking',
      });
    }
  }

  // Check for added paths
  for (const path of newPaths) {
    if (!oldPaths.includes(path)) {
      addedPaths.push(path);
    }
  }

  // Check for method changes on existing paths
  for (const path of oldPaths) {
    if (!newSpec.paths[path]) continue;

    const oldPathItem = oldSpec.paths[path];
    const newPathItem = newSpec.paths[path];

    for (const method of methods) {
      const oldOp = oldPathItem?.[method];
      const newOp = newPathItem?.[method];

      if (oldOp && !newOp) {
        // Method was removed
        removedMethods.push({ path, method });
        breakingChanges.push({
          type: 'method-removed',
          path: `${path}/${method}`,
          description: `${method.toUpperCase()} method was removed from ${path}`,
          severity: 'breaking',
        });
      } else if (!oldOp && newOp) {
        // Method was added
        addedMethods.push({ path, method });
      } else if (oldOp && newOp) {
        // Check for parameter changes
        checkParameterChanges(path, method, oldOp, newOp, breakingChanges, warnings);
        
        // Check for response changes
        checkResponseChanges(path, method, oldOp, newOp, breakingChanges, warnings);

        // Check for deprecation
        if (!oldOp.deprecated && newOp.deprecated) {
          warnings.push({
            type: 'parameter-changed',
            path: `${path}/${method}`,
            description: `${method.toUpperCase()} ${path} has been deprecated`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return {
    compatible: breakingChanges.length === 0,
    breakingChanges,
    warnings,
    addedPaths,
    removedPaths,
    addedMethods,
    removedMethods,
  };
}

/**
 * Check for breaking parameter changes
 */
function checkParameterChanges(
  path: string,
  method: string,
  oldOp: any,
  newOp: any,
  breakingChanges: BreakingChange[],
  warnings: BreakingChange[]
): void {
  const oldParams = oldOp.parameters || [];
  const newParams = newOp.parameters || [];

  // Check for removed required parameters
  for (const oldParam of oldParams) {
    const newParam = newParams.find((p: any) => p.name === oldParam.name && p.in === oldParam.in);
    
    if (!newParam) {
      // Parameter was removed
      if (oldParam.required) {
        breakingChanges.push({
          type: 'parameter-changed',
          path: `${path}/${method}`,
          description: `Required parameter '${oldParam.name}' was removed`,
          severity: 'breaking',
        });
      } else {
        warnings.push({
          type: 'parameter-changed',
          path: `${path}/${method}`,
          description: `Optional parameter '${oldParam.name}' was removed`,
          severity: 'warning',
        });
      }
    } else if (!oldParam.required && newParam.required) {
      // Parameter became required
      breakingChanges.push({
        type: 'parameter-changed',
        path: `${path}/${method}`,
        description: `Parameter '${oldParam.name}' became required`,
        severity: 'breaking',
      });
    }
  }

  // Check for new required parameters
  for (const newParam of newParams) {
    const oldParam = oldParams.find((p: any) => p.name === newParam.name && p.in === newParam.in);
    
    if (!oldParam && newParam.required) {
      breakingChanges.push({
        type: 'parameter-changed',
        path: `${path}/${method}`,
        description: `New required parameter '${newParam.name}' was added`,
        severity: 'breaking',
      });
    }
  }

  // Check requestBody changes
  const oldBody = oldOp.requestBody;
  const newBody = newOp.requestBody;

  if (!oldBody?.required && newBody?.required) {
    breakingChanges.push({
      type: 'parameter-changed',
      path: `${path}/${method}`,
      description: 'Request body became required',
      severity: 'breaking',
    });
  }
}

/**
 * Check for breaking response changes
 */
function checkResponseChanges(
  path: string,
  method: string,
  oldOp: any,
  newOp: any,
  breakingChanges: BreakingChange[],
  warnings: BreakingChange[]
): void {
  const oldResponses = oldOp.responses || {};
  const newResponses = newOp.responses || {};

  // Check for removed success responses
  const successCodes = ['200', '201', '204'];
  for (const code of successCodes) {
    if (oldResponses[code] && !newResponses[code]) {
      breakingChanges.push({
        type: 'response-changed',
        path: `${path}/${method}`,
        description: `Response ${code} was removed`,
        severity: 'breaking',
      });
    }
  }
}

/**
 * Validate semantic versioning
 */
function validateSemanticVersioning(oldVersion: string, newVersion: string, hasBreakingChanges: boolean): {
  valid: boolean;
  message: string;
} {
  const oldParts = oldVersion.replace(/^v/, '').split('.').map(Number);
  const newParts = newVersion.replace(/^v/, '').split('.').map(Number);

  if (oldParts.length !== 3 || newParts.length !== 3) {
    return { valid: false, message: 'Versions must follow semver format (MAJOR.MINOR.PATCH)' };
  }

  const [oldMajor, oldMinor, oldPatch] = oldParts;
  const [newMajor, newMinor, newPatch] = newParts;

  // New version must be greater
  if (
    newMajor < oldMajor ||
    (newMajor === oldMajor && newMinor < oldMinor) ||
    (newMajor === oldMajor && newMinor === oldMinor && newPatch < oldPatch)
  ) {
    return { valid: false, message: 'New version must be greater than old version' };
  }

  // Breaking changes require major version bump
  if (hasBreakingChanges && newMajor === oldMajor) {
    return {
      valid: false,
      message: `Breaking changes detected but major version was not bumped (${oldVersion} → ${newVersion})`,
    };
  }

  return { valid: true, message: 'Version change is valid' };
}

describe('Contract Tests: Backward Compatibility', () => {
  describe('Breaking Change Detection', () => {
    it('should detect removed paths as breaking changes', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': { get: { responses: { '200': { description: 'OK' } } } },
          '/items': { get: { responses: { '200': { description: 'OK' } } } },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '2.0.0' },
        paths: {
          '/users': { get: { responses: { '200': { description: 'OK' } } } },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(false);
      expect(result.removedPaths).toContain('/items');
      expect(result.breakingChanges.some((c) => c.type === 'path-removed')).toBe(true);
    });

    it('should detect removed methods as breaking changes', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { responses: { '200': { description: 'OK' } } },
            post: { responses: { '201': { description: 'Created' } } },
          },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '2.0.0' },
        paths: {
          '/users': {
            get: { responses: { '200': { description: 'OK' } } },
          },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(false);
      expect(result.removedMethods).toContainEqual({ path: '/users', method: 'post' });
    });

    it('should detect new required parameters as breaking changes', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [{ name: 'page', in: 'query', required: false }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '2.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'page', in: 'query', required: false },
                { name: 'apiKey', in: 'header', required: true },
              ],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges.some((c) => c.description.includes('apiKey'))).toBe(true);
    });

    it('should detect parameter becoming required as breaking change', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [{ name: 'filter', in: 'query', required: false }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '2.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [{ name: 'filter', in: 'query', required: true }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges.some((c) => c.description.includes('became required'))).toBe(true);
    });

    it('should detect removed success responses as breaking changes', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': { description: 'OK' },
                '404': { description: 'Not Found' },
              },
            },
          },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '2.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '404': { description: 'Not Found' },
              },
            },
          },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges.some((c) => c.type === 'response-changed')).toBe(true);
    });
  });

  describe('Non-Breaking Changes', () => {
    it('should allow adding new paths', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': { get: { responses: { '200': { description: 'OK' } } } },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.1.0' },
        paths: {
          '/users': { get: { responses: { '200': { description: 'OK' } } } },
          '/items': { get: { responses: { '200': { description: 'OK' } } } },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(true);
      expect(result.addedPaths).toContain('/items');
    });

    it('should allow adding new methods to existing paths', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': { get: { responses: { '200': { description: 'OK' } } } },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.1.0' },
        paths: {
          '/users': {
            get: { responses: { '200': { description: 'OK' } } },
            post: { responses: { '201': { description: 'Created' } } },
          },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(true);
      expect(result.addedMethods).toContainEqual({ path: '/users', method: 'post' });
    });

    it('should allow adding optional parameters', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.1.0' },
        paths: {
          '/users': {
            get: {
              parameters: [{ name: 'filter', in: 'query', required: false }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(true);
    });
  });

  describe('Deprecation Tracking', () => {
    it('should detect newly deprecated operations', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.1.0' },
        paths: {
          '/users': {
            get: {
              deprecated: true,
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(true); // Deprecation is not breaking
      expect(result.warnings.some((w) => w.description.includes('deprecated'))).toBe(true);
    });
  });

  describe('Semantic Versioning Validation', () => {
    it('should require major bump for breaking changes', () => {
      const result = validateSemanticVersioning('1.0.0', '1.1.0', true);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Breaking changes');
    });

    it('should accept major bump for breaking changes', () => {
      const result = validateSemanticVersioning('1.0.0', '2.0.0', true);
      expect(result.valid).toBe(true);
    });

    it('should allow minor bump for non-breaking changes', () => {
      const result = validateSemanticVersioning('1.0.0', '1.1.0', false);
      expect(result.valid).toBe(true);
    });

    it('should allow patch bump for fixes', () => {
      const result = validateSemanticVersioning('1.0.0', '1.0.1', false);
      expect(result.valid).toBe(true);
    });

    it('should reject downgrade', () => {
      const result = validateSemanticVersioning('2.0.0', '1.0.0', false);
      expect(result.valid).toBe(false);
    });

    it('should allow same version when no changes', () => {
      // Same version with no changes is valid (idempotent operation)
      const result = validateSemanticVersioning('1.0.0', '1.0.0', false);
      expect(result.valid).toBe(true);
    });

    it('should handle v-prefixed versions', () => {
      const result = validateSemanticVersioning('v1.0.0', 'v1.1.0', false);
      expect(result.valid).toBe(true);
    });
  });

  describe('Full Compatibility Check', () => {
    it('should report full compatibility status', () => {
      const oldSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [{ name: 'page', in: 'query', required: false }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const newSpec: OpenAPISpec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.1.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'page', in: 'query', required: false },
                { name: 'limit', in: 'query', required: false },
              ],
              responses: { '200': { description: 'OK' } },
            },
            post: { responses: { '201': { description: 'Created' } } },
          },
          '/items': { get: { responses: { '200': { description: 'OK' } } } },
        },
      };

      const result = checkBackwardCompatibility(oldSpec, newSpec);

      expect(result.compatible).toBe(true);
      expect(result.breakingChanges).toHaveLength(0);
      expect(result.addedPaths).toContain('/items');
      expect(result.addedMethods).toContainEqual({ path: '/users', method: 'post' });
    });
  });
});

export { checkBackwardCompatibility, validateSemanticVersioning, CompatibilityResult };
