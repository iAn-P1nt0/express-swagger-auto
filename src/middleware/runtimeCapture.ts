import type { Request, Response, NextFunction } from 'express';

export interface RuntimeCaptureConfig {
  enabled?: boolean;
  sensitiveFields?: string[];
  maxBodySize?: number;
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
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enabled) {
      next();
      return;
    }

    // Phase 1: Basic runtime capture framework
    // TODO(Phase 2): Store captured data for schema inference
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

      storeCapturedData(capturedData);

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

function storeCapturedData(data: any): void {
  // Phase 2: Implement persistent storage for runtime samples
  // TODO(Phase 2): Write to data/runtime-snapshots/*.json with hashing
  // TODO(Phase 3): Implement schema inference from captured samples
  if (process.env.DEBUG) {
    console.warn('[RuntimeCapture]', JSON.stringify(data, null, 2));
  }
}
