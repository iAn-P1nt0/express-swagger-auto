# Phase 3: Advanced Parsing - Design Document

## Overview

Phase 3 focuses on implementing advanced parsing capabilities to automatically extract OpenAPI metadata from code without manual route metadata definitions. The three main components are:

1. **JSDoc Parser**: Extract OpenAPI metadata from JSDoc comments
2. **Enhanced Decorators**: Improve decorator metadata composition and inheritance
3. **Type Inference Engine**: Automatically infer schemas from TypeScript types and runtime examples

## Goals

- **Definition of Done (from CLAUDE.md)**:
  - AST tooling for code analysis
  - Decorator system with metadata composition
  - Example + type inference engine
  - Full JSDoc parser with YAML payload extraction
  - Zero manual route metadata in examples

## 1. JSDoc Parser Architecture

### Strategy

Parse JSDoc comments from source files to extract OpenAPI metadata. Two approaches:

**Approach A: AST-based (Recommended)**
- Use `@babel/parser` or `typescript` compiler API to parse source files
- Extract JSDoc comments from AST nodes
- Use `doctrine` or `comment-parser` to parse JSDoc structure
- Match JSDoc blocks to route handlers via location/function name

**Approach B: Regex-based**
- Simpler but fragile
- Won't handle complex cases (nested functions, class methods)
- Not recommended for production use

### Libraries to Evaluate

1. **doctrine** (ESLint's JSDoc parser)
   - Mature, widely used
   - Parses JSDoc tags into structured data
   - Supports custom tags

2. **comment-parser**
   - More modern, actively maintained
   - Better TypeScript support
   - Flexible tag parsing

3. **@babel/parser**
   - Full JavaScript/TypeScript parser
   - Can extract comments with location info
   - Large dependency

4. **typescript compiler API**
   - Native TypeScript support
   - Can get JSDoc from nodes
   - Heavy dependency but already used

### JSDoc Tag Format

Support standard OpenAPI tags plus custom syntax:

```javascript
/**
 * @openapi
 * @route GET /users/{id}
 * @summary Get user by ID
 * @description Retrieves a single user from the database
 * @tags users
 * @param {string} id.path.required - User ID
 * @param {number} [limit=10].query - Results limit
 * @response 200 - User found
 * @response 404 - User not found
 */
```

Alternative YAML format (Phase 3 extension):

```javascript
/**
 * @openapi
 * GET /users/{id}:
 *   summary: Get user by ID
 *   tags: [users]
 *   parameters:
 *     - name: id
 *       in: path
 *       required: true
 */
```

### Implementation Steps

1. **File Scanner**: Recursively find JavaScript/TypeScript files
2. **AST Parser**: Parse files and extract JSDoc comments
3. **Comment Matcher**: Match JSDoc to route handlers
4. **Metadata Transformer**: Convert JSDoc to RouteMetadata
5. **Schema Referencer**: Link validator schemas mentioned in JSDoc
6. **Integration**: Wire into RouteDiscovery

## 2. Enhanced Decorator System

### Current Limitations

- No metadata inheritance (base class decorators not inherited)
- No composition (can't combine decorators)
- No conditional metadata (can't vary by environment)

### Enhancements

**A. Metadata Inheritance**
```typescript
class BaseController {
  @Route({ tags: ['api'] })
  baseMethod() {}
}

class UserController extends BaseController {
  @Route({ summary: 'Get users' })
  // Should inherit tags: ['api']
  getUsers() {}
}
```

**B. Metadata Composition**
```typescript
const AuthRequired = () => (target, key, descriptor) => {
  // Add security scheme to existing metadata
};

class UserController {
  @Route({ summary: 'Get users' })
  @AuthRequired()
  getUsers() {}
}
```

**C. Conditional Metadata**
```typescript
@Route({
  summary: 'Get users',
  responses: {
    200: { description: 'Success' },
    ...(process.env.NODE_ENV === 'development' && {
      500: { description: 'Debug info' }
    })
  }
})
```

### Implementation

1. Create decorator factory helper: `composeMetadata()`
2. Implement metadata merging strategy (deep merge vs shallow)
3. Add reflection helpers for inheritance
4. Update decorator tests

## 3. Type Inference Engine

### Goals

Automatically infer OpenAPI schemas from:
- TypeScript interfaces/types
- Zod/Joi/Yup schemas
- Runtime example values
- Express request/response objects

### Strategies

**A. TypeScript Type Inference**

Use `typescript` compiler API to extract type information:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

app.get('/users', (req, res: Response<User[]>) => {
  // Infer response schema from Response<User[]>
});
```

**B. Runtime Example Inference**

Enhance existing runtime capture to build comprehensive examples:

```typescript
// After multiple requests with different field combinations
{
  "type": "object",
  "properties": {
    "id": { "type": "number", "example": 1 },
    "name": { "type": "string", "example": "Alice" },
    "email": { "type": "string", "example": "alice@example.com" }
  }
}
```

**C. Validator Schema Detection**

Automatically detect validator schemas in handler code:

```javascript
app.post('/users', (req, res) => {
  const userSchema = z.object({
    name: z.string(),
    email: z.string().email()
  });

  const user = userSchema.parse(req.body); // Auto-detect this pattern
  // ...
});
```

### Implementation

1. Create `TypeInferenceEngine` class
2. Implement TypeScript type walker
3. Enhance runtime inference with example merging
4. Add code analysis for inline validator schemas
5. Create schema confidence scoring (how certain we are)

## 4. Integration Architecture

### File Structure

```
src/
  parsers/
    JsDocParser.ts          # Main JSDoc parser
    AstWalker.ts            # AST traversal utilities
    CommentExtractor.ts     # Extract comments from AST
    MetadataTransformer.ts  # JSDoc -> RouteMetadata
  inference/
    TypeInferenceEngine.ts  # TypeScript type inference
    ExampleMerger.ts        # Merge runtime examples
    SchemaAnalyzer.ts       # Detect inline schemas
  decorators/
    composition.ts          # Decorator composition helpers
    inheritance.ts          # Metadata inheritance
```

### RouteDiscovery Enhancement

Update RouteDiscovery to support multiple metadata sources:

```typescript
class RouteDiscovery {
  private jsDocParser?: JsDocParser;
  private typeInference?: TypeInferenceEngine;

  discover(app: ExpressApp, options?: DiscoveryOptions): RouteMetadata[] {
    const routes = this.extractRoutes(app);

    if (options?.enableJsDocParsing) {
      this.enhanceWithJsDoc(routes, options.sourceFiles);
    }

    if (options?.enableTypeInference) {
      this.enhanceWithTypes(routes, options.tsconfigPath);
    }

    return routes;
  }
}
```

## 5. Testing Strategy

### Unit Tests

- **JsDocParser.test.ts**: 20+ tests for various JSDoc formats
- **TypeInferenceEngine.test.ts**: 15+ tests for type inference
- **MetadataComposition.test.ts**: 10+ tests for decorator composition
- **ExampleMerger.test.ts**: 10+ tests for example merging

### Integration Tests

- **jsdoc-integration.test.ts**: End-to-end JSDoc parsing
- **type-inference-integration.test.ts**: TypeScript type extraction
- **hybrid-strategy.test.ts**: Combining multiple strategies

### Fixtures

Create fixture files under `test/fixtures/`:
- `jsdoc-examples.js` - Various JSDoc comment styles
- `typescript-types.ts` - TypeScript interfaces and types
- `inline-validators.js` - Code with inline validation

## 6. Performance Considerations

### Targets (from CLAUDE.md)

- Route discovery: O(n) relative to layer count
- Spec generation: <50ms for 100 routes
- File parsing: <200ms for 50 files

### Optimizations

1. **Lazy Parsing**: Only parse files when needed
2. **Caching**: Cache parsed AST and metadata
3. **Parallel Processing**: Parse multiple files concurrently
4. **Incremental Updates**: Re-parse only changed files

## 7. Security Considerations

- Never execute code during parsing (static analysis only)
- Validate JSDoc tag values (prevent injection)
- Sanitize example values from runtime capture
- Limit AST traversal depth (prevent DoS)

## 8. Migration Path

### For Existing Users

**jsdoc-example update**:
```javascript
// Before (Phase 2): Manual route metadata
const routes = [
  { method: 'GET', path: '/users', metadata: { ... } }
];

// After (Phase 3): Automatic JSDoc parsing
const discovery = new RouteDiscovery();
const routes = discovery.discover(app, {
  enableJsDocParsing: true,
  sourceFiles: ['./src/**/*.js']
});
```

### Backward Compatibility

- Manual route metadata still supported (fallback)
- JSDoc parsing opt-in via flag
- No breaking changes to existing APIs

## 9. Dependencies to Add

```json
{
  "dependencies": {
    "comment-parser": "^1.4.1",
    "glob": "^10.3.10"
  },
  "devDependencies": {
    "@babel/parser": "^7.23.9",
    "@types/babel__core": "^7.20.5"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "peerDependenciesMeta": {
    "typescript": {
      "optional": true
    }
  }
}
```

## 10. Success Metrics

Phase 3 complete when:

- ✅ JSDoc parser handles 95% of OpenAPI tags
- ✅ TypeScript type inference works for common patterns
- ✅ jsdoc-example uses automatic parsing (no manual metadata)
- ✅ All tests pass with >85% coverage
- ✅ Performance budgets met (<50ms for 100 routes)
- ✅ Documentation updated with JSDoc examples
- ✅ Migration guide published

## 11. Timeline Estimate

- **Week 1**: JSDoc parser implementation
- **Week 2**: Type inference engine
- **Week 3**: Decorator enhancements
- **Week 4**: Integration, testing, documentation

## Next Steps

1. Install required dependencies
2. Implement JsDocParser with comment-parser
3. Create test fixtures
4. Wire into RouteDiscovery
5. Update jsdoc-example
6. Comprehensive testing
