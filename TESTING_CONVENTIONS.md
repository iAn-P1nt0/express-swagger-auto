# Testing Conventions

Standards and best practices for writing tests in `express-swagger-auto`.

## File Naming

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*.test.ts` | Standard unit tests | `RouteDiscovery.test.ts` |
| `*.spec.ts` | Specification tests | `SpecGenerator.spec.ts` |
| `*.comprehensive.test.ts` | Full coverage tests | `PathParameterExtractor.comprehensive.test.ts` |
| `*.integration.test.ts` | Integration tests | `api.integration.test.ts` |
| `*.e2e.test.ts` | End-to-end tests | `cli.e2e.test.ts` |

## Directory Structure

```
project/
├── src/
│   ├── core/
│   │   ├── __tests__/                 # Comprehensive tests
│   │   │   ├── RouteDiscovery.comprehensive.test.ts
│   │   │   └── SpecGenerator.comprehensive.test.ts
│   │   ├── RouteDiscovery.ts
│   │   ├── RouteDiscovery.test.ts     # Basic tests (co-located)
│   │   └── SpecGenerator.ts
│   └── ...
└── test/
    ├── cli/                           # CLI integration tests
    ├── fixtures/                      # Test fixtures
    └── helpers/                       # Test utilities
```

## Test Organization

### Test Suites

```typescript
describe('ModuleName', () => {
  // Group by functionality
  describe('Initialization', () => {});
  describe('Core Functionality', () => {});
  describe('Error Handling', () => {});
  describe('Edge Cases', () => {});
});
```

### Test Naming

Use descriptive names that explain the expected behavior:

```typescript
// ✅ Good
it('should extract path parameters from Express route pattern', () => {});
it('should return empty array when path has no parameters', () => {});
it('should throw ValidationError when schema is invalid', () => {});

// ❌ Bad
it('test extract', () => {});
it('works', () => {});
it('error test', () => {});
```

## Assertion Style

### Use Explicit Assertions

```typescript
// ✅ Good
expect(result).toBeDefined();
expect(result.parameters).toHaveLength(2);
expect(result.parameters[0].name).toBe('userId');

// ❌ Bad
expect(result).toBeTruthy();
expect(result.parameters.length).toBe(2);
```

### Assert One Concept Per Test

```typescript
// ✅ Good - Single concept per test
it('should extract userId parameter', () => {
  const result = extractor.extract('/users/:userId');
  expect(result.parameters[0].name).toBe('userId');
});

it('should mark path parameters as required', () => {
  const result = extractor.extract('/users/:userId');
  expect(result.parameters[0].required).toBe(true);
});

// ❌ Bad - Multiple concepts
it('should extract and configure parameter', () => {
  const result = extractor.extract('/users/:userId');
  expect(result.parameters[0].name).toBe('userId');
  expect(result.parameters[0].required).toBe(true);
  expect(result.parameters[0].in).toBe('path');
  expect(result.normalized).toBe('/users/{userId}');
});
```

## Setup and Teardown

### Use Hooks Appropriately

```typescript
describe('FeatureUnderTest', () => {
  let instance: FeatureClass;

  // Setup before each test
  beforeEach(() => {
    instance = new FeatureClass();
  });

  // Cleanup after each test
  afterEach(() => {
    instance.cleanup();
  });

  // One-time setup
  beforeAll(() => {
    // Global setup (database, connections, etc.)
  });

  // One-time cleanup
  afterAll(() => {
    // Global cleanup
  });
});
```

### Avoid Shared State

```typescript
// ✅ Good - Fresh instance per test
beforeEach(() => {
  discovery = new RouteDiscovery();
});

// ❌ Bad - Shared mutable state
const discovery = new RouteDiscovery(); // Can leak between tests
```

## Mocking

### Mock Only What's Necessary

```typescript
import { vi } from 'vitest';

// ✅ Good - Mock external dependencies
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('content'),
}));

// ❌ Bad - Mocking too much
vi.mock('../RouteDiscovery'); // Don't mock the thing you're testing
```

### Use Factory Functions

```typescript
// helpers/mocks.ts
export const createMockRequest = (overrides = {}): Request => ({
  method: 'GET',
  path: '/test',
  headers: {},
  query: {},
  body: {},
  ...overrides,
}) as Request;

export const createMockResponse = (): Response => ({
  statusCode: 200,
  json: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
}) as unknown as Response;
```

## Coverage Requirements

### Module Coverage Targets

| Module | Minimum | Target |
|--------|---------|--------|
| `src/core/*` | 85% | 90% |
| `src/parsers/*` | 85% | 90% |
| `src/security/*` | 90% | 95% |
| `src/validators/*` | 85% | 90% |
| `src/middleware/*` | 80% | 85% |
| `src/cli/*` | 75% | 85% |

### What to Test

✅ **Test:**
- Public API methods
- Error handling paths
- Edge cases
- Input validation
- Configuration options

❌ **Don't Test:**
- Private implementation details
- Third-party library internals
- Simple getters/setters
- Log statements

## Testing Patterns

### Arrange-Act-Assert (AAA)

```typescript
it('should normalize Express path to OpenAPI format', () => {
  // Arrange
  const extractor = new PathParameterExtractor();
  const expressPath = '/users/:id';

  // Act
  const result = extractor.normalizePath(expressPath);

  // Assert
  expect(result).toBe('/users/{id}');
});
```

### Table-Driven Tests

```typescript
describe('Type Inference', () => {
  const cases = [
    ['userId', 'integer'],
    ['slug', 'string'],
    ['active', 'boolean'],
  ] as const;

  test.each(cases)(
    'should infer %s as %s type',
    (paramName, expectedType) => {
      const result = extractor.extractPathParameters(`/:${paramName}`);
      expect(result.parameters[0].schema.type).toBe(expectedType);
    }
  );
});
```

### Boundary Testing

```typescript
describe('Body Size Limits', () => {
  it('should accept body at max size', () => {
    const maxSize = 1000;
    const body = 'x'.repeat(maxSize);
    expect(() => capture(body, maxSize)).not.toThrow();
  });

  it('should truncate body exceeding max size', () => {
    const maxSize = 1000;
    const body = 'x'.repeat(maxSize + 1);
    const result = capture(body, maxSize);
    expect(result.length).toBeLessThanOrEqual(maxSize + 20);
  });
});
```

## Documentation in Tests

### Document Test Intent

```typescript
/**
 * Comprehensive tests for RouteDiscovery
 * Target: 90% coverage for route discovery functionality
 *
 * Tests cover:
 * - Express 4 & 5 compatibility
 * - Nested router support
 * - Path parameter extraction
 * - Error handling
 */
describe('RouteDiscovery - Comprehensive Tests', () => {
  // Tests here
});
```

### Comment Complex Assertions

```typescript
it('should handle Express 5 matcher functions', () => {
  // Express 5 uses compiled matcher functions instead of regex
  // We need to probe the matcher to find what prefix it expects
  const routes = discovery.discover(express5App);
  
  // Path may vary by Express version, just verify route found
  expect(routes.length).toBeGreaterThan(0);
});
```

## Anti-Patterns to Avoid

### ❌ Test Interdependence

```typescript
// Bad - Tests depend on order
let counter = 0;

it('increments counter', () => {
  counter++;
  expect(counter).toBe(1);
});

it('counter is 1', () => {
  expect(counter).toBe(1); // Fails if run alone
});
```

### ❌ Overly Complex Setup

```typescript
// Bad - Too much setup
beforeEach(async () => {
  await connectDatabase();
  await seedData();
  await startServer();
  await configureAuth();
  // ... 20 more lines
});
```

### ❌ Testing Implementation Details

```typescript
// Bad - Testing private implementation
it('should use _processRoute internally', () => {
  const spy = vi.spyOn(discovery, '_processRoute');
  discovery.discover(app);
  expect(spy).toHaveBeenCalled(); // Will break on refactor
});
```

### ❌ Ignoring Error Messages

```typescript
// Bad - Not verifying error details
it('should throw error', () => {
  expect(() => parse(null)).toThrow(); // What error?
});

// Good - Verify error type and message
it('should throw ValidationError for null input', () => {
  expect(() => parse(null)).toThrow(ValidationError);
  expect(() => parse(null)).toThrow(/input cannot be null/i);
});
```

## Continuous Integration

### Test Commands in CI

```yaml
# Run all tests
- run: pnpm test

# Run with coverage for main branches
- run: pnpm test:coverage
  if: github.ref == 'refs/heads/main'

# Fail on coverage regression
- run: pnpm test:coverage --coverage.thresholdAutoUpdate
```

### Coverage Reporting

Coverage reports are automatically generated and uploaded to Codecov on the `main` branch.
