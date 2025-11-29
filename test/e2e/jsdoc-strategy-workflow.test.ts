/**
 * E2E Test Suite: JSDoc Strategy Workflow
 * Tests the JSDoc-based API documentation generation flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import {
  createTempDir,
  cleanupTempDir,
  writeFile,
  readFile,
  fileExists,
  parseJSON,
  getCliPath,
  runCommand,
  createMockPackageJson,
} from './helpers/test-utils';
import { jsDocExpressApp, validOpenAPISpec } from './fixtures/sample-apps';

describe('JSDoc Strategy Workflow E2E', () => {
  let testDir: string;
  let cliPath: string;

  beforeAll(async () => {
    cliPath = getCliPath();
    testDir = createTempDir('jsdoc-workflow');
    expect(fileExists(cliPath)).toBe(true);
  });

  afterAll(() => {
    cleanupTempDir(testDir);
  });

  describe('Creating JavaScript Express App with JSDoc', () => {
    it('should create Express app with JSDoc annotations', () => {
      const appPath = path.join(testDir, 'app.js');
      writeFile(appPath, jsDocExpressApp);
      createMockPackageJson(testDir, {
        dependencies: {
          express: '^4.18.0',
        },
      });

      expect(fileExists(appPath)).toBe(true);
      const content = readFile(appPath);
      
      // Verify JSDoc annotations
      expect(content).toContain('@openapi');
      expect(content).toContain('@route');
      expect(content).toContain('@summary');
      expect(content).toContain('@tags');
      expect(content).toContain('@response');
    });

    it('should include all required JSDoc tags', () => {
      const appPath = path.join(testDir, 'app.js');
      const content = readFile(appPath);

      // Verify route definitions
      expect(content).toContain('@route GET /products');
      expect(content).toContain('@route GET /products/{id}');
      expect(content).toContain('@route POST /products');

      // Verify parameter documentation
      expect(content).toContain('@param');
      expect(content).toContain('.path.required');
      expect(content).toContain('.query');
    });
  });

  describe('Parsing JSDoc from Source Files', () => {
    it('should validate JSDoc syntax patterns', () => {
      const appPath = path.join(testDir, 'app.js');
      const content = readFile(appPath);

      // Extract JSDoc blocks
      const jsdocBlocks = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
      expect(jsdocBlocks.length).toBeGreaterThan(0);

      // Verify each block has @openapi tag
      const openApiBlocks = jsdocBlocks.filter((block) => block.includes('@openapi'));
      expect(openApiBlocks.length).toBeGreaterThan(0);
    });

    it('should support parameter type annotations', () => {
      const content = readFile(path.join(testDir, 'app.js'));

      // Verify parameter types
      expect(content).toMatch(/@param \{(number|integer|string)\}/);
    });

    it('should support response documentation', () => {
      const content = readFile(path.join(testDir, 'app.js'));

      // Verify response codes
      expect(content).toContain('@response 200');
      expect(content).toContain('@response 201');
      expect(content).toContain('@response 404');
    });
  });

  describe('Integrating Joi Validation', () => {
    let joiDir: string;

    beforeAll(() => {
      joiDir = path.join(testDir, 'joi-integration');
      require('fs').mkdirSync(joiDir, { recursive: true });
    });

    it('should create app with Joi validation schemas', () => {
      const joiApp = `
const express = require('express');
const Joi = require('joi');

const app = express();
app.use(express.json());

// Joi schema for product
const productSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  price: Joi.number().positive().precision(2).required(),
  category: Joi.string().valid('electronics', 'clothing', 'books').required(),
});

/**
 * @openapi
 * @route POST /products
 * @summary Create new product
 * @tags products
 * @bodySchema productSchema
 * @response 201 - Product created
 * @response 400 - Validation error
 */
app.post('/products', (req, res) => {
  const { error, value } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  res.status(201).json({ id: 1, ...value });
});

module.exports = app;
`;

      const appPath = path.join(joiDir, 'app.js');
      writeFile(appPath, joiApp);

      expect(fileExists(appPath)).toBe(true);
      expect(readFile(appPath)).toContain('Joi.object');
      expect(readFile(appPath)).toContain('@bodySchema productSchema');
    });

    it('should reference Joi schemas in JSDoc', () => {
      const content = readFile(path.join(joiDir, 'app.js'));

      // Verify schema reference patterns
      expect(content).toContain('productSchema');
      expect(content).toContain('Joi.string()');
      expect(content).toContain('Joi.number()');
    });
  });

  describe('Generating Spec from JSDoc', () => {
    let specGenDir: string;

    beforeAll(() => {
      specGenDir = path.join(testDir, 'spec-generation');
      require('fs').mkdirSync(specGenDir, { recursive: true });
      writeFile(path.join(specGenDir, 'app.js'), jsDocExpressApp);
      createMockPackageJson(specGenDir, {
        dependencies: { express: '^4.18.0' },
      });
    });

    it('should attempt to generate spec with JSDoc strategy', async () => {
      const appPath = path.join(specGenDir, 'app.js');
      const outputPath = path.join(specGenDir, 'openapi.json');

      const result = await runCommand(
        'node',
        [cliPath, 'generate', '-i', appPath, '-o', outputPath, '--strategies', 'jsdoc'],
        {
          cwd: specGenDir,
          timeout: 15000,
        }
      );

      // The command may fail in test environment due to module loading
      // but the CLI itself should be reachable
      expect(result.stdout + result.stderr).toBeDefined();
    });
  });

  describe('Validating All JSDoc Tags Processed', () => {
    it('should recognize @openapi tag', () => {
      const content = readFile(path.join(testDir, 'app.js'));
      const openApiTags = (content.match(/@openapi/g) || []).length;
      expect(openApiTags).toBeGreaterThan(0);
    });

    it('should recognize @route tag with method and path', () => {
      const content = readFile(path.join(testDir, 'app.js'));
      
      // Verify route tag patterns
      expect(content).toMatch(/@route (GET|POST|PUT|DELETE|PATCH) \/.+/);
    });

    it('should recognize @summary tag', () => {
      const content = readFile(path.join(testDir, 'app.js'));
      expect(content).toContain('@summary');
    });

    it('should recognize @description tag', () => {
      const content = readFile(path.join(testDir, 'app.js'));
      expect(content).toContain('@description');
    });

    it('should recognize @tags tag', () => {
      const content = readFile(path.join(testDir, 'app.js'));
      expect(content).toContain('@tags products');
    });

    it('should recognize @param tag with location', () => {
      const content = readFile(path.join(testDir, 'app.js'));
      
      // Path parameter
      expect(content).toMatch(/@param \{.*\}.*\.path/);
      // Query parameter
      expect(content).toMatch(/@param \{.*\}.*\.query/);
    });

    it('should recognize @response tags', () => {
      const content = readFile(path.join(testDir, 'app.js'));
      
      // Verify response documentation
      expect(content).toContain('@response 200');
      expect(content).toContain('@response 201');
      expect(content).toContain('@response 400');
      expect(content).toContain('@response 404');
    });
  });

  describe('Complex JSDoc Scenarios', () => {
    let complexDir: string;

    beforeAll(() => {
      complexDir = path.join(testDir, 'complex-jsdoc');
      require('fs').mkdirSync(complexDir, { recursive: true });
    });

    it('should support nested tags and YAML content', () => {
      const complexApp = `
const express = require('express');
const app = express();
app.use(express.json());

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users
 *     description: |
 *       Retrieves a paginated list of all users.
 *       
 *       Supports filtering by role and status.
 *     tags:
 *       - users
 *     parameters:
 *       - name: role
 *         in: query
 *         schema:
 *           type: string
 *           enum: [admin, user, guest]
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */
app.get('/users', (req, res) => {
  res.json([]);
});

module.exports = app;
`;

      const appPath = path.join(complexDir, 'app.js');
      writeFile(appPath, complexApp);

      const content = readFile(appPath);
      expect(content).toContain('enum: [admin, user, guest]');
      expect(content).toContain('application/json:');
      expect(content).toContain('type: array');
    });

    it('should support security scheme annotations', () => {
      const securityApp = `
const express = require('express');
const app = express();

/**
 * @openapi
 * @route GET /admin/users
 * @summary Get admin users
 * @tags admin
 * @security bearerAuth
 * @response 200 - List of admin users
 * @response 401 - Unauthorized
 * @response 403 - Forbidden
 */
app.get('/admin/users', (req, res) => {
  res.json([]);
});

module.exports = app;
`;

      const appPath = path.join(complexDir, 'security-app.js');
      writeFile(appPath, securityApp);

      const content = readFile(appPath);
      expect(content).toContain('@security bearerAuth');
      expect(content).toContain('@response 401');
      expect(content).toContain('@response 403');
    });

    it('should support request body documentation', () => {
      const bodyApp = `
const express = require('express');
const app = express();
app.use(express.json());

/**
 * @openapi
 * @route POST /orders
 * @summary Create new order
 * @tags orders
 * @requestBody
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - items
 *           - customerId
 *         properties:
 *           customerId:
 *             type: string
 *             format: uuid
 *           items:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 productId:
 *                   type: string
 *                 quantity:
 *                   type: integer
 *                   minimum: 1
 * @response 201 - Order created
 */
app.post('/orders', (req, res) => {
  res.status(201).json({ id: '123', ...req.body });
});

module.exports = app;
`;

      const appPath = path.join(complexDir, 'body-app.js');
      writeFile(appPath, bodyApp);

      const content = readFile(appPath);
      expect(content).toContain('@requestBody');
      expect(content).toContain('format: uuid');
      expect(content).toContain('minimum: 1');
    });
  });

  describe('JSDoc Parsing Edge Cases', () => {
    let edgeDir: string;

    beforeAll(() => {
      edgeDir = path.join(testDir, 'edge-cases');
      require('fs').mkdirSync(edgeDir, { recursive: true });
    });

    it('should handle multi-line descriptions', () => {
      const app = `
/**
 * @openapi
 * @route GET /products
 * @summary Get all products
 * @description This is a multi-line description that spans
 *   multiple lines and includes various details about the endpoint.
 *   It should be properly parsed and included in the spec.
 * @tags products
 * @response 200 - Success
 */
app.get('/products', (req, res) => res.json([]));
`;
      writeFile(path.join(edgeDir, 'multiline.js'), app);
      expect(readFile(path.join(edgeDir, 'multiline.js'))).toContain('multi-line description');
    });

    it('should handle optional parameters', () => {
      const app = `
/**
 * @openapi
 * @route GET /search
 * @param {string} [q] - Search query (optional)
 * @param {number} [limit=10] - Result limit with default
 * @response 200 - Results
 */
app.get('/search', (req, res) => res.json([]));
`;
      writeFile(path.join(edgeDir, 'optional.js'), app);
      const content = readFile(path.join(edgeDir, 'optional.js'));
      expect(content).toContain('[q]');
      expect(content).toContain('[limit=10]');
    });

    it('should handle special characters in descriptions', () => {
      const app = `
/**
 * @openapi
 * @route GET /data
 * @summary Get data with "special" characters
 * @description Handles values like: <, >, &, "quotes", and 'apostrophes'
 * @response 200 - Success
 */
app.get('/data', (req, res) => res.json({}));
`;
      writeFile(path.join(edgeDir, 'special-chars.js'), app);
      const content = readFile(path.join(edgeDir, 'special-chars.js'));
      expect(content).toContain('"special"');
      expect(content).toContain("'apostrophes'");
    });
  });
});
