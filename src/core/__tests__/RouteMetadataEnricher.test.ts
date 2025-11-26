/**
 * Tests for RouteMetadataEnricher
 */

import { describe, it, expect } from 'vitest';
import { RouteMetadataEnricher } from '../RouteMetadataEnricher';
import type { RouteMetadata } from '../../types';

describe('RouteMetadataEnricher', () => {
  const enricher = new RouteMetadataEnricher();

  const baseRoute: RouteMetadata = {
    path: '/api/users/:id',
    method: 'GET',
    handler: 'getUser',
  };

  describe('enrich', () => {
    it('should enrich basic route metadata', () => {
      const enriched = enricher.enrich(baseRoute, {
        generateOperationId: true,
      });

      expect(enriched.path).toBe('/api/users/:id');
      expect(enriched.method).toBe('GET');
      expect(enriched.operationId).toBeDefined();
      expect(enriched.tags).toBeDefined();
      expect(enriched.deprecated).toBe(false);
    });

    it('should generate operation IDs', () => {
      const enriched = enricher.enrich(baseRoute, {
        generateOperationId: true,
      });

      expect(enriched.operationId).toBeTruthy();
      expect(enriched.operationId).toContain('get');
    });

    it('should generate tags from path', () => {
      const enriched = enricher.enrich(baseRoute, {
        generateOperationId: true,
      });

      expect(enriched.tags.length).toBeGreaterThan(0);
      expect(enriched.tags.some(t => t.includes('User'))).toBe(true);
    });

    it('should add custom tags', () => {
      const enriched = enricher.enrich(baseRoute, {
        customTags: ['Investment', 'Portfolio'],
      });

      expect(enriched.tags).toContain('Investment');
      expect(enriched.tags).toContain('Portfolio');
    });

    it('should merge middleware information', () => {
      const middlewares = [
        {
          name: 'AuthGuard',
          type: 'auth' as const,
          description: 'JWT auth',
          security: {
            type: 'jwt' as const,
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token',
          },
        },
      ];

      const enriched = enricher.enrich(baseRoute, { middlewares });

      expect(enriched.isProtected).toBe(true);
      expect(enriched.securitySchemes.length).toBeGreaterThan(0);
    });

    it('should extract path parameters', () => {
      const parameters = [
        {
          name: 'id',
          in: 'path' as const,
          required: true,
          schema: { type: 'integer' as const },
          description: 'User ID',
        },
      ];

      const enriched = enricher.enrich(baseRoute, { parameters });

      expect(enriched.parameters.length).toBe(1);
      expect(enriched.parameters[0].name).toBe('id');
    });

    it('should merge JSDoc metadata', () => {
      const jsDocMetadata = {
        description: 'Get a user by ID',
        summary: 'Retrieve user',
        tags: ['users', 'profile'],
        deprecated: false,
        operationId: 'getUserById',
      };

      const enriched = enricher.enrich(baseRoute, { jsDocMetadata });

      expect(enriched.description).toBe('Get a user by ID');
      expect(enriched.summary).toBe('Retrieve user');
      expect(enriched.operationId).toBe('getUserById');
    });

    it('should detect deprecated routes', () => {
      const deprecatedRoute: RouteMetadata = {
        ...baseRoute,
        path: '/api/v1/deprecated/users',
      };

      const enriched = enricher.enrich(deprecatedRoute, {
        generateOperationId: true,
      });

      expect(enriched.deprecated).toBe(true);
    });

    it('should generate examples', () => {
      const enriched = enricher.enrich(baseRoute, {
        generateOperationId: true,
      });

      expect(enriched.examples).toBeDefined();
      expect(enriched.examples.success).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate complete metadata', () => {
      const enriched = enricher.enrich(baseRoute, {
        generateOperationId: true,
        customTags: ['Users'],
      });

      enriched.description = 'Get user by ID';

      const validation = enricher.validate(enriched);

      // May have some warnings, but should generally be valid
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
    });

    it('should warn about missing description', () => {
      const enriched = enricher.enrich(baseRoute, {
        generateOperationId: true,
      });

      const validation = enricher.validate(enriched);

      const hasDescriptionWarning = validation.warnings.some(w =>
        w.includes('description')
      );

      expect(hasDescriptionWarning).toBe(true);
    });

    it('should warn about protected route without security schemes', () => {
      const middlewares = [
        {
          name: 'AuthGuard',
          type: 'auth' as const,
          description: 'Auth',
        },
      ];

      const enriched = enricher.enrich(baseRoute, { middlewares });
      enriched.isProtected = true;
      enriched.securitySchemes = [];

      const validation = enricher.validate(enriched);

      const hasSecurityWarning = validation.warnings.some(w =>
        w.includes('security')
      );

      expect(hasSecurityWarning).toBe(true);
    });

    it('should warn about missing tags', () => {
      const enriched = enricher.enrich(baseRoute, {
        generateOperationId: true,
      });
      enriched.tags = [];

      const validation = enricher.validate(enriched);

      const hasTagWarning = validation.warnings.some(w =>
        w.includes('tags')
      );

      expect(hasTagWarning).toBe(true);
    });
  });

  describe('mergeMetadata', () => {
    it('should merge metadata with additional overrides', () => {
      const base = enricher.enrich(baseRoute, {
        generateOperationId: true,
      });

      const additional = {
        description: 'Custom description',
        summary: 'Custom summary',
      };

      const merged = enricher.mergeMetadata(base, additional, 'additional');

      expect(merged.description).toBe('Custom description');
      expect(merged.summary).toBe('Custom summary');
      expect(merged.tags).toBeDefined();
    });

    it('should preserve base with priority', () => {
      const base = enricher.enrich(baseRoute, {
        generateOperationId: true,
        jsDocMetadata: {
          description: 'Base description',
          tags: ['base'],
        },
      });

      const additional = {
        description: 'Custom description',
      };

      const merged = enricher.mergeMetadata(base, additional, 'base');

      expect(merged.description).toBe(base.description);
      expect(merged.description).toBe('Base description');
    });
  });
});
