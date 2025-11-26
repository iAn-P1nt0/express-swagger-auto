export { RouteDiscovery } from './core/RouteDiscovery';
export type { RouteDiscoveryOptions } from './core/RouteDiscovery';
export { SpecGenerator } from './core/SpecGenerator';
export { SnapshotStorage } from './core/SnapshotStorage';
export { ExampleMerger } from './core/ExampleMerger';

// Phase 1: Route Enhancement Components
export { MiddlewareAnalyzer } from './core/MiddlewareAnalyzer';
export type { MiddlewareMetadata, RouteMiddlewareInfo } from './core/MiddlewareAnalyzer';
export { PathParameterExtractor } from './core/PathParameterExtractor';
export type { PathParameter, ParsedPath } from './core/PathParameterExtractor';
export { RouteMetadataEnricher } from './core/RouteMetadataEnricher';
export type { EnrichedRouteMetadata } from './core/RouteMetadataEnricher';

// Phase 2: Schema Extraction Components
export { JoiSchemaParser } from './schema/JoiSchemaParser';
export type { JoiSchemaProperty, ParsedJoiSchema } from './schema/JoiSchemaParser';
export { ControllerAnalyzer } from './schema/ControllerAnalyzer';
export type { ControllerSchema, FunctionParameter } from './schema/ControllerAnalyzer';
export { SchemaExtractor } from './schema/SchemaExtractor';
export type { ExtractedSchema, RouteSchema } from './schema/SchemaExtractor';

// Phase 3: Type Inference Components
export { TypeInferenceEngine } from './inference/TypeInferenceEngine';
export type {
  TypeDefinition,
  InferenceResult,
  TypeInferenceOptions,
} from './inference/TypeInferenceEngine';

// Validators
export { ZodAdapter } from './validators/ZodAdapter';
export { JoiAdapter } from './validators/JoiAdapter';
export { YupAdapter } from './validators/YupAdapter';
export { ValidatorRegistry, validatorRegistry } from './validators/ValidatorRegistry';

// Config
export { ConfigLoader } from './config/ConfigLoader';
export type { SwaggerAutoConfig } from './config/ConfigLoader';

// Middleware
export { runtimeCapture } from './middleware/runtimeCapture';
export { createSwaggerUIMiddleware } from './middleware/swaggerUI';

// Parsers
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
