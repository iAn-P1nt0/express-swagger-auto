import { describe, it, expect } from 'vitest';
import { RouteDiscovery } from './RouteDiscovery';
import express from 'express';

describe('RouteDiscovery', () => {
  it('should initialize without errors', () => {
    const discovery = new RouteDiscovery();
    expect(discovery).toBeDefined();
  });

  it('should return empty routes on initial call', () => {
    const discovery = new RouteDiscovery();
    const routes = discovery.getRoutes();
    expect(routes).toEqual([]);
  });

  it('should handle null app gracefully', () => {
    const discovery = new RouteDiscovery();
    const routes = discovery.discover(null as any);
    expect(routes).toEqual([]);
  });

  describe('Route Extraction', () => {
    it('should discover simple routes', () => {
      const app = express();
      app.get('/users', (req, res) => res.json([]));
      app.post('/users', (req, res) => res.json({}));
      app.get('/users/:id', (req, res) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBe(3);
      expect(routes.map(r => `${r.method} ${r.path}`)).toEqual([
        'GET /users',
        'POST /users',
        'GET /users/:id'
      ]);
    });

    it('should discover nested router routes with correct paths', () => {
      const app = express();
      const router = express.Router();
      
      router.get('/list', (req, res) => res.json([]));
      router.post('/create', (req, res) => res.json({}));
      
      app.use('/api/v1', router);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBe(2);
      expect(routes.map(r => `${r.method} ${r.path}`)).toEqual([
        'GET /api/v1/list',
        'POST /api/v1/create'
      ]);
    });

    it('should discover deeply nested router routes', () => {
      const app = express();
      const apiRouter = express.Router();
      const transactionRouter = express.Router();
      
      transactionRouter.get('/get-details', (req, res) => res.json({}));
      transactionRouter.post('/create/:id', (req, res) => res.json({}));
      
      apiRouter.use('/transaction/v1', transactionRouter);
      app.use(apiRouter);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBe(2);
      expect(routes.map(r => `${r.method} ${r.path}`)).toEqual([
        'GET /transaction/v1/get-details',
        'POST /transaction/v1/create/:id'
      ]);
    });

    it('should handle multiple nested routers', () => {
      const app = express();
      const usersRouter = express.Router();
      const productsRouter = express.Router();
      
      usersRouter.get('/', (req, res) => res.json([]));
      usersRouter.get('/:id', (req, res) => res.json({}));
      
      productsRouter.get('/', (req, res) => res.json([]));
      productsRouter.post('/', (req, res) => res.json({}));
      
      app.use('/users', usersRouter);
      app.use('/products', productsRouter);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBe(4);
      const paths = routes.map(r => `${r.method} ${r.path}`);
      expect(paths).toContain('GET /users');
      expect(paths).toContain('GET /users/:id');
      expect(paths).toContain('GET /products');
      expect(paths).toContain('POST /products');
    });

    it('should extract path parameters correctly', () => {
      const app = express();
      app.get('/users/:userId/posts/:postId', (req, res) => res.json({}));

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app, {
        enablePathParameterExtraction: true
      });

      expect(routes.length).toBe(1);
      const route = routes[0];
      expect(route.path).toBe('/users/:userId/posts/:postId');
      expect(route.parameters).toBeDefined();
      expect(route.parameters?.length).toBe(2);
      expect(route.parameters?.map(p => p.name)).toEqual(['userId', 'postId']);
    });

    it('should handle root router with no path prefix', () => {
      const app = express();
      const router = express.Router();
      
      router.get('/health', (req, res) => res.json({ status: 'ok' }));
      
      app.use(router);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe('/health');
    });

    it('should handle all HTTP methods', () => {
      const app = express();
      const handler = (req: express.Request, res: express.Response) => res.json({});
      
      app.get('/resource', handler);
      app.post('/resource', handler);
      app.put('/resource', handler);
      app.patch('/resource', handler);
      app.delete('/resource', handler);

      const discovery = new RouteDiscovery();
      const routes = discovery.discover(app);

      expect(routes.length).toBe(5);
      const methods = routes.map(r => r.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('PATCH');
      expect(methods).toContain('DELETE');
    });
  });
});
