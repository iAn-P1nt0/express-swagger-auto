/**
 * Export command - Export OpenAPI spec to API client formats
 * Supports Postman, Insomnia, Bruno, and Hoppscotch
 */

import type { OpenAPIV3 } from 'openapi-types';

// ============================================================
// Types
// ============================================================

export type ExportFormat = 'postman' | 'insomnia' | 'bruno' | 'hoppscotch';

export interface ExportOptions {
  format: ExportFormat | ExportFormat[];
  output?: string;
  name?: string;
  includeEnv?: boolean;
  variables?: Record<string, string>;
  groupBy?: 'tags' | 'paths' | 'none';
}

export interface ExportResult {
  format: ExportFormat;
  output: string;
  success: boolean;
  error?: string;
}

// ============================================================
// Postman v2.1 Types
// ============================================================

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  description?: string;
}

interface PostmanHeader {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface PostmanQuery {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode: 'raw' | 'formdata' | 'urlencoded' | 'file' | 'graphql';
  raw?: string;
  options?: {
    raw?: {
      language: string;
    };
  };
}

interface PostmanRequest {
  method: string;
  header: PostmanHeader[];
  body?: PostmanBody;
  url: {
    raw: string;
    host: string[];
    path: string[];
    query?: PostmanQuery[];
    variable?: PostmanVariable[];
  };
  description?: string;
}

interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  response?: any[];
  item?: PostmanItem[];
  description?: string;
}

interface PostmanAuth {
  type: string;
  bearer?: { key: string; value: string; type: string }[];
  apikey?: { key: string; value: string; type: string }[];
  basic?: { key: string; value: string; type: string }[];
  oauth2?: { key: string; value: string; type: string }[];
}

interface PostmanCollection {
  info: {
    _postman_id?: string;
    name: string;
    description?: string;
    schema: string;
    version?: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
  auth?: PostmanAuth;
}

interface PostmanEnvironment {
  name: string;
  values: {
    key: string;
    value: string;
    type: string;
    enabled: boolean;
  }[];
}

// ============================================================
// Insomnia v4 Types
// ============================================================

interface InsomniaResource {
  _id: string;
  _type: string;
  parentId: string | null;
  name: string;
  description?: string;
  url?: string;
  method?: string;
  headers?: { name: string; value: string; disabled?: boolean }[];
  body?: {
    mimeType: string;
    text?: string;
  };
  parameters?: { name: string; value: string; disabled?: boolean }[];
  authentication?: any;
  created?: number;
  modified?: number;
}

interface InsomniaExport {
  _type: 'export';
  __export_format: 4;
  __export_date: string;
  __export_source: string;
  resources: InsomniaResource[];
}

// ============================================================
// Bruno Types
// ============================================================

interface BrunoRequest {
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: {
    type: 'json' | 'text' | 'xml' | 'formUrlEncoded' | 'multipartForm' | 'none';
    json?: string;
    text?: string;
  };
  params?: { name: string; value: string; type: 'path' | 'query' }[];
  description?: string;
}

interface BrunoCollection {
  version: string;
  name: string;
  type: 'collection';
  items: BrunoItem[];
}

interface BrunoItem {
  name: string;
  type: 'folder' | 'http-request';
  items?: BrunoItem[];
  request?: BrunoRequest;
}

// ============================================================
// Hoppscotch Types
// ============================================================

interface HoppscotchRequest {
  v: string;
  name: string;
  method: string;
  endpoint: string;
  headers: { key: string; value: string; active: boolean }[];
  params: { key: string; value: string; active: boolean }[];
  body: {
    contentType: string | null;
    body: string | null;
  };
  auth: {
    authType: string;
    authActive: boolean;
  };
  preRequestScript?: string;
  testScript?: string;
}

interface HoppscotchFolder {
  v: number;
  name: string;
  folders: HoppscotchFolder[];
  requests: HoppscotchRequest[];
}

interface HoppscotchCollection {
  v: number;
  name: string;
  folders: HoppscotchFolder[];
  requests: HoppscotchRequest[];
}

// ============================================================
// Utility Functions
// ============================================================

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getBaseUrl(spec: OpenAPIV3.Document): string {
  if (spec.servers && spec.servers.length > 0) {
    return spec.servers[0].url || 'http://localhost:3000';
  }
  return 'http://localhost:3000';
}

function convertPathToPostmanUrl(path: string): string {
  // Convert OpenAPI path params {id} to Postman :id format
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

function convertPathToInsomnia(path: string): string {
  // Insomnia uses {{ variable }} for path params in some contexts
  // but also supports :id format
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

function getRequestBody(
  operation: OpenAPIV3.OperationObject,
  spec: OpenAPIV3.Document
): { contentType: string; example: any } | null {
  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  if (!requestBody || !requestBody.content) return null;

  // Prefer application/json
  const jsonContent = requestBody.content['application/json'];
  if (jsonContent) {
    const schema = jsonContent.schema as OpenAPIV3.SchemaObject;
    const example = jsonContent.example || schema?.example || generateExampleFromSchema(schema, spec);
    return { contentType: 'application/json', example };
  }

  // Fall back to first available content type
  const contentTypes = Object.keys(requestBody.content);
  if (contentTypes.length > 0) {
    const contentType = contentTypes[0];
    const content = requestBody.content[contentType];
    const schema = content.schema as OpenAPIV3.SchemaObject;
    const example = content.example || schema?.example || generateExampleFromSchema(schema, spec);
    return { contentType, example };
  }

  return null;
}

function generateExampleFromSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  spec: OpenAPIV3.Document
): any {
  if (!schema) return {};
  
  // Resolve $ref
  if ('$ref' in schema) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    const resolved = spec.components?.schemas?.[refPath] as OpenAPIV3.SchemaObject;
    return generateExampleFromSchema(resolved, spec);
  }

  const s = schema as OpenAPIV3.SchemaObject;

  if (s.example !== undefined) return s.example;

  switch (s.type) {
    case 'string':
      if (s.enum) return s.enum[0];
      if (s.format === 'email') return 'user@example.com';
      if (s.format === 'date-time') return new Date().toISOString();
      if (s.format === 'date') return new Date().toISOString().split('T')[0];
      if (s.format === 'uuid') return generateId();
      if (s.format === 'uri') return 'https://example.com';
      return 'string';
    case 'integer':
    case 'number':
      if (s.minimum !== undefined) return s.minimum;
      return 0;
    case 'boolean':
      return true;
    case 'array':
      const itemSchema = s.items as OpenAPIV3.SchemaObject;
      return [generateExampleFromSchema(itemSchema, spec)];
    case 'object':
      const obj: Record<string, any> = {};
      if (s.properties) {
        for (const [key, propSchema] of Object.entries(s.properties)) {
          obj[key] = generateExampleFromSchema(propSchema as OpenAPIV3.SchemaObject, spec);
        }
      }
      return obj;
    default:
      return {};
  }
}

function extractParameters(
  operation: OpenAPIV3.OperationObject,
  pathParams: OpenAPIV3.ParameterObject[] = []
): {
  query: { name: string; value: string; description?: string }[];
  path: { name: string; value: string; description?: string }[];
  header: { name: string; value: string; description?: string }[];
} {
  const params = [...pathParams, ...(operation.parameters || [])] as OpenAPIV3.ParameterObject[];
  
  const query: { name: string; value: string; description?: string }[] = [];
  const path: { name: string; value: string; description?: string }[] = [];
  const header: { name: string; value: string; description?: string }[] = [];

  for (const param of params) {
    const schema = param.schema as OpenAPIV3.SchemaObject | undefined;
    const value = param.example?.toString() || schema?.example?.toString() || '';
    const item = { name: param.name, value, description: param.description };

    switch (param.in) {
      case 'query':
        query.push(item);
        break;
      case 'path':
        path.push(item);
        break;
      case 'header':
        header.push(item);
        break;
    }
  }

  return { query, path, header };
}

function getSecurityScheme(
  operation: OpenAPIV3.OperationObject,
  spec: OpenAPIV3.Document
): { type: string; scheme?: string; name?: string; in?: string } | null {
  const security = operation.security || spec.security;
  if (!security || security.length === 0) return null;

  const securityRequirement = security[0];
  const schemeName = Object.keys(securityRequirement)[0];
  if (!schemeName) return null;

  const scheme = spec.components?.securitySchemes?.[schemeName] as OpenAPIV3.SecuritySchemeObject;
  if (!scheme) return null;

  return {
    type: scheme.type,
    scheme: 'scheme' in scheme ? scheme.scheme : undefined,
    name: 'name' in scheme ? scheme.name : undefined,
    in: 'in' in scheme ? scheme.in : undefined,
  };
}

// ============================================================
// Postman Export
// ============================================================

export function exportToPostman(
  spec: OpenAPIV3.Document,
  options: ExportOptions
): { collection: PostmanCollection; environment?: PostmanEnvironment } {
  const baseUrl = getBaseUrl(spec);
  const collectionName = options.name || spec.info.title || 'API Collection';

  const collection: PostmanCollection = {
    info: {
      _postman_id: generateId(),
      name: collectionName,
      description: spec.info.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: spec.info.version,
    },
    item: [],
    variable: [
      { key: 'baseUrl', value: baseUrl, type: 'string' },
      ...Object.entries(options.variables || {}).map(([key, value]) => ({
        key,
        value,
        type: 'string',
      })),
    ],
  };

  // Add auth if security schemes exist
  const securitySchemes = spec.components?.securitySchemes;
  if (securitySchemes) {
    const firstScheme = Object.values(securitySchemes)[0] as OpenAPIV3.SecuritySchemeObject;
    if (firstScheme.type === 'http' && 'scheme' in firstScheme && firstScheme.scheme === 'bearer') {
      collection.auth = {
        type: 'bearer',
        bearer: [{ key: 'token', value: '{{bearerToken}}', type: 'string' }],
      };
      collection.variable!.push({ key: 'bearerToken', value: '', type: 'string' });
    } else if (firstScheme.type === 'apiKey') {
      collection.auth = {
        type: 'apikey',
        apikey: [
          { key: 'key', value: (firstScheme as OpenAPIV3.ApiKeySecurityScheme).name || 'X-API-Key', type: 'string' },
          { key: 'value', value: '{{apiKey}}', type: 'string' },
          { key: 'in', value: (firstScheme as OpenAPIV3.ApiKeySecurityScheme).in || 'header', type: 'string' },
        ],
      };
      collection.variable!.push({ key: 'apiKey', value: '', type: 'string' });
    }
  }

  // Group items based on groupBy option
  const groupedItems = groupOperations(spec, options.groupBy || 'tags');

  for (const [groupName, operations] of Object.entries(groupedItems)) {
    const folderItem: PostmanItem = {
      name: groupName,
      item: [],
    };

    for (const op of operations) {
      const { method, path, operation } = op;
      const params = extractParameters(operation, op.pathParams);
      const body = getRequestBody(operation, spec);
      const postmanPath = convertPathToPostmanUrl(path);

      const requestItem: PostmanItem = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [
            ...params.header.map((h) => ({
              key: h.name,
              value: h.value,
              description: h.description,
            })),
            ...(body ? [{ key: 'Content-Type', value: body.contentType }] : []),
          ],
          url: {
            raw: `{{baseUrl}}${postmanPath}${params.query.length ? '?' + params.query.map(q => `${q.name}=${q.value}`).join('&') : ''}`,
            host: ['{{baseUrl}}'],
            path: postmanPath.split('/').filter(Boolean),
            query: params.query.map((q) => ({
              key: q.name,
              value: q.value,
              description: q.description,
            })),
            variable: params.path.map((p) => ({
              key: p.name,
              value: p.value,
              description: p.description,
            })),
          },
          description: operation.description,
        },
        response: [],
      };

      if (body) {
        requestItem.request!.body = {
          mode: 'raw',
          raw: JSON.stringify(body.example, null, 2),
          options: {
            raw: { language: 'json' },
          },
        };
      }

      folderItem.item!.push(requestItem);
    }

    if (groupName === '_ungrouped') {
      collection.item.push(...folderItem.item!);
    } else {
      collection.item.push(folderItem);
    }
  }

  // Generate environment if requested
  let environment: PostmanEnvironment | undefined;
  if (options.includeEnv) {
    environment = {
      name: `${collectionName} Environment`,
      values: [
        { key: 'baseUrl', value: baseUrl, type: 'default', enabled: true },
        ...Object.entries(options.variables || {}).map(([key, value]) => ({
          key,
          value,
          type: 'default' as const,
          enabled: true,
        })),
      ],
    };

    // Add auth variables
    if (collection.auth?.type === 'bearer') {
      environment.values.push({ key: 'bearerToken', value: '', type: 'secret', enabled: true });
    } else if (collection.auth?.type === 'apikey') {
      environment.values.push({ key: 'apiKey', value: '', type: 'secret', enabled: true });
    }
  }

  return { collection, environment };
}

// ============================================================
// Insomnia Export
// ============================================================

export function exportToInsomnia(
  spec: OpenAPIV3.Document,
  options: ExportOptions
): InsomniaExport {
  const baseUrl = getBaseUrl(spec);
  const workspaceName = options.name || spec.info.title || 'API Workspace';
  const workspaceId = `wrk_${generateId().replace(/-/g, '')}`;

  const resources: InsomniaResource[] = [
    {
      _id: workspaceId,
      _type: 'workspace',
      parentId: null,
      name: workspaceName,
      description: spec.info.description,
      created: Date.now(),
      modified: Date.now(),
    },
  ];

  // Create base environment
  const baseEnvId = `env_${generateId().replace(/-/g, '')}`;
  resources.push({
    _id: baseEnvId,
    _type: 'environment',
    parentId: workspaceId,
    name: 'Base Environment',
    created: Date.now(),
    modified: Date.now(),
  });

  // Group operations
  const groupedItems = groupOperations(spec, options.groupBy || 'tags');
  const folderIds: Record<string, string> = {};

  for (const [groupName, operations] of Object.entries(groupedItems)) {
    // Create folder for group
    let parentId = workspaceId;
    if (groupName !== '_ungrouped') {
      const folderId = `fld_${generateId().replace(/-/g, '')}`;
      folderIds[groupName] = folderId;
      resources.push({
        _id: folderId,
        _type: 'request_group',
        parentId: workspaceId,
        name: groupName,
        description: spec.tags?.find((t) => t.name === groupName)?.description,
        created: Date.now(),
        modified: Date.now(),
      });
      parentId = folderId;
    }

    for (const op of operations) {
      const { method, path, operation } = op;
      const params = extractParameters(operation, op.pathParams);
      const body = getRequestBody(operation, spec);
      const insomniaPath = convertPathToInsomnia(path);
      const requestId = `req_${generateId().replace(/-/g, '')}`;

      const request: InsomniaResource = {
        _id: requestId,
        _type: 'request',
        parentId,
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        description: operation.description,
        url: `${baseUrl}${insomniaPath}`,
        method: method.toUpperCase(),
        headers: [
          ...params.header.map((h) => ({ name: h.name, value: h.value })),
          ...(body ? [{ name: 'Content-Type', value: body.contentType }] : []),
        ],
        parameters: params.query.map((q) => ({ name: q.name, value: q.value })),
        created: Date.now(),
        modified: Date.now(),
      };

      if (body) {
        request.body = {
          mimeType: body.contentType,
          text: JSON.stringify(body.example, null, 2),
        };
      }

      // Add authentication
      const secScheme = getSecurityScheme(operation, spec);
      if (secScheme) {
        if (secScheme.type === 'http' && secScheme.scheme === 'bearer') {
          request.authentication = {
            type: 'bearer',
            token: '{{ _.bearerToken }}',
          };
        } else if (secScheme.type === 'apiKey') {
          // API key is handled via headers
          request.headers!.push({
            name: secScheme.name || 'X-API-Key',
            value: '{{ _.apiKey }}',
          });
        }
      }

      resources.push(request);
    }
  }

  return {
    _type: 'export',
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: 'express-swagger-auto',
    resources,
  };
}

// ============================================================
// Bruno Export
// ============================================================

export function exportToBruno(
  spec: OpenAPIV3.Document,
  options: ExportOptions
): BrunoCollection {
  const baseUrl = getBaseUrl(spec);
  const collectionName = options.name || spec.info.title || 'API Collection';

  const collection: BrunoCollection = {
    version: '1',
    name: collectionName,
    type: 'collection',
    items: [],
  };

  // Group operations
  const groupedItems = groupOperations(spec, options.groupBy || 'tags');

  for (const [groupName, operations] of Object.entries(groupedItems)) {
    const folderItem: BrunoItem = {
      name: groupName,
      type: 'folder',
      items: [],
    };

    for (const op of operations) {
      const { method, path, operation } = op;
      const params = extractParameters(operation, op.pathParams);
      const body = getRequestBody(operation, spec);

      const request: BrunoRequest = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        url: `${baseUrl}${path}`,
        headers: params.header.reduce((acc, h) => {
          acc[h.name] = h.value;
          return acc;
        }, {} as Record<string, string>),
        params: [
          ...params.path.map((p) => ({ name: p.name, value: p.value, type: 'path' as const })),
          ...params.query.map((q) => ({ name: q.name, value: q.value, type: 'query' as const })),
        ],
        description: operation.description,
      };

      if (body) {
        request.headers = { ...request.headers, 'Content-Type': body.contentType };
        if (body.contentType === 'application/json') {
          request.body = {
            type: 'json',
            json: JSON.stringify(body.example, null, 2),
          };
        } else {
          request.body = {
            type: 'text',
            text: JSON.stringify(body.example, null, 2),
          };
        }
      }

      const requestItem: BrunoItem = {
        name: request.name,
        type: 'http-request',
        request,
      };

      folderItem.items!.push(requestItem);
    }

    if (groupName === '_ungrouped') {
      collection.items.push(...folderItem.items!);
    } else {
      collection.items.push(folderItem);
    }
  }

  return collection;
}

// ============================================================
// Hoppscotch Export
// ============================================================

export function exportToHoppscotch(
  spec: OpenAPIV3.Document,
  options: ExportOptions
): HoppscotchCollection {
  const baseUrl = getBaseUrl(spec);
  const collectionName = options.name || spec.info.title || 'API Collection';

  const collection: HoppscotchCollection = {
    v: 1,
    name: collectionName,
    folders: [],
    requests: [],
  };

  // Group operations
  const groupedItems = groupOperations(spec, options.groupBy || 'tags');

  for (const [groupName, operations] of Object.entries(groupedItems)) {
    const folder: HoppscotchFolder = {
      v: 1,
      name: groupName,
      folders: [],
      requests: [],
    };

    for (const op of operations) {
      const { method, path, operation } = op;
      const params = extractParameters(operation, op.pathParams);
      const body = getRequestBody(operation, spec);

      const request: HoppscotchRequest = {
        v: '1',
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        endpoint: `${baseUrl}${path}`,
        headers: params.header.map((h) => ({
          key: h.name,
          value: h.value,
          active: true,
        })),
        params: params.query.map((q) => ({
          key: q.name,
          value: q.value,
          active: true,
        })),
        body: {
          contentType: body?.contentType || null,
          body: body ? JSON.stringify(body.example, null, 2) : null,
        },
        auth: {
          authType: 'none',
          authActive: false,
        },
      };

      // Add auth
      const secScheme = getSecurityScheme(operation, spec);
      if (secScheme) {
        if (secScheme.type === 'http' && secScheme.scheme === 'bearer') {
          request.auth = {
            authType: 'bearer',
            authActive: true,
          };
        }
      }

      folder.requests.push(request);
    }

    if (groupName === '_ungrouped') {
      collection.requests.push(...folder.requests);
    } else {
      collection.folders.push(folder);
    }
  }

  return collection;
}

// ============================================================
// Helper: Group Operations
// ============================================================

interface GroupedOperation {
  method: string;
  path: string;
  operation: OpenAPIV3.OperationObject;
  pathParams: OpenAPIV3.ParameterObject[];
}

function groupOperations(
  spec: OpenAPIV3.Document,
  groupBy: 'tags' | 'paths' | 'none'
): Record<string, GroupedOperation[]> {
  const groups: Record<string, GroupedOperation[]> = {};

  const paths = spec.paths || {};

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    const pathObject = pathItem as OpenAPIV3.PathItemObject;
    const pathParams = (pathObject.parameters || []) as OpenAPIV3.ParameterObject[];

    const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

    for (const method of methods) {
      const operation = pathObject[method];
      if (!operation) continue;

      let groupName: string;

      switch (groupBy) {
        case 'tags':
          groupName = operation.tags?.[0] || '_ungrouped';
          break;
        case 'paths':
          // Group by first path segment
          const segments = pathKey.split('/').filter(Boolean);
          groupName = segments[0] || '_ungrouped';
          break;
        case 'none':
          groupName = '_ungrouped';
          break;
      }

      if (!groups[groupName]) {
        groups[groupName] = [];
      }

      groups[groupName].push({
        method,
        path: pathKey,
        operation,
        pathParams,
      });
    }
  }

  return groups;
}

// ============================================================
// Main Export Function
// ============================================================

export function exportSpec(
  spec: OpenAPIV3.Document,
  format: ExportFormat,
  options: ExportOptions
): string {
  switch (format) {
    case 'postman': {
      const result = exportToPostman(spec, options);
      return JSON.stringify(result.collection, null, 2);
    }
    case 'insomnia': {
      const result = exportToInsomnia(spec, options);
      return JSON.stringify(result, null, 2);
    }
    case 'bruno': {
      const result = exportToBruno(spec, options);
      return JSON.stringify(result, null, 2);
    }
    case 'hoppscotch': {
      const result = exportToHoppscotch(spec, options);
      return JSON.stringify(result, null, 2);
    }
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

export function exportSpecWithEnv(
  spec: OpenAPIV3.Document,
  format: ExportFormat,
  options: ExportOptions
): { collection: string; environment?: string } {
  if (format === 'postman') {
    const result = exportToPostman(spec, { ...options, includeEnv: true });
    return {
      collection: JSON.stringify(result.collection, null, 2),
      environment: result.environment ? JSON.stringify(result.environment, null, 2) : undefined,
    };
  }

  // Other formats don't have separate environment files
  return { collection: exportSpec(spec, format, options) };
}

export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'postman':
      return '.postman_collection.json';
    case 'insomnia':
      return '.insomnia.json';
    case 'bruno':
      return '.bruno.json';
    case 'hoppscotch':
      return '.hoppscotch.json';
    default:
      return '.json';
  }
}

export function getEnvironmentFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'postman':
      return '.postman_environment.json';
    default:
      return '.env.json';
  }
}
