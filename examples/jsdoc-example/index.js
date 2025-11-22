const express = require('express');
const Joi = require('joi');
const {
  RouteDiscovery,
  SpecGenerator,
  createSwaggerUIMiddleware,
  JoiAdapter,
  JsDocParser,
} = require('express-swagger-auto');

const app = express();
app.use(express.json());

// Joi schemas for validation
const productSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('').optional(),
  price: Joi.number().positive().precision(2).required(),
  category: Joi.string().valid('electronics', 'clothing', 'books', 'food', 'other').required(),
  inStock: Joi.boolean().default(true),
});

const createProductSchema = productSchema.keys({
  id: Joi.forbidden(), // ID is auto-generated
});

// In-memory product store
const products = [
  {
    id: 1,
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    category: 'electronics',
    inStock: true,
  },
  {
    id: 2,
    name: 'T-Shirt',
    description: 'Cotton t-shirt',
    price: 19.99,
    category: 'clothing',
    inStock: true,
  },
  {
    id: 3,
    name: 'JavaScript Book',
    description: 'Learn JavaScript',
    price: 39.99,
    category: 'books',
    inStock: false,
  },
];

let nextId = 4;

/**
 * @openapi
 * @route GET /products
 * @summary Get all products
 * @description Retrieves a paginated list of all products
 * @tags products
 * @param {number} [page=1].query - Page number for pagination
 * @param {number} [limit=10].query - Number of items per page
 * @param {string} category.query - Filter by category
 * @response 200 - List of products
 * @response 400 - Invalid query parameters
 */
app.get('/products', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const category = req.query.category;

  let filtered = products;
  if (category) {
    filtered = products.filter((p) => p.category === category);
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  res.json({
    data: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
});

/**
 * @openapi
 * @route GET /products/{id}
 * @summary Get product by ID
 * @description Retrieves a single product by its unique identifier
 * @tags products
 * @param {integer} id.path.required - Product ID
 * @response 200 - Product found
 * @response 404 - Product not found
 */
app.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({
      error: 'NotFound',
      message: `Product with ID ${id} not found`,
    });
  }

  res.json(product);
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
 */
app.post('/products', (req, res) => {
  const { error, value } = createProductSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'ValidationError',
      message: error.details[0].message,
      details: error.details,
    });
  }

  const newProduct = {
    id: nextId++,
    ...value,
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @openapi
 * @route PUT /products/{id}
 * @summary Update product
 * @description Updates an existing product
 * @tags products
 * @param {integer} id.path.required - Product ID
 * @bodyContent {application/json} createProductSchema
 * @response 200 - Product updated successfully
 * @response 400 - Invalid product data
 * @response 404 - Product not found
 */
app.put('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productIndex = products.findIndex((p) => p.id === id);

  if (productIndex === -1) {
    return res.status(404).json({
      error: 'NotFound',
      message: `Product with ID ${id} not found`,
    });
  }

  const updateSchema = createProductSchema.keys({
    name: Joi.string().min(1).max(200),
    description: Joi.string().allow(''),
    price: Joi.number().positive().precision(2),
    category: Joi.string().valid('electronics', 'clothing', 'books', 'food', 'other'),
    inStock: Joi.boolean(),
  });

  const { error, value } = updateSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'ValidationError',
      message: error.details[0].message,
    });
  }

  products[productIndex] = { ...products[productIndex], ...value };
  res.json(products[productIndex]);
});

/**
 * @openapi
 * @route DELETE /products/{id}
 * @summary Delete product
 * @description Removes a product from the catalog
 * @tags products
 * @param {integer} id.path.required - Product ID
 * @response 204 - Product deleted successfully
 * @response 404 - Product not found
 */
app.delete('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productIndex = products.findIndex((p) => p.id === id);

  if (productIndex === -1) {
    return res.status(404).json({
      error: 'NotFound',
      message: `Product with ID ${id} not found`,
    });
  }

  products.splice(productIndex, 1);
  res.status(204).send();
});

/**
 * @openapi
 * @route GET /categories
 * @summary Get all categories
 * @description Retrieves a list of available product categories
 * @tags categories
 * @response 200 - List of categories
 */
app.get('/categories', (req, res) => {
  const categories = ['electronics', 'clothing', 'books', 'food', 'other'];
  res.json({ categories });
});

// Generate OpenAPI spec using automatic JSDoc parsing (Phase 3)
const parser = new JsDocParser({
  sourceFiles: [__filename], // Parse this file
  includeAll: false, // Only include @openapi tagged comments
});

const discovery = new RouteDiscovery();
const routes = discovery.discover(app, {
  enableJsDocParsing: true,
  jsDocParser: parser,
});

const generator = new SpecGenerator({
  info: {
    title: 'Product Catalog API',
    version: '1.0.0',
    description: 'Example API demonstrating automatic JSDoc-based documentation with Joi validation',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
  ],
});

const spec = generator.generate(routes);

// Mount Swagger UI
app.use(
  createSwaggerUIMiddleware({
    spec,
    routePrefix: '/api-docs',
    customSiteTitle: 'Product Catalog API - JSDoc Example',
  })
);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  console.log(`OpenAPI spec available at http://localhost:${PORT}/api-docs.json`);
  console.log('\n✨ JSDoc Parser (Phase 3) Active!');
  console.log(`   Parsed ${routes.length} routes from JSDoc comments`);
  console.log('   Using automatic JSDoc parsing with Joi schemas');
});
