# JSDoc Tags Reference

Complete reference for JSDoc tags supported by `express-swagger-auto` for automatic OpenAPI documentation generation.

## Table of Contents

- [Quick Start](#quick-start)
- [Required Tags](#required-tags)
- [Route Information](#route-information)
- [Parameters](#parameters)
- [Request Body](#request-body)
- [Responses](#responses)
- [Security](#security)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)

## Quick Start

Minimal example to get started:

```javascript
/**
 * @openapi
 * @route GET /users/{id}
 * @summary Get user by ID
 * @param {string} id.path.required - User ID
 * @response 200 - User found
 */
app.get('/users/:id', (req, res) => {
  // handler implementation
});
```

## Required Tags

### `@openapi`

**Required**: Yes
**Description**: Marks a JSDoc comment for OpenAPI generation. Only comments with this tag are processed.

```javascript
/**
 * @openapi
 * ...other tags...
 */
```

**Notes**:
- Must be the first tag in the comment
- Without this tag, the comment is ignored by the parser

### `@route`

**Required**: Yes
**Syntax**: `@route METHOD /path`
**Description**: Defines the HTTP method and path for the route.

```javascript
/**
 * @route GET /users
 * @route POST /users
 * @route PUT /users/{id}
 * @route DELETE /users/{id}
 */
```

**Supported Methods**:
- `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`

**Path Syntax**:
- Use `{paramName}` for path parameters (OpenAPI format)
- Express format `:paramName` also works but `{paramName}` is preferred

## Route Information

### `@summary`

**Required**: No
**Syntax**: `@summary Short description`
**Description**: Brief one-line description of the endpoint.

```javascript
/**
 * @summary Get all users
 */
```

**Best Practices**:
- Keep it under 120 characters
- Use imperative mood ("Get users" not "Gets users")
- Don't end with a period

### `@description`

**Required**: No
**Syntax**: `@description Detailed description`
**Description**: Longer, detailed description of the endpoint behavior.

```javascript
/**
 * @description Retrieves a paginated list of all users from the database.
 *              Supports filtering by role and sorting by creation date.
 */
```

**Notes**:
- Can span multiple lines
- Supports markdown formatting
- Use for explaining complex behavior, side effects, or constraints

### `@tags`

**Required**: No
**Syntax**: `@tags tag1, tag2, tag3`
**Description**: Comma-separated list of tags for grouping endpoints in Swagger UI.

```javascript
/**
 * @tags users, admin
 */
```

**Best Practices**:
- Use lowercase singular nouns
- Common patterns: resource name, feature area, access level
- Example tags: `users`, `products`, `admin`, `public`, `auth`

## Parameters

### `@param`

**Required**: No
**Syntax**: `@param {type} name.location[.required] - Description`
**Description**: Defines a parameter (path, query, header, or cookie).

#### Basic Syntax

```javascript
/**
 * @param {string} id.path.required - User ID
 * @param {number} limit.query - Results per page
 * @param {string} authorization.header - Bearer token
 * @param {string} session.cookie - Session ID
 */
```

#### Optional Parameters

Use square brackets for optional parameters:

```javascript
/**
 * @param {number} [page].query - Page number
 * @param {string} [sort].query - Sort field
 */
```

#### Default Values

Specify default values inside square brackets:

```javascript
/**
 * @param {number} [page=1].query - Page number (default: 1)
 * @param {number} [limit=10].query - Results per page (default: 10)
 * @param {boolean} [active=true].query - Filter by active status
 */
```

#### Parameter Locations

| Location | Description | Example |
|----------|-------------|---------|
| `path` | URL path parameter | `/users/{id}` |
| `query` | Query string parameter | `/users?page=1` |
| `header` | HTTP header | `Authorization: Bearer token` |
| `cookie` | Cookie value | `sessionId=abc123` |

#### Supported Types

```javascript
/**
 * @param {string} name.query - String parameter
 * @param {number} age.query - Number parameter
 * @param {integer} count.query - Integer parameter
 * @param {boolean} active.query - Boolean parameter
 * @param {array} ids.query - Array parameter
 */
```

#### Complete Parameter Examples

```javascript
/**
 * @openapi
 * @route GET /products
 * @param {number} [page=1].query - Page number for pagination
 * @param {number} [limit=20].query - Items per page (max: 100)
 * @param {string} category.query.required - Product category filter
 * @param {boolean} [inStock=true].query - Show only in-stock items
 * @param {string} search.query - Search query string
 */
```

## Request Body

### `@bodyContent`

**Required**: No
**Syntax**: `@bodyContent {contentType} schemaName`
**Description**: Defines the request body content type and schema reference.

```javascript
/**
 * @bodyContent {application/json} createUserSchema
 * @bodyContent {multipart/form-data} uploadSchema
 * @bodyContent {application/x-www-form-urlencoded} loginSchema
 */
```

**Notes**:
- `schemaName` should reference a validator schema (Joi, Zod, Yup)
- The schema must be accessible via the validator registry
- Most common: `application/json`

**Example with Joi**:

```javascript
const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  age: Joi.number().min(18)
});

/**
 * @openapi
 * @route POST /users
 * @bodyContent {application/json} createUserSchema
 */
app.post('/users', (req, res) => {
  const { error, value } = createUserSchema.validate(req.body);
  // ...
});
```

## Responses

### `@response`

**Required**: No
**Syntax**: `@response statusCode - Description`
**Description**: Defines possible response status codes and descriptions.

#### Basic Response Definitions

```javascript
/**
 * @response 200 - Success
 * @response 201 - Created successfully
 * @response 204 - Deleted successfully (no content)
 * @response 400 - Invalid request data
 * @response 401 - Unauthorized
 * @response 403 - Forbidden
 * @response 404 - Resource not found
 * @response 500 - Internal server error
 */
```

#### Common Response Patterns

**CRUD Operations**:

```javascript
// GET (Read)
/**
 * @response 200 - Resource retrieved
 * @response 404 - Resource not found
 */

// POST (Create)
/**
 * @response 201 - Resource created
 * @response 400 - Validation error
 * @response 409 - Resource already exists
 */

// PUT (Update)
/**
 * @response 200 - Resource updated
 * @response 400 - Validation error
 * @response 404 - Resource not found
 */

// DELETE
/**
 * @response 204 - Resource deleted
 * @response 404 - Resource not found
 */
```

**With Authentication**:

```javascript
/**
 * @response 200 - Success
 * @response 401 - Not authenticated
 * @response 403 - Not authorized
 */
```

## Security

### `@security`

**Required**: No
**Syntax**: `@security schemeName [scope1, scope2]`
**Description**: Specifies security requirements for the endpoint.

```javascript
/**
 * @security BearerAuth
 * @security OAuth2 read:users, write:users
 * @security ApiKey
 */
```

**Notes**:
- Security schemes must be defined in your `SpecGenerator` config
- Multiple security requirements create an OR relationship
- Scopes are optional and OAuth2-specific

**Example with Security Scheme**:

```javascript
const generator = new SpecGenerator({
  info: { title: 'My API', version: '1.0.0' },
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  }
});

/**
 * @openapi
 * @route GET /admin/users
 * @security BearerAuth
 * @response 200 - Users list
 * @response 401 - Not authenticated
 */
```

## Complete Examples

### Simple GET Endpoint

```javascript
/**
 * @openapi
 * @route GET /health
 * @summary Health check endpoint
 * @description Returns the current health status of the API
 * @tags monitoring
 * @response 200 - Service is healthy
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});
```

### GET with Query Parameters

```javascript
/**
 * @openapi
 * @route GET /products
 * @summary Get all products
 * @description Retrieves a paginated list of products with optional filtering
 * @tags products
 * @param {number} [page=1].query - Page number for pagination
 * @param {number} [limit=10].query - Number of items per page
 * @param {string} category.query - Filter by category
 * @param {boolean} [inStock].query - Show only in-stock items
 * @response 200 - List of products
 * @response 400 - Invalid query parameters
 */
app.get('/products', (req, res) => {
  // Implementation
});
```

### GET with Path Parameter

```javascript
/**
 * @openapi
 * @route GET /users/{id}
 * @summary Get user by ID
 * @description Retrieves a single user by their unique identifier
 * @tags users
 * @param {integer} id.path.required - User ID
 * @response 200 - User found
 * @response 404 - User not found
 * @response 500 - Server error
 */
app.get('/users/:id', (req, res) => {
  // Implementation
});
```

### POST with Request Body

```javascript
const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  price: Joi.number().positive().precision(2).required(),
  category: Joi.string().valid('electronics', 'clothing', 'books').required(),
  inStock: Joi.boolean().default(true)
});

/**
 * @openapi
 * @route POST /products
 * @summary Create new product
 * @description Creates a new product in the catalog
 * @tags products
 * @bodyContent {application/json} createProductSchema
 * @response 201 - Product created successfully
 * @response 400 - Invalid product data
 * @response 409 - Product already exists
 */
app.post('/products', (req, res) => {
  const { error, value } = createProductSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }
  // Create product
  res.status(201).json(newProduct);
});
```

### PUT with Path Parameter and Body

```javascript
/**
 * @openapi
 * @route PUT /users/{id}
 * @summary Update user
 * @description Updates an existing user's information
 * @tags users
 * @param {integer} id.path.required - User ID
 * @bodyContent {application/json} updateUserSchema
 * @response 200 - User updated successfully
 * @response 400 - Invalid user data
 * @response 404 - User not found
 */
app.put('/users/:id', (req, res) => {
  // Implementation
});
```

### Protected Endpoint with Security

```javascript
/**
 * @openapi
 * @route DELETE /admin/users/{id}
 * @summary Delete user (Admin only)
 * @description Permanently deletes a user account
 * @tags admin, users
 * @security BearerAuth
 * @param {integer} id.path.required - User ID to delete
 * @response 204 - User deleted successfully
 * @response 401 - Not authenticated
 * @response 403 - Not authorized (admin only)
 * @response 404 - User not found
 */
app.delete('/admin/users/:id', authenticateAdmin, (req, res) => {
  // Implementation
});
```

### Complex Endpoint with Multiple Parameters

```javascript
/**
 * @openapi
 * @route GET /search
 * @summary Advanced search
 * @description Performs advanced search across multiple resources
 * @tags search
 * @param {string} q.query.required - Search query
 * @param {string} [type=all].query - Resource type (users, products, articles)
 * @param {number} [page=1].query - Page number
 * @param {number} [limit=20].query - Results per page
 * @param {string} [sort=relevance].query - Sort order (relevance, date, name)
 * @param {boolean} [fuzzy=true].query - Enable fuzzy matching
 * @param {string} [dateFrom].query - Filter by start date (ISO 8601)
 * @param {string} [dateTo].query - Filter by end date (ISO 8601)
 * @response 200 - Search results
 * @response 400 - Invalid search parameters
 * @response 429 - Rate limit exceeded
 */
app.get('/search', (req, res) => {
  // Implementation
});
```

## Best Practices

### 1. Be Consistent

Use the same style and conventions across all endpoints:

```javascript
// Good - Consistent pattern
/**
 * @openapi
 * @route GET /users
 * @summary Get all users
 * @tags users
 */

/**
 * @openapi
 * @route GET /products
 * @summary Get all products
 * @tags products
 */
```

### 2. Document Edge Cases

Include responses for all possible outcomes:

```javascript
/**
 * @response 200 - Success
 * @response 400 - Validation error
 * @response 401 - Not authenticated
 * @response 403 - Insufficient permissions
 * @response 404 - Resource not found
 * @response 429 - Rate limit exceeded
 * @response 500 - Server error
 */
```

### 3. Use Meaningful Descriptions

```javascript
// Bad
/**
 * @param {string} id.path - ID
 */

// Good
/**
 * @param {string} id.path.required - Unique user identifier (UUID v4)
 */
```

### 4. Group Related Endpoints with Tags

```javascript
/**
 * @tags users, admin
 * @tags products, inventory
 * @tags orders, payments
 */
```

### 5. Document Default Values

```javascript
/**
 * @param {number} [limit=10].query - Items per page (default: 10, max: 100)
 * @param {boolean} [active=true].query - Show only active items (default: true)
 */
```

### 6. Use Proper HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | GET, PUT success |
| 201 | POST success (created) |
| 204 | DELETE success (no content) |
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Authorization failed |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limit exceeded |
| 500 | Server error |

### 7. Keep Summaries Short

```javascript
// Bad - Too long
/**
 * @summary This endpoint retrieves a comprehensive list of all users currently registered in the system
 */

// Good - Concise
/**
 * @summary Get all users
 */
```

### 8. Use Description for Details

```javascript
/**
 * @summary Create user
 * @description Creates a new user account. Email must be unique.
 *              Password must be at least 8 characters with one uppercase,
 *              one lowercase, and one number. Sends verification email.
 */
```

## Troubleshooting

### Parser Not Finding Routes

**Problem**: Routes are not appearing in Swagger UI

**Solutions**:
1. Ensure `@openapi` tag is present
2. Check that `@route` tag has correct syntax
3. Verify source files are included in `JsDocParser` config:
   ```javascript
   const parser = new JsDocParser({
     sourceFiles: [__filename], // or ['src/**/*.js']
     includeAll: false
   });
   ```

### Parameters Not Appearing

**Problem**: Parameters defined in JSDoc are missing

**Solutions**:
1. Check parameter syntax: `{type} name.location[.required]`
2. Verify location is valid: `path`, `query`, `header`, `cookie`
3. For path parameters, use `{paramName}` in route path

### Schema References Not Working

**Problem**: `@bodyContent` schema not found

**Solutions**:
1. Ensure schema variable is in scope
2. Check schema is registered with validator registry
3. Verify schema name matches exactly (case-sensitive)

## Integration Example

Complete setup with JSDoc parsing:

```javascript
const express = require('express');
const {
  RouteDiscovery,
  SpecGenerator,
  JsDocParser,
  createSwaggerUIMiddleware
} = require('express-swagger-auto');

const app = express();
app.use(express.json());

// Define routes with JSDoc
/**
 * @openapi
 * @route GET /api/health
 * @summary Health check
 * @tags monitoring
 * @response 200 - Service healthy
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Setup automatic parsing
const parser = new JsDocParser({
  sourceFiles: [__filename],
  includeAll: false
});

const discovery = new RouteDiscovery();
const routes = discovery.discover(app, {
  enableJsDocParsing: true,
  jsDocParser: parser
});

const generator = new SpecGenerator({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'Automatically documented API'
  }
});

const spec = generator.generate(routes);

// Mount Swagger UI
app.use(createSwaggerUIMiddleware({ spec }));

app.listen(3000, () => {
  console.log('API docs: http://localhost:3000/api-docs');
});
```

## See Also

- [Main README](../README.md)
- [Phase 3 Progress](./PHASE_3_PROGRESS.md)
- [Examples Directory](../examples/)
