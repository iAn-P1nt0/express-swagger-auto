# API Reference

This document provides detailed API documentation for express-swagger-auto's public interfaces.

## Table of Contents

- [Core Classes](#core-classes)
  - [RouteDiscovery](#routediscovery)
  - [SpecGenerator](#specgenerator)
  - [SecurityDetector](#securitydetector)
  - [FileWatcher](#filewatcher)
- [Validators](#validators)
  - [ZodValidator](#zodvalidator)
  - [JoiValidator](#joivalidator)
  - [YupValidator](#yupvalidator)
- [Middleware](#middleware)
- [Types & Interfaces](#types--interfaces)
- [Examples](#examples)

## Core Classes

### RouteDiscovery

Discovers Express routes and extracts metadata.

#### Constructor

```typescript
constructor(options?: RouteDiscoveryOptions)
```

**Options:**
```typescript
interface RouteDiscoveryOptions {
  /** Include middleware in analysis (default: false) */
  includeMiddleware?: boolean;

  /** Maximum depth for nested routers (default: 10) */
  maxDepth?: number;

  /** Skip routes matching these patterns (default: []) */
  skipPatterns?: RegExp[];
}
```

#### Methods

##### discover(app: Express | Router): RouteMetadata[]

Discovers all routes in an Express app or router.

**Parameters:**
- `app`: Express Application or Router instance

**Returns:** Array of discovered routes with metadata

**Example:**
```typescript
import { RouteDiscovery } from 'express-swagger-auto';
import express from 'express';

const app = express();
const discovery = new RouteDiscovery();
const routes = discovery.discover(app);

console.log(routes);
// [
//   {
//     path: '/api/users',
//     methods: ['GET', 'POST'],
//     middleware: ['auth', 'validate'],
//     handler: [Function],
//   },
//   // ...
// ]
```

##### getRouteByPath(path: string): RouteMetadata | undefined

Get a specific route by path.

**Parameters:**
- `path`: Route path to find

**Returns:** Route metadata or undefined if not found

**Example:**
```typescript
const route = discovery.getRouteByPath('/api/users/:id');
```

### SpecGenerator

Generates OpenAPI specifications from routes.

#### Constructor

```typescript
constructor(options?: SpecGeneratorOptions)
```

**Options:**
```typescript
interface SpecGeneratorOptions {
  /** OpenAPI version (default: '3.1.0') */
  version?: '3.0.0' | '3.1.0';

  /** API info */
  info: {
    title: string;
    version: string;
    description?: string;
  };

  /** Server definitions */
  servers?: Array<{
    url: string;
    description?: string;
  }>;

  /** Enable caching (default: true) */
  cache?: boolean;
}
```

#### Methods

##### generate(routes: RouteMetadata[]): OpenAPISpec

Generates OpenAPI specification from routes.

**Parameters:**
- `routes`: Array of route metadata

**Returns:** Complete OpenAPI 3.1 specification

**Example:**
```typescript
import { SpecGenerator } from 'express-swagger-auto';

const generator = new SpecGenerator({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'My awesome API',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://api.example.com', description: 'Production' },
  ],
});

const spec = generator.generate(routes);
console.log(JSON.stringify(spec, null, 2));
```

##### addSecurityScheme(name: string, scheme: OpenAPISecurityScheme): void

Adds a security scheme to the spec.

**Parameters:**
- `name`: Security scheme name
- `scheme`: Security scheme definition

**Example:**
```typescript
generator.addSecurityScheme('Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
```

##### addServer(url: string, description?: string): void

Adds a server definition.

**Parameters:**
- `url`: Server URL
- `description`: Optional server description

**Example:**
```typescript
generator.addServer('https://staging.example.com', 'Staging');
```

##### getSpec(): OpenAPISpec

Gets the generated specification (with caching if enabled).

**Returns:** Current OpenAPI specification

### SecurityDetector

Automatically detects security schemes in Express apps.

#### Constructor

```typescript
constructor(options?: SecurityDetectorOptions)
```

**Options:**
```typescript
interface SecurityDetectorOptions {
  /** Custom pattern matching rules */
  patterns?: {
    jwt?: RegExp;
    apiKey?: RegExp;
    oauth?: RegExp;
    basic?: RegExp;
  };

  /** Fields to sanitize in specs */
  sanitizeFields?: string[];
}
```

#### Methods

##### detect(options: DetectOptions): Map<string, OpenAPISecurityScheme>

Detects security schemes from multiple sources.

**Parameters:**
```typescript
interface DetectOptions {
  /** Middleware array to analyze */
  middleware?: any[];

  /** Route metadata */
  metadata?: any;

  /** HTTP headers to check */
  headers?: string[];
}
```

**Returns:** Map of security scheme name → OpenAPI definition

**Example:**
```typescript
import { SecurityDetector } from 'express-swagger-auto';

const detector = new SecurityDetector();
const schemes = detector.detect({
  middleware: [authMiddleware],
  headers: ['Authorization', 'X-API-Key'],
});

schemes.forEach((scheme, name) => {
  console.log(`Found ${name}:`, scheme);
});
```

##### detectFromMiddleware(middleware: any[]): Map<string, OpenAPISecurityScheme>

Detects security schemes from middleware.

**Parameters:**
- `middleware`: Array of middleware functions

**Returns:** Detected schemes

##### detectFromHeaders(headers: string[]): Map<string, OpenAPISecurityScheme>

Detects security schemes from HTTP headers.

**Parameters:**
- `headers`: Array of header names

**Returns:** Detected schemes

**Example:**
```typescript
const schemes = detector.detectFromHeaders([
  'Authorization',
  'X-API-Key',
  'X-Request-ID',
]);
// Returns: { Bearer: {...}, ApiKey: {...} }
```

### FileWatcher

Watches files for changes and triggers callbacks.

#### Constructor

```typescript
constructor(options: FileWatcherOptions)
```

**Options:**
```typescript
interface FileWatcherOptions {
  /** Glob patterns to watch */
  paths: string[];

  /** Patterns to ignore (default: ['node_modules', '.git']) */
  ignored?: string[] | string;

  /** Debounce time in ms (default: 500) */
  debounce?: number;

  /** Enable persistent watching (default: true) */
  persistent?: boolean;
}
```

#### Methods

##### start(): Promise<void>

Starts file watching.

**Example:**
```typescript
import { FileWatcher } from 'express-swagger-auto';

const watcher = new FileWatcher({
  paths: ['src/**/*.ts'],
  debounce: 500,
  ignored: ['node_modules', '**/*.test.ts'],
});

await watcher.start();
console.log('Watching files...');
```

##### stop(): Promise<void>

Stops file watching gracefully.

**Example:**
```typescript
process.on('SIGINT', async () => {
  await watcher.stop();
  console.log('Watcher stopped');
  process.exit(0);
});
```

##### onChange(handler: ChangeHandler): void

Registers a change handler.

**Parameters:**
```typescript
type ChangeHandler = (
  eventType: 'add' | 'change' | 'unlink',
  filePath: string,
) => Promise<void> | void;
```

**Example:**
```typescript
watcher.onChange(async (eventType, filePath) => {
  console.log(`File ${eventType}: ${filePath}`);
  // Regenerate spec
  const spec = await generateSpec();
  console.log('Spec regenerated');
});
```

##### getWatchedFileCount(): number

Gets the number of currently watched files.

**Returns:** File count

## Validators

### ZodValidator

Converts Zod schemas to OpenAPI types.

#### Methods

##### toOpenAPI(schema: z.ZodType): OpenAPIType

Converts a Zod schema to OpenAPI schema.

**Parameters:**
- `schema`: Zod schema object

**Returns:** OpenAPI type definition

**Example:**
```typescript
import { z } from 'zod';
import { ZodValidator } from 'express-swagger-auto';

const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  age: z.number().min(0).max(150).optional(),
});

const validator = new ZodValidator();
const openAPIType = validator.toOpenAPI(userSchema);

console.log(openAPIType);
// {
//   type: 'object',
//   properties: {
//     id: { type: 'integer' },
//     email: { type: 'string', format: 'email' },
//     name: { type: 'string' },
//     age: { type: 'integer', minimum: 0, maximum: 150 },
//   },
//   required: ['id', 'email', 'name'],
// }
```

### JoiValidator

Converts Joi schemas to OpenAPI types.

#### Methods

##### toOpenAPI(schema: Schema): OpenAPIType

Converts a Joi schema to OpenAPI schema.

**Example:**
```typescript
import Joi from 'joi';
import { JoiValidator } from 'express-swagger-auto';

const userSchema = Joi.object({
  id: Joi.number().required(),
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  age: Joi.number().min(0).max(150),
});

const validator = new JoiValidator();
const openAPIType = validator.toOpenAPI(userSchema);
```

### YupValidator

Converts Yup schemas to OpenAPI types.

#### Methods

##### toOpenAPI(schema: BaseSchema): OpenAPIType

Converts a Yup schema to OpenAPI schema.

**Example:**
```typescript
import * as yup from 'yup';
import { YupValidator } from 'express-swagger-auto';

const userSchema = yup.object().shape({
  id: yup.number().required(),
  email: yup.string().email().required(),
  name: yup.string().required(),
  age: yup.number().min(0).max(150),
});

const validator = new YupValidator();
const openAPIType = validator.toOpenAPI(userSchema);
```

## Middleware

### swaggerUI()

Express middleware to serve Swagger UI.

**Usage:**
```typescript
import { swaggerUI } from 'express-swagger-auto/middleware';
import express from 'express';

const app = express();

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUI());

app.listen(3000);
```

**Configuration:**
```typescript
interface SwaggerUIOptions {
  /** Path to OpenAPI spec JSON file */
  specPath?: string;

  /** Inline spec object (alternative to specPath) */
  spec?: OpenAPISpec;

  /** Swagger UI options */
  uiOptions?: {
    docExpansion?: 'list' | 'full' | 'none';
    filter?: boolean;
    showRequestHeaders?: boolean;
    presets?: string[];
  };
}

app.use(
  '/api-docs',
  swaggerUI({
    spec: generatedSpec,
    uiOptions: {
      docExpansion: 'list',
      filter: true,
    },
  }),
);
```

### runtimeCapture()

Experimental middleware to capture runtime request/response data.

**⚠️ Warning**: Only use in development. Never enable in production unless you're certain sensitive data won't be captured.

**Usage:**
```typescript
import { runtimeCapture } from 'express-swagger-auto/middleware';

if (process.env.NODE_ENV === 'development') {
  app.use(runtimeCapture());
}

app.get('/api/users', (req, res) => {
  res.json({ id: 1, name: 'John' });
});

// Runtime capture now analyzes this endpoint
```

## Types & Interfaces

### RouteMetadata

```typescript
interface RouteMetadata {
  /** Route path pattern */
  path: string;

  /** HTTP methods (GET, POST, etc.) */
  methods: string[];

  /** Middleware functions in route chain */
  middleware: any[];

  /** Route handler function */
  handler: Function;

  /** Route-specific metadata */
  metadata?: Record<string, any>;

  /** Extracted JSDoc comments */
  jsdoc?: JSDocMetadata;

  /** Decorator-based metadata */
  decorators?: DecoratorMetadata[];
}
```

### OpenAPISpec

```typescript
interface OpenAPISpec {
  /** OpenAPI version */
  openapi: string;

  /** API information */
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };

  /** Server definitions */
  servers: Array<{
    url: string;
    description?: string;
  }>;

  /** API paths */
  paths: Record<string, PathItem>;

  /** Reusable components */
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    responses?: Record<string, any>;
  };

  /** Security definitions for entire API */
  security?: Array<Record<string, string[]>>;

  /** API tags */
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}
```

### OpenAPISecurityScheme

```typescript
interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';

  /** For apiKey type */
  name?: string;
  in?: 'query' | 'header' | 'cookie';

  /** For http type */
  scheme?: string;
  bearerFormat?: string;

  /** For oauth2 type */
  flows?: {
    implicit?: {
      authorizationUrl: string;
      scopes: Record<string, string>;
    };
    authorizationCode?: {
      authorizationUrl: string;
      tokenUrl: string;
      scopes: Record<string, string>;
    };
  };

  /** Description */
  description?: string;
}
```

## Examples

### Complete Setup Example

```typescript
import express, { Express } from 'express';
import { RouteDiscovery, SpecGenerator, SecurityDetector } from 'express-swagger-auto';
import { swaggerUI } from 'express-swagger-auto/middleware';

const app: Express = express();

// Define routes
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

app.post('/api/users', (req, res) => {
  res.status(201).json({ id: 2, name: 'Jane' });
});

app.get('/api/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'User' });
});

// Discover routes
const discovery = new RouteDiscovery();
const routes = discovery.discover(app);

// Generate spec
const generator = new SpecGenerator({
  info: {
    title: 'User API',
    version: '1.0.0',
    description: 'Simple user management API',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
});

const spec = generator.generate(routes);

// Detect security
const detector = new SecurityDetector();
const securitySchemes = detector.detect({
  headers: ['Authorization'],
});

securitySchemes.forEach((scheme, name) => {
  generator.addSecurityScheme(name, scheme);
});

// Serve Swagger UI
app.use('/api-docs', swaggerUI({ spec }));

// Serve OpenAPI JSON
app.get('/openapi.json', (req, res) => {
  res.json(spec);
});

app.listen(3000, () => {
  console.log('API running on http://localhost:3000');
  console.log('Docs available at http://localhost:3000/api-docs');
});
```

### Validator Integration Example

```typescript
import { z } from 'zod';
import { ZodValidator } from 'express-swagger-auto';
import express from 'express';

const app = express();

// Define Zod schema
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().min(18).optional(),
});

// Convert to OpenAPI
const validator = new ZodValidator();
const userRequestSchema = validator.toOpenAPI(createUserSchema);

// Use in route
app.post('/api/users', (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }

  res.status(201).json({ id: 1, ...result.data });
});
```

### File Watching Example

```typescript
import { FileWatcher, SpecGenerator, RouteDiscovery } from 'express-swagger-auto';
import express from 'express';
import path from 'path';

const app = express();
let spec: any;

// Watch source files for changes
const watcher = new FileWatcher({
  paths: ['src/**/*.ts'],
  debounce: 500,
  ignored: ['node_modules', '**/*.test.ts'],
});

async function regenerateSpec() {
  const discovery = new RouteDiscovery();
  const routes = discovery.discover(app);

  const generator = new SpecGenerator({
    info: { title: 'My API', version: '1.0.0' },
  });

  spec = generator.generate(routes);
  console.log('✓ Spec regenerated');
}

watcher.onChange(async (eventType, filePath) => {
  console.log(`Changed: ${filePath}`);

  // Clear require cache to reload modules
  delete require.cache[path.resolve(filePath)];

  await regenerateSpec();
});

await watcher.start();
console.log('Watching for changes...');

app.get('/openapi.json', (req, res) => {
  res.json(spec);
});

app.listen(3000);
```

## See Also

- [CLI Reference](./CLI.md) - Command-line interface
- [Security Guide](./SECURITY.md) - Security best practices
- [Performance Guide](./PERFORMANCE.md) - Optimization tips
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development setup
