const express = require('express');
const {
  RouteDiscovery,
  SpecGenerator,
  createSwaggerUIMiddleware,
  runtimeCapture,
  SnapshotStorage,
} = require('express-swagger-auto');

const app = express();
app.use(express.json());

// Initialize snapshot storage for persisting captured schemas
const snapshotStorage = new SnapshotStorage({
  outputDir: './data/snapshots',
  enabled: true,
});

// Enable runtime capture middleware
// This will automatically infer schemas from request/response payloads
app.use(
  runtimeCapture({
    enabled: true,
    storage: snapshotStorage,
    sanitize: true, // Mask sensitive fields (password, token, apiKey, etc.)
  })
);

// In-memory blog post store
const posts = [
  {
    id: 1,
    title: 'Getting Started with Express',
    content: 'Express is a minimal and flexible Node.js web application framework...',
    author: 'Jane Doe',
    tags: ['nodejs', 'express', 'tutorial'],
    published: true,
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: 2,
    title: 'Understanding Middleware',
    content: 'Middleware functions are functions that have access to the request object...',
    author: 'John Smith',
    tags: ['express', 'middleware', 'nodejs'],
    published: true,
    createdAt: new Date('2024-02-20').toISOString(),
  },
  {
    id: 3,
    title: 'REST API Best Practices',
    content: 'When designing REST APIs, there are several best practices to follow...',
    author: 'Jane Doe',
    tags: ['rest', 'api', 'best-practices'],
    published: false,
    createdAt: new Date('2024-03-10').toISOString(),
  },
];

let nextId = 4;

// GET /posts - Get all posts
app.get('/posts', (req, res) => {
  const { published, author, tag } = req.query;

  let filtered = posts;

  if (published !== undefined) {
    const isPublished = published === 'true';
    filtered = filtered.filter((p) => p.published === isPublished);
  }

  if (author) {
    filtered = filtered.filter((p) => p.author.toLowerCase().includes(author.toLowerCase()));
  }

  if (tag) {
    filtered = filtered.filter((p) => p.tags.includes(tag));
  }

  res.json({
    posts: filtered,
    count: filtered.length,
  });
});

// GET /posts/:id - Get post by ID
app.get('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);

  if (!post) {
    return res.status(404).json({
      error: 'NotFound',
      message: `Post with ID ${id} not found`,
    });
  }

  res.json(post);
});

// POST /posts - Create new post
app.post('/posts', (req, res) => {
  const { title, content, author, tags, published } = req.body;

  // Basic validation
  if (!title || !content || !author) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Missing required fields: title, content, author',
    });
  }

  const newPost = {
    id: nextId++,
    title,
    content,
    author,
    tags: tags || [],
    published: published !== undefined ? published : false,
    createdAt: new Date().toISOString(),
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

// PUT /posts/:id - Update post
app.put('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const postIndex = posts.findIndex((p) => p.id === id);

  if (postIndex === -1) {
    return res.status(404).json({
      error: 'NotFound',
      message: `Post with ID ${id} not found`,
    });
  }

  const { title, content, author, tags, published } = req.body;

  // Update only provided fields
  if (title !== undefined) posts[postIndex].title = title;
  if (content !== undefined) posts[postIndex].content = content;
  if (author !== undefined) posts[postIndex].author = author;
  if (tags !== undefined) posts[postIndex].tags = tags;
  if (published !== undefined) posts[postIndex].published = published;

  res.json(posts[postIndex]);
});

// DELETE /posts/:id - Delete post
app.delete('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const postIndex = posts.findIndex((p) => p.id === id);

  if (postIndex === -1) {
    return res.status(404).json({
      error: 'NotFound',
      message: `Post with ID ${id} not found`,
    });
  }

  posts.splice(postIndex, 1);
  res.status(204).send();
});

// GET /stats - Get blog statistics
app.get('/stats', (req, res) => {
  const stats = {
    totalPosts: posts.length,
    publishedPosts: posts.filter((p) => p.published).length,
    draftPosts: posts.filter((p) => !p.published).length,
    authors: [...new Set(posts.map((p) => p.author))],
    allTags: [...new Set(posts.flatMap((p) => p.tags))],
  };

  res.json(stats);
});

// POST /posts/:id/publish - Publish a draft post
app.post('/posts/:id/publish', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);

  if (!post) {
    return res.status(404).json({
      error: 'NotFound',
      message: `Post with ID ${id} not found`,
    });
  }

  if (post.published) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Post is already published',
    });
  }

  post.published = true;
  res.json(post);
});

// Generate OpenAPI spec from discovered routes
const discovery = new RouteDiscovery();
const routes = discovery.discover(app);

const generator = new SpecGenerator({
  info: {
    title: 'Blog API - Runtime Capture Example',
    version: '1.0.0',
    description:
      'Example API demonstrating runtime schema capture and inference. ' +
      'Schemas are automatically generated from actual request/response data.',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3002',
      description: 'Development server',
    },
  ],
});

const spec = generator.generate(routes);

// Enhance spec with runtime-captured schemas
// In Phase 2, this pulls from SnapshotStorage
const snapshots = snapshotStorage.getAllSnapshots();
for (const [key, snapshotList] of snapshots.entries()) {
  const [method, path] = key.split(':');
  const latestSnapshot = snapshotList[snapshotList.length - 1]; // Use most recent

  if (!latestSnapshot) continue;

  // Find matching path in spec
  const specPath = spec.paths?.[path];
  if (!specPath) continue;

  const operation = specPath[method.toLowerCase()];
  if (!operation) continue;

  // Add inferred request schema if available
  if (latestSnapshot.requestSchema && method !== 'GET' && method !== 'DELETE') {
    operation.requestBody = {
      description: 'Inferred from runtime data',
      required: true,
      content: {
        'application/json': {
          schema: latestSnapshot.requestSchema,
        },
      },
    };
  }

  // Add inferred response schema
  const statusCode = latestSnapshot.statusCode?.toString() || '200';
  if (latestSnapshot.responseSchema) {
    operation.responses = operation.responses || {};
    operation.responses[statusCode] = {
      description: operation.responses[statusCode]?.description || 'Success',
      content: {
        'application/json': {
          schema: latestSnapshot.responseSchema,
        },
      },
    };
  }
}

// Mount Swagger UI
app.use(
  createSwaggerUIMiddleware({
    spec,
    routePrefix: '/api-docs',
    customSiteTitle: 'Blog API - Runtime Capture Example',
  })
);

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  console.log(`OpenAPI spec available at http://localhost:${PORT}/api-docs.json`);
  console.log('\n🔍 Runtime Schema Capture Enabled');
  console.log('   Snapshots stored in: ./data/snapshots');
  console.log('   Make API requests to see schemas auto-generated!\n');
  console.log('Try these commands:');
  console.log('  curl http://localhost:3002/posts');
  console.log('  curl -X POST http://localhost:3002/posts -H "Content-Type: application/json" \\');
  console.log('    -d \'{"title":"New Post","content":"Content here","author":"Test Author"}\'');
});
