const express = require('express');
const { RouteDiscovery, JsDocParser } = require('express-swagger-auto');
const path = require('path');

// Create a simple Express app
const app = express();
app.use(express.json());

/**
 * @openapi
 * @route GET /test
 * @summary Test route
 * @tags test
 * @response 200 - Success
 */
app.get('/test', (req, res) => {
  res.json({ message: 'test' });
});

// Test JSDoc parser
const parser = new JsDocParser({
  sourceFiles: [__filename],
  includeAll: false,
});

console.log('Testing JSDoc parser...');
const parsedRoutes = parser.parse();
console.log(`JSDoc parser found ${parsedRoutes.length} routes:`);
parsedRoutes.forEach(r => {
  console.log(`  - ${r.metadata.method} ${r.metadata.path}`);
});

// Debug: Check router stack
console.log(`\nExpress app router info:`);
console.log(`  Has _router: ${!!app._router}`);
console.log(`  Stack length: ${app._router?.stack?.length || 0}`);
if (app._router?.stack) {
  app._router.stack.forEach((layer, i) => {
    console.log(`  ${i}. ${layer.name}${layer.route ? ` (route: ${layer.route.path})` : ''}`);
  });
}

// Test RouteDiscovery
const discovery = new RouteDiscovery();
const discoveredRoutes = discovery.discover(app, {
  enableJsDocParsing: true,
  jsDocParser: parser,
});

console.log(`\nRouteDiscovery found ${discoveredRoutes.length} routes:`);
discoveredRoutes.forEach(r => {
  console.log(`  - ${r.method} ${r.path}`);
  console.log(`    Has metadata: ${!!r.metadata}`);
  if (r.metadata) {
    console.log(`    Summary: ${r.metadata.summary}`);
    console.log(`    Tags: ${r.metadata.tags?.join(', ')}`);
  }
});
