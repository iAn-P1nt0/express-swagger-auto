export { RouteDiscovery } from './core/RouteDiscovery';
export type { RouteDiscoveryOptions } from './core/RouteDiscovery';
export { SpecGenerator } from './core/SpecGenerator';
export { SnapshotStorage } from './core/SnapshotStorage';
export { ExampleMerger } from './core/ExampleMerger';
export { ZodAdapter } from './validators/ZodAdapter';
export { JoiAdapter } from './validators/JoiAdapter';
export { YupAdapter } from './validators/YupAdapter';
export { ValidatorRegistry, validatorRegistry } from './validators/ValidatorRegistry';
export { runtimeCapture } from './middleware/runtimeCapture';
export { createSwaggerUIMiddleware } from './middleware/swaggerUI';
export { JsDocParser } from './parsers/JsDocParser';
export { JsDocTransformer } from './parsers/JsDocTransformer';
export { CommentExtractor } from './parsers/CommentExtractor';

export type { JsDocMetadata } from './parsers/JsDocTransformer';
export type { ParsedRoute, JsDocParserOptions } from './parsers/JsDocParser';
export type { ExtractedComment, CommentExtractorOptions } from './parsers/CommentExtractor';

export type {
  OpenAPISpec,
  OpenAPIInfo,
  OpenAPIPath,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
  OpenAPISchema,
  OpenAPIServer,
  OpenAPISecurityScheme,
  RouteMetadata,
  GeneratorConfig,
  ValidatorAdapter,
  ExpressApp,
} from './types';

export type { RuntimeCaptureConfig } from './middleware/runtimeCapture';
export type { SwaggerUIConfig } from './middleware/swaggerUI';
export type { RuntimeSnapshot, SnapshotStorageConfig } from './core/SnapshotStorage';
