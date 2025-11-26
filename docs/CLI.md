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
    "swagger:generate": "express-swagger-auto generate",
    "swagger:validate": "express-swagger-auto validate ./openapi.yaml",
    "swagger:watch": "express-swagger-auto generate --watch",
    "swagger:serve": "express-swagger-auto serve"
  }
}
```

### As a global tool

```bash
npm install --global express-swagger-auto
express-swagger-auto generate
```

## Quick Start

The fastest way to get started is using the `init` command:

```bash
npx express-swagger-auto init
```

This will interactively guide you through setup, creating a config file and example routes.

## Configuration

### Config File Support

express-swagger-auto supports multiple config file formats via [cosmiconfig](https://github.com/davidtheclark/cosmiconfig):

- `swagger-auto.config.js` (recommended)
- `.swagger-autorc.json`
- `.swagger-autorc.yaml` / `.swagger-autorc.yml`
- `package.json` `"swaggerAuto"` key

#### Example Config (JavaScript)

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
  },
  ci: {
    enabled: false,
    outputFormat: 'json'
  }
};
```

#### Example Config (YAML)

```yaml
# .swagger-autorc.yaml
input: ./src/app.ts
output: ./docs/openapi.yaml
format: yaml
strategies:
  - jsdoc
  - decorator
info:
  title: My API
  version: 2.0.0
security:
  detect: true
```

## Commands

### `init` - Initialize Project

Creates a configuration file and optionally generates example routes with JSDoc annotations.

#### Usage

```bash
express-swagger-auto init [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-y, --yes` | Skip prompts and use defaults | `false` |
| `--format <format>` | Config file format (js\|json\|yaml) | `js` |
| `--example` | Generate example route file with JSDoc | `false` |

#### Examples

**Interactive setup:**

```bash
express-swagger-auto init
```

**Non-interactive with defaults:**

```bash
express-swagger-auto init --yes --example
```

#### What It Creates

1. **Config file** (`swagger-auto.config.js` or chosen format)
2. **Example routes** (optional) with JSDoc annotations
3. **npm scripts** in `package.json`:
   - `swagger:generate`
   - `swagger:watch`
   - `swagger:serve`
   - `swagger:validate`

---

### `generate` - Generate OpenAPI Specification

Automatically discovers routes in your Express app and generates an OpenAPI 3.1 specification.

#### Usage

```bash
express-swagger-auto generate [options]
```

#### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--config` | `-c` | Path to config file | Auto-detected |
| `--input` | `-i` | Entry point file (Express app) | `./src/app.ts` |
| `--output` | `-o` | Output path for OpenAPI spec | `./openapi.json` |
| `--format` | `-f` | Output format (json\|yaml) | Auto from extension |
| `--watch` | `-w` | Watch mode - regenerate on changes | `false` |
| `--title` | | API title | From package.json |
| `--version` | | API version | From package.json |
| `--description` | | API description | `''` |
| `--strategies` | | Generation strategies | `jsdoc,decorator` |
| `--include-paths` | | Include only paths matching patterns | All paths |
| `--exclude-paths` | | Exclude paths matching patterns | None |
| `--tags` | | Include only routes with tags | All tags |
| `--ci` | | CI mode: JSON output, no colors | `false` |
| `--ci-format` | | CI output format (text\|json\|sarif) | `text` |

#### Examples

**Basic generation with config file:**

```bash
express-swagger-auto generate
```

**Generate YAML output:**

```bash
express-swagger-auto generate -o openapi.yaml
# or
express-swagger-auto generate --format yaml
```

**Filter routes:**

```bash
express-swagger-auto generate \
  --include-paths "/api/*" "/v1/*" \
  --exclude-paths "/internal/*" \
  --tags "public" "users"
```

**CI/CD pipeline:**

```bash
express-swagger-auto generate --ci --ci-format json
```

**Watch mode (development):**

```bash
express-swagger-auto generate --watch
```

#### Generation Strategies

Control how metadata is extracted:

- `jsdoc` - Extract from JSDoc comments (recommended)
- `decorator` - Extract from TypeScript decorators
- `runtime` - Capture from actual request/response (opt-in)

```bash
express-swagger-auto generate --strategies jsdoc decorator
```

---

### `validate` - Validate OpenAPI Specification

Validates your OpenAPI specification against the OpenAPI schema and reports issues.

#### Usage

```bash
express-swagger-auto validate <specPath> [options]
```

#### Arguments

| Argument | Description |
|----------|-------------|
| `<specPath>` | Path to OpenAPI spec file (JSON or YAML) |

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--strict` | Enable strict validation (operationId, tags, descriptions) | `false` |
| `--ci` | CI mode: no colors, structured output | `false` |
| `--ci-format` | CI output format (text\|json\|sarif) | `text` |
| `--fail-on-warnings` | Exit with error code on warnings | `false` |
| `--security-audit` | Check for security best practices | `false` |

#### Examples

**Basic validation:**

```bash
express-swagger-auto validate ./openapi.yaml
```

**Strict validation (recommended for CI):**

```bash
express-swagger-auto validate ./openapi.yaml --strict --fail-on-warnings
```

**Security audit:**

```bash
express-swagger-auto validate ./openapi.yaml --security-audit
```

**CI with JSON output:**

```bash
express-swagger-auto validate ./openapi.yaml --ci --ci-format json
```

**SARIF output for code quality tools:**

```bash
express-swagger-auto validate ./openapi.yaml --ci --ci-format sarif
```

#### What It Checks

**Basic validation:**
- ✅ Valid JSON/YAML format
- ✅ Required OpenAPI fields (openapi, info, paths)
- ✅ Info object has title and version
- ✅ OpenAPI version is 3.x

**Strict mode (`--strict`):**
- ✅ All operations have operationId
- ✅ No duplicate operationIds
- ✅ All operations have responses
- ✅ All operations have summary or description
- ✅ All operations have tags
- ✅ All $ref references resolve

**Security audit (`--security-audit`):**
- ✅ Security schemes are defined
- ✅ Operations have security requirements
- ✅ Sensitive endpoints are protected

#### CI Output Formats

**JSON format:**
```json
{
  "success": true,
  "specPath": "./openapi.yaml",
  "openapi": "3.0.0",
  "title": "My API",
  "version": "1.0.0",
  "paths": 5,
  "operations": 12,
  "errors": [],
  "warnings": [],
  "duration": 23
}
```

**SARIF format** (for GitHub Code Scanning, SonarQube, etc.):
```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/...",
  "version": "2.1.0",
  "runs": [...]
}
```

---

### `serve` - Serve Swagger UI

Serves a standalone Swagger UI instance for your OpenAPI specification.

#### Usage

```bash
express-swagger-auto serve [options]
```

#### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--spec` | `-s` | OpenAPI spec file | `./openapi.json` |
| `--port` | `-p` | Port number | `3000` |
| `--host` | | Host address | `localhost` |

#### Examples

```bash
express-swagger-auto serve
```

```bash
express-swagger-auto serve --port 8080 --spec ./docs/openapi.yaml
```

#### Endpoints

- `/api-docs` - Swagger UI interface
- `/openapi.json` - Raw spec JSON
- `/health` - Health check endpoint

---

### `migrate` - Migrate from Other Tools

Migrate existing OpenAPI configurations from other tools.

#### Usage

```bash
express-swagger-auto migrate <source> [options]
```

#### Supported Sources

| Source | Status |
|--------|--------|
| `swagger-jsdoc` | 🔜 Planned |
| `tsoa` | 🔜 Planned |
| `express-oas-generator` | 🔜 Planned |

---

## CI/CD Integration

### GitHub Actions

```yaml
name: API Documentation

on: [push, pull_request]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run build
      
      # Generate spec
      - run: npx express-swagger-auto generate --ci --ci-format json
      
      # Validate with strict mode
      - run: npx express-swagger-auto validate ./openapi.yaml --strict --fail-on-warnings --ci
      
      # Security audit
      - run: npx express-swagger-auto validate ./openapi.yaml --security-audit --ci --ci-format sarif > results.sarif
      
      # Upload SARIF for GitHub Code Scanning
      - uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: results.sarif
```

### GitLab CI

```yaml
api-docs:
  stage: build
  script:
    - npm ci
    - npm run build
    - npx express-swagger-auto generate --ci
    - npx express-swagger-auto validate ./openapi.yaml --strict --fail-on-warnings
  artifacts:
    paths:
      - openapi.yaml
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

npx express-swagger-auto generate
npx express-swagger-auto validate ./openapi.yaml --strict

if [ $? -ne 0 ]; then
  echo "API spec validation failed. Commit aborted."
  exit 1
fi

git add openapi.yaml
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
- See [CLI Roadmap](./CLI-ROADMAP.md) for planned features

---

## Planned Commands (Coming Soon)

The following commands are planned for upcoming releases. See [CLI-ROADMAP.md](./CLI-ROADMAP.md) for detailed specifications.

### `stats` - API Statistics (v0.3.1)

Analyze your OpenAPI spec and get comprehensive metrics.

```bash
express-swagger-auto stats ./openapi.yaml
express-swagger-auto stats ./openapi.yaml --format json
```

**Metrics provided:**
- Operations count by method
- Schema statistics
- Documentation coverage percentage
- Security coverage
- Tag distribution

---

### `completion` - Shell Completion (v0.3.1)

Generate shell completion scripts for improved CLI experience.

```bash
# Bash
express-swagger-auto completion bash >> ~/.bashrc

# Zsh
express-swagger-auto completion zsh >> ~/.zshrc

# Fish
express-swagger-auto completion fish > ~/.config/fish/completions/express-swagger-auto.fish
```

---

### `diff` - Breaking Change Detection (v0.4.0)

Compare two OpenAPI specs to detect breaking changes.

```bash
express-swagger-auto diff ./v1/openapi.yaml ./v2/openapi.yaml
express-swagger-auto diff ./old.yaml ./new.yaml --fail-on-breaking
express-swagger-auto diff ./old.yaml ./new.yaml --format markdown
```

**Detects:**
- 🔴 Breaking changes (removed endpoints, changed types)
- 🟢 Non-breaking changes (new endpoints, added properties)
- 🟡 Deprecations

---

### `lint` - Advanced Linting (v0.4.0)

Lint your spec with configurable rulesets.

```bash
express-swagger-auto lint ./openapi.yaml
express-swagger-auto lint ./openapi.yaml --ruleset strict
express-swagger-auto lint ./openapi.yaml --config .swagger-auto-lint.yaml
```

**Built-in rulesets:** `minimal`, `recommended`, `strict`

---

### `bundle` - Multi-file Bundling (v0.5.0)

Bundle multi-file specs into a single file.

```bash
express-swagger-auto bundle ./api/openapi.yaml -o ./dist/openapi.yaml
express-swagger-auto bundle ./api/openapi.yaml --dereference
```

---

### `mock` - Mock Server (v0.5.0)

Generate a mock server from your OpenAPI spec.

```bash
express-swagger-auto mock ./openapi.yaml
express-swagger-auto mock ./openapi.yaml --port 4010 --dynamic
```

---

### `score` - Quality Scoring (v0.5.0)

Get an API quality score with recommendations.

```bash
express-swagger-auto score ./openapi.yaml
express-swagger-auto score ./openapi.yaml --threshold 80 --fail-below
```
