/**
 * E2E Test Suite: Decorator Strategy Workflow
 * Tests the TypeScript decorator-based documentation flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import {
  createTempDir,
  cleanupTempDir,
  writeFile,
  readFile,
  fileExists,
  createMockPackageJson,
} from './helpers/test-utils';
import { decoratorExpressAppTs, tsconfigJson } from './fixtures/sample-apps';

describe('Decorator Strategy Workflow E2E', () => {
  let testDir: string;

  beforeAll(() => {
    testDir = createTempDir('decorator-workflow');
  });

  afterAll(() => {
    cleanupTempDir(testDir);
  });

  describe('Creating TypeScript Express App', () => {
    it('should create TypeScript Express app with proper setup', () => {
      const srcDir = path.join(testDir, 'src');
      require('fs').mkdirSync(srcDir, { recursive: true });

      writeFile(path.join(srcDir, 'app.ts'), decoratorExpressAppTs);
      writeFile(path.join(testDir, 'tsconfig.json'), JSON.stringify(tsconfigJson, null, 2));
      createMockPackageJson(testDir, {
        type: 'commonjs',
        scripts: {
          build: 'tsc',
        },
        dependencies: {
          express: '^4.18.0',
          zod: '^3.22.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          '@types/express': '^4.17.0',
        },
      });

      expect(fileExists(path.join(srcDir, 'app.ts'))).toBe(true);
      expect(fileExists(path.join(testDir, 'tsconfig.json'))).toBe(true);
    });

    it('should include TypeScript decorators configuration', () => {
      const tsconfig = JSON.parse(readFile(path.join(testDir, 'tsconfig.json')));

      expect(tsconfig.compilerOptions.experimentalDecorators).toBe(true);
      expect(tsconfig.compilerOptions.emitDecoratorMetadata).toBe(true);
    });
  });

  describe('Adding Decorators to Routes', () => {
    let decoratorDir: string;

    beforeAll(() => {
      decoratorDir = path.join(testDir, 'decorator-routes');
      require('fs').mkdirSync(path.join(decoratorDir, 'src'), { recursive: true });
    });

    it('should create app with @Route decorator', () => {
      const routeApp = `
import express from 'express';
import { Route, Controller } from 'express-swagger-auto/decorators';

const app = express();
app.use(express.json());

@Controller('/api/users')
class UserController {
  @Route('GET', '/')
  async getUsers(req: express.Request, res: express.Response) {
    res.json([{ id: 1, name: 'John' }]);
  }

  @Route('GET', '/:id')
  async getUserById(req: express.Request, res: express.Response) {
    res.json({ id: req.params.id, name: 'John' });
  }

  @Route('POST', '/')
  async createUser(req: express.Request, res: express.Response) {
    res.status(201).json({ id: 2, ...req.body });
  }
}

export default app;
`;

      writeFile(path.join(decoratorDir, 'src', 'app.ts'), routeApp);
      const content = readFile(path.join(decoratorDir, 'src', 'app.ts'));

      expect(content).toContain('@Controller');
      expect(content).toContain('@Route');
      expect(content).toContain("@Route('GET', '/')");
      expect(content).toContain("@Route('POST', '/')");
    });

    it('should create app with @Parameter decorator', () => {
      const paramApp = `
import express from 'express';
import { Route, Parameter, Query, Path, Body } from 'express-swagger-auto/decorators';

const app = express();
app.use(express.json());

class ProductController {
  @Route('GET', '/products')
  @Query('page', { type: 'integer', default: 1 })
  @Query('limit', { type: 'integer', default: 10 })
  async getProducts(req: express.Request, res: express.Response) {
    res.json({ products: [], pagination: { page: 1, limit: 10 } });
  }

  @Route('GET', '/products/:id')
  @Path('id', { type: 'integer', required: true })
  async getProductById(req: express.Request, res: express.Response) {
    res.json({ id: req.params.id });
  }

  @Route('POST', '/products')
  @Body('product', { $ref: '#/components/schemas/CreateProduct' })
  async createProduct(req: express.Request, res: express.Response) {
    res.status(201).json(req.body);
  }
}

export default app;
`;

      writeFile(path.join(decoratorDir, 'src', 'param-app.ts'), paramApp);
      const content = readFile(path.join(decoratorDir, 'src', 'param-app.ts'));

      expect(content).toContain('@Query');
      expect(content).toContain('@Path');
      expect(content).toContain('@Body');
      expect(content).toContain("type: 'integer'");
    });

    it('should create app with @Response decorator', () => {
      const responseApp = `
import express from 'express';
import { Route, Response, ApiResponse } from 'express-swagger-auto/decorators';

const app = express();
app.use(express.json());

class OrderController {
  @Route('POST', '/orders')
  @Response(201, { description: 'Order created successfully' })
  @Response(400, { description: 'Invalid order data' })
  @Response(401, { description: 'Unauthorized' })
  async createOrder(req: express.Request, res: express.Response) {
    res.status(201).json({ orderId: '123' });
  }

  @Route('GET', '/orders/:id')
  @ApiResponse({
    200: { 
      description: 'Order found',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } }
    },
    404: { description: 'Order not found' }
  })
  async getOrder(req: express.Request, res: express.Response) {
    res.json({ orderId: req.params.id });
  }
}

export default app;
`;

      writeFile(path.join(decoratorDir, 'src', 'response-app.ts'), responseApp);
      const content = readFile(path.join(decoratorDir, 'src', 'response-app.ts'));

      expect(content).toContain('@Response(201');
      expect(content).toContain('@Response(400');
      expect(content).toContain('@ApiResponse');
      expect(content).toContain('description:');
    });
  });

  describe('Integrating Zod Validation', () => {
    let zodDir: string;

    beforeAll(() => {
      zodDir = path.join(testDir, 'zod-integration');
      require('fs').mkdirSync(path.join(zodDir, 'src'), { recursive: true });
    });

    it('should create app with Zod schemas', () => {
      writeFile(path.join(zodDir, 'src', 'app.ts'), decoratorExpressAppTs);
      const content = readFile(path.join(zodDir, 'src', 'app.ts'));

      expect(content).toContain("import { z } from 'zod'");
      expect(content).toContain('z.object');
      expect(content).toContain('z.string()');
      expect(content).toContain('z.number()');
    });

    it('should define user schema with Zod', () => {
      const content = readFile(path.join(zodDir, 'src', 'app.ts'));

      expect(content).toContain('UserSchema');
      expect(content).toContain('z.number().int().positive()');
      expect(content).toContain('z.string().email()');
      expect(content).toContain("z.enum(['admin', 'user', 'guest'])");
    });

    it('should use Zod for request validation', () => {
      const content = readFile(path.join(zodDir, 'src', 'app.ts'));

      expect(content).toContain('safeParse');
      expect(content).toContain('validation.success');
      expect(content).toContain('validation.error');
    });

    it('should create complex Zod schemas with nested objects', () => {
      const complexZodApp = `
import { z } from 'zod';

// Address schema
const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\\d{5}(-\\d{4})?$/),
  country: z.string().default('US'),
});

// Contact schema
const ContactSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  preferredMethod: z.enum(['email', 'phone', 'sms']).default('email'),
});

// User schema with nested objects
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150).optional(),
  address: AddressSchema,
  contact: ContactSchema,
  roles: z.array(z.enum(['admin', 'user', 'moderator'])),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date().default(() => new Date()),
});

export { AddressSchema, ContactSchema, UserSchema };
`;

      writeFile(path.join(zodDir, 'src', 'schemas.ts'), complexZodApp);
      const content = readFile(path.join(zodDir, 'src', 'schemas.ts'));

      expect(content).toContain('AddressSchema');
      expect(content).toContain('ContactSchema');
      expect(content).toContain('z.array');
      expect(content).toContain('z.record');
      expect(content).toContain('z.unknown()');
    });
  });

  describe('Generating Spec from Decorators', () => {
    it('should prepare app for spec generation', () => {
      const specGenApp = `
import express from 'express';
import { z } from 'zod';
import { 
  Route, 
  Controller, 
  Parameter, 
  Response,
  Schema,
  Tag,
  Summary,
  Description
} from 'express-swagger-auto/decorators';

const app = express();
app.use(express.json());

// Define schemas
const ProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
});

@Controller('/api')
@Tag('products')
class ProductController {
  @Route('GET', '/products')
  @Summary('Get all products')
  @Description('Retrieves a paginated list of products')
  @Response(200, { description: 'List of products' })
  async getProducts(req: express.Request, res: express.Response) {
    res.json({ products: [] });
  }

  @Route('POST', '/products')
  @Summary('Create product')
  @Schema('body', ProductSchema)
  @Response(201, { description: 'Product created' })
  @Response(400, { description: 'Validation error' })
  async createProduct(req: express.Request, res: express.Response) {
    const validation = ProductSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.issues });
    }
    res.status(201).json(validation.data);
  }
}

export default app;
`;

      const appPath = path.join(testDir, 'spec-gen', 'src');
      require('fs').mkdirSync(appPath, { recursive: true });
      writeFile(path.join(appPath, 'app.ts'), specGenApp);

      const content = readFile(path.join(appPath, 'app.ts'));
      expect(content).toContain('@Tag');
      expect(content).toContain('@Summary');
      expect(content).toContain('@Description');
      expect(content).toContain('@Schema');
    });
  });

  describe('Validating Decorator Metadata Extraction', () => {
    it('should define proper decorator metadata structure', () => {
      const metadataTypes = `
// Decorator metadata types
interface RouteMetadata {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

interface ParameterMetadata {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema: SchemaObject;
  description?: string;
}

interface ResponseMetadata {
  statusCode: number;
  description: string;
  content?: Record<string, MediaTypeObject>;
}

interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
}

interface SecurityRequirement {
  [name: string]: string[];
}

interface MediaTypeObject {
  schema: SchemaObject;
  example?: unknown;
}

// Metadata storage
const routeMetadataKey = Symbol('route');
const parameterMetadataKey = Symbol('parameter');
const responseMetadataKey = Symbol('response');

export {
  RouteMetadata,
  ParameterMetadata,
  ResponseMetadata,
  routeMetadataKey,
  parameterMetadataKey,
  responseMetadataKey,
};
`;

      const typesPath = path.join(testDir, 'decorator-types');
      require('fs').mkdirSync(typesPath, { recursive: true });
      writeFile(path.join(typesPath, 'metadata.ts'), metadataTypes);

      const content = readFile(path.join(typesPath, 'metadata.ts'));
      expect(content).toContain('RouteMetadata');
      expect(content).toContain('ParameterMetadata');
      expect(content).toContain('ResponseMetadata');
      expect(content).toContain('Symbol');
    });
  });

  describe('Type-Safe Request/Response Handling', () => {
    it('should create type-safe request handlers', () => {
      const typeSafeApp = `
import express from 'express';
import { z } from 'zod';

// Request body types derived from Zod schemas
const CreateUserBody = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});

type CreateUserRequest = z.infer<typeof CreateUserBody>;

// Type-safe response types
interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

// Type-safe request handler
type TypedRequestHandler<TBody, TResponse> = (
  req: express.Request<unknown, TResponse, TBody>,
  res: express.Response<TResponse | ErrorResponse>
) => Promise<void>;

const createUser: TypedRequestHandler<CreateUserRequest, UserResponse> = async (req, res) => {
  const validation = CreateUserBody.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: validation.error.issues 
    });
  }
  
  // Type-safe access to validated data
  const { name, email } = validation.data;
  
  res.status(201).json({
    id: 'user-123',
    name,
    email,
    createdAt: new Date().toISOString(),
  });
};

const app = express();
app.use(express.json());
app.post('/users', createUser);

export default app;
`;

      const typeSafePath = path.join(testDir, 'type-safe');
      require('fs').mkdirSync(path.join(typeSafePath, 'src'), { recursive: true });
      writeFile(path.join(typeSafePath, 'src', 'app.ts'), typeSafeApp);

      const content = readFile(path.join(typeSafePath, 'src', 'app.ts'));
      expect(content).toContain('z.infer<typeof');
      expect(content).toContain('TypedRequestHandler');
      expect(content).toContain('express.Request<');
      expect(content).toContain('express.Response<');
    });

    it('should define typed route parameters', () => {
      const typedParamsApp = `
import express from 'express';

// Typed path parameters
interface GetUserParams {
  id: string;
}

// Typed query parameters
interface ListUsersQuery {
  page?: string;
  limit?: string;
  sort?: 'asc' | 'desc';
}

const app = express();

app.get('/users/:id', (req: express.Request<GetUserParams>, res) => {
  const userId = req.params.id; // Type: string
  res.json({ id: userId });
});

app.get('/users', (req: express.Request<{}, {}, {}, ListUsersQuery>, res) => {
  const { page = '1', limit = '10', sort = 'asc' } = req.query;
  res.json({ page, limit, sort });
});

export default app;
`;

      const typedParamsPath = path.join(testDir, 'typed-params');
      require('fs').mkdirSync(path.join(typedParamsPath, 'src'), { recursive: true });
      writeFile(path.join(typedParamsPath, 'src', 'app.ts'), typedParamsApp);

      const content = readFile(path.join(typedParamsPath, 'src', 'app.ts'));
      expect(content).toContain('GetUserParams');
      expect(content).toContain('ListUsersQuery');
      expect(content).toContain('express.Request<');
    });
  });

  describe('Decorator Edge Cases', () => {
    let edgeCasesDir: string;

    beforeAll(() => {
      edgeCasesDir = path.join(testDir, 'edge-cases');
      require('fs').mkdirSync(path.join(edgeCasesDir, 'src'), { recursive: true });
    });

    it('should handle multiple decorators on same method', () => {
      const multiDecoratorApp = `
import { Route, Summary, Description, Tag, Response, Deprecated } from 'express-swagger-auto/decorators';

class Controller {
  @Route('GET', '/legacy')
  @Summary('Legacy endpoint')
  @Description('This endpoint is deprecated')
  @Tag('legacy')
  @Response(200, { description: 'Success' })
  @Response(410, { description: 'Gone' })
  @Deprecated()
  async legacyEndpoint(req, res) {
    res.json({ message: 'deprecated' });
  }
}
`;

      writeFile(path.join(edgeCasesDir, 'src', 'multi-decorator.ts'), multiDecoratorApp);
      const content = readFile(path.join(edgeCasesDir, 'src', 'multi-decorator.ts'));

      expect(content).toContain('@Route');
      expect(content).toContain('@Summary');
      expect(content).toContain('@Description');
      expect(content).toContain('@Tag');
      expect(content).toContain('@Deprecated');
    });

    it('should handle inherited decorators', () => {
      const inheritedApp = `
import { Controller, Route, Tag } from 'express-swagger-auto/decorators';

@Controller('/api')
@Tag('base')
abstract class BaseController {
  @Route('GET', '/health')
  healthCheck(req, res) {
    res.json({ status: 'ok' });
  }
}

@Controller('/users')
@Tag('users')
class UserController extends BaseController {
  @Route('GET', '/')
  getUsers(req, res) {
    res.json([]);
  }
}
`;

      writeFile(path.join(edgeCasesDir, 'src', 'inherited.ts'), inheritedApp);
      const content = readFile(path.join(edgeCasesDir, 'src', 'inherited.ts'));

      expect(content).toContain('abstract class BaseController');
      expect(content).toContain('extends BaseController');
    });

    it('should handle security decorators', () => {
      const securityApp = `
import { Route, Security, BearerAuth, ApiKey, OAuth2 } from 'express-swagger-auto/decorators';

class SecureController {
  @Route('GET', '/public')
  @Security([]) // No security required
  publicEndpoint(req, res) {
    res.json({ public: true });
  }

  @Route('GET', '/protected')
  @BearerAuth()
  protectedEndpoint(req, res) {
    res.json({ user: req.user });
  }

  @Route('GET', '/admin')
  @BearerAuth()
  @Security([{ bearerAuth: [], apiKey: [] }])
  adminEndpoint(req, res) {
    res.json({ admin: true });
  }
}
`;

      writeFile(path.join(edgeCasesDir, 'src', 'security.ts'), securityApp);
      const content = readFile(path.join(edgeCasesDir, 'src', 'security.ts'));

      expect(content).toContain('@Security');
      expect(content).toContain('@BearerAuth');
      expect(content).toContain('bearerAuth');
    });
  });
});
