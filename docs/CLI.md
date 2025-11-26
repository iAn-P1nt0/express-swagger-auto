# CLI Documentation

## Overview

The `express-swagger-auto` CLI provides a command-line interface for generating, validating, and managing OpenAPI specifications from Express.js applications.

```bash
express-swagger-auto <command> [options]
```

## Installation

### As a dev dependency (recommended)

```bash
npm install --save-dev express-swagger-auto
# or
pnpm add -D express-swagger-auto
```

Then use via npm scripts:

```json
{
  "scripts": {
    "generate:api-docs": "express-swagger-auto generate",
    "validate:api-docs": "express-swagger-auto validate ./openapi.json"
  }
}
```

### As a global tool

```bash
npm install --global express-swagger-auto
express-swagger-auto generate
```

## Commands

### `generate` - Generate OpenAPI Specification

Automatically discovers routes in your Express app and generates an OpenAPI 3.1 specification.

#### Usage

```bash
express-swagger-auto generate [options]
```

#### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Entry point file (Express app) | `./src/app.ts` |
| `--output` | `-o` | Output path for OpenAPI spec | `./openapi.json` |
| `--watch` | `-w` | Watch mode - regenerate on file changes | `false` |
| `--title` | | API title | From package.json |
| `--version` | | API version | From package.json |
| `--description` | | API description | `''` |

#### Examples

**Basic generation:**

```bash
express-swagger-auto generate
```

This assumes your Express app is at `./src/app.ts` and outputs to `./openapi.json`.

**With custom paths:**

```bash
express-swagger-auto generate \
  --input ./src/server.js \
  --output ./api-spec.json
```

**With API metadata:**

```bash
express-swagger-auto generate \
  --title "My API" \
  --version "2.0.0" \
  --description "Production API with full docs"
```

**Watch mode (development):**

```bash
express-swagger-auto generate --watch
```

This regenerates the spec whenever files change. Perfect for development workflows with automatic spec updates.

#### How it Works

The `generate` command:
1. **Loads your Express app** dynamically from the input file
2. **Discovers all routes** by analyzing the router stack
3. **Extracts metadata** from decorators, JSDoc comments, and validators
4. **Generates OpenAPI spec** combining all discovered information
5. **Writes to file** in JSON format (pretty-printed for readability)
6. **Reports statistics** showing routes found and spec size

#### App Entry Point Requirements

Your entry point file must:
- Export the Express application as the default export or module.exports
- Be either compiled JavaScript (.js) or TypeScript (.ts that gets transpiled)

**Example app file:**

```typescript
// src/app.ts
import express from 'express';
import { UserRouter } from './routes/users';

const app = express();

app.use(express.json());
app.use('/users', UserRouter);

export default app;
```

Or CommonJS:

```javascript
// src/app.js
const express = require('express');
const { UserRouter } = require('./routes/users');

const app = express();
app.use(express.json());
app.use('/users', UserRouter);

module.exports = app;
```

#### Output Format

The generated `openapi.json` follows OpenAPI 3.1.0 specification:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "My API",
    "version": "1.0.0",
    "description": "My API description"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Get all users",
        "operationId": "get_users",
        "responses": {
          "200": {
            "description": "Successful response"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {}
  }
}
```

### `validate` - Validate OpenAPI Specification

Validates your OpenAPI specification file against the OpenAPI schema and reports issues.

#### Usage

```bash
express-swagger-auto validate <specPath> [options]
```

#### Arguments

| Argument | Description |
|----------|-------------|
| `<specPath>` | Path to OpenAPI spec file (required) |

#### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--strict` | | Enable strict validation mode |

#### Examples

**Basic validation:**

```bash
express-swagger-auto validate ./openapi.json
```

**Strict validation (upcoming feature):**

```bash
express-swagger-auto validate ./openapi.json --strict
```

#### What It Checks

The validator ensures:
- ✅ Valid JSON format
- ✅ Required OpenAPI fields present (openapi, info, paths)
- ✅ Info object has title and version
- ✅ Paths object is valid
- ✅ All operations have responses
- ✅ No duplicate operation IDs

#### Success Output

```
🔍 Validating OpenAPI specification...

✓ Validation passed!

  OpenAPI Version: 3.1.0
  Title: My API
  Version: 1.0.0
  Paths: 5
  Operations: 12

✅ Done!
```

#### Error Output

```
🔍 Validating OpenAPI specification...

✗ Validation failed:

  • Missing required field: info.title
  • Missing required field: paths

(exit code: 1)
```

### `serve` - Serve Swagger UI

Serves a Swagger UI instance for your OpenAPI specification.

#### Usage

```bash
express-swagger-auto serve [options]
```

#### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--spec` | `-s` | OpenAPI spec file | `./openapi.json` |
| `--port` | `-p` | Port number | `3000` |

#### Examples

```bash
express-swagger-auto serve
```

```bash
express-swagger-auto serve --port 8080 --spec ./api-spec.json
```

#### Note

The `serve` command is a placeholder for Phase 4. For now, you can serve Swagger UI using:

1. **Use the middleware** in your Express app:

```typescript
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import spec from './openapi.json' assert { type: 'json' };

const app = express();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
app.listen(3000);
```

2. **Use Swagger Editor** - Upload your JSON spec online

### `migrate` - Migrate from Other Tools

Migrate existing OpenAPI configurations from other tools to express-swagger-auto format.

#### Usage

```bash
express-swagger-auto migrate <source> [options]
```

#### Arguments

| Argument | Description | Supported |
|----------|-------------|-----------|
| `swagger-jsdoc` | Migrate from swagger-jsdoc | ✅ Phase 4 |
| `tsoa` | Migrate from tsoa | ✅ Phase 4 |
| `express-oas-generator` | Migrate from express-oas-generator | ✅ Phase 4 |

#### Examples

```bash
express-swagger-auto migrate swagger-jsdoc
```

#### Note

The `migrate` command is planned for Phase 4. It will help convert JSDoc comments from other tools to express-swagger-auto format.

## Global Options

### `--help` / `-h`

Display help information.

```bash
express-swagger-auto --help
express-swagger-auto generate --help
```

### `--version` / `-v`

Display CLI version.

```bash
express-swagger-auto --version
```

## Integration Examples

### npm Scripts

```json
{
  "scripts": {
    "dev": "nodemon src/app.ts",
    "build": "tsc",
    "docs:generate": "express-swagger-auto generate",
    "docs:validate": "express-swagger-auto validate ./openapi.json",
    "docs:watch": "express-swagger-auto generate --watch",
    "prestart": "npm run docs:generate"
  }
}
```

### GitHub Actions CI/CD

```yaml
name: API Docs

on: [push, pull_request]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npx express-swagger-auto generate
      - run: npx express-swagger-auto validate ./openapi.json
      - uses: EndBug/add-and-commit@v9
        with:
          message: 'docs: update API specification'
          add: 'openapi.json'
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build app
RUN npm run build

# Generate API docs
RUN npx express-swagger-auto generate --output /app/public/openapi.json

EXPOSE 3000

CMD ["npm", "start"]
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

npx express-swagger-auto generate
npx express-swagger-auto validate ./openapi.json

if [ $? -ne 0 ]; then
  echo "API spec validation failed. Commit aborted."
  exit 1
fi

git add openapi.json
```

## Error Handling

### Common Errors

#### "Input file not found"

```
✗ Input file not found: ./src/app.ts
```

**Solution:** Ensure the path points to your compiled or source Express app file.

#### "Failed to load Express app"

```
✗ Failed to load Express app: Cannot find module './src/app'
```

**Solution:**
1. Make sure the app file exists and is readable
2. If using TypeScript, ensure it's compiled to JavaScript first
3. Check that the file exports the app as default or module.exports

#### "Invalid JSON in spec file"

```
✗ Invalid JSON: Unexpected token } in JSON at position 123
```

**Solution:** Check the generated or provided spec file for JSON syntax errors.

#### "Validation failed"

```
✗ Validation failed:
  • Missing required field: info.title
  • Missing required field: paths
```

**Solution:** Ensure your OpenAPI spec includes all required fields per OpenAPI 3.1 specification.

## Best Practices

1. **Version control your specs**
   ```bash
   git add openapi.json
   git commit -m "docs: update API specification"
   ```

2. **Validate in CI/CD**
   - Always validate generated specs in your pipeline
   - Catch spec issues before they reach production

3. **Use JSDoc metadata**
   ```typescript
   /**
    * Get all users
    * @summary List users
    * @tags Users
    */
   app.get('/users', getUsersHandler);
   ```

4. **Generate before shipping**
   - Include spec generation in your build process
   - Ensure consumers always have current documentation

5. **Watch during development**
   ```bash
   express-swagger-auto generate --watch
   ```
   - Keep spec updated as you develop
   - Share live docs with API consumers

6. **Organize routing**
   ```
   src/
   ├── app.ts
   └── routes/
       ├── users.ts
       ├── products.ts
       └── orders.ts
   ```

## Troubleshooting

### Routes not being discovered

**Possible causes:**
- Routes defined on router that's not mounted on app
- Routes added after spec generation
- Routes in files that aren't imported in app.ts

**Solution:**
Ensure all routes are mounted on the main Express app:

```typescript
// src/app.ts
const app = express();

// ✅ Good - routes mounted
app.use('/users', userRoutes);
app.use('/products', productRoutes);

// ❌ Bad - routes not mounted
const orphanRoutes = express.Router();
orphanRoutes.get('/orphan', handler); // Won't be discovered!

export default app;
```

### Spec generation is slow

**Cause:** Large number of routes or heavy file I/O

**Solution:**
- See [Performance Tuning Guide](./PERFORMANCE.md) for optimization strategies
- Use caching mechanisms for large apps
- Profile with `node --prof` to identify bottlenecks

### CLI not found when installed globally

**Solution:**
```bash
npm install --global express-swagger-auto
# Then verify installation
express-swagger-auto --version

# If still not found, check npm global path
npm root -g
```

## Next Steps

- See [Getting Started Guide](../README.md#quick-start) for basic setup
- Read [Security Guide](./SECURITY.md) for production security practices
- Check [Performance Guide](./PERFORMANCE.md) for optimization tips
- Explore [Decorator API](../src/decorators/metadata.ts) for advanced metadata
