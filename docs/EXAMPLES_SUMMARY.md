# Example Applications Summary

This document summarizes the three example applications created to demonstrate the hybrid OpenAPI generation strategies of `express-swagger-auto`.

## Overview

All three examples are located in the `examples/` directory and showcase different approaches to API documentation:

1. **decorator-example**: TypeScript decorators with Zod validation
2. **jsdoc-example**: JavaScript with JSDoc comments and Joi validation
3. **runtime-example**: Runtime schema capture with automatic inference

## Example 1: Decorator Example (TypeScript)

**Location**: `examples/decorator-example/`

**Tech Stack**:
- TypeScript with experimental decorators enabled
- Express.js 4.x
- Zod for schema validation
- ts-node for development

**Key Features**:
- UserController class with decorated methods
- Full CRUD API (GET, POST, PUT, DELETE)
- Type-safe request/response handling
- Zod schema conversion to OpenAPI

**Decorators Used**:
- `@Route({ summary, description, tags })` - Route metadata
- `@Parameter({ name, in, required, schema })` - Path/query parameters
- `@RequestBody({ required, content })` - Request body schema
- `@Response({ statusCode, description, schema })` - Response schema

**API Endpoints**:
- GET /users - List all users
- GET /users/:id - Get user by ID
- POST /users - Create new user
- PUT /users/:id - Update user
- DELETE /users/:id - Delete user

**Port**: 3000

**Running**:
```bash
cd examples/decorator-example
pnpm install
pnpm dev
```

## Example 2: JSDoc Example (JavaScript)

**Location**: `examples/jsdoc-example/`

**Tech Stack**:
- Pure JavaScript (Node.js)
- Express.js 4.x
- Joi for schema validation
- JSDoc parser for automatic metadata extraction (Phase 3 Complete)

**Key Features**:
- Product catalog API with pagination
- JSDoc-style inline documentation
- Joi schema validation and OpenAPI conversion
- Query parameter filtering
- Automatic JSDoc parsing integration

**API Endpoints**:
- GET /products - Get all products (with pagination)
- GET /products/:id - Get product by ID
- POST /products - Create new product
- PUT /products/:id - Update product
- DELETE /products/:id - Delete product
- GET /categories - Get available categories

**Port**: 3001

**Running**:
```bash
cd examples/jsdoc-example
pnpm install
pnpm start
```

**Note**: The JSDoc parser is fully implemented (Phase 3 Complete) and automatically parses JSDoc comments to extract OpenAPI metadata.

## Example 3: Runtime Example

**Location**: `examples/runtime-example/`

**Tech Stack**:
- Pure JavaScript (Node.js)
- Express.js 4.x
- Runtime schema capture middleware
- SnapshotStorage for persistence

**Key Features**:
- Zero-annotation blog API
- Automatic schema inference from request/response data
- Snapshot storage with SHA-256 deduplication
- Sensitive field sanitization

**API Endpoints**:
- GET /posts - Get all posts (with filters)
- GET /posts/:id - Get post by ID
- POST /posts - Create new post
- PUT /posts/:id - Update post
- DELETE /posts/:id - Delete post
- GET /stats - Get blog statistics
- POST /posts/:id/publish - Publish a draft post

**Port**: 3002

**Running**:
```bash
cd examples/runtime-example
pnpm install
pnpm start
```

**Snapshot Storage**:
- Snapshots saved to `./data/snapshots/`
- Each route's schemas persisted as JSON files
- Duplicate detection via content hashing
- Schemas enhanced in OpenAPI spec at startup

## Testing Status

All three examples have been tested and verified:

✅ decorator-example: Builds successfully with TypeScript, starts on port 3000
✅ jsdoc-example: Runs successfully, starts on port 3001
✅ runtime-example: Runs successfully, starts on port 3002

## Common Features Across All Examples

1. **Swagger UI Integration**: All examples expose Swagger UI at `/api-docs`
2. **OpenAPI Spec JSON**: Available at `/api-docs.json` in each example
3. **README Documentation**: Each has comprehensive README with:
   - Installation instructions
   - Usage examples
   - curl command samples
   - Architecture explanation
4. **Development Ready**: All include pnpm scripts for dev/start/build

## Usage Comparison

| Feature | Decorator | JSDoc | Runtime |
|---------|-----------|-------|---------|
| Language | TypeScript | JavaScript | JavaScript |
| Annotations | Decorators | Comments | None |
| Validation | Zod | Joi | None |
| Type Safety | ✅ Compile-time | ❌ Runtime only | ❌ Runtime only |
| Learning Curve | Medium | Low | Lowest |
| Boilerplate | Medium | Low | None |
| Best For | New TS projects | JS projects | Legacy apps |

## Integration with Main Package

All examples use the local build of `express-swagger-auto` via `file:../..` in package.json. This ensures:

- Examples always test the latest code
- No version drift between examples and package
- Easy development iteration

## Status Updates

**Phase 3 JSDoc parser implementation is COMPLETE:**
- JSDoc parser (`JsDocParser.ts`) fully implemented and tested (20 tests)
- Automatic route discovery with JSDoc metadata extraction
- JSDoc-RouteDiscovery integration working
- All example apps validated and working

## Files Created

**decorator-example**:
- `examples/decorator-example/package.json`
- `examples/decorator-example/tsconfig.json`
- `examples/decorator-example/src/index.ts`
- `examples/decorator-example/README.md`

**jsdoc-example**:
- `examples/jsdoc-example/package.json`
- `examples/jsdoc-example/index.js`
- `examples/jsdoc-example/README.md`

**runtime-example**:
- `examples/runtime-example/package.json`
- `examples/runtime-example/index.js`
- `examples/runtime-example/README.md`

## Modifications to Core Package

1. **SnapshotStorage.ts**: Added `options` getter property for external access to config
2. **tsconfig.json**: Updated moduleResolution to `node16` in decorator-example to support subpath exports

## Summary

Three complete, working example applications demonstrating all three hybrid generation strategies have been successfully created, tested, and documented. Each example serves as:

- A reference implementation for users
- Integration tests for the package
- Living documentation of best practices
- Proof of concept for each strategy

All examples are ready for users to clone, run, and learn from.
