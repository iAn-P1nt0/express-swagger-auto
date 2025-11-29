/**
 * Integration Test Helpers
 * Shared utilities and fixtures for integration testing
 */
import express, { Express, Router, Request, Response, NextFunction } from 'express';

/**
 * Create a mock Express 4/5 compatible app with many routes
 * for integration testing
 */
export function createComplexExpressApp(routeCount: number = 50): Express {
  const app = express();
  app.use(express.json());

  // App-level middleware
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next();
  });

  // Simple routes
  for (let i = 0; i < Math.floor(routeCount / 5); i++) {
    app.get(`/simple/${i}`, (_req: Request, res: Response) => {
      res.json({ index: i });
    });
    app.post(`/simple/${i}`, (_req: Request, res: Response) => {
      res.status(201).json({ created: true });
    });
  }

  // Parameterized routes
  for (let i = 0; i < Math.floor(routeCount / 10); i++) {
    app.get(`/users/:userId/posts/:postId/resource${i}`, (_req: Request, res: Response) => {
      res.json({ resource: i });
    });
  }

  // Nested routers
  const apiRouter = Router();
  const v1Router = Router();
  const v2Router = Router();

  // V1 routes
  v1Router.get('/users', (_req: Request, res: Response) => res.json([]));
  v1Router.get('/users/:id', (_req: Request, res: Response) => res.json({}));
  v1Router.post('/users', (_req: Request, res: Response) => res.status(201).json({}));
  v1Router.put('/users/:id', (_req: Request, res: Response) => res.json({}));
  v1Router.delete('/users/:id', (_req: Request, res: Response) => res.status(204).send());
  v1Router.patch('/users/:id', (_req: Request, res: Response) => res.json({}));

  // V2 routes
  v2Router.get('/products', (_req: Request, res: Response) => res.json([]));
  v2Router.get('/products/:id', (_req: Request, res: Response) => res.json({}));
  v2Router.post('/products', (_req: Request, res: Response) => res.status(201).json({}));

  // Nested products router under V2
  const productsRouter = Router();
  productsRouter.get('/:productId/reviews', (_req: Request, res: Response) => res.json([]));
  productsRouter.post('/:productId/reviews', (_req: Request, res: Response) => res.status(201).json({}));
  productsRouter.get('/:productId/reviews/:reviewId', (_req: Request, res: Response) => res.json({}));
  v2Router.use('/products', productsRouter);

  apiRouter.use('/v1', v1Router);
  apiRouter.use('/v2', v2Router);
  app.use('/api', apiRouter);

  // Health and status endpoints
  app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));
  app.get('/status', (_req: Request, res: Response) => res.json({ status: 'running' }));

  return app;
}

/**
 * Create app with different HTTP methods for all CRUD operations
 */
export function createCRUDApp(): Express {
  const app = express();
  app.use(express.json());

  const resources = ['users', 'posts', 'comments', 'tags', 'categories'];

  resources.forEach((resource) => {
    app.get(`/${resource}`, (_req: Request, res: Response) => res.json([]));
    app.get(`/${resource}/:id`, (_req: Request, res: Response) => res.json({}));
    app.post(`/${resource}`, (_req: Request, res: Response) => res.status(201).json({}));
    app.put(`/${resource}/:id`, (_req: Request, res: Response) => res.json({}));
    app.patch(`/${resource}/:id`, (_req: Request, res: Response) => res.json({}));
    app.delete(`/${resource}/:id`, (_req: Request, res: Response) => res.status(204).send());
  });

  // HEAD and OPTIONS
  app.head('/users', (_req: Request, res: Response) => res.status(200).end());
  app.options('/users', (_req: Request, res: Response) => {
    res.setHeader('Allow', 'GET,POST,HEAD,OPTIONS');
    res.status(200).end();
  });

  return app;
}

/**
 * Create app with middleware chains for testing middleware analysis
 */
export function createAppWithMiddleware(): Express {
  const app = express();
  app.use(express.json());

  // Auth middleware
  const authMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
  // Set name for detection
  Object.defineProperty(authMiddleware, 'name', { value: 'authMiddleware' });

  // Rate limiting middleware
  const rateLimitMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
  Object.defineProperty(rateLimitMiddleware, 'name', { value: 'rateLimitMiddleware' });

  // Validation middleware
  const validateBody = (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
  Object.defineProperty(validateBody, 'name', { value: 'validateBody' });

  // Routes with different middleware combinations
  app.get('/public', (_req: Request, res: Response) => res.json({ public: true }));
  app.get('/protected', authMiddleware, (_req: Request, res: Response) => res.json({ protected: true }));
  app.post('/protected', authMiddleware, validateBody, (_req: Request, res: Response) =>
    res.status(201).json({})
  );
  app.get('/rate-limited', rateLimitMiddleware, (_req: Request, res: Response) =>
    res.json({ limited: true })
  );
  app.post(
    '/secured',
    authMiddleware,
    rateLimitMiddleware,
    validateBody,
    (_req: Request, res: Response) => res.status(201).json({})
  );

  // Router with middleware
  const adminRouter = Router();
  adminRouter.use(authMiddleware);
  adminRouter.get('/dashboard', (_req: Request, res: Response) => res.json({ admin: true }));
  adminRouter.get('/users', (_req: Request, res: Response) => res.json([]));
  app.use('/admin', adminRouter);

  return app;
}

/**
 * Create app with decorated handlers (simulating metadata)
 */
export function createAppWithMetadata(): Express {
  const app = express();
  app.use(express.json());

  // Handler with metadata
  const getUsersHandler = (_req: Request, res: Response) => res.json([]);
  (getUsersHandler as any).__openapi_metadata = {
    summary: 'Get all users',
    description: 'Returns a list of all users in the system',
    tags: ['users'],
    responses: {
      '200': { description: 'List of users' },
      '401': { description: 'Unauthorized' },
    },
  };

  const createUserHandler = (_req: Request, res: Response) => res.status(201).json({});
  (createUserHandler as any).__openapi_metadata = {
    summary: 'Create a new user',
    description: 'Creates a new user with the provided data',
    tags: ['users'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
            required: ['name', 'email'],
          },
        },
      },
    },
    responses: {
      '201': { description: 'User created' },
      '400': { description: 'Invalid input' },
    },
  };

  app.get('/users', getUsersHandler);
  app.post('/users', createUserHandler);

  return app;
}

/**
 * Create minimal OpenAPI spec for testing
 */
export function createMinimalSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {
      '/users': {
        get: {
          summary: 'Get users',
          responses: {
            '200': { description: 'Success' },
          },
        },
      },
    },
  };
}

/**
 * Create OpenAPI spec with security schemes
 */
export function createSecuredSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Secured API',
      version: '1.0.0',
    },
    servers: [
      { url: 'https://api.example.com', description: 'Production' },
    ],
    paths: {
      '/users': {
        get: {
          summary: 'Get users',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Success' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  };
}

/**
 * Create spec with component schemas
 */
export function createSpecWithSchemas() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Schema API',
      version: '1.0.0',
    },
    paths: {
      '/users': {
        get: {
          summary: 'Get users',
          responses: {
            '200': {
              description: 'Success',
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
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateUser' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'name', 'email'],
        },
        CreateUser: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
          },
          required: ['name', 'email'],
        },
      },
    },
  };
}

/**
 * Type definitions for test utilities
 */
export interface RouteInfo {
  method: string;
  path: string;
  handler?: Function;
  metadata?: Record<string, any>;
}

export interface SpecValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
  warnings: Array<{ path: string; message: string }>;
}
