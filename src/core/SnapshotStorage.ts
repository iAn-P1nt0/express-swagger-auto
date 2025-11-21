import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export interface RuntimeSnapshot {
  method: string;
  path: string;
  requestSchema?: any;
  responseSchema?: any;
  timestamp: string;
  hash: string;
}

export interface SnapshotStorageConfig {
  enabled?: boolean;
  outputDir?: string;
  maxSnapshots?: number;
}

export class SnapshotStorage {
  private config: Required<SnapshotStorageConfig>;
  private snapshots: Map<string, RuntimeSnapshot[]> = new Map();

  /** Public options accessor for external use */
  public get options(): Required<SnapshotStorageConfig> {
    return this.config;
  }

  constructor(config: SnapshotStorageConfig = {}) {
    this.config = {
      enabled: config.enabled ?? process.env.NODE_ENV === 'development',
      outputDir: config.outputDir ?? './data/runtime-snapshots',
      maxSnapshots: config.maxSnapshots ?? 100,
    };
  }

  store(snapshot: Omit<RuntimeSnapshot, 'hash' | 'timestamp'>): void {
    if (!this.config.enabled) {
      return;
    }

    const key = `${snapshot.method}:${snapshot.path}`;
    const hash = this.generateHash(snapshot);
    const timestamp = new Date().toISOString();

    const fullSnapshot: RuntimeSnapshot = {
      ...snapshot,
      hash,
      timestamp,
    };

    // Get existing snapshots for this route
    const existing = this.snapshots.get(key) || [];

    // Check if we already have this exact snapshot (by hash)
    const duplicate = existing.find((s) => s.hash === hash);
    if (duplicate) {
      return; // Skip duplicate
    }

    // Add new snapshot
    existing.push(fullSnapshot);

    // Limit number of snapshots per route
    if (existing.length > this.config.maxSnapshots) {
      existing.shift(); // Remove oldest
    }

    this.snapshots.set(key, existing);

    // Persist to disk
    this.persistSnapshot(key, fullSnapshot);
  }

  getSnapshots(method: string, path: string): RuntimeSnapshot[] {
    const key = `${method}:${path}`;
    return this.snapshots.get(key) || [];
  }

  getAllSnapshots(): Map<string, RuntimeSnapshot[]> {
    return new Map(this.snapshots);
  }

  clear(): void {
    this.snapshots.clear();
  }

  private generateHash(snapshot: Omit<RuntimeSnapshot, 'hash' | 'timestamp'>): string {
    const content = JSON.stringify({
      method: snapshot.method,
      path: snapshot.path,
      requestSchema: snapshot.requestSchema,
      responseSchema: snapshot.responseSchema,
    });

    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private persistSnapshot(key: string, snapshot: RuntimeSnapshot): void {
    try {
      // Ensure output directory exists
      if (!existsSync(this.config.outputDir)) {
        mkdirSync(this.config.outputDir, { recursive: true });
      }

      // Create safe filename from route key
      const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeKey}_${snapshot.hash}.json`;
      const filepath = join(this.config.outputDir, filename);

      // Write snapshot to file
      writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (error) {
      console.error('[SnapshotStorage] Failed to persist snapshot:', error);
    }
  }

  loadSnapshots(): void {
    try {
      if (!existsSync(this.config.outputDir)) {
        return;
      }

      const fs = require('fs');
      const files = fs.readdirSync(this.config.outputDir);

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        const filepath = join(this.config.outputDir, file);
        const content = readFileSync(filepath, 'utf-8');
        const snapshot: RuntimeSnapshot = JSON.parse(content);

        const key = `${snapshot.method}:${snapshot.path}`;
        const existing = this.snapshots.get(key) || [];
        existing.push(snapshot);
        this.snapshots.set(key, existing);
      }
    } catch (error) {
      console.error('[SnapshotStorage] Failed to load snapshots:', error);
    }
  }

  analyzeSchema(method: string, path: string): any {
    const snapshots = this.getSnapshots(method, path);

    if (snapshots.length === 0) {
      return null;
    }

    // Merge schemas from all snapshots to infer complete schema
    const requestSchemas = snapshots
      .map((s) => s.requestSchema)
      .filter((s) => s !== undefined && s !== null);

    const responseSchemas = snapshots
      .map((s) => s.responseSchema)
      .filter((s) => s !== undefined && s !== null);

    return {
      requestSchema: this.mergeSchemas(requestSchemas),
      responseSchema: this.mergeSchemas(responseSchemas),
      sampleCount: snapshots.length,
      lastUpdated: snapshots[snapshots.length - 1]?.timestamp,
    };
  }

  private mergeSchemas(schemas: any[]): any {
    if (schemas.length === 0) {
      return null;
    }

    if (schemas.length === 1) {
      return schemas[0];
    }

    // Basic schema merging - combine all observed properties
    const merged: any = {
      type: 'object',
      properties: {},
    };

    for (const schema of schemas) {
      if (schema && typeof schema === 'object' && schema.properties) {
        Object.assign(merged.properties, schema.properties);
      }
    }

    return merged;
  }
}
