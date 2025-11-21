import type { Request, Response, NextFunction, Router, Application } from 'express';

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
}

export interface OpenAPIPath {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
}

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: OpenAPISchema }>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema: OpenAPISchema }>;
}

export interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  description?: string;
  format?: string;
  enum?: unknown[];
  example?: unknown;
  default?: unknown;
  $ref?: string;
  allOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}

export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: Record<string, Record<string, OpenAPIPath>>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}

export interface RouteMetadata {
  method: string;
  path: string;
  handler: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
  metadata?: {
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: OpenAPIParameter[];
    requestBody?: OpenAPIRequestBody;
    responses?: Record<string, OpenAPIResponse>;
  };
}

export interface GeneratorConfig {
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  specVersion?: '3.0.0' | '3.1.0';
  enableRuntimeCapture?: boolean;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
  outputPath?: string;
}

export interface ValidatorAdapter {
  name: string;
  detect: (schema: unknown) => boolean;
  convert: (schema: unknown) => OpenAPISchema;
}

export type ExpressApp = Application | Router;
