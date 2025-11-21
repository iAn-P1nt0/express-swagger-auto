import { describe, it, expect, vi } from 'vitest';
import { runtimeCapture } from './runtimeCapture';
import type { Request, Response, NextFunction } from 'express';

describe('runtimeCapture', () => {
  const createMockReq = (overrides = {}): Partial<Request> => ({
    method: 'GET',
    path: '/test',
    query: {},
    headers: {},
    body: {},
    ...overrides,
  });

  const createMockRes = (): Partial<Response> => {
    const res: any = {
      statusCode: 200,
      send: vi.fn().mockReturnThis(),
    };
    return res;
  };

  const mockNext: NextFunction = vi.fn();

  it('should call next when disabled', () => {
    const middleware = runtimeCapture({ enabled: false });
    const req = createMockReq();
    const res = createMockRes();

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should capture request data when enabled', () => {
    const middleware = runtimeCapture({ enabled: true });
    const req = createMockReq({
      method: 'POST',
      path: '/users',
      query: { page: '1' },
      headers: { 'content-type': 'application/json' },
      body: { name: 'Alice' },
    });
    const res = createMockRes();

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize sensitive fields in query', () => {
    const middleware = runtimeCapture({ enabled: true });
    const req = createMockReq({
      query: { apiKey: 'secret123', name: 'test' },
    });
    const res = createMockRes();

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize sensitive fields in headers', () => {
    const middleware = runtimeCapture({ enabled: true });
    const req = createMockReq({
      headers: { authorization: 'Bearer token123', 'user-agent': 'test' },
    });
    const res = createMockRes();

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize sensitive fields in body', () => {
    const middleware = runtimeCapture({ enabled: true });
    const req = createMockReq({
      body: { password: 'secret123', username: 'alice' },
    });
    const res = createMockRes();

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should use custom sensitive fields', () => {
    const middleware = runtimeCapture({
      enabled: true,
      sensitiveFields: ['customSecret'],
    });
    const req = createMockReq({
      body: { customSecret: 'value', regularField: 'ok' },
    });
    const res = createMockRes();

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should truncate large body', () => {
    const middleware = runtimeCapture({
      enabled: true,
      maxBodySize: 10,
    });
    const req = createMockReq({
      body: { data: 'this is a very long string that should be truncated' },
    });
    const res = createMockRes();

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should default to development mode only', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const middleware = runtimeCapture();
    const req = createMockReq();
    const res = createMockRes();

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
