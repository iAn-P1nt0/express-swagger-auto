/**
 * File Watcher - Watch for file changes and regenerate specs
 *
 * Features:
 * - Debounced file watching (500ms default)
 * - Configurable watch patterns
 * - Change event reporting
 * - Graceful shutdown
 */

/* eslint-disable no-console */
const chokidar = require('chokidar');
import type { FSWatcher } from 'chokidar';

export interface WatcherOptions {
  /**
   * Paths to watch (glob patterns)
   * @default ['src/**']
   */
  paths?: string[];

  /**
   * Debounce delay in milliseconds
   * @default 500
   */
  debounce?: number;

  /**
   * Files to ignore
   * @default ['node_modules', '.git', 'dist', 'build']
   */
  ignored?: string[];

  /**
   * Initial delay before starting watch
   * @default 100
   */
  initialDelay?: number;
}

export type ChangeHandler = (eventType: 'add' | 'change' | 'unlink', path: string) => void | Promise<void>;

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay: number;
  private changeHandlers: ChangeHandler[] = [];
  private watchPaths: string[];
  private ignoredPatterns: string[];
  private isInitializing = false;

  constructor(options: WatcherOptions = {}) {
    this.watchPaths = options.paths || ['src/**'];
    this.debounceDelay = options.debounce || 500;
    this.ignoredPatterns = options.ignored || [
      'node_modules',
      '.git',
      'dist',
      'build',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.map',
    ];
  }

  /**
   * Start watching files
   */
  async start(): Promise<void> {
    if (this.isInitializing || this.watcher) {
      return;
    }

    this.isInitializing = true;

    try {
      this.watcher = chokidar.watch(this.watchPaths, {
        ignored: this.ignoredPatterns,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100,
        },
      });

      this.watcher?.on('add', (path: string) => this.onFileChange('add', path));
      this.watcher?.on('change', (path: string) => this.onFileChange('change', path));
      this.watcher?.on('unlink', (path: string) => this.onFileChange('unlink', path));

      this.watcher?.on('error', (error: Error) => {
        console.error(`Watcher error: ${error.message}`);
      });

      this.watcher?.on('ready', () => {
        console.log('File watcher ready');
      });
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Register a change handler
   */
  onChange(handler: ChangeHandler): void {
    this.changeHandlers.push(handler);
  }

  /**
   * Handle file changes with debouncing
   */
  private onFileChange(eventType: 'add' | 'change' | 'unlink', path: string): void {
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(async () => {
      try {
        for (const handler of this.changeHandlers) {
          await handler(eventType, path);
        }
      } catch (error) {
        console.error(`Error in change handler: ${(error as any).message}`);
      }
      this.debounceTimer = null;
    }, this.debounceDelay);
  }

  /**
   * Check if watcher is active
   */
  isWatching(): boolean {
    return this.watcher !== null && this.watcher !== undefined;
  }

  /**
   * Get number of files being watched
   */
  getWatchedFileCount(): number {
    if (!this.watcher || !this.watcher.getWatched) return 0;
    try {
      const watched = this.watcher.getWatched();
      if (!watched) return 0;
      const keys = Object.keys(watched);
      return keys.reduce((sum, key) => sum + watched[key].length, 0);
    } catch {
      return 0;
    }
  }
}

/**
 * Convenient function for starting file watch
 */
export async function watchFiles(
  paths: string[],
  onChange: ChangeHandler,
  options: Partial<WatcherOptions> = {}
): Promise<FileWatcher> {
  const watcher = new FileWatcher({
    paths,
    ...options,
  });

  watcher.onChange(onChange);
  await watcher.start();

  return watcher;
}
