const { JsDocParser } = require('express-swagger-auto');
const path = require('path');

const parser = new JsDocParser({
  sourceFiles: [path.join(__dirname, 'index.js')],
  includeAll: false,
});

console.log('Testing JSDoc parser...');
const routes = parser.parse();

console.log(`\nFound ${routes.length} routes:`);
routes.forEach((route, i) => {
  console.log(`\n${i + 1}. ${route.metadata.method} ${route.metadata.path}`);
  console.log(`   Summary: ${route.metadata.summary || '(none)'}`);
  console.log(`   Tags: ${route.metadata.tags?.join(', ') || '(none)'}`);
  console.log(`   Parameters: ${route.metadata.parameters?.length || 0}`);
  console.log(`   Responses: ${Object.keys(route.metadata.responses || {}).join(', ')}`);
});
