/**
 * Security Test Utilities
 *
 * Helper functions for security testing
 */

import type { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';

/**
 * Create a mock Express request with security test defaults
 */
export function createSecurityMockRequest(
  overrides: Partial<Request> = {}
): Request {
  return {
    method: 'GET',
    path: '/test',
    query: {},
    headers: {},
    body: {},
    params: {},
    url: '/test',
    originalUrl: '/test',
    baseUrl: '',
    ...overrides,
  } as Request;
}

/**
 * Create a mock Express response for security testing
 */
export function createSecurityMockResponse(): Response {
  const res: Partial<Response> = {
    statusCode: 200,
    send: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

/**
 * Create a tracked mock next function
 */
export function createTrackedNext(): NextFunction & {
  wasCalled: () => boolean;
  getError: () => Error | undefined;
  reset: () => void;
} {
  let called = false;
  let error: Error | undefined;

  const next = vi.fn((err?: Error) => {
    called = true;
    error = err;
  }) as NextFunction & {
    wasCalled: () => boolean;
    getError: () => Error | undefined;
    reset: () => void;
  };

  next.wasCalled = () => called;
  next.getError = () => error;
  next.reset = () => {
    called = false;
    error = undefined;
    (next as any).mockClear();
  };

  return next;
}

/**
 * Check if a string contains potential injection patterns
 */
export function detectInjectionPatterns(input: string): {
  hasSqlInjection: boolean;
  hasXss: boolean;
  hasCommandInjection: boolean;
  hasPathTraversal: boolean;
  hasHeaderInjection: boolean;
} {
  return {
    hasSqlInjection: /('|"|;|--|\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b)/i.test(
      input
    ),
    hasXss: /(<script|javascript:|on\w+=|<iframe|<svg|<img.*onerror)/i.test(input),
    hasCommandInjection: /(;|\||`|\$\(|&&|\|\||>|<|\\n|\\r)/i.test(input),
    hasPathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f)/i.test(input),
    hasHeaderInjection: /(\r\n|\n|\r|%0d%0a|%0a|%0d)/i.test(input),
  };
}

/**
 * Sanitize input for safe logging/display
 */
export function sanitizeForLogging(input: any): string {
  if (input === null) return 'null';
  if (input === undefined) return 'undefined';
  if (typeof input !== 'string') {
    try {
      input = JSON.stringify(input);
    } catch {
      return '[Non-serializable]';
    }
  }

  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 1000); // Truncate to reasonable length
}

/**
 * Check if a value contains only safe characters
 */
export function isSafeString(input: string): boolean {
  // Allow alphanumeric, spaces, and common punctuation
  return /^[\w\s.,!?@#$%^&*()_+=\[\]{}|\\:;"'<>,.?/~`-]*$/.test(input);
}

/**
 * Validate path doesn't contain traversal attempts
 */
export function isPathSafe(path: string): boolean {
  // Normalize path separators
  const normalizedPath = path.replace(/\\/g, '/');

  // Check for traversal patterns
  const traversalPatterns = [
    '../',
    '..\\',
    '%2e%2e',
    '%252e',
    '..%2f',
    '..%5c',
    '%c0%ae',
    '%c0%af',
    '/etc/',
    '/proc/',
    '/var/',
    'C:\\',
    'C:/',
    // Additional patterns for symlinks and dev paths
    '/dev/',
    '/root/',
    // Double-encoded patterns
    '%252e%252e',
    '..%255c',
    // Overlong UTF-8
    '%e0%80%af',
  ];

  // Absolute Unix paths starting with /etc, /proc, /var, /dev, /root
  if (/^\/(etc|proc|var|dev|root)/.test(normalizedPath)) {
    return false;
  }

  return !traversalPatterns.some(
    (pattern) =>
      normalizedPath.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Check if headers are safe from injection
 */
export function areHeadersSafe(headers: Record<string, string>): boolean {
  for (const [key, value] of Object.entries(headers)) {
    // Check for CRLF injection
    if (/[\r\n]/.test(key) || /[\r\n]/.test(value)) {
      return false;
    }

    // Check for null bytes
    if (/\x00/.test(key) || /\x00/.test(value)) {
      return false;
    }

    // Check for encoded CRLF
    if (/%0[ad]/i.test(key) || /%0[ad]/i.test(value)) {
      return false;
    }
  }

  return true;
}

/**
 * Test helper to verify sensitive data is masked
 */
export function verifySensitiveDataMasked(
  data: any,
  sensitiveFields: string[],
  maskPattern: RegExp = /\*{3,}|REDACTED/
): { allMasked: boolean; unmaskeedFields: string[] } {
  const unmaskedFields: string[] = [];

  function checkObject(obj: any, path: string = ''): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        if (typeof value === 'string' && !maskPattern.test(value)) {
          unmaskedFields.push(currentPath);
        }
      }

      if (typeof value === 'object' && value !== null) {
        checkObject(value, currentPath);
      }
    }
  }

  checkObject(data);

  return {
    allMasked: unmaskedFields.length === 0,
    unmaskeedFields: unmaskedFields,
  };
}

/**
 * Generate test variations for security testing
 */
export function generateTestVariations<T>(
  baseValue: T,
  variations: Array<(value: T) => T>
): T[] {
  return variations.map((variation) => variation(baseValue));
}

/**
 * Create timing-safe comparison function
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check content type validation
 */
export function isValidContentType(
  contentType: string | undefined,
  allowed: string[]
): boolean {
  if (!contentType) return false;

  const normalizedContentType = contentType.toLowerCase().split(';')[0].trim();
  return allowed.some(
    (allowed) => normalizedContentType === allowed.toLowerCase()
  );
}

/**
 * Memory usage tracker for performance tests
 */
export function getMemoryUsage(): { heapUsed: number; heapTotal: number; rss: number } {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
  };
}

/**
 * Create a rate limiting test helper
 */
export function createRateLimiter(limit: number, windowMs: number): {
  checkLimit: () => boolean;
  reset: () => void;
  getCount: () => number;
} {
  let count = 0;
  let resetTime = Date.now() + windowMs;

  return {
    checkLimit: () => {
      const now = Date.now();
      if (now >= resetTime) {
        count = 0;
        resetTime = now + windowMs;
      }
      count++;
      return count <= limit;
    },
    reset: () => {
      count = 0;
      resetTime = Date.now() + windowMs;
    },
    getCount: () => count,
  };
}

/**
 * Async test helper with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Generate random string for testing
 */
export function randomString(length: number, charset = 'alphanumeric'): string {
  const charsets: Record<string, string> = {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    hex: '0123456789abcdef',
  };

  const chars = charsets[charset] || charsets.alphanumeric;
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}
