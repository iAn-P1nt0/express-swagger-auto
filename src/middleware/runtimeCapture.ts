import type { Request, Response, NextFunction } from 'express';
import { SnapshotStorage } from '../core/SnapshotStorage';

export interface RuntimeCaptureConfig {
  enabled?: boolean;
  sensitiveFields?: string[];
  maxBodySize?: number;
  snapshotStorage?: SnapshotStorage;
}

const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
];

export function runtimeCapture(config: RuntimeCaptureConfig = {}) {
  const {
    enabled = process.env.NODE_ENV === 'development',
    sensitiveFields = DEFAULT_SENSITIVE_FIELDS,
    maxBodySize = 1024 * 100,
    snapshotStorage,
  } = config;

  // Create default snapshot storage if not provided
  const storage = snapshotStorage || new SnapshotStorage({ enabled });

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enabled) {
      next();
      return;
    }

    // Phase 2: Enhanced runtime capture with snapshot storage
    // TODO(Phase 3): Implement sample aggregation and drift analysis
    // TODO(Phase 4): Add hot reload and watch mode integration

    const capturedData = {
      method: req.method,
      path: req.path,
      query: sanitizeObject(req.query, sensitiveFields),
      headers: sanitizeObject(req.headers, sensitiveFields),
      body: captureBody(req.body, maxBodySize, sensitiveFields),
      timestamp: new Date().toISOString(),
    };

    const originalSend = res.send.bind(res);
    res.send = function (body: any) {
      (capturedData as any).response = {
        statusCode: res.statusCode,
        body: captureBody(body, maxBodySize, sensitiveFields),
      };

      // Store snapshot with inferred schemas
      storeCapturedData(capturedData, storage);

      return originalSend(body);
    };

    next();
  };
}

function sanitizeObject(
  obj: Record<string, any> | undefined,
  sensitiveFields: string[]
): Record<string, any> {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function captureBody(body: any, maxSize: number, sensitiveFields: string[]): any {
  if (!body) {
    return undefined;
  }

  let serialized: string;
  try {
    serialized = typeof body === 'string' ? body : JSON.stringify(body);
  } catch {
    return '[Non-serializable data]';
  }

  if (serialized.length > maxSize) {
    serialized = serialized.substring(0, maxSize) + '...[truncated]';
  }

  let parsed: any;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return serialized;
  }

  return typeof parsed === 'object' ? sanitizeObject(parsed, sensitiveFields) : parsed;
}

function storeCapturedData(data: any, storage: SnapshotStorage): void {
  // Phase 2: Store runtime samples with schema inference
  try {
    const requestSchema = inferSchema(data.body);
    const responseSchema = inferSchema(data.response?.body);

    storage.store({
      method: data.method,
      path: data.path,
      requestSchema,
      responseSchema,
    });
  } catch (error) {
    if (process.env.DEBUG) {
      console.error('[RuntimeCapture] Failed to store snapshot:', error);
    }
  }
}

function inferSchema(data: any): any {
  // Phase 2: Basic schema inference from runtime data
  // TODO(Phase 3): Enhanced type inference with union types and advanced patterns

  if (data === null || data === undefined) {
    return null;
  }

  const type = typeof data;

  switch (type) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object': {
      if (Array.isArray(data)) {
        const itemSchema = data.length > 0 ? inferSchema(data[0]) : {};
        return {
          type: 'array',
          items: itemSchema,
        };
      }

      const properties: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        properties[key] = inferSchema(value);
      }

      return {
        type: 'object',
        properties,
      };
    }
    default:
      return { type: 'object' };
  }
}
