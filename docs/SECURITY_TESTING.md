# Security Testing Guide

This guide documents the security testing practices for `express-swagger-auto`.

## Overview

The security test suite covers OWASP API Security Top 10 and additional security best practices. All security tests are located in `test/security/`.

## Test Structure

```
test/security/
├── fixtures.ts                    # Attack vectors and test data
├── utils.ts                       # Security testing utilities
├── sensitive-data-masking.test.ts # PII protection tests
├── injection-attacks.test.ts      # SQL/XSS/Command injection tests
├── path-traversal.test.ts         # Filesystem security tests
├── api-security.test.ts           # OWASP API security tests
├── malformed-requests.test.ts     # Edge case input tests
├── unicode-handling.test.ts       # Character encoding tests
└── error-recovery.test.ts         # Graceful degradation tests
```

## Running Security Tests

```bash
# Run all security tests
pnpm vitest run test/security/

# Run with coverage
pnpm vitest run test/security/ --coverage

# Run specific test file
pnpm vitest run test/security/sensitive-data-masking.test.ts
```

## Test Categories

### 1. Sensitive Data Masking

Tests for protecting PII and sensitive data in runtime capture and logs.

**Covered scenarios:**
- Password field masking (all case variations)
- Token/API key masking in headers
- Credit card number (PAN) masking
- Social security number masking
- Email/phone number masking
- Deep nested object masking (5+ levels)
- Array element masking
- Query parameter masking
- Custom sensitive field patterns

**Key assertions:**
- Sensitive data must be masked before logging
- Masked data must not appear in OpenAPI examples
- Custom field patterns must be respected

### 2. Injection Attack Prevention

Tests for SQL, XSS, Command, and other injection attacks.

**Covered attacks:**
- SQL injection (path params, query params, body)
- XSS in route documentation and OpenAPI specs
- Command injection in file paths and CLI arguments
- Path traversal attempts
- Template injection
- LDAP injection
- Header injection (CRLF)
- NoSQL injection
- XML External Entity (XXE)
- Server-Side Request Forgery (SSRF)
- Prototype pollution

### 3. Path Traversal Security

Tests for filesystem security and path validation.

**Covered patterns:**
- `../` traversal patterns
- Windows-style `..\\` traversal
- URL-encoded traversal (`%2e%2e%2f`)
- Double-encoded traversal
- Overlong UTF-8 encoding
- Absolute path injection (Unix and Windows)
- Null byte injection
- Symlink following prevention

### 4. API Security (OWASP Top 10)

Tests covering OWASP API Security Top 10:

| ID | Name | Coverage |
|----|------|----------|
| API1 | Broken Object Level Authorization | ✅ |
| API2 | Broken Authentication | ✅ |
| API3 | Broken Object Property Level Authorization | ✅ |
| API4 | Unrestricted Resource Consumption | ✅ |
| API5 | Broken Function Level Authorization | ✅ |
| API6 | Unrestricted Access to Sensitive Business Flows | ✅ |
| API7 | Server Side Request Forgery | ✅ |
| API8 | Security Misconfiguration | ✅ |
| API9 | Improper Inventory Management | ✅ |
| API10 | Unsafe Consumption of APIs | ✅ |

### 5. Edge Cases

**Malformed Requests:**
- Missing required fields
- Invalid JSON/YAML syntax
- Large payloads (>10MB)
- Empty bodies
- Null vs undefined values
- Type coercion (string vs number)
- Invalid enum values

**Unicode Handling:**
- CJK characters (Chinese, Japanese, Korean)
- Arabic and RTL text
- Emoji and surrogate pairs
- Zero-width characters
- Combining characters
- BOM handling

**Error Recovery:**
- Partial route discovery on errors
- Invalid route skipping
- Malformed JSDoc handling
- Network timeout handling
- Graceful degradation

## Security Testing Utilities

### `isPathSafe(path: string): boolean`

Validates a path doesn't contain traversal attempts.

```typescript
import { isPathSafe } from './test/security/utils';

isPathSafe('../../../etc/passwd'); // false
isPathSafe('/api/users');          // true
```

### `detectInjectionPatterns(input: string)`

Detects various injection patterns in user input.

```typescript
import { detectInjectionPatterns } from './test/security/utils';

const result = detectInjectionPatterns("' OR '1'='1");
// { hasSqlInjection: true, hasXss: false, ... }
```

### `createRateLimiter(limit: number, windowMs: number)`

Creates a rate limiter for testing.

```typescript
import { createRateLimiter } from './test/security/utils';

const limiter = createRateLimiter(100, 60000);
limiter.checkLimit(); // true (first request)
```

## Writing Security Tests

### Test Structure

```typescript
describe('Security Feature', () => {
  describe('Attack Vector Category', () => {
    it('should handle specific attack', () => {
      // Arrange
      const maliciousInput = '<script>alert(1)</script>';
      
      // Act
      const result = processInput(maliciousInput);
      
      // Assert
      expect(result).not.toContain('<script>');
    });
  });
});
```

### Best Practices

1. **Use fixtures for attack vectors**
   ```typescript
   import { sqlInjectionVectors } from './fixtures';
   ```

2. **Test both positive and negative cases**
   ```typescript
   it('should reject malicious input', () => { ... });
   it('should allow valid input', () => { ... });
   ```

3. **Test edge cases and encoding variations**
   ```typescript
   it('should handle URL-encoded attacks', () => { ... });
   it('should handle double-encoded attacks', () => { ... });
   ```

4. **Verify no sensitive data leaks**
   ```typescript
   expect(logs).not.toContain(sensitiveValue);
   ```

## Security Compliance

### OWASP Recommendations

The test suite implements checks aligned with:
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

### Runtime Capture Security

By default, runtime capture:
- Masks sensitive fields (password, token, apiKey, etc.)
- Respects custom sensitive field patterns
- Truncates large payloads
- Disabled in production mode

### Secure Defaults

```typescript
const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
];
```

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** create a public issue
2. Email security concerns to the maintainers
3. Include detailed reproduction steps
4. Allow time for a fix before public disclosure

See [SECURITY.md](../SECURITY.md) for full details.
