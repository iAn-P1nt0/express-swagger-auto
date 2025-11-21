import { describe, it, expect } from 'vitest';
import { RouteDiscovery } from './RouteDiscovery';

describe('RouteDiscovery', () => {
  it('should initialize without errors', () => {
    const discovery = new RouteDiscovery();
    expect(discovery).toBeDefined();
  });

  it('should return empty routes on initial call', () => {
    const discovery = new RouteDiscovery();
    const routes = discovery.getRoutes();
    expect(routes).toEqual([]);
  });

  it('should handle null app gracefully', () => {
    const discovery = new RouteDiscovery();
    const routes = discovery.discover(null as any);
    expect(routes).toEqual([]);
  });
});
