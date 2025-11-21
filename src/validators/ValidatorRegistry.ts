import type { ValidatorAdapter, OpenAPISchema } from '../types';
import { ZodAdapter } from './ZodAdapter';
import { JoiAdapter } from './JoiAdapter';
import { YupAdapter } from './YupAdapter';

export class ValidatorRegistry {
  private adapters: Map<string, ValidatorAdapter> = new Map();
  private static instance: ValidatorRegistry | null = null;

  constructor() {
    // Register built-in adapters
    this.register(new ZodAdapter());
    this.register(new JoiAdapter());
    this.register(new YupAdapter());
  }

  static getInstance(): ValidatorRegistry {
    if (!ValidatorRegistry.instance) {
      ValidatorRegistry.instance = new ValidatorRegistry();
    }
    return ValidatorRegistry.instance;
  }

  register(adapter: ValidatorAdapter): void {
    if (this.adapters.has(adapter.name)) {
      console.warn(`Validator adapter "${adapter.name}" is already registered. Overwriting.`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  unregister(name: string): boolean {
    return this.adapters.delete(name);
  }

  getAdapter(name: string): ValidatorAdapter | undefined {
    return this.adapters.get(name);
  }

  getAllAdapters(): ValidatorAdapter[] {
    return Array.from(this.adapters.values());
  }

  detectAndConvert(schema: unknown): OpenAPISchema | null {
    // Try each registered adapter to detect and convert the schema
    for (const adapter of this.adapters.values()) {
      if (adapter.detect(schema)) {
        return adapter.convert(schema);
      }
    }

    return null;
  }

  hasAdapter(name: string): boolean {
    return this.adapters.has(name);
  }

  clear(): void {
    this.adapters.clear();
  }

  reset(): void {
    this.clear();
    // Re-register built-in adapters
    this.register(new ZodAdapter());
    this.register(new JoiAdapter());
    this.register(new YupAdapter());
  }
}

// Export singleton instance for convenience
export const validatorRegistry = ValidatorRegistry.getInstance();
