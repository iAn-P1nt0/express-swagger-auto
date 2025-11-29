# Writing Tests Guide

A step-by-step guide for contributors on how to write tests for `express-swagger-auto`.

## Table of Contents

- [Getting Started](#getting-started)
- [Test Types](#test-types)
- [Step-by-Step Examples](#step-by-step-examples)
- [Testing Patterns](#testing-patterns)
- [Common Scenarios](#common-scenarios)

## Getting Started

### Prerequisites

Ensure you have the development dependencies installed:

```bash
pnpm install
```

### Test File Location

Place your test files according to the module being tested:

| Module Type | Test Location |
|-------------|---------------|
| Core modules | `src/core/__tests__/*.test.ts` |
| Parser modules | `src/parsers/__tests__/*.test.ts` |
| Validator modules | `src/validators/*.test.ts` |
| Middleware | `src/middleware/*.test.ts` |
| CLI | `test/cli/*.test.ts` |

## Test Types

### 1. Unit Tests

Test individual functions or classes in isolation.

```typescript
import { describe, it, expect } from 'vitest';
import { PathParameterExtractor } from '../PathParameterExtractor';

describe('PathParameterExtractor', () => {
  const extractor = new PathParameterExtractor();

  it('should extract single path parameter', () => {
    const result = extractor.extractPathParameters('/users/:id');
    
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].name).toBe('id');
    expect(result.parameters[0].in).toBe('path');
    expect(result.parameters[0].required).toBe(true);
  });
});
```

### 2. Integration Tests

Test how multiple modules work together.

```typescript
import { describe, it, expect } from 'vitest';
import express from 'express';
import { RouteDiscovery } from '../core/RouteDiscovery';
import { SpecGenerator } from '../core/SpecGenerator';

describe('Route Discovery and Spec Generation Integration', () => {
  it('should generate spec from discovered routes', () => {
    const app = express();
    app.get('/users', (req, res) => res.json([]));
    app.post('/users', (req, res) => res.json({}));

    const discovery = new RouteDiscovery();
    const routes = discovery.discover(app);

    const generator = new SpecGenerator({
      info: { title: 'Test API', version: '1.0.0' },
    });
    const spec = generator.generate(routes);

    expect(spec.paths['/users'].get).toBeDefined();
    expect(spec.paths['/users'].post).toBeDefined();
  });
});
```

### 3. Snapshot Tests

Test complex output by comparing to saved snapshots.

```typescript
import { describe, it, expect } from 'vitest';
import { SpecGenerator } from '../core/SpecGenerator';

describe('SpecGenerator Snapshots', () => {
  it('should generate consistent spec structure', () => {
    const generator = new SpecGenerator({
      info: { title: 'API', version: '1.0.0' },
    });
    const spec = generator.generate([
      { method: 'GET', path: '/users', handler: () => {} },
    ]);

    expect(spec).toMatchSnapshot();
  });
});
```

## Step-by-Step Examples

### Example 1: Testing a New Validator Adapter

```typescript
// src/validators/CustomAdapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CustomAdapter } from './CustomAdapter';

describe('CustomAdapter', () => {
  let adapter: CustomAdapter;

  beforeEach(() => {
    adapter = new CustomAdapter();
  });

  describe('Schema Conversion', () => {
    it('should convert string schema', () => {
      const customSchema = { type: 'text' };
      const openAPISchema = adapter.convert(customSchema);

      expect(openAPISchema).toEqual({
        type: 'string',
      });
    });

    it('should convert number schema with constraints', () => {
      const customSchema = {
        type: 'number',
        min: 0,
        max: 100,
      };
      const openAPISchema = adapter.convert(customSchema);

      expect(openAPISchema).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 100,
      });
    });

    it('should handle nested object schemas', () => {
      const customSchema = {
        type: 'object',
        fields: {
          name: { type: 'text', required: true },
          age: { type: 'number' },
        },
      };
      const openAPISchema = adapter.convert(customSchema);

      expect(openAPISchema.type).toBe('object');
      expect(openAPISchema.properties.name.type).toBe('string');
      expect(openAPISchema.required).toContain('name');
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid schema', () => {
      expect(() => adapter.convert(null)).toThrow();
    });

    it('should return generic schema for unknown types', () => {
      const schema = adapter.convert({ type: 'unknown' });
      expect(schema).toEqual({ type: 'object' });
    });
  });
});
```

### Example 2: Testing Route Discovery

```typescript
// src/core/__tests__/RouteDiscovery.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RouteDiscovery } from '../RouteDiscovery';
import express, { Router } from 'express';

describe('RouteDiscovery', () => {
  let discovery: RouteDiscovery;

  beforeEach(() => {
    discovery = new RouteDiscovery();
  });

  describe('Simple Routes', () => {
    it('should discover GET route', () => {
      const app = express();
      app.get('/users', (req, res) => res.json([]));

      const routes = discovery.discover(app);

      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('GET');
      expect(routes[0].path).toBe('/users');
    });

    it('should discover multiple methods on same path', () => {
      const app = express();
      app.get('/items', (req, res) => res.json([]));
      app.post('/items', (req, res) => res.json({}));

      const routes = discovery.discover(app);

      expect(routes).toHaveLength(2);
      expect(routes.map(r => r.method)).toContain('GET');
      expect(routes.map(r => r.method)).toContain('POST');
    });
  });

  describe('Nested Routers', () => {
    it('should discover routes in nested router', () => {
      const app = express();
      const apiRouter = Router();
      
      apiRouter.get('/users', (req, res) => res.json([]));
      app.use('/api/v1', apiRouter);

      const routes = discovery.discover(app);

      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe('/api/v1/users');
    });
  });

  describe('Error Handling', () => {
    it('should handle null app', () => {
      const routes = discovery.discover(null as any);
      expect(routes).toEqual([]);
    });

    it('should handle app without router', () => {
      const routes = discovery.discover({} as any);
      expect(routes).toEqual([]);
    });
  });
});
```

### Example 3: Testing Middleware

```typescript
// src/middleware/customMiddleware.test.ts
import { describe, it, expect, vi } from 'vitest';
import { customMiddleware } from './customMiddleware';
import type { Request, Response, NextFunction } from 'express';

describe('customMiddleware', () => {
  const createMockRequest = (overrides = {}): Request => ({
    method: 'GET',
    path: '/test',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  } as Request);

  const createMockResponse = (): Response => ({
    statusCode: 200,
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response);

  it('should call next when enabled', () => {
    const middleware = customMiddleware({ enabled: true });
    const req = createMockRequest();
    const res = createMockResponse();
    const next: NextFunction = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should skip processing when disabled', () => {
    const middleware = customMiddleware({ enabled: false });
    const req = createMockRequest();
    const res = createMockResponse();
    const next: NextFunction = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
```

## Testing Patterns

### Pattern 1: Arrange-Act-Assert

```typescript
it('should extract parameters from path', () => {
  // Arrange
  const extractor = new PathParameterExtractor();
  const path = '/users/:userId/posts/:postId';

  // Act
  const result = extractor.extractPathParameters(path);

  // Assert
  expect(result.parameters).toHaveLength(2);
  expect(result.parameters[0].name).toBe('userId');
  expect(result.parameters[1].name).toBe('postId');
});
```

### Pattern 2: Given-When-Then

```typescript
describe('Given a valid Express app', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.get('/users', handler);
  });

  describe('When discovering routes', () => {
    let routes: RouteMetadata[];

    beforeEach(() => {
      const discovery = new RouteDiscovery();
      routes = discovery.discover(app);
    });

    it('Then it should find the GET route', () => {
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('GET');
    });
  });
});
```

### Pattern 3: Table-Driven Tests

```typescript
describe('Type Inference', () => {
  const testCases = [
    { param: 'userId', expected: 'integer' },
    { param: 'slug', expected: 'string' },
    { param: 'active', expected: 'boolean' },
    { param: 'page', expected: 'integer' },
  ];

  testCases.forEach(({ param, expected }) => {
    it(`should infer ${expected} type for :${param}`, () => {
      const result = extractor.extractPathParameters(`/items/:${param}`);
      expect(result.parameters[0].schema.type).toBe(expected);
    });
  });
});
```

## Common Scenarios

### Testing Async Operations

```typescript
it('should handle async file parsing', async () => {
  const parser = new JsDocParser({ cwd: __dirname });
  const routes = await parser.parse();

  expect(routes.length).toBeGreaterThan(0);
});
```

### Testing Error Scenarios

```typescript
describe('Error Handling', () => {
  it('should throw on invalid input', () => {
    expect(() => {
      parser.parse(null as any);
    }).toThrow('Invalid input');
  });

  it('should handle parse errors gracefully', () => {
    const source = '/** invalid jsdoc';
    const routes = parser.parseSource(source);
    
    // Should not throw, returns empty array
    expect(routes).toEqual([]);
  });
});
```

### Testing with Mocks

```typescript
import { vi } from 'vitest';

describe('With mocked dependencies', () => {
  it('should use mocked storage', () => {
    const mockStorage = {
      store: vi.fn(),
      retrieve: vi.fn().mockReturnValue([]),
    };

    const capture = runtimeCapture({
      snapshotStorage: mockStorage as any,
    });

    // ... test code

    expect(mockStorage.store).toHaveBeenCalled();
  });
});
```

### Testing Express Applications

```typescript
import request from 'supertest';

describe('API Endpoints', () => {
  it('should return OpenAPI spec', async () => {
    const app = createTestApp();

    const response = await request(app)
      .get('/openapi.json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.openapi).toBe('3.1.0');
  });
});
```

## Tips for Writing Good Tests

1. **One assertion per test when possible** - Makes failures easier to diagnose
2. **Use meaningful test names** - Should describe the expected behavior
3. **Test behavior, not implementation** - Tests should survive refactoring
4. **Keep tests independent** - Each test should work in isolation
5. **Use fixtures for complex data** - Store test data in `test/fixtures/`
6. **Clean up after tests** - Use `afterEach` to reset state

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Express Testing with Supertest](https://github.com/ladjs/supertest)
