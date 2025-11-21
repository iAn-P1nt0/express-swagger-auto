import { describe, it, expect } from 'vitest';
import { SpecGenerator } from './SpecGenerator';
import type { GeneratorConfig } from '../types';

describe('SpecGenerator', () => {
  const config: GeneratorConfig = {
    info: {
      title: 'Test API',
      version: '1.0.0',
      description: 'Test API description',
    },
  };

  it('should initialize with config', () => {
    const generator = new SpecGenerator(config);
    expect(generator).toBeDefined();
  });

  it('should generate minimal spec with no routes', () => {
    const generator = new SpecGenerator(config);
    const spec = generator.generate([]);

    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.paths).toEqual({});
  });

  it('should generate spec with single route', () => {
    const generator = new SpecGenerator(config);
    const routes = [
      {
        method: 'GET',
        path: '/users',
        handler: () => {},
      },
    ];

    const spec = generator.generate(routes);

    expect(spec.paths['/users']).toBeDefined();
    expect(spec.paths['/users'].get).toBeDefined();
    expect(spec.paths['/users'].get.summary).toContain('GET');
  });
});
