import type { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { OpenAPISpec } from '../types';

export interface SwaggerUIConfig {
  routePrefix?: string;
  spec: OpenAPISpec;
  customCss?: string;
  customSiteTitle?: string;
}

export function createSwaggerUIMiddleware(config: SwaggerUIConfig): Router {
  const { routePrefix = '/api-docs', spec, customCss, customSiteTitle } = config;

  const router = require('express').Router() as Router;

  const swaggerOptions = {
    customCss,
    customSiteTitle: customSiteTitle || spec.info.title,
  };

  router.use(routePrefix, swaggerUi.serve);
  router.get(routePrefix, swaggerUi.setup(spec, swaggerOptions));

  router.get(`${routePrefix}.json`, (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(spec, null, 2));
  });

  return router;
}
