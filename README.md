# express-swagger-auto

> Hybrid OpenAPI 3.x generator for Express.js with zero-config setup

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
- **Security First**: Automatic masking of sensitive fields in runtime capture

## Installation

```bash
npm install express-swagger-auto
# or
pnpm add express-swagger-auto
# or
yarn add express-swagger-auto
```

## Quick Start

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

## Examples

Explore complete working examples in the [`examples/`](./examples) directory:

- **[decorator-example](./examples/decorator-example)**: TypeScript decorators with Zod validation
  - Demonstrates `@Route`, `@Parameter`, `@RequestBody`, `@Response` decorators
  - Full CRUD user management API
  - Type-safe request/response handling

- **[jsdoc-example](./examples/jsdoc-example)**: JavaScript with JSDoc comments and Joi validation
  - Product catalog API with pagination
  - JSDoc-style inline documentation (Phase 3 parser coming)
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

## CLI Usage

```bash
# Generate OpenAPI spec
npx express-swagger-auto generate --input ./src/app.ts --output ./openapi.json

# Serve Swagger UI standalone
npx express-swagger-auto serve --spec ./openapi.json --port 3000

# Validate OpenAPI spec
npx express-swagger-auto validate ./openapi.json

# Migrate from other tools
npx express-swagger-auto migrate swagger-jsdoc
```

## Phase Roadmap

| Phase | Status | Focus |
|-------|--------|-------|
| 1 | ✅ Complete | Core foundation, route discovery, basic spec generation |
| 2 | ✅ Complete | Schema extraction (Zod/Joi/Yup), plugin API, runtime inference |
| 3 | ✅ Complete | JSDoc parser, decorator system, example merging |
| 4 | **Current** | Security detection, perf tuning, hot reload, CLI completion |
| 5 | Planned | Docs site, CI/CD, npm publish |

**Phase 3 Completed**: JSDoc parser fully implemented and validated! See [PHASE_STATUS.md](./PHASE_STATUS.md) for details.

## Configuration

See `CLAUDE.md` for architecture guardrails and `AGENTS.md` for agent roster.

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

## Performance Budgets

- Route discovery: O(n) relative to layer count
- Spec generation: <50ms for 100 routes (Phase 4 target)
- CLI file watching: Debounce ≥500ms, throttle ≤1Hz

## Security

- **Runtime capture disabled by default in production**
- **Automatic sanitization of sensitive fields** (password, token, apiKey, etc.)
- **No secrets in generated specs or logs**

## Contributing

See `AGENTS.md` for agent collaboration protocol and `docs/AGENT_LOG.md` for development history.

## License

MIT

## Related Projects

- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) - JSDoc-based OpenAPI generation
- [tsoa](https://github.com/lukeautry/tsoa) - TypeScript decorators for Express/Koa
- [express-oas-generator](https://github.com/mpashkovskiy/express-oas-generator) - Runtime-based generation

**express-swagger-auto** combines the best of all three approaches with zero-config hybrid support.
