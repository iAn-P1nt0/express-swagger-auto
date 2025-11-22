const express = require('express');

const app = express();

console.log('Before adding routes:');
console.log('  app._router:', !!app._router);

app.get('/test', (req, res) => res.json({ test: true }));

console.log('\nAfter adding route:');
console.log('  app._router:', !!app._router);
console.log('  app._router.stack length:', app._router?.stack?.length);

if (app._router?.stack) {
  console.log('\nRouter stack:');
  app._router.stack.forEach((layer, i) => {
    console.log(`  ${i}. ${layer.name}${layer.route ? ` (${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path})` : ''}`);
  });
}
