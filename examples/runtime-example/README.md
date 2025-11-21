# Runtime Example - Schema Capture

This example demonstrates how to use runtime schema capture with `express-swagger-auto` to automatically generate OpenAPI documentation from actual request/response data.

## Features

- ✅ **Zero Annotation**: No decorators, JSDoc, or schema definitions required
- ✅ **Automatic Inference**: Schemas generated from runtime request/response data
- ✅ **Snapshot Storage**: Persists captured schemas to disk with deduplication
- ✅ **Sensitive Data Masking**: Auto-sanitizes password, token, apiKey fields
- ✅ **Development-First**: Designed for dev/staging environments
- ✅ **Full CRUD Operations**: Create, Read, Update, Delete blog posts

## Prerequisites

- Node.js 16+
- pnpm (or npm/yarn)

## Installation

```bash
cd examples/runtime-example
pnpm install
```

## Running the Example

```bash
pnpm start
```

The server will create a `data/snapshots/` directory to store captured schemas.

## Accessing the API

- **API Base URL**: http://localhost:3002
- **Swagger UI**: http://localhost:3002/api-docs
- **OpenAPI Spec**: http://localhost:3002/api-docs.json
- **Snapshots**: `./data/snapshots/*.json`

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | Get all posts (with filters) |
| GET | `/posts/:id` | Get post by ID |
| POST | `/posts` | Create new post |
| PUT | `/posts/:id` | Update post |
| DELETE | `/posts/:id` | Delete post |
| GET | `/stats` | Get blog statistics |
| POST | `/posts/:id/publish` | Publish a draft post |

## How It Works

### 1. Enable Runtime Capture Middleware

```javascript
const snapshotStorage = new SnapshotStorage({
  outputDir: './data/snapshots',
  enabled: true,
});

app.use(
  runtimeCapture({
    enabled: true,
    storage: snapshotStorage,
    sanitize: true, // Mask password, token, apiKey, etc.
  })
);
```

### 2. Write Your API (No Schemas Required!)

```javascript
app.get('/posts', (req, res) => {
  const { published, author, tag } = req.query;
  let filtered = posts;
  // Filter logic...
  res.json({ posts: filtered, count: filtered.length });
});

app.post('/posts', (req, res) => {
  const { title, content, author, tags, published } = req.body;
  const newPost = { id: nextId++, title, content, author, tags, published };
  posts.push(newPost);
  res.status(201).json(newPost);
});
```

### 3. Make Requests to Generate Schemas

The middleware captures request/response data and infers schemas:

```bash
# This request will generate a schema for GET /posts
curl http://localhost:3002/posts

# This request will generate schemas for POST /posts request + response
curl -X POST http://localhost:3002/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is the content",
    "author": "Alice",
    "tags": ["tutorial", "nodejs"],
    "published": true
  }'
```

### 4. View Generated Schemas

Check `./data/snapshots/` for captured schemas:

```json
{
  "hash": "a1b2c3d4e5f6g7h8",
  "timestamp": "2024-03-15T10:30:00.000Z",
  "method": "POST",
  "path": "/posts",
  "statusCode": 201,
  "requestSchema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "content": { "type": "string" },
      "author": { "type": "string" },
      "tags": {
        "type": "array",
        "items": { "type": "string" }
      },
      "published": { "type": "boolean" }
    }
  },
  "responseSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "number" },
      "title": { "type": "string" },
      "content": { "type": "string" },
      "author": { "type": "string" },
      "tags": { "type": "array", "items": { "type": "string" } },
      "published": { "type": "boolean" },
      "createdAt": { "type": "string" }
    }
  }
}
```

### 5. Schemas Auto-Populate Swagger UI

The generated OpenAPI spec automatically includes inferred schemas:

```javascript
const snapshots = snapshotStorage.getAll();
for (const [key, snapshotList] of Object.entries(snapshots)) {
  const [method, path] = key.split(' ');
  const latestSnapshot = snapshotList[snapshotList.length - 1];

  // Enhance OpenAPI spec with runtime schemas
  operation.requestBody = {
    content: {
      'application/json': {
        schema: latestSnapshot.requestSchema,
      },
    },
  };
}
```

## Example Usage

### Get all posts
```bash
curl http://localhost:3002/posts
```

### Filter published posts
```bash
curl "http://localhost:3002/posts?published=true"
```

### Filter by author
```bash
curl "http://localhost:3002/posts?author=Jane"
```

### Filter by tag
```bash
curl "http://localhost:3002/posts?tag=nodejs"
```

### Get post by ID
```bash
curl http://localhost:3002/posts/1
```

### Create new post
```bash
curl -X POST http://localhost:3002/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learning OpenAPI",
    "content": "OpenAPI makes API documentation easy!",
    "author": "Bob Johnson",
    "tags": ["openapi", "documentation"],
    "published": false
  }'
```

### Update post
```bash
curl -X PUT http://localhost:3002/posts/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "published": true
  }'
```

### Delete post
```bash
curl -X DELETE http://localhost:3002/posts/3
```

### Get statistics
```bash
curl http://localhost:3002/stats
```

### Publish a draft
```bash
curl -X POST http://localhost:3002/posts/2/publish
```

## Snapshot Storage Features

### Deduplication
Snapshots are hashed (SHA-256) to prevent storing duplicate schemas:

```javascript
// Same request/response structure = same hash
// Only one snapshot stored, others ignored
```

### Persistence
Snapshots persist across server restarts:

```bash
ls -la data/snapshots/
# GET_posts.json
# POST_posts.json
# PUT_posts_id.json
# ...
```

### Sanitization
Sensitive fields are automatically masked:

```javascript
const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];

// Before: { password: 'secret123' }
// After:  { password: '***REDACTED***' }
```

## Production Considerations

⚠️ **Runtime capture is designed for development environments only!**

### Disable in Production

```javascript
app.use(
  runtimeCapture({
    enabled: process.env.NODE_ENV !== 'production',
    storage: snapshotStorage,
  })
);
```

### Performance Impact
- Adds ~1-5ms latency per request for schema inference
- Negligible for dev/staging; disable for production traffic

### Security
- Always enable `sanitize: true` to mask sensitive data
- Never capture authentication tokens or PII in production
- Review snapshots before committing to version control

## Key Concepts

- **Runtime Capture**: Middleware intercepts requests/responses to infer schemas
- **Schema Inference**: Recursive type detection from JavaScript values
- **Snapshot Storage**: File-based persistence with SHA-256 deduplication
- **Sanitization**: Automatic masking of sensitive field names
- **Dev-Time Only**: Designed for development, not production traffic
- **Zero Config**: No annotations required, works with existing APIs

## Benefits

- 🚀 **Fastest Onboarding**: Add middleware, start server, make requests
- 📊 **Real Data**: Schemas reflect actual API behavior, not assumptions
- 🔄 **Legacy Apps**: Document existing APIs without refactoring
- 🧪 **Testing Aid**: Capture test request/response for validation
- 📝 **Living Docs**: Swagger UI updates as API evolves

## Limitations

- **Type Inference**: Only infers from observed data (e.g., optional fields might be missed)
- **Validation**: No runtime validation (use Joi/Zod for that)
- **Production**: Not recommended for high-traffic environments
- **Nullable Fields**: May not detect all nullable fields without multiple samples

## Combining Strategies

You can mix runtime capture with decorators or JSDoc:

```javascript
// Use decorators for primary docs
@Route({ summary: 'Get all posts' })
getAllPosts(req, res) { ... }

// Runtime capture fills in missing schemas
app.use(runtimeCapture({ enabled: true }));
```

## Next Steps

- Make API requests and watch schemas appear in `data/snapshots/`
- Check Swagger UI to see inferred schemas in action
- Try the decorator-example for explicit schema definition
- Try the jsdoc-example for comment-based docs
- Explore combining all three strategies for comprehensive coverage
