#!/usr/bin/env node
/**
 * Generates Express apps with varying route counts for performance benchmarking
 * Creates: 10, 50, 100, 500, 1000 route apps
 */

import fs from 'fs';
import path from 'path';

interface AppConfig {
  name: string;
  routeCount: number;
}

const apps: AppConfig[] = [
  { name: 'app-10-routes', routeCount: 10 },
  { name: 'app-50-routes', routeCount: 50 },
  { name: 'app-100-routes', routeCount: 100 },
  { name: 'app-500-routes', routeCount: 500 },
  { name: 'app-1000-routes', routeCount: 1000 },
];

const benchmarkDir = path.join(__dirname, 'apps');

// Ensure benchmark apps directory exists
if (!fs.existsSync(benchmarkDir)) {
  fs.mkdirSync(benchmarkDir, { recursive: true });
}

function generateApp(config: AppConfig): void {
  const appCode = `
import express from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

${generateRoutes(config.routeCount)}

export default app;
`;

  const appPath = path.join(benchmarkDir, config.name, 'app.ts');
  const appDir = path.dirname(appPath);

  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }

  fs.writeFileSync(appPath, appCode);
  console.log(`✓ Generated ${config.name} with ${config.routeCount} routes`);
}

function generateRoutes(count: number): string {
  const routes: string[] = [];

  for (let i = 0; i < count; i++) {
    const resourceName = `resource${i}`;
    const routeNum = i + 1;

    routes.push(`
// Resource ${routeNum}
const ${resourceName}Schema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

app.get('/${resourceName}', (req, res) => {
  res.json({ message: 'GET ${resourceName}' });
});

app.post('/${resourceName}', (req, res) => {
  res.json({ created: true });
});

app.get('/${resourceName}/:id', (req, res) => {
  res.json({ id: req.params.id });
});

app.put('/${resourceName}/:id', (req, res) => {
  res.json({ updated: true });
});

app.delete('/${resourceName}/:id', (req, res) => {
  res.json({ deleted: true });
});
`);
  }

  return routes.join('\n');
}

// Generate all test apps
apps.forEach(generateApp);

console.log(`\n✓ All benchmark apps generated in ${benchmarkDir}`);
