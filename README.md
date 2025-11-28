# express-swagger-auto

> Hybrid OpenAPI 3.x generator for Express.js with zero-config setup

[![npm version](https://img.shields.io/npm/v/express-swagger-auto.svg)](https://www.npmjs.com/package/express-swagger-auto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

Automatically generate OpenAPI 3.0/3.1 specifications and Swagger UI from Express.js REST APIs using decorators, JSDoc, and runtime capture.

## Key Differentiators

- **Zero-Config Onboarding**: Works with legacy JavaScript apps out of the box
- **Hybrid Generation Strategy**: Choose from three approaches or mix them:
  - **Decorators**: TypeScript-first with experimental decorators
  - **JSDoc**: Comment-based documentation with YAML payloads
  - **Runtime Capture**: Automatic schema inference from live requests (dev mode only)
- **Validator-Aware Schema Extraction**: Native support for Zod, Joi, and Yup with plugin architecture for custom validators
- **Express 4 & 5 Compatible**: Handles nested routers and middleware chains
- **Performance Optimized**: <50ms generation for 100-route apps
- **Security First**: Automatic detection of security schemes and masking of sensitive fields
- **Full-Featured CLI**: Generate, validate, serve, and export specs with watch mode

## Current Version: v0.3.2

### ✅ All Core Phases Complete

| Phase | Status | Focus |
|-------|--------|-------|
| 1 | ✅ Complete | Core foundation, route discovery, basic spec generation |
| 2 | ✅ Complete | Schema extraction (Zod/Joi/Yup), plugin API, runtime inference |
| 3 | ✅ Complete | JSDoc parser, decorator system, TypeScript type inference |
| 4 | ✅ Complete | Security detection, CLI completion, file watching, hot reload |
| 5 | ✅ Complete | CI/CD workflows, npm publish, community infrastructure |
| 6 | 🚀 Current | Documentation site, additional examples, migration guides |

**474 tests passing** with comprehensive coverage across all features.

---

## Installation

```bash
npm install express-swagger-auto
# or
pnpm add express-swagger-auto
# or
yarn add express-swagger-auto
```

## Quick Start

### Initialize Your Project

The fastest way to get started:

```bash
npx express-swagger-auto init
```

This will interactively guide you through setup, creating a config file and example routes.

### Basic Usage (Zero Config)

```typescript
import express from 'express';
import { RouteDiscovery, SpecGenerator, createSwaggerUIMiddleware } from 'express-swagger-auto';

const app = express();

// Your existing routes
app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

// Auto-generate OpenAPI spec
const discovery = new RouteDiscovery();
const routes = discovery.discover(app);

const generator = new SpecGenerator({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'Auto-generated API documentation',
  },
});

const spec = generator.generate(routes);

// Mount Swagger UI
app.use(createSwaggerUIMiddleware({ spec }));

app.listen(3000, () => {
  console.log('Swagger UI: http://localhost:3000/api-docs');
});
```

### Strategy 1: TypeScript Decorators

```typescript
import { Route, Parameter, Response } from 'express-swagger-auto/decorators';

class UserController {
  @Route({
    summary: 'Get user by ID',
    tags: ['users'],
  })
  @Parameter({
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string' },
  })
  @Response({
    statusCode: 200,
    description: 'User found',
  })
  async getUser(req: Request, res: Response) {
    // handler logic
  }
}
```

### Strategy 2: JSDoc Comments ✅

```javascript
import { RouteDiscovery, JsDocParser, SpecGenerator } from 'express-swagger-auto';

/**
 * @openapi
 * @route GET /users/{id}
 * @summary Get user by ID
 * @tags users
 * @param {string} id.path.required - User ID
 * @response 200 - User found
 * @response 404 - User not found
 */
app.get('/users/:id', (req, res) => {
  // handler logic
});

// Automatic parsing from JSDoc comments
const parser = new JsDocParser({ sourceFiles: ['src/**/*.js'] });
const discovery = new RouteDiscovery();
const routes = discovery.discover(app, {
  enableJsDocParsing: true,
  jsDocParser: parser,
});

const generator = new SpecGenerator({ info: { title: 'My API', version: '1.0.0' } });
const spec = generator.generate(routes);
```

**📖 [Complete JSDoc Tags Reference](./docs/JSDOC_TAGS.md)** - Full documentation of all supported tags and syntax

### Strategy 3: Runtime Capture (Dev Mode)

```typescript
import { runtimeCapture } from 'express-swagger-auto/middleware';

// Enable runtime capture in development
app.use(runtimeCapture({
  enabled: process.env.NODE_ENV === 'development',
  sensitiveFields: ['password', 'token', 'apiKey'],
}));

// Routes are automatically analyzed during execution
app.post('/users', (req, res) => {
  // Schema inferred from actual request/response
  res.json({ id: 1, name: 'Bob' });
});
```

### Validator Integration (Zod Example)

```typescript
import { z } from 'zod';
import { ZodAdapter } from 'express-swagger-auto';

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive(),
});

const adapter = new ZodAdapter();
const openApiSchema = adapter.convert(userSchema);
// Automatically converts to OpenAPI schema format
```

## CLI Usage

The CLI provides comprehensive tooling for generating, validating, and serving API documentation.

### Commands Overview

```bash
# Initialize project with config file
npx express-swagger-auto init

# Generate OpenAPI spec
npx express-swagger-auto generate --input ./src/app.ts --output ./openapi.json

# Generate with watch mode
npx express-swagger-auto generate --watch

# Serve Swagger UI standalone
npx express-swagger-auto serve --spec ./openapi.json --port 3000

# Validate OpenAPI spec
npx express-swagger-auto validate ./openapi.json

# Validate with strict mode and security audit
npx express-swagger-auto validate ./openapi.json --strict --security-audit

# Get API statistics
npx express-swagger-auto stats ./openapi.json

# Export to Postman/Insomnia/Bruno/Hoppscotch
npx express-swagger-auto export ./openapi.json --format postman

# Generate realistic example values
npx express-swagger-auto examples ./openapi.json --inplace

# Generate shell completion
npx express-swagger-auto completion bash >> ~/.bashrc

# Migrate from other tools
npx express-swagger-auto migrate swagger-jsdoc
```

### Configuration File

express-swagger-auto supports multiple config file formats via cosmiconfig:

```javascript
// swagger-auto.config.js
/** @type {import('express-swagger-auto').SwaggerAutoConfig} */
module.exports = {
  input: './src/app.ts',
  output: './docs/openapi.yaml',
  format: 'yaml',
  strategies: ['jsdoc', 'decorator'],
  info: {
    title: 'My API',
    version: '2.0.0',
    description: 'Production API'
  },
  security: {
    detect: true
  },
  watch: {
    paths: ['src/**'],
    ignored: ['node_modules', 'dist'],
    debounce: 500
  },
  routes: {
    include: ['/api/*'],
    exclude: ['/internal/*']
  }
};
```

**📖 [Complete CLI Documentation](./docs/CLI.md)** - Full reference for all commands and options

## Examples

Explore complete working examples in the [`examples/`](./examples) directory:

- **[decorator-example](./examples/decorator-example)**: TypeScript decorators with Zod validation
  - Demonstrates `@Route`, `@Parameter`, `@RequestBody`, `@Response` decorators
  - Full CRUD user management API
  - Type-safe request/response handling

- **[jsdoc-example](./examples/jsdoc-example)**: JavaScript with JSDoc comments and Joi validation
  - Product catalog API with pagination
  - JSDoc-style inline documentation
  - Manual route metadata with Joi schema conversion

- **[runtime-example](./examples/runtime-example)**: Runtime schema capture with snapshot storage
  - Zero-annotation blog API
  - Automatic schema inference from request/response data
  - Snapshot persistence with deduplication

Each example includes:
- Complete implementation with README
- Installation and usage instructions
- curl command examples
- Running Swagger UI integration

## Core Features

### Route Discovery
- **Express 4 & 5 Compatible**: Full support for both Express versions
- **Nested Router Support**: Handles deeply nested routers with cycle detection
- **Middleware Analysis**: Detects authentication guards, validation middleware, error handlers, CORS, and logging
- **Path Parameter Extraction**: Converts Express patterns to OpenAPI format

### Schema Extraction
- **Validator Adapters**: Native support for Zod, Joi, and Yup
- **Plugin Architecture**: Extensible ValidatorRegistry for custom validators
- **Controller Analysis**: Infers request/response schemas from handlers
- **Runtime Inference**: Automatic schema detection from live requests

### Security Detection
- **Auto-Detection**: Automatically identifies JWT/Bearer, API Key, OAuth2, and Basic auth
- **Multiple Sources**: Analyzes middleware names, route metadata, and HTTP headers
- **Safe Sanitization**: Automatic masking of sensitive fields (passwords, tokens, API keys)

### TypeScript Type Inference
- **Full Type Support**: Primitives, arrays, unions, intersections, generics, and utility types
- **Confidence Scoring**: Quality metrics for inferred types
- **Performance Caching**: Optimized for large codebases

## Configuration

### GeneratorConfig

```typescript
interface GeneratorConfig {
  info: OpenAPIInfo;              // Required: API title, version, description
  servers?: OpenAPIServer[];      // API servers
  specVersion?: '3.0.0' | '3.1.0'; // Default: '3.1.0'
  enableRuntimeCapture?: boolean; // Default: false in production
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
  outputPath?: string;            // CLI output path
}
```

### SwaggerAutoConfig (for config files)

```typescript
interface SwaggerAutoConfig {
  input?: string;                 // Entry point file
  output?: string;                // Output path
  format?: 'json' | 'yaml';       // Output format
  strategies?: Array<'jsdoc' | 'decorator' | 'runtime'>;
  info?: OpenAPIInfo;
  servers?: OpenAPIServer[];
  security?: { detect?: boolean };
  watch?: { paths?: string[]; ignored?: string[]; debounce?: number };
  routes?: { include?: string[]; exclude?: string[]; tags?: string[] };
  ci?: { enabled?: boolean; outputFormat?: 'text' | 'json' | 'sarif' };
}
```

See `CLAUDE.md` for architecture guardrails and `AGENTS.md` for agent roster.

## Performance Budgets

- Route discovery: O(n) relative to layer count
- Spec generation: <50ms for 100 routes
- CLI file watching: Debounce ≥500ms, throttle ≤1Hz
- Memory: <50MB for 1000+ routes

See [Performance Guide](./docs/PERFORMANCE.md) for optimization tips and benchmarking.

## Security

- **Runtime capture disabled by default in production**
- **Automatic sanitization of sensitive fields** (password, token, apiKey, etc.)
- **Security scheme auto-detection** (JWT, API Key, OAuth2, Basic)
- **No secrets in generated specs or logs**
- **HTTPS-only recommendations for production**

See [Security Guide](./docs/SECURITY.md) for production best practices.

## Documentation

- **[API Reference](./docs/API.md)** - Complete API documentation
- **[CLI Guide](./docs/CLI.md)** - Command-line interface reference
- **[JSDoc Tags](./docs/JSDOC_TAGS.md)** - Supported JSDoc annotations
- **[Security Guide](./docs/SECURITY.md)** - Security best practices
- **[Performance Guide](./docs/PERFORMANCE.md)** - Optimization and benchmarking

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

See `AGENTS.md` for agent collaboration protocol and `docs/AGENT_LOG.md` for development history.

## License

MIT

## Related Projects

- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) - JSDoc-based OpenAPI generation
- [tsoa](https://github.com/lukeautry/tsoa) - TypeScript decorators for Express/Koa
- [express-oas-generator](https://github.com/mpashkovskiy/express-oas-generator) - Runtime-based generation

**express-swagger-auto** combines the best of all three approaches with zero-config hybrid support.
