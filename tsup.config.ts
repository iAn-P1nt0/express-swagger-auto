import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    'middleware/index': 'src/middleware/index.ts',
    'decorators/index': 'src/decorators/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  shims: true,
  external: ['express', 'swagger-ui-express', 'zod', 'joi', 'yup'],
  banner: {
    js: '#!/usr/bin/env node',
  },
  onSuccess: 'chmod +x dist/cli.js',
});
