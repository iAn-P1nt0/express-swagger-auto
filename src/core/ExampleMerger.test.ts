import { describe, it, expect } from 'vitest';
import { ExampleMerger } from './ExampleMerger';
import type { RuntimeSnapshot } from './SnapshotStorage';

describe('ExampleMerger', () => {
  const merger = new ExampleMerger();

  describe('mergeSnapshots', () => {
    it('returns empty object for no snapshots', () => {
      const result = merger.mergeSnapshots([]);
      expect(result).toEqual({});
    });

    it('merges single snapshot correctly', () => {
      const snapshot: RuntimeSnapshot = {
        method: 'GET',
        path: '/users',
        responseSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          },
        },
        timestamp: '2025-01-01T00:00:00Z',
        hash: 'abc123',
      };

      const result = merger.mergeSnapshots([snapshot]);
      expect(result.responseSchema).toBeDefined();
      expect(result.responseSchema?.type).toBe('object');
    });

    it('merges multiple snapshots with same fields', () => {
      const snapshots: RuntimeSnapshot[] = [
        {
          method: 'GET',
          path: '/users',
          responseSchema: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Alice' },
            },
          },
          timestamp: '2025-01-01T00:00:00Z',
          hash: 'abc1',
        },
        {
          method: 'GET',
          path: '/users',
          responseSchema: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 2 },
              name: { type: 'string', example: 'Bob' },
            },
          },
          timestamp: '2025-01-01T00:01:00Z',
          hash: 'abc2',
        },
      ];

      const result = merger.mergeSnapshots(snapshots);
      expect(result.responseSchema?.type).toBe('object');
      expect(result.responseSchema?.properties).toBeDefined();
      expect(result.responseSchema?.required).toEqual(['id', 'name']); // Both present in all snapshots
    });

    it('marks fields as optional when not present in all snapshots', () => {
      const snapshots: RuntimeSnapshot[] = [
        {
          method: 'POST',
          path: '/users',
          requestSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          timestamp: '2025-01-01T00:00:00Z',
          hash: 'req1',
        },
        {
          method: 'POST',
          path: '/users',
          requestSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' }, // Only in this snapshot
            },
          },
          timestamp: '2025-01-01T00:01:00Z',
          hash: 'req2',
        },
      ];

      const result = merger.mergeSnapshots(snapshots);
      expect(result.requestSchema?.required).toEqual(['name', 'email']); // phone is optional
      expect(result.requestSchema?.properties).toHaveProperty('phone'); // But still present
    });
  });

  describe('enum detection', () => {
    it('detects enum from string values', () => {
      const snapshots: RuntimeSnapshot[] = [
        {
          method: 'GET',
          path: '/products',
          responseSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'active' },
            },
          },
          timestamp: '2025-01-01T00:00:00Z',
          hash: 'p1',
        },
        {
          method: 'GET',
          path: '/products',
          responseSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'inactive' },
            },
          },
          timestamp: '2025-01-01T00:01:00Z',
          hash: 'p2',
        },
        {
          method: 'GET',
          path: '/products',
          responseSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'active' }, // Duplicate
            },
          },
          timestamp: '2025-01-01T00:02:00Z',
          hash: 'p3',
        },
      ];

      const result = merger.mergeSnapshots(snapshots);
      const statusSchema = result.responseSchema?.properties?.status;

      expect(statusSchema?.type).toBe('string');
      expect(statusSchema?.enum).toEqual(['active', 'inactive']); // Sorted, unique
    });

    it('does not create enum for too many values', () => {
      const snapshots: RuntimeSnapshot[] = Array.from({ length: 12 }, (_, i) => ({
        method: 'GET',
        path: '/items',
        responseSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: `item-${i}` },
          },
        },
        timestamp: '2025-01-01T00:00:00Z',
        hash: `item${i}`,
      }));

      const result = merger.mergeSnapshots(snapshots);
      const idSchema = result.responseSchema?.properties?.id;

      expect(idSchema?.enum).toBeUndefined(); // Too many values
      expect(idSchema?.example).toBeDefined(); // Has example instead
    });
  });

  describe('array schema merging', () => {
    it('merges array item schemas', () => {
      const snapshots: RuntimeSnapshot[] = [
        {
          method: 'GET',
          path: '/users',
          responseSchema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Alice' },
              },
            },
          },
          timestamp: '2025-01-01T00:00:00Z',
          hash: 'arr1',
        },
        {
          method: 'GET',
          path: '/users',
          responseSchema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
                name: { type: 'string', example: 'Bob' },
                email: { type: 'string', example: 'bob@example.com' }, // Extra field
              },
            },
          },
          timestamp: '2025-01-01T00:01:00Z',
          hash: 'arr2',
        },
      ];

      const result = merger.mergeSnapshots(snapshots);
      expect(result.responseSchema?.type).toBe('array');
      expect(result.responseSchema?.items).toBeDefined();

      const items = result.responseSchema?.items as any;
      expect(items.properties).toHaveProperty('id');
      expect(items.properties).toHaveProperty('name');
      expect(items.properties).toHaveProperty('email');
      expect(items.required).toEqual(['id', 'name']); // email is optional
    });
  });

  describe('number constraints', () => {
    it('detects min/max for numbers', () => {
      const snapshots: RuntimeSnapshot[] = [
        {
          method: 'GET',
          path: '/stats',
          responseSchema: {
            type: 'object',
            properties: {
              count: { type: 'number', example: 5 },
            },
          },
          timestamp: '2025-01-01T00:00:00Z',
          hash: 'num1',
        },
        {
          method: 'GET',
          path: '/stats',
          responseSchema: {
            type: 'object',
            properties: {
              count: { type: 'number', example: 15 },
            },
          },
          timestamp: '2025-01-01T00:01:00Z',
          hash: 'num2',
        },
        {
          method: 'GET',
          path: '/stats',
          responseSchema: {
            type: 'object',
            properties: {
              count: { type: 'number', example: 10 },
            },
          },
          timestamp: '2025-01-01T00:02:00Z',
          hash: 'num3',
        },
      ];

      const result = merger.mergeSnapshots(snapshots);
      const countSchema = result.responseSchema?.properties?.count;

      expect(countSchema?.type).toBe('number');
      expect(countSchema?.minimum).toBe(5);
      expect(countSchema?.maximum).toBe(15);
    });
  });

  describe('detectPatterns', () => {
    it('identifies required and optional fields', () => {
      const snapshots: RuntimeSnapshot[] = [
        {
          method: 'POST',
          path: '/items',
          requestSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
            },
          },
          timestamp: '2025-01-01T00:00:00Z',
          hash: 'pat1',
        },
        {
          method: 'POST',
          path: '/items',
          requestSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
              description: { type: 'string' }, // Optional
            },
          },
          timestamp: '2025-01-01T00:01:00Z',
          hash: 'pat2',
        },
      ];

      const patterns = merger.detectPatterns(snapshots);
      expect(patterns.requiredFields).toContain('name');
      expect(patterns.requiredFields).toContain('price');
      expect(patterns.optionalFields).toContain('description');
    });

    it('identifies enum candidates', () => {
      const snapshots: RuntimeSnapshot[] = [
        {
          method: 'GET',
          path: '/orders',
          responseSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'pending' },
            },
          },
          timestamp: '2025-01-01T00:00:00Z',
          hash: 'ord1',
        },
        {
          method: 'GET',
          path: '/orders',
          responseSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'completed' },
            },
          },
          timestamp: '2025-01-01T00:01:00Z',
          hash: 'ord2',
        },
        {
          method: 'GET',
          path: '/orders',
          responseSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'cancelled' },
            },
          },
          timestamp: '2025-01-01T00:02:00Z',
          hash: 'ord3',
        },
      ];

      const patterns = merger.detectPatterns(snapshots);
      expect(patterns.enumCandidates.has('status')).toBe(true);

      const statusValues = patterns.enumCandidates.get('status');
      expect(statusValues?.size).toBe(3);
      expect(statusValues?.has('pending')).toBe(true);
      expect(statusValues?.has('completed')).toBe(true);
      expect(statusValues?.has('cancelled')).toBe(true);
    });
  });

  describe('nested object handling', () => {
    it('merges deeply nested objects', () => {
      const snapshots: RuntimeSnapshot[] = [
        {
          method: 'GET',
          path: '/profile',
          responseSchema: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: {
                    type: 'object',
                    properties: {
                      city: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          timestamp: '2025-01-01T00:00:00Z',
          hash: 'nest1',
        },
        {
          method: 'GET',
          path: '/profile',
          responseSchema: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: {
                    type: 'object',
                    properties: {
                      city: { type: 'string' },
                      zipCode: { type: 'string' }, // Additional nested field
                    },
                  },
                },
              },
            },
          },
          timestamp: '2025-01-01T00:01:00Z',
          hash: 'nest2',
        },
      ];

      const result = merger.mergeSnapshots(snapshots);
      const userSchema = result.responseSchema?.properties?.user as any;
      const addressSchema = userSchema?.properties?.address as any;

      expect(addressSchema.properties).toHaveProperty('city');
      expect(addressSchema.properties).toHaveProperty('zipCode');
      expect(addressSchema.required).toEqual(['city']); // zipCode is optional
    });
  });
});
