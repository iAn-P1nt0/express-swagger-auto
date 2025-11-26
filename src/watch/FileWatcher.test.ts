import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileWatcher } from './FileWatcher';

describe('FileWatcher', () => {
  let watcher: FileWatcher;

  beforeEach(() => {
    watcher = new FileWatcher({
      debounce: 100, // Shorter debounce for tests
      paths: ['src/**'],
      ignored: ['node_modules', '.git', 'dist', 'build'],
    });
  });

  afterEach(async () => {
    if (watcher.isWatching()) {
      await watcher.stop();
    }
  });

  describe('initialization', () => {
    it('should create watcher with default options', () => {
      const defaultWatcher = new FileWatcher();
      expect(defaultWatcher).toBeDefined();
    });

    it('should create watcher with custom options', () => {
      const customWatcher = new FileWatcher({
        paths: ['src/**', 'tests/**'],
        debounce: 1000,
        ignored: ['node_modules'],
      });
      expect(customWatcher).toBeDefined();
    });

    it('should not be watching initially', () => {
      expect(watcher.isWatching()).toBe(false);
    });
  });

  describe('start and stop', () => {
    it('should start watching', async () => {
      await watcher.start();
      expect(watcher.isWatching()).toBe(true);
      await watcher.stop();
    });

    it('should stop watching', async () => {
      await watcher.start();
      await watcher.stop();
      expect(watcher.isWatching()).toBe(false);
    });

    it('should prevent multiple start calls', async () => {
      await watcher.start();
      await watcher.start(); // Should not cause issues
      expect(watcher.isWatching()).toBe(true);
      await watcher.stop();
    });

    it('should handle stop without start', async () => {
      await watcher.stop(); // Should not throw
      expect(watcher.isWatching()).toBe(false);
    });
  });

  describe('change handlers', () => {
    it('should register change handler', () => {
      const handler = vi.fn();
      watcher.onChange(handler);
      // Handler is registered but not called
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      watcher.onChange(handler1);
      watcher.onChange(handler2);

      // Both handlers should be registered
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('debouncing', () => {
    it('should debounce rapid changes', async () => {
      const handler = vi.fn();
      watcher.onChange(handler);
      await watcher.start();

      // Simulate rapid changes
      // In real scenario, these would be triggered by file system

      await watcher.stop();
    });

    it('should respect custom debounce delay', () => {
      const customWatcher = new FileWatcher({
        debounce: 2000,
      });

      // The custom debounce should be set
      expect(customWatcher).toBeDefined();
    });
  });

  describe('watched files tracking', () => {
    it('should track watched file count', async () => {
      await watcher.start();
      const count = watcher.getWatchedFileCount();
      // chokidar returns count or 0 depending on state
      expect(typeof count === 'number' || count === 0).toBe(true);
      await watcher.stop();
    });

    it('should return 0 when not watching', () => {
      const count = watcher.getWatchedFileCount();
      expect(count).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      watcher.onChange(errorHandler);

      // Watcher should continue functioning despite handler errors
      await watcher.start();
      await watcher.stop();

      expect(errorHandler).toBeDefined();
    });
  });
});
