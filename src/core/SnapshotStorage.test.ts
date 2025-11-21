import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SnapshotStorage } from './SnapshotStorage';
import { existsSync, rmSync } from 'fs';

describe('SnapshotStorage', () => {
  const testDir = './test-snapshots';
  let storage: SnapshotStorage;

  beforeEach(() => {
    storage = new SnapshotStorage({
      enabled: true,
      outputDir: testDir,
      maxSnapshots: 5,
    });
  });

  afterEach(() => {
    storage.clear();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('store', () => {
    it('should store snapshot', () => {
      storage.store({
        method: 'GET',
        path: '/users',
        responseSchema: { type: 'array' },
      });

      const snapshots = storage.getSnapshots('GET', '/users');
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].method).toBe('GET');
      expect(snapshots[0].path).toBe('/users');
    });

    it('should not store duplicate snapshots', () => {
      const snapshot = {
        method: 'GET',
        path: '/users',
        responseSchema: { type: 'array' },
      };

      storage.store(snapshot);
      storage.store(snapshot);

      const snapshots = storage.getSnapshots('GET', '/users');
      expect(snapshots).toHaveLength(1);
    });

    it('should generate unique hashes for different snapshots', () => {
      storage.store({
        method: 'GET',
        path: '/users',
        responseSchema: { type: 'array' },
      });

      storage.store({
        method: 'GET',
        path: '/users',
        responseSchema: { type: 'object' },
      });

      const snapshots = storage.getSnapshots('GET', '/users');
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].hash).not.toBe(snapshots[1].hash);
    });

    it('should limit snapshots per route', () => {
      for (let i = 0; i < 10; i++) {
        storage.store({
          method: 'GET',
          path: '/users',
          responseSchema: { type: 'array', items: { count: i } },
        });
      }

      const snapshots = storage.getSnapshots('GET', '/users');
      expect(snapshots).toHaveLength(5); // maxSnapshots is 5
    });

    it('should add timestamp to snapshot', () => {
      storage.store({
        method: 'GET',
        path: '/users',
      });

      const snapshots = storage.getSnapshots('GET', '/users');
      expect(snapshots[0].timestamp).toBeDefined();
      expect(new Date(snapshots[0].timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('getSnapshots', () => {
    it('should return empty array for non-existent route', () => {
      const snapshots = storage.getSnapshots('GET', '/nonexistent');
      expect(snapshots).toEqual([]);
    });

    it('should return snapshots for specific route', () => {
      storage.store({
        method: 'GET',
        path: '/users',
      });

      storage.store({
        method: 'POST',
        path: '/users',
      });

      const getSnapshots = storage.getSnapshots('GET', '/users');
      const postSnapshots = storage.getSnapshots('POST', '/users');

      expect(getSnapshots).toHaveLength(1);
      expect(postSnapshots).toHaveLength(1);
      expect(getSnapshots[0].method).toBe('GET');
      expect(postSnapshots[0].method).toBe('POST');
    });
  });

  describe('getAllSnapshots', () => {
    it('should return all snapshots', () => {
      storage.store({
        method: 'GET',
        path: '/users',
      });

      storage.store({
        method: 'POST',
        path: '/posts',
      });

      const all = storage.getAllSnapshots();
      expect(all.size).toBe(2);
      expect(all.has('GET:/users')).toBe(true);
      expect(all.has('POST:/posts')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all snapshots', () => {
      storage.store({
        method: 'GET',
        path: '/users',
      });

      expect(storage.getAllSnapshots().size).toBe(1);

      storage.clear();

      expect(storage.getAllSnapshots().size).toBe(0);
    });
  });

  describe('analyzeSchema', () => {
    it('should return null for route with no snapshots', () => {
      const analysis = storage.analyzeSchema('GET', '/nonexistent');
      expect(analysis).toBeNull();
    });

    it('should analyze schema from single snapshot', () => {
      storage.store({
        method: 'GET',
        path: '/users',
        responseSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      });

      const analysis = storage.analyzeSchema('GET', '/users');

      expect(analysis).toBeDefined();
      expect(analysis.sampleCount).toBe(1);
      expect(analysis.responseSchema).toBeDefined();
    });

    it('should merge schemas from multiple snapshots', () => {
      storage.store({
        method: 'GET',
        path: '/users',
        responseSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      });

      storage.store({
        method: 'GET',
        path: '/users',
        responseSchema: {
          type: 'object',
          properties: { age: { type: 'number' } },
        },
      });

      const analysis = storage.analyzeSchema('GET', '/users');

      expect(analysis.sampleCount).toBe(2);
      expect(analysis.responseSchema.properties.name).toBeDefined();
      expect(analysis.responseSchema.properties.age).toBeDefined();
    });
  });

  describe('disabled mode', () => {
    it('should not store when disabled', () => {
      const disabledStorage = new SnapshotStorage({ enabled: false });

      disabledStorage.store({
        method: 'GET',
        path: '/users',
      });

      const snapshots = disabledStorage.getSnapshots('GET', '/users');
      expect(snapshots).toHaveLength(0);
    });
  });
});
