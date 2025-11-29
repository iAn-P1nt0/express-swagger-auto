# Edge Cases and Limitations

This document describes known edge cases, limitations, and how they are handled in `express-swagger-auto`.

## Input Validation Edge Cases

### Malformed Request Bodies

| Case | Behavior | Notes |
|------|----------|-------|
| `null` body | Handled gracefully | No crash, next() called |
| `undefined` body | Handled gracefully | No crash, next() called |
| Empty object `{}` | Processed normally | Valid JSON |
| Empty string `""` | Converted to empty | String body handling |
| Circular references | Non-serializable handling | Returns `[Non-serializable data]` |

### Type Coercion

Express may receive values in unexpected types:

```javascript
// String booleans
{ active: "true" }   // String, not boolean
{ active: "false" }  // String, not boolean

// String numbers
{ id: "123" }        // String, not number
{ amount: "99.99" }  // String, not number

// Arrays vs Objects
{ "0": "a", "1": "b" }  // Object that looks like array
```

**Recommendation:** Use validation libraries (Zod/Joi/Yup) to coerce and validate types.

### Large Payloads

| Size | Behavior |
|------|----------|
| < 100KB | Full processing |
| 100KB - 10MB | Truncated in capture |
| > 10MB | Should be rejected at server level |

**Configuration:**
```typescript
runtimeCapture({
  maxBodySize: 102400  // 100KB default
});
```

## Character Encoding Edge Cases

### Unicode Support

✅ **Supported:**
- Chinese (中文)
- Japanese (日本語)
- Korean (한국어)
- Arabic (العربية)
- Hindi (हिंदी)
- Emoji (🚀🔥💯)
- Currency symbols (€£¥₹)

⚠️ **Edge Cases:**
- Right-to-left (RTL) text mixed with LTR
- Zero-width characters (may affect string comparison)
- Combining diacritical marks (NFC vs NFD normalization)
- Surrogate pairs in emoji

### URL Encoding

```
%20  → space
%2F  → /
%2E  → .
%3A  → :
%3F  → ?
```

**Double encoding** (`%252F` → `%2F` → `/`) is detected as potentially malicious.

## Router Configuration Edge Cases

### Nested Routers

✅ **Supported depths:**
- 10+ levels of nesting
- Multiple routers at same path
- Dynamic path segments

⚠️ **Edge cases:**
```javascript
// Circular router reference (will cause issues)
const routerA = express.Router();
const routerB = express.Router();
routerA.use('/b', routerB);
routerB.use('/a', routerA);  // Circular!
```

### Route Patterns

| Pattern | Support |
|---------|---------|
| `/users/:id` | ✅ Full |
| `/users/:id?` | ✅ Full |
| `/files/*` | ✅ Full |
| `/test(ing)?` | ⚠️ Partial |
| Regex routes | ⚠️ Partial |

### Middleware Inheritance

Routes inherit middleware from parent routers:

```javascript
const app = express();
const api = express.Router();

app.use(authMiddleware);  // Applied to all
api.use(apiKeyMiddleware); // Applied to /api/*

app.use('/api', api);
```

## Schema Extraction Limitations

### Zod Adapter

✅ **Fully supported:**
- `z.string()`, `z.number()`, `z.boolean()`
- `z.object()`, `z.array()`
- `z.enum()`, `z.literal()`
- `z.optional()`, `z.nullable()`
- `z.union()`, `z.discriminatedUnion()`

⚠️ **Limited support:**
- `z.transform()` - Only input type
- `z.lazy()` - Circular references
- `z.custom()` - No schema inference

### Joi Adapter

✅ **Fully supported:**
- Basic types (string, number, boolean)
- Object and array schemas
- Validation rules

⚠️ **Limited support:**
- Custom validators
- External references
- `when()` conditionals

### Yup Adapter

✅ **Fully supported:**
- Basic types
- Object and array schemas
- Validation rules

⚠️ **Limited support:**
- Custom test functions
- Context-dependent validation

## Performance Considerations

### Route Discovery

| Routes | Expected Time |
|--------|---------------|
| 100 | < 50ms |
| 500 | < 200ms |
| 1000 | < 500ms |

### Spec Generation

| Routes | Expected Time |
|--------|---------------|
| 100 | < 100ms |
| 500 | < 500ms |
| 1000 | < 1s |

### Memory Usage

| Routes | Heap Increase |
|--------|---------------|
| 100 | ~0.5MB |
| 500 | ~2MB |
| 1000 | ~5MB |

**Recommendation:** For apps with 1000+ routes, use caching and incremental updates.

## Security Considerations

### Sensitive Data Masking

Default sensitive fields:
- `password`
- `token`
- `apiKey`
- `api_key`
- `secret`
- `authorization`
- `cookie`

**Adding custom fields:**
```typescript
runtimeCapture({
  sensitiveFields: ['ssn', 'creditCard', 'cvv']
});
```

### Runtime Capture in Production

⚠️ **Warning:** Runtime capture is disabled by default in production:

```typescript
// Enabled only in development by default
enabled: process.env.NODE_ENV === 'development'
```

**If you must enable in production:**
```typescript
runtimeCapture({
  enabled: true,
  sensitiveFields: [...], // Comprehensive list
  maxBodySize: 1024,      // Smaller limit
});
```

## Known Limitations

### Express Version Compatibility

| Express | Support |
|---------|---------|
| 4.x | ✅ Full |
| 5.x | ✅ Full |
| 3.x | ❌ Not supported |

### Node.js Version

| Node | Support |
|------|---------|
| 16.x | ✅ Full |
| 18.x | ✅ Full |
| 20.x | ✅ Full |
| 22.x | ✅ Full |
| 14.x | ❌ Not supported |

### TypeScript Decorators

Requires experimental decorators:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### JSDoc Parsing

✅ **Supported tags:**
- `@summary`
- `@description`
- `@param`
- `@returns`
- `@tags`
- `@example`

⚠️ **Edge cases:**
- Multi-line YAML in JSDoc
- Nested objects in parameters
- Complex type expressions

## Error Handling

### Graceful Degradation

The library continues operation when encountering:
- Invalid route handlers
- Malformed JSDoc comments
- Schema conversion errors
- Circular dependencies

Errors are logged but don't crash the application.

### Recovery Strategies

```typescript
// Partial route discovery
const routes = discovery.discover(app);
// Returns valid routes even if some fail

// Invalid schema handling
const schema = adapter.convert(invalidSchema);
// Returns generic object schema
```

## Reporting Issues

If you encounter an edge case not documented here:

1. Check existing [GitHub issues](https://github.com/iAn-P1nt0/express-swagger-auto/issues)
2. Create a new issue with:
   - Express and Node.js versions
   - Minimal reproduction code
   - Expected vs actual behavior
   - Error messages if any

## See Also

- [SECURITY_TESTING.md](SECURITY_TESTING.md) - Security testing guide
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - General testing guide
- [API.md](API.md) - API reference
