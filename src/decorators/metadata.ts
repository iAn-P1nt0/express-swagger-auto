import type { OpenAPIParameter, OpenAPIRequestBody } from '../types';

export interface RouteDecoratorOptions {
  summary?: string;
  description?: string;
  tags?: string[];
}

export interface ParameterDecoratorOptions extends OpenAPIParameter {}

export interface RequestBodyDecoratorOptions extends OpenAPIRequestBody {}

export interface ResponseDecoratorOptions {
  statusCode: number;
  description: string;
  schema?: any;
}

export function Route(options: RouteDecoratorOptions = {}) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    // Phase 3: Basic decorator metadata attachment
    // TODO(Phase 3): Complete decorator implementation with reflection
    // TODO(Phase 3): Integrate with RouteDiscovery extraction logic

    if (!descriptor.value.__openapi_metadata) {
      descriptor.value.__openapi_metadata = {};
    }

    Object.assign(descriptor.value.__openapi_metadata, options);

    return descriptor;
  };
}

export function Parameter(options: ParameterDecoratorOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    if (!descriptor.value.__openapi_metadata) {
      descriptor.value.__openapi_metadata = {};
    }

    if (!descriptor.value.__openapi_metadata.parameters) {
      descriptor.value.__openapi_metadata.parameters = [];
    }

    descriptor.value.__openapi_metadata.parameters.push(options);

    return descriptor;
  };
}

export function RequestBody(options: RequestBodyDecoratorOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    if (!descriptor.value.__openapi_metadata) {
      descriptor.value.__openapi_metadata = {};
    }

    descriptor.value.__openapi_metadata.requestBody = options;

    return descriptor;
  };
}

export function Response(options: ResponseDecoratorOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    if (!descriptor.value.__openapi_metadata) {
      descriptor.value.__openapi_metadata = {};
    }

    if (!descriptor.value.__openapi_metadata.responses) {
      descriptor.value.__openapi_metadata.responses = {};
    }

    descriptor.value.__openapi_metadata.responses[options.statusCode] = {
      description: options.description,
      ...(options.schema && {
        content: {
          'application/json': { schema: options.schema },
        },
      }),
    };

    return descriptor;
  };
}
