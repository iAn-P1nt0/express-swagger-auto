/**
 * E2E Test Fixtures
 * Sample Express apps and configurations for testing complete workflows
 */

/**
 * Minimal Express app (zero-config scenario)
 */
export const minimalExpressApp = `
const express = require('express');
const app = express();
app.use(express.json());

// Simple routes without any documentation
app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'John' });
});

app.post('/users', (req, res) => {
  res.status(201).json({ id: 2, ...req.body });
});

module.exports = app;
`;

/**
 * Express app with JSDoc annotations
 */
export const jsDocExpressApp = `
const express = require('express');
const app = express();
app.use(express.json());

/**
 * @openapi
 * @route GET /products
 * @summary Get all products
 * @description Retrieves a paginated list of all products
 * @tags products
 * @param {number} [page=1].query - Page number for pagination
 * @param {number} [limit=10].query - Number of items per page
 * @response 200 - List of products
 */
app.get('/products', (req, res) => {
  res.json({
    products: [
      { id: 1, name: 'Product 1', price: 19.99 },
      { id: 2, name: 'Product 2', price: 29.99 },
    ],
    pagination: { page: 1, limit: 10, total: 2 },
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
  if (id === 1) {
    res.json({ id: 1, name: 'Product 1', price: 19.99 });
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

/**
 * @openapi
 * @route POST /products
 * @summary Create new product
 * @description Creates a new product in the catalog
 * @tags products
 * @response 201 - Product created successfully
 * @response 400 - Invalid product data
 */
app.post('/products', (req, res) => {
  res.status(201).json({ id: 3, ...req.body });
});

module.exports = app;
`;

/**
 * Express app with TypeScript decorators (source code)
 */
export const decoratorExpressAppTs = `
import express from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Zod schemas for validation
const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

const CreateUserSchema = UserSchema.omit({ id: true });

// Routes with Zod validation
app.get('/users', (req, res) => {
  res.json({
    users: [
      { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin' },
      { id: 2, name: 'Regular User', email: 'user@example.com', role: 'user' },
    ],
  });
});

app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json({ id, name: 'Test User', email: 'test@example.com', role: 'user' });
});

app.post('/users', (req, res) => {
  const validation = CreateUserSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Validation failed', details: validation.error.issues });
  }
  res.status(201).json({ id: 3, ...validation.data });
});

export default app;
`;

/**
 * Express app for runtime capture testing
 */
export const runtimeCaptureApp = `
const express = require('express');
const app = express();
app.use(express.json());

// Sample data
const posts = [
  { id: 1, title: 'First Post', content: 'Hello World', author: 'John' },
  { id: 2, title: 'Second Post', content: 'Another post', author: 'Jane' },
];

app.get('/posts', (req, res) => {
  res.json({ posts, total: posts.length });
});

app.get('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json(post);
});

app.post('/posts', (req, res) => {
  const { title, content, author } = req.body;
  const newPost = { id: posts.length + 1, title, content, author };
  posts.push(newPost);
  res.status(201).json(newPost);
});

app.put('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const postIndex = posts.findIndex(p => p.id === id);
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  posts[postIndex] = { ...posts[postIndex], ...req.body };
  res.json(posts[postIndex]);
});

app.delete('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const postIndex = posts.findIndex(p => p.id === id);
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  posts.splice(postIndex, 1);
  res.status(204).send();
});

module.exports = app;
`;

/**
 * Valid OpenAPI spec for testing
 */
export const validOpenAPISpec = {
  openapi: '3.1.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
    description: 'Test API for E2E testing',
  },
  paths: {
    '/users': {
      get: {
        summary: 'Get all users',
        operationId: 'getUsers',
        tags: ['users'],
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create user',
        operationId: 'createUser',
        tags: ['users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUser' },
            },
          },
        },
        responses: {
          '201': { description: 'User created' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/users/{id}': {
      get: {
        summary: 'Get user by ID',
        operationId: 'getUserById',
        tags: ['users'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'User found' },
          '404': { description: 'User not found' },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        required: ['id', 'name', 'email'],
      },
      CreateUser: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        required: ['name', 'email'],
      },
    },
  },
};

/**
 * Invalid OpenAPI spec (missing required fields)
 */
export const invalidOpenAPISpec = {
  openapi: '3.1.0',
  // Missing info
  paths: {},
};

/**
 * Config file for testing
 */
export const testConfig = {
  input: './app.js',
  output: './openapi.json',
  format: 'json',
  strategies: ['jsdoc', 'decorator'],
  info: {
    title: 'Test API',
    version: '1.0.0',
    description: 'Generated from config',
  },
};

/**
 * TypeScript config for decorator tests
 */
export const tsconfigJson = {
  compilerOptions: {
    target: 'ES2020',
    module: 'CommonJS',
    moduleResolution: 'node',
    esModuleInterop: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    strict: true,
    skipLibCheck: true,
    outDir: './dist',
    rootDir: './src',
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist'],
};
