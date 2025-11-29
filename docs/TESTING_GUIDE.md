# Testing Guide

This guide provides comprehensive documentation for testing the `express-swagger-auto` package.

## Table of Contents

- [Overview](#overview)
- [Test Configuration](#test-configuration)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)

## Overview

The test suite uses [Vitest](https://vitest.dev/) as the test framework with V8 coverage provider. Tests are organized into two main categories:

- **Unit Tests**: Isolated tests for individual modules
- **Integration Tests**: Tests for module interactions and CLI functionality

## Test Configuration

### Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Default configuration for all tests |
| `vitest.config.unit.ts` | Configuration for isolated unit testing |
| `vitest.config.integration.ts` | Configuration for integration testing |

### Unit Test Configuration

The unit test configuration (`vitest.config.unit.ts`) focuses on testing individual modules in isolation:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    name: 'unit',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/integration.test.ts',
      '**/*.integration.test.ts',
      'test/cli/**',
    ],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
});
```

### Integration Test Configuration

The integration test configuration (`vitest.config.integration.ts`) handles module interactions:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    name: 'integration',
    include: [
      'src/integration.test.ts',
      'test/cli/**/*.test.ts',
      'src/cli.*.test.ts',
    ],
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
```

## Running Tests

### Available Scripts

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run unit tests only
pnpm test:unit

# Run unit tests in watch mode
pnpm test:unit:watch

# Run unit tests with coverage
pnpm test:unit:coverage

# Run integration tests only
pnpm test:integration

# Run integration tests with coverage
pnpm test:integration:coverage

# Run all tests with coverage
pnpm test:coverage
```

### Running Specific Tests

```bash
# Run tests matching a pattern
pnpm vitest run --grep "RouteDiscovery"

# Run a specific test file
pnpm vitest run src/core/RouteDiscovery.test.ts

# Run tests with verbose output
pnpm vitest run --reporter=verbose
```

## Test Structure

### Directory Organization

```
src/
├── core/
│   ├── __tests__/
│   │   ├── RouteDiscovery.comprehensive.test.ts
│   │   ├── SpecGenerator.comprehensive.test.ts
│   │   ├── PathParameterExtractor.comprehensive.test.ts
│   │   └── ...
│   ├── RouteDiscovery.test.ts
│   └── SpecGenerator.test.ts
├── parsers/
│   ├── __tests__/
│   │   └── JsDocParser.comprehensive.test.ts
│   └── JsDocParser.test.ts
├── security/
│   ├── __tests__/
│   │   └── SensitiveFieldMasking.test.ts
│   └── SecurityDetector.test.ts
└── ...

test/
├── cli/
│   ├── examples.test.ts
│   ├── export.test.ts
│   └── ...
└── fixtures/
    └── jsdoc-examples.js
```

### Test File Naming Conventions

| Pattern | Purpose |
|---------|---------|
| `*.test.ts` | Standard test files |
| `*.spec.ts` | Specification tests |
| `*.comprehensive.test.ts` | Comprehensive coverage tests |
| `*.integration.test.ts` | Integration tests |
| `*.e2e.test.ts` | End-to-end tests |

### Test Organization

Tests should follow this structure:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('ModuleName', () => {
  describe('Initialization', () => {
    it('should initialize without errors', () => {
      // Test code
    });
  });

  describe('FeatureName', () => {
    beforeEach(() => {
      // Setup
    });

    it('should do something specific', () => {
      // Test code
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', () => {
      // Test code
    });
  });
});
```

## Coverage Requirements

### Minimum Coverage Thresholds

| Category | Threshold |
|----------|-----------|
| Lines | 85% |
| Functions | 85% |
| Branches | 85% |
| Statements | 85% |

### Module-Specific Targets

| Module | Target Coverage |
|--------|-----------------|
| `src/core/*` | 90% |
| `src/parsers/*` | 90% |
| `src/security/*` | 95% |
| `src/validators/*` | 90% |
| `src/middleware/*` | 85% |

### Viewing Coverage Reports

After running tests with coverage:

```bash
pnpm test:coverage
```

Coverage reports are generated in:
- `./coverage/` - Combined coverage
- `./coverage/unit/` - Unit test coverage
- `./coverage/integration/` - Integration test coverage

Open `./coverage/index.html` in a browser to view the detailed report.

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

The workflow includes:
1. Run tests on multiple Node.js versions (16.x, 18.x, 20.x, 22.x)
2. Run tests on multiple operating systems (Ubuntu, macOS, Windows)
3. Generate coverage reports
4. Upload coverage to Codecov

### Coverage Gates

Pull requests must meet minimum coverage thresholds:
- Overall coverage must be ≥85%
- No significant decrease in existing coverage

## Best Practices

### Writing Tests

1. **Isolate tests**: Each test should be independent
2. **Use descriptive names**: Test names should describe the expected behavior
3. **Test edge cases**: Include tests for error handling and boundary conditions
4. **Avoid duplication**: Use `beforeEach` and helper functions

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock a module
vi.mock('module-name', () => ({
  default: vi.fn(),
}));

// Mock a function
const mockFn = vi.fn().mockReturnValue(expected);
```

### Snapshot Testing

For complex output verification:

```typescript
import { expect } from 'vitest';

it('should generate expected spec', () => {
  const spec = generator.generate(routes);
  expect(spec).toMatchSnapshot();
});
```

## Security Testing Best Practices

### Test Sensitive Data Handling

Always verify that sensitive data is properly masked:

```typescript
import { runtimeCapture } from 'express-swagger-auto/middleware';

describe('Sensitive Data Protection', () => {
  it('should mask passwords in request body', () => {
    const middleware = runtimeCapture({ enabled: true });
    // ... test that password values are masked
  });

  it('should mask tokens in headers', () => {
    const middleware = runtimeCapture({ enabled: true });
    // ... test Authorization header handling
  });
});
```

### Test for Injection Attacks

Include injection attack vectors in your test suite:

```typescript
import { sqlInjectionVectors, xssVectors } from './fixtures';

describe('Injection Prevention', () => {
  it.each(sqlInjectionVectors)('should handle SQL injection: %s', (vector) => {
    // Test that SQL injection doesn't execute
  });

  it.each(xssVectors)('should sanitize XSS: %s', (vector) => {
    // Test that XSS is escaped
  });
});
```

### Test Input Validation

Validate edge cases in input handling:

```typescript
describe('Input Validation', () => {
  it('should handle null body', () => { /* ... */ });
  it('should handle empty strings', () => { /* ... */ });
  it('should handle large payloads', () => { /* ... */ });
  it('should handle unicode characters', () => { /* ... */ });
});
```

### Security Test Coverage

Aim for the following security test coverage:

| Category | Target |
|----------|--------|
| Sensitive data masking | 100% |
| Injection prevention | 90% |
| Input validation | 95% |
| Path traversal | 100% |

See [SECURITY_TESTING.md](SECURITY_TESTING.md) for comprehensive security testing documentation.

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout in config or individual test
2. **Port conflicts**: Integration tests run sequentially to avoid conflicts
3. **Coverage drops**: Check excluded files in coverage config

### Debug Mode

```bash
# Run tests with debugging
DEBUG=* pnpm test

# Run specific test with verbose output
pnpm vitest run --reporter=verbose path/to/test.ts
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [express-swagger-auto Repository](https://github.com/iAn-P1nt0/express-swagger-auto)
