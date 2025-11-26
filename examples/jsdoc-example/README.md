# JSDoc Example - JavaScript

This example demonstrates how to use JSDoc comments with `express-swagger-auto` to document your Express.js API.

## Features

- ✅ JSDoc-style inline documentation
- ✅ Joi schema validation and OpenAPI conversion
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Query parameter handling (pagination, filtering)
- ✅ Automatic Swagger UI generation
- ✅ JSDoc parser integration (Phase 3 Complete)

## Prerequisites

- Node.js 16+
- pnpm (or npm/yarn)

## Installation

```bash
cd examples/jsdoc-example
pnpm install
```

## Running the Example

```bash
pnpm start
```

## Accessing the API

- **API Base URL**: http://localhost:3001
- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI Spec**: http://localhost:3001/api-docs.json

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Get all products (with pagination) |
| GET | `/products/:id` | Get product by ID |
| POST | `/products` | Create new product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| GET | `/categories` | Get all categories |

## Example Usage

### Get all products
```bash
curl http://localhost:3001/products
```

### Get products with pagination
```bash
curl "http://localhost:3001/products?page=1&limit=5"
```

### Filter by category
```bash
curl "http://localhost:3001/products?category=electronics"
```

### Get product by ID
```bash
curl http://localhost:3001/products/1
```

### Create new product
```bash
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "description": "Ergonomic wireless mouse",
    "price": 29.99,
    "category": "electronics",
    "inStock": true
  }'
```

### Update product
```bash
curl -X PUT http://localhost:3001/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 899.99,
    "inStock": false
  }'
```

### Delete product
```bash
curl -X DELETE http://localhost:3001/products/3
```

## How It Works

### 1. Define Joi Schemas

```javascript
const productSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('').optional(),
  price: Joi.number().positive().precision(2).required(),
  category: Joi.string().valid('electronics', 'clothing', 'books', 'food', 'other').required(),
  inStock: Joi.boolean().default(true),
});
```

### 2. Add JSDoc Comments

```javascript
/**
 * @route GET /products
 * @summary Get all products
 * @description Retrieves a paginated list of all products
 * @tags products
 * @param {number} [page=1] - Page number for pagination
 * @param {number} [limit=10] - Number of items per page
 * @param {string} [category] - Filter by category
 * @response 200 - List of products
 * @response 400 - Invalid query parameters
 */
app.get('/products', (req, res) => {
  // Implementation
});
```

### 3. Implement Request Handlers with Joi Validation

```javascript
app.post('/products', (req, res) => {
  const { error, value } = createProductSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'ValidationError',
      message: error.details[0].message,
    });
  }

  const newProduct = { id: nextId++, ...value };
  products.push(newProduct);
  res.status(201).json(newProduct);
});
```

### 4. Generate OpenAPI Spec (Current: Manual Metadata)

Since the JSDoc parser is Phase 3, we currently define routes manually:

```javascript
const adapter = new JoiAdapter();

const routes = [
  {
    method: 'GET',
    path: '/products',
    handler: () => {},
    metadata: {
      summary: 'Get all products',
      description: 'Retrieves a paginated list of all products',
      tags: ['products'],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        '200': { description: 'List of products' },
      },
    },
  },
  // ... more routes
];
```

### 5. Mount Swagger UI

```javascript
const generator = new SpecGenerator({
  info: {
    title: 'Product Catalog API',
    version: '1.0.0',
  },
});

const spec = generator.generate(routes);

app.use(createSwaggerUIMiddleware({
  spec,
  routePrefix: '/api-docs',
}));
```

## Automatic JSDoc Parsing (Phase 3 Complete)

With Phase 3 JSDoc parser implementation, routes are automatically parsed:

```javascript
// Automatic JSDoc parsing
const discovery = new RouteDiscovery();
const routes = discovery.discover(app, {
  enableJsDocParsing: true,
  jsDocParser: new JsDocParser({ sourceFiles: [__filename] })
}); // Parses JSDoc comments automatically

const spec = generator.generate(routes);
```

## Key Concepts

- **JSDoc Comments**: Inline documentation automatically parsed by the JSDoc parser
- **Joi Schemas**: Define data structures with validation
- **JoiAdapter**: Convert Joi schemas to OpenAPI schemas
- **JsDocParser**: Automatically extract OpenAPI metadata from JSDoc comments
- **SpecGenerator**: Generate OpenAPI 3.1 specification
- **Swagger UI**: Interactive API documentation

## Benefits

- 📝 **Familiar Syntax**: Use JSDoc comments developers already know
- 🔒 **Runtime Validation**: Joi validates requests automatically
- ✅ **No TypeScript Required**: Pure JavaScript development
- 🎨 **Clean Code**: Documentation lives alongside route handlers
- 🚀 **Auto-Generated**: JSDoc parser automatically extracts OpenAPI metadata

## Next Steps

- Explore the JSDoc comments in `index.js`
- Try modifying Joi schemas and see Swagger UI update
- Add new endpoints following the JSDoc pattern
- Check out the decorator-example for TypeScript approach
- Refer to [JSDoc Tags Reference](../../docs/JSDOC_TAGS.md) for supported tags
