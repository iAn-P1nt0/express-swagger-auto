import express from 'express';
import { z } from 'zod';
import {
  RouteDiscovery,
  SpecGenerator,
  createSwaggerUIMiddleware,
  ZodAdapter,
} from 'express-swagger-auto';
import { Route, Parameter, Response, RequestBody } from 'express-swagger-auto/decorators';

const app = express();
app.use(express.json());

// Zod schemas for validation and OpenAPI generation
const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

const CreateUserSchema = UserSchema.omit({ id: true });

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

// In-memory user store
const users: Array<z.infer<typeof UserSchema>> = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', age: 30 },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', age: 25 },
];

let nextId = 3;

// User Controller with decorators
class UserController {
  @Route({
    summary: 'Get all users',
    description: 'Retrieves a list of all users in the system',
    tags: ['users'],
  })
  @Response({
    statusCode: 200,
    description: 'List of users',
    schema: new ZodAdapter().convert(z.array(UserSchema)),
  })
  getAllUsers(_req: express.Request, res: express.Response) {
    res.json(users);
  }

  @Route({
    summary: 'Get user by ID',
    description: 'Retrieves a single user by their unique identifier',
    tags: ['users'],
  })
  @Parameter({
    name: 'id',
    in: 'path',
    required: true,
    description: 'User ID',
    schema: { type: 'integer' },
  })
  @Response({
    statusCode: 200,
    description: 'User found',
    schema: new ZodAdapter().convert(UserSchema),
  })
  @Response({
    statusCode: 404,
    description: 'User not found',
    schema: new ZodAdapter().convert(ErrorSchema),
  })
  getUserById(req: express.Request, res: express.Response) {
    const id = parseInt(req.params.id);
    const user = users.find((u) => u.id === id);

    if (!user) {
      return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    }

    res.json(user);
  }

  @Route({
    summary: 'Create new user',
    description: 'Creates a new user in the system',
    tags: ['users'],
  })
  @RequestBody({
    required: true,
    description: 'User data',
    content: {
      'application/json': {
        schema: new ZodAdapter().convert(CreateUserSchema),
      },
    },
  })
  @Response({
    statusCode: 201,
    description: 'User created',
    schema: new ZodAdapter().convert(UserSchema),
  })
  @Response({
    statusCode: 400,
    description: 'Invalid input',
    schema: new ZodAdapter().convert(ErrorSchema),
  })
  createUser(req: express.Request, res: express.Response) {
    try {
      const userData = CreateUserSchema.parse(req.body);
      const newUser = { id: nextId++, ...userData };
      users.push(newUser);
      res.status(201).json(newUser);
    } catch (error) {
      res.status(400).json({
        error: 'ValidationError',
        message: error instanceof Error ? error.message : 'Invalid input',
      });
    }
  }

  @Route({
    summary: 'Update user',
    description: 'Updates an existing user',
    tags: ['users'],
  })
  @Parameter({
    name: 'id',
    in: 'path',
    required: true,
    description: 'User ID',
    schema: { type: 'integer' },
  })
  @RequestBody({
    required: true,
    description: 'Updated user data',
    content: {
      'application/json': {
        schema: new ZodAdapter().convert(CreateUserSchema.partial()),
      },
    },
  })
  @Response({
    statusCode: 200,
    description: 'User updated',
    schema: new ZodAdapter().convert(UserSchema),
  })
  @Response({
    statusCode: 404,
    description: 'User not found',
    schema: new ZodAdapter().convert(ErrorSchema),
  })
  updateUser(req: express.Request, res: express.Response) {
    const id = parseInt(req.params.id);
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    }

    const updates = CreateUserSchema.partial().parse(req.body);
    users[userIndex] = { ...users[userIndex], ...updates };
    res.json(users[userIndex]);
  }

  @Route({
    summary: 'Delete user',
    description: 'Deletes a user from the system',
    tags: ['users'],
  })
  @Parameter({
    name: 'id',
    in: 'path',
    required: true,
    description: 'User ID',
    schema: { type: 'integer' },
  })
  @Response({
    statusCode: 204,
    description: 'User deleted',
  })
  @Response({
    statusCode: 404,
    description: 'User not found',
    schema: new ZodAdapter().convert(ErrorSchema),
  })
  deleteUser(req: express.Request, res: express.Response) {
    const id = parseInt(req.params.id);
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    }

    users.splice(userIndex, 1);
    res.status(204).send();
  }
}

// Initialize controller
const userController = new UserController();

// Register routes
app.get('/users', userController.getAllUsers.bind(userController));
app.get('/users/:id', userController.getUserById.bind(userController));
app.post('/users', userController.createUser.bind(userController));
app.put('/users/:id', userController.updateUser.bind(userController));
app.delete('/users/:id', userController.deleteUser.bind(userController));

// Generate OpenAPI spec
const discovery = new RouteDiscovery();
const routes = discovery.discover(app);

const generator = new SpecGenerator({
  info: {
    title: 'User Management API',
    version: '1.0.0',
    description: 'Example API demonstrating decorator-based OpenAPI generation with Zod schemas',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
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
    customSiteTitle: 'User Management API - Decorator Example',
  })
);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  console.log(`OpenAPI spec available at http://localhost:${PORT}/api-docs.json`);
});
