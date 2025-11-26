# Security Guide

## Overview

This guide covers security aspects of `express-swagger-auto`, including:
- Automatic security scheme detection
- Best practices for documenting API security
- Runtime safety considerations
- Production security recommendations

## Automatic Security Detection

The SecurityDetector automatically identifies security schemes from your Express middleware and route metadata.

### Supported Security Schemes

- **JWT/Bearer Tokens** - HTTP Bearer authentication with JWT format
- **API Keys** - Header-based API key authentication
- **OAuth 2.0** - OAuth2 provider detection
- **Basic Authentication** - HTTP Basic auth detection

### How Detection Works

The SecurityDetector analyzes three sources:

1. **Middleware names** - Detects patterns in middleware function names
2. **Route metadata** - Extracts security info from decorators/JSDoc
3. **Header usage** - Identifies authentication headers in routes

### Example Detection

```typescript
import { SecurityDetector } from 'express-swagger-auto/security';

const detector = new SecurityDetector();

// Detect from middleware
const middleware = [
  verifyJWT,  // Detected as bearerAuth
  checkApiKey, // Detected as apiKeyAuth
];

const schemes = detector.detect(middleware);
// Result: { bearerAuth: {...}, apiKeyAuth: {...} }
```

## Documenting Security in Routes

### Using JSDoc

```typescript
/**
 * Get current user profile
 * @security bearerAuth
 * @returns {200} User profile object
 */
app.get('/profile', verifyJWT, (req, res) => {
  res.json(req.user);
});
```

### Using Decorators

```typescript
import { Security } from 'express-swagger-auto/decorators';

@Security('bearerAuth')
@Get('/profile')
getProfile(req: Request, res: Response) {
  res.json(req.user);
}
```

### Supported Security Schemes

#### Bearer Token (JWT)

```typescript
/**
 * @security bearerAuth
 */
```

Generates:

```json
{
  "security": [{ "bearerAuth": [] }],
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer",
      "bearerFormat": "JWT"
    }
  }
}
```

#### API Key

```typescript
/**
 * @security apiKeyAuth
 * @header X-API-Key - Your API key
 */
```

Generates:

```json
{
  "security": [{ "apiKeyAuth": [] }],
  "securitySchemes": {
    "apiKeyAuth": {
      "type": "apiKey",
      "name": "X-API-Key",
      "in": "header"
    }
  }
}
```

## Runtime Capture Safety

The runtime capture feature has built-in protections for sensitive data.

### Enabled by Default: OFF

```typescript
const generator = new SpecGenerator({
  info: { title: 'API', version: '1.0.0' },
  // enableRuntimeCapture is false by default
});
```

### Safe Field Sanitization

When enabled, runtime capture automatically masks:
- Password fields
- Token fields
- API key fields
- Secret fields
- Authorization headers

Example sanitization:

```typescript
// Input
{
  username: 'alice',
  password: 'secret123',
  token: 'jwt_token_xyz'
}

// Output (in spec)
{
  username: 'alice',
  password: '***MASKED***',
  token: '***MASKED***'
}
```

### Configuring Sanitization

```typescript
const generator = new SpecGenerator({
  info: { title: 'API', version: '1.0.0' },
  enableRuntimeCapture: true,
  sanitizationPatterns: [
    'password',
    'token',
    'secret',
    'apikey',
    'authorization',
    // Custom patterns
    'private_key',
    'access_token',
  ],
});
```

## Production Security Best Practices

### 1. Disable Runtime Capture in Production

```typescript
// Always disable in production
const enableCapture = process.env.NODE_ENV !== 'production';

const generator = new SpecGenerator({
  info: { title: 'API', version: '1.0.0' },
  enableRuntimeCapture: enableCapture,
});
```

### 2. Validate Generated Specs

Always validate OpenAPI specs before deploying:

```bash
express-swagger-auto validate ./openapi.json
express-swagger-auto validate ./openapi.json --strict
```

### 3. Secure Spec Distribution

The generated `openapi.json` may contain sensitive information:

- **Don't commit secrets** - Never commit API keys or credentials in specs
- **Use environment variables** - Reference secrets in docs, not values
- **Control access** - Restrict who can download the spec
- **Version control** - Don't expose internal API versions

```typescript
// ❌ Bad - Credentials in spec
{
  "info": {
    "title": "API",
    "x-api-key": "sk_live_abc123xyz"
  }
}

// ✅ Good - Reference to environment
{
  "info": {
    "title": "API",
    "description": "API key required (set via X-API-Key header)"
  }
}
```

### 4. Implement Authentication

Secure your `/api-docs` endpoint:

```typescript
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import spec from './openapi.json';

const app = express();

// Protect the docs endpoint
app.use('/api-docs', (req, res, next) => {
  // Implement authentication
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}, swaggerUi.serve, swaggerUi.setup(spec));
```

### 5. HTTPS Only

Always serve API documentation over HTTPS in production:

```typescript
// Enforce HTTPS
app.use((req, res, next) => {
  if (req.protocol !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.get('host')}${req.url}`);
  }
  next();
});
```

### 6. Content Security Policy

Implement CSP headers:

```typescript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

## Security Detection Examples

### Example 1: JWT Authentication

```typescript
import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();

// Middleware with detectable name
function verifyJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('No token');
  // Verify token...
  next();
}

/**
 * Get protected resource
 * @returns {200} Protected data
 */
app.get('/protected', verifyJWT, (req, res) => {
  res.json({ data: 'secret' });
});

// SecurityDetector will automatically detect:
// - bearerAuth from "verifyJWT" middleware name
// - Authorization header from route analysis
```

Generated security scheme:

```json
{
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer",
      "bearerFormat": "JWT"
    }
  }
}
```

### Example 2: API Key Authentication

```typescript
function checkApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).send('Invalid API key');
  }
  next();
}

/**
 * List all items
 * @header X-API-Key - API authentication key
 */
app.get('/items', checkApiKey, (req, res) => {
  res.json([]);
});
```

Generated security scheme:

```json
{
  "securitySchemes": {
    "apiKeyAuth": {
      "type": "apiKey",
      "name": "X-API-Key",
      "in": "header"
    }
  }
}
```

### Example 3: Multiple Security Schemes

```typescript
const app = express();

// Different endpoints with different auth
app.get(
  '/public',
  (req, res) => res.json({ data: 'public' })
);

app.get(
  '/api/private',
  verifyJWT,
  (req, res) => res.json({ data: 'private' })
);

app.get(
  '/admin',
  checkApiKey,
  verifyAdmin,
  (req, res) => res.json({ data: 'admin' })
);
```

The SecurityDetector will identify all three schemes.

## Common Security Patterns

### API Key Rotation

```typescript
// Support multiple API keys
const validApiKeys = new Set(
  (process.env.API_KEYS || '').split(',')
);

function checkApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!validApiKeys.has(key)) {
    return res.status(401).send('Invalid key');
  }
  next();
}
```

### Rate Limiting with Authentication

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
});

app.use('/api/', limiter);
```

### Token Expiration

```typescript
function verifyJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}
```

## Security Audit Checklist

Before deploying your API:

- [ ] Security schemes are detected or explicitly documented
- [ ] Runtime capture is disabled in production
- [ ] Sensitive fields are masked in generated specs
- [ ] API documentation endpoint is protected
- [ ] HTTPS is enforced in production
- [ ] Content Security Policy headers are set
- [ ] API keys are not hardcoded in specs
- [ ] Authentication tokens are not logged
- [ ] Rate limiting is implemented
- [ ] Input validation is in place
- [ ] CORS is properly configured
- [ ] Secrets are stored in environment variables
- [ ] API spec is validated before deployment
- [ ] Access logs are monitored

## Reporting Security Issues

If you discover a security vulnerability in express-swagger-auto:

1. **Do not** open a public GitHub issue
2. Email security details to the maintainers
3. Include steps to reproduce and impact assessment
4. Allow 90 days for a fix before public disclosure

## Resources

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [OpenAPI Security](https://swagger.io/docs/specification/authentication/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [API Key Management](https://cloud.google.com/docs/authentication/api-keys)

## Version Support

Security updates are provided for:
- Current major version
- Previous major version (limited support)

Check the [CHANGELOG](../CHANGELOG.md) for security patches.
