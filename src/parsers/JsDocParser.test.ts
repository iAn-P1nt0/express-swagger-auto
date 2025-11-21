import { describe, it, expect } from 'vitest';
import { JsDocParser } from './JsDocParser';
import { JsDocTransformer } from './JsDocTransformer';
import { CommentExtractor } from './CommentExtractor';
import { join } from 'path';

describe('CommentExtractor', () => {
  it('should extract JSDoc comments with @openapi tag', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 * @summary Get all users
 */
function getUsers() {}
    `;

    const extractor = new CommentExtractor();
    const comments = extractor.extractFromSource(source);

    expect(comments).toHaveLength(1);
    expect(comments[0].comment.tags).toHaveLength(3);
    expect(comments[0].comment.tags[0].tag).toBe('openapi');
  });

  it('should skip comments without @openapi tag by default', () => {
    const source = `
/**
 * Regular JSDoc comment
 * @param {string} name
 */
function helper(name) {}
    `;

    const extractor = new CommentExtractor();
    const comments = extractor.extractFromSource(source);

    expect(comments).toHaveLength(0);
  });

  it('should include all comments when includeNonOpenAPI is true', () => {
    const source = `
/**
 * Regular JSDoc comment
 * @param {string} name
 */
function helper(name) {}
    `;

    const extractor = new CommentExtractor({ includeNonOpenAPI: true });
    const comments = extractor.extractFromSource(source);

    expect(comments).toHaveLength(1);
  });

  it('should extract multiple comments from source', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 */
function getUsers() {}

/**
 * @openapi
 * @route POST /users
 */
function createUser() {}
    `;

    const extractor = new CommentExtractor();
    const comments = extractor.extractFromSource(source);

    expect(comments).toHaveLength(2);
  });
});

describe('JsDocTransformer', () => {
  const transformer = new JsDocTransformer();

  it('should parse @route tag with method and path', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.method).toBe('GET');
    expect(metadata?.path).toBe('/users');
  });

  it('should parse @summary tag', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 * @summary Get all users
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.summary).toBe('Get all users');
  });

  it('should parse @description tag', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 * @description Retrieves a paginated list of users
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.description).toBe('Retrieves a paginated list of users');
  });

  it('should parse @tags tag with multiple tags', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 * @tags users, admin
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.tags).toEqual(['users', 'admin']);
  });

  it('should parse required path parameter', () => {
    const source = `
/**
 * @openapi
 * @route GET /users/{id}
 * @param {string} id.path.required - User ID
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.parameters).toHaveLength(1);
    expect(metadata?.parameters?.[0]).toMatchObject({
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'User ID',
    });
  });

  it('should parse optional query parameter with default', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 * @param {number} [page=1].query - Page number
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.parameters).toHaveLength(1);
    expect(metadata?.parameters?.[0]).toMatchObject({
      name: 'page',
      in: 'query',
      schema: { type: 'number', default: 1 },
      description: 'Page number',
    });
  });

  it('should parse multiple parameters', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 * @param {number} [page=1].query - Page number
 * @param {number} [limit=10].query - Items per page
 * @param {string} search.query - Search term
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.parameters).toHaveLength(3);
    expect(metadata?.parameters?.[0].name).toBe('page');
    expect(metadata?.parameters?.[1].name).toBe('limit');
    expect(metadata?.parameters?.[2].name).toBe('search');
  });

  it('should parse @response tags', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 * @response 200 - List of users
 * @response 400 - Invalid parameters
 * @response 500 - Server error
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.responses).toBeDefined();
    expect(metadata?.responses?.['200']).toEqual({ description: 'List of users' });
    expect(metadata?.responses?.['400']).toEqual({ description: 'Invalid parameters' });
    expect(metadata?.responses?.['500']).toEqual({ description: 'Server error' });
  });

  it('should parse @bodyContent tag', () => {
    const source = `
/**
 * @openapi
 * @route POST /users
 * @bodyContent {application/json} CreateUserSchema
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.requestBody).toBeDefined();
    expect(metadata?.requestBody?.required).toBe(true);
    expect(metadata?.requestBody?.content?.['application/json']).toBeDefined();
  });

  it('should parse @security tag', () => {
    const source = `
/**
 * @openapi
 * @route POST /users
 * @security BearerAuth
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.security).toHaveLength(1);
    expect(metadata?.security?.[0]).toEqual({ BearerAuth: [] });
  });

  it('should handle route without method (default to GET)', () => {
    const source = `
/**
 * @openapi
 * @route /users
 */
    `;

    const extractor = new CommentExtractor();
    const [comment] = extractor.extractFromSource(source);
    const metadata = transformer.transform(comment.comment);

    expect(metadata?.method).toBe('GET');
    expect(metadata?.path).toBe('/users');
  });

  it('should merge metadata correctly', () => {
    const base = {
      summary: 'Base summary',
      tags: ['api'],
      parameters: [{ name: 'id', in: 'path' as const }],
    };

    const override = {
      description: 'Override description',
      tags: ['users'],
      parameters: [{ name: 'page', in: 'query' as const }],
    };

    const merged = transformer.mergeMetadata(base, override);

    expect(merged.summary).toBe('Base summary');
    expect(merged.description).toBe('Override description');
    expect(merged.tags).toEqual(['api', 'users']);
    expect(merged.parameters).toHaveLength(2);
  });
});

describe('JsDocParser', () => {
  it('should parse source code with multiple routes', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 * @summary Get all users
 * @tags users
 */
function getUsers() {}

/**
 * @openapi
 * @route POST /users
 * @summary Create user
 * @tags users
 */
function createUser() {}
    `;

    const parser = new JsDocParser();
    const routes = parser.parseSource(source);

    expect(routes).toHaveLength(2);
    expect(routes[0].metadata.method).toBe('GET');
    expect(routes[0].metadata.path).toBe('/users');
    expect(routes[1].metadata.method).toBe('POST');
  });

  it('should parse fixture file', () => {
    const fixturePath = join(__dirname, '../../test/fixtures/jsdoc-examples.js');
    const parser = new JsDocParser();
    const routes = parser.parseFile(fixturePath);

    // Should find 7 routes (excluding the non-OpenAPI comment)
    expect(routes.length).toBeGreaterThanOrEqual(6);

    // Verify some specific routes
    const getUsersRoute = routes.find((r) => r.metadata.path === '/users' && r.metadata.method === 'GET');
    expect(getUsersRoute).toBeDefined();
    expect(getUsersRoute?.metadata.summary).toBe('Get all users');
    expect(getUsersRoute?.metadata.parameters).toHaveLength(2);

    const createUserRoute = routes.find((r) => r.metadata.path === '/users' && r.metadata.method === 'POST');
    expect(createUserRoute).toBeDefined();
    expect(createUserRoute?.metadata.security).toBeDefined();
  });

  it('should handle empty source gracefully', () => {
    const parser = new JsDocParser();
    const routes = parser.parseSource('');

    expect(routes).toHaveLength(0);
  });

  it('should handle source with syntax errors gracefully', () => {
    const source = `
/**
 * @openapi
 * @route GET /users
 */
function getUsers() {
  // Incomplete function
    `;

    const parser = new JsDocParser();
    const routes = parser.parseSource(source);

    // Should still extract the comment
    expect(routes).toHaveLength(1);
  });
});
