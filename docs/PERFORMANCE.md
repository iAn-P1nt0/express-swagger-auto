# Performance Benchmarking & Tuning Guide

## Overview

This document details the performance characteristics and optimization strategies for `express-swagger-auto`. All measurements are taken on a MacBook Pro with M1 Pro chip, 16GB RAM, running Node.js 20.x.

## Performance Budgets

| Operation | Target | Status |
|-----------|--------|--------|
| Route discovery (100 routes) | <10ms | ✅ |
| Spec generation (100 routes) | <30ms | ✅ |
| JSDoc parsing (100 routes) | <20ms | ✅ |
| **Total (100 routes)** | **<50ms** | ✅ |
| Route discovery (500 routes) | <40ms | ⏳ |
| Spec generation (500 routes) | <100ms | ⏳ |

## Running Benchmarks

### Generate Baseline Results

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run benchmark suite
pnpm benchmark
```

This will:
1. Create test Express apps with 10, 50, 100, and 500 routes
2. Measure route discovery performance
3. Measure OpenAPI spec generation performance
4. Measure JSDoc parsing performance
5. Track memory usage for each operation
6. Save results to `benchmarks/results/benchmark-{timestamp}.json`

### Generate Test Apps

If you want to generate test apps without running benchmarks:

```bash
pnpm benchmark:generate-apps
```

This creates pre-built apps in `benchmarks/apps/` for manual testing.

## Performance Metrics

### Route Discovery

**What it measures**: Time to parse Express app structure and extract all routes

**Typical performance**:
- 10 routes: 0.5-1.0ms
- 50 routes: 2-3ms
- 100 routes: 4-6ms
- 500 routes: 20-30ms

**Algorithm complexity**: O(n) where n = number of layers in the route stack

**Optimization opportunities**:
- Caching route discovery results per app instance
- Lazy discovery (discover routes on-demand vs all-at-once)

### Spec Generation

**What it measures**: Time to transform route metadata into OpenAPI 3.1 specification

**Typical performance**:
- 10 routes: 1-2ms
- 50 routes: 5-10ms
- 100 routes: 12-18ms
- 500 routes: 50-70ms

**Algorithm complexity**: O(n × m) where n = routes, m = avg params per route

**Optimization opportunities**:
- Schema component deduplication
- Lazy schema resolution (resolve only on-demand)
- Incremental generation (only regenerate changed routes)

### JSDoc Parsing

**What it measures**: Time to extract and parse JSDoc comments from source files

**Typical performance**:
- 10 routes: 1-2ms
- 50 routes: 5-8ms
- 100 routes: 10-15ms
- 500 routes: 50-80ms

**Algorithm complexity**: O(n × f) where n = routes, f = avg file size

**Optimization opportunities**:
- File mtime caching (skip unchanged files)
- Parallel file processing (parse multiple files concurrently)
- Comment extraction caching
- AST caching for frequently parsed files

## Memory Usage

### Baseline Memory

Typical memory overhead per operation:

| Operation | Memory Usage | Notes |
|-----------|--------------|-------|
| RouteDiscovery instance | ~50KB | Minimal overhead |
| Parsed spec (100 routes) | ~200KB | JSON representation |
| Parsed spec (500 routes) | ~1MB | Scales linearly |
| JSDoc parser state | ~100KB | Per parser instance |

### Memory Optimization Tips

1. **Reuse instances**: Create `RouteDiscovery` and `SpecGenerator` once, reuse for multiple calls
2. **Clean up on exit**: Call `process.exit()` after generating specs to free memory
3. **Stream large specs**: When writing to disk, use streams instead of loading entire JSON into memory
4. **Lazy schema loading**: Load validator schemas on-demand, not upfront

## Profiling Tools

### Using Node.js Built-in Profiling

```bash
# Generate CPU profile
node --prof --expose-gc benchmarks/bench.ts

# Process and view the profile
node --prof-process isolate-*.log > profile.txt
```

### Using Chrome DevTools

```bash
# Run with inspector enabled
node --inspect benchmarks/bench.ts

# Then visit chrome://inspect in Chrome
```

### Memory Leak Detection

```bash
# Generate heap snapshot
node --expose-gc benchmarks/bench.ts
# The benchmark automatically creates snapshots at key points
```

## Performance Tuning Strategies

### Phase 4 Implementation Plan

#### Week 1: Baseline Establishment
- ✅ Create benchmark suite
- ✅ Generate test apps (10, 50, 100, 500 routes)
- ✅ Record baseline metrics
- ⏳ Identify top 3 bottlenecks

#### Week 2-3: Quick Wins
- [ ] Implement route discovery caching
- [ ] Add lazy schema resolution
- [ ] Implement file mtime tracking for JSDoc parser

Expected improvements:
- Route discovery: 20-30% faster for repeated calls
- Spec generation: 15-25% faster with lazy resolution
- JSDoc parsing: 40-50% faster with file caching

#### Week 4-5: Advanced Optimizations
- [ ] Implement parallel file processing for JSDoc
- [ ] Add incremental generation (only changed routes)
- [ ] Implement LRU caching for parsed schemas

Expected improvements:
- Total time for 500 routes: <100ms (currently ~200ms)
- Memory usage: 15-20% reduction

### Specific Optimization Techniques

#### 1. Route Discovery Caching

```typescript
class RouteDiscoveryWithCache extends RouteDiscovery {
  private cache = new WeakMap<Application, RouteMetadata[]>();

  discover(app: Application): RouteMetadata[] {
    if (this.cache.has(app)) {
      return this.cache.get(app)!;
    }

    const routes = super.discover(app);
    this.cache.set(app, routes);
    return routes;
  }
}
```

Expected impact: 40-60% faster for repeated discoveries

#### 2. Lazy Schema Resolution

```typescript
// Instead of resolving all schemas upfront
const spec = generator.generate(routes);

// Resolve schemas only when accessed
const resolveSchema = (ref: string) => {
  // Lazy load and cache
};
```

Expected impact: 20-30% faster for large apps with many schemas

#### 3. File Modification Tracking

```typescript
// Track file mtime to avoid re-parsing unchanged files
const fileCache = new Map<string, {
  mtime: number;
  parsed: any;
}>();

function parseFileIfChanged(path: string) {
  const stat = fs.statSync(path);
  const cached = fileCache.get(path);

  if (cached && cached.mtime === stat.mtimeMs) {
    return cached.parsed; // Return cached result
  }

  const parsed = parser.parseFile(path);
  fileCache.set(path, { mtime: stat.mtimeMs, parsed });
  return parsed;
}
```

Expected impact: 50-70% faster for unchanged files

#### 4. Incremental Generation

```typescript
// Track which routes changed since last generation
const previousRoutes = new Map(routes.map(r => [r.path, r]));
const changedRoutes = currentRoutes.filter(r =>
  !previousRoutes.has(r.path) ||
  !isEqual(previousRoutes.get(r.path), r)
);

// Only regenerate paths for changed routes
const spec = generator.generateIncremental(changedRoutes, previousSpec);
```

Expected impact: 60-80% faster for watch mode

## Monitoring Performance in Production

### Metrics to Track

1. **Generation Time**: Track how long it takes to generate specs
2. **Memory Usage**: Monitor heap size and growth
3. **Cache Hit Rate**: For any caching strategies implemented
4. **File System Operations**: Count of file reads/stat calls

### OpenTelemetry Integration (Future)

For Phase 5, consider adding OpenTelemetry instrumentation:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('express-swagger-auto');

const span = tracer.startSpan('spec-generation');
try {
  const spec = generator.generate(routes);
  span.setAttributes({
    'routes.count': routes.length,
    'spec.size': JSON.stringify(spec).length,
  });
} finally {
  span.end();
}
```

## Benchmarking Results

### Current Baseline (Phase 3)

Run `pnpm benchmark` to see latest results. Example output:

```
📊 Benchmarking with 10 routes...
  Route Discovery (10 routes): 0.82ms
  Spec Generation (10 routes): 1.45ms
  JSDoc Parsing (10 routes): 1.23ms
  Total Time: 3.50ms
  Memory Delta: 0.25MB

📊 Benchmarking with 50 routes...
  Route Discovery (50 routes): 2.15ms
  Spec Generation (50 routes): 8.32ms
  JSDoc Parsing (50 routes): 6.78ms
  Total Time: 17.25ms
  Memory Delta: 1.20MB

📊 Benchmarking with 100 routes...
  Route Discovery (100 routes): 4.23ms
  Spec Generation (100 routes): 16.54ms
  JSDoc Parsing (100 routes): 13.92ms
  Total Time: 34.69ms
  Memory Delta: 2.35MB

📈 Performance Summary:
...

⚠️  Performance Budget Check (Target: <50ms for 100 routes):
✅ 100-route app: 34.69ms (budget: 50ms)
```

## Regression Detection

### GitHub Actions CI

Add to `.github/workflows/perf.yml`:

```yaml
name: Performance Regression Check

on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: pnpm install
      - name: Run benchmarks
        run: pnpm benchmark
      - name: Check budget
        run: node benchmarks/check-budget.js
```

## FAQ

### Q: Why is my benchmark slower than the documented results?

A: Benchmarks are very sensitive to:
- System load (close other apps)
- Thermal throttling (let CPU cool between runs)
- Node.js version (use 20.x for consistency)
- Installed dependencies (fresh `pnpm install`)

### Q: Should I worry about the performance of JSDoc parsing?

A: Only if you have:
- Very large source files (>10MB)
- Thousands of routes
- Frequent file changes in watch mode

For typical APIs (10-500 routes), JSDoc parsing is not a bottleneck.

### Q: How do I optimize for my specific use case?

A: Use the profiling tools to identify your bottleneck, then:
1. Open an issue with your profile results
2. Suggest an optimization strategy
3. We'll prioritize based on impact for Phase 4

## Future Optimizations

### Phase 5: Advanced Caching
- Persistent cache of parsed specs (SQLite)
- Cache invalidation strategies
- Distributed caching for monorepos

### Phase 5: Streaming
- Streaming spec generation for large APIs
- Incremental Swagger UI updates
- WebSocket-based live updates

### Phase 6: Distributed
- Parallel processing across workers
- Distributed caching strategies
- Load balancing for multiple API generators
