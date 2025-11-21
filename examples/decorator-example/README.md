# Decorator Example - TypeScript

This example demonstrates how to use TypeScript decorators with `express-swagger-auto` to generate OpenAPI documentation automatically.

## Features

- ✅ TypeScript decorators (`@Route`, `@Parameter`, `@RequestBody`, `@Response`)
- ✅ Zod schema validation and OpenAPI conversion
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Type-safe request/response handling
- ✅ Automatic Swagger UI generation

## Prerequisites

- Node.js 16+
- pnpm (or npm/yarn)

## Installation

```bash
cd examples/decorator-example
pnpm install
```

## Running the Example

```bash
# Development mode with ts-node
pnpm dev

# Or build and run
pnpm build
pnpm start
```

## Accessing the API

- **API Base URL**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI Spec**: http://localhost:3000/api-docs.json

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create new user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |

## Example Usage

### Get all users
```bash
curl http://localhost:3000/users
```

### Get user by ID
```bash
curl http://localhost:3000/users/1
```

### Create new user
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie Brown","email":"charlie@example.com","age":28}'
```

### Update user
```bash
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"age":31}'
```

### Delete user
```bash
curl -X DELETE http://localhost:3000/users/1
```

## How It Works

### 1. Define Zod Schemas

```typescript
const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});
```

### 2. Use Decorators

```typescript
class UserController {
  @Route({
    summary: 'Get all users',
    tags: ['users'],
  })
  @Response({
    statusCode: 200,
    description: 'List of users',
    schema: new ZodAdapter().convert(z.array(UserSchema)),
  })
  getAllUsers(req: Request, res: Response) {
    res.json(users);
  }
}
```

### 3. Register Routes

```typescript
const userController = new UserController();
app.get('/users', userController.getAllUsers.bind(userController));
```

### 4. Generate OpenAPI Spec

```typescript
const discovery = new RouteDiscovery();
const routes = discovery.discover(app);

const generator = new SpecGenerator({
  info: {
    title: 'User Management API',
    version: '1.0.0',
  },
});

const spec = generator.generate(routes);
```

### 5. Mount Swagger UI

```typescript
app.use(createSwaggerUIMiddleware({ spec }));
```

## Key Concepts

- **Decorators**: Attach OpenAPI metadata to controller methods
- **Zod Schemas**: Define data structures with validation
- **ZodAdapter**: Convert Zod schemas to OpenAPI schemas
- **RouteDiscovery**: Extract routes from Express app
- **SpecGenerator**: Generate OpenAPI 3.1 specification
- **Swagger UI**: Interactive API documentation

## TypeScript Configuration

Decorators require these `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Benefits

- 📝 **Documentation as Code**: Keep docs in sync with implementation
- 🔒 **Type Safety**: Compile-time type checking with TypeScript
- ✅ **Runtime Validation**: Zod validates requests automatically
- 🎨 **Clean Controllers**: Decorators separate concerns
- 🚀 **Auto-Generated**: No manual OpenAPI spec writing

## Next Steps

- Try modifying the schemas and see the Swagger UI update
- Add new endpoints with different HTTP methods
- Explore other decorators like `@Parameter` for query params
- Integrate with other validators (Joi, Yup)
