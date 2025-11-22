# Phase 4 Roadmap: Production Polish

**Start Date**: 2025-11-22
**Target Completion**: 4-6 weeks
**Status**: Ready to begin

---

## Overview

Phase 4 focuses on production hardening, performance optimization, and developer experience polish. The core functionality from Phases 1-3 is complete and tested. Phase 4 will make the package production-ready.

---

## Success Criteria

### Performance Budgets
- [ ] Route discovery: O(n) maintained for 100+ routes
- [ ] Spec generation: <50ms for 100-route app
- [ ] JSDoc parsing: <100ms for 50 source files
- [ ] CLI file watching: Debounce ≥500ms, throttle ≤1Hz
- [ ] Memory usage: <50MB for typical app
- [ ] Package size: <500KB (excluding peer deps)

### Quality Gates
- [ ] Test coverage: ≥85% for `src/core/*`
- [ ] Zero critical security vulnerabilities
- [ ] CLI works on macOS, Linux, Windows
- [ ] Node 16, 18, 20, 22 compatibility
- [ ] Express 4.x and 5.x compatibility
- [ ] TypeScript 4.5+ compatibility

### Feature Completeness
- [ ] All CLI commands functional
- [ ] Security detection working
- [ ] Hot reload implemented
- [ ] Migration tools available
- [ ] Documentation complete

---

## Milestone 1: Performance Baseline & Optimization (Week 1-2)

### 1.1 Establish Performance Benchmarks

**Goal**: Measure current performance and identify bottlenecks

#### Tasks
- [ ] Create benchmark suite in `benchmarks/`
  - [ ] Route discovery benchmark (10, 50, 100, 500 routes)
  - [ ] Spec generation benchmark
  - [ ] JSDoc parsing benchmark
  - [ ] Memory usage profiling
  - [ ] Package size analysis

- [ ] Add benchmark scripts to package.json
  ```json
  {
    "bench": "node benchmarks/run.js",
    "bench:profile": "node --prof benchmarks/run.js",
    "bench:memory": "node --max-old-space-size=128 benchmarks/run.js"
  }
  ```

- [ ] Create test apps for benchmarking
  - [ ] `benchmarks/apps/small-app.ts` (10 routes)
  - [ ] `benchmarks/apps/medium-app.ts` (50 routes)
  - [ ] `benchmarks/apps/large-app.ts` (100 routes)
  - [ ] `benchmarks/apps/xlarge-app.ts` (500 routes)

#### Acceptance Criteria
- Benchmark suite runs and produces JSON output
- Baseline metrics documented in `PERFORMANCE.md`
- Identified top 3 performance bottlenecks

---

### 1.2 Route Discovery Optimization

**Goal**: Maintain O(n) performance, reduce constant factors

#### Tasks
- [ ] Add caching for repeated discoveries
  - [ ] Cache layer metadata by reference
  - [ ] Clear cache on app changes
  - [ ] LRU cache with size limit

- [ ] Optimize nested router traversal
  - [ ] Reduce regexp parsing overhead
  - [ ] Cache path normalization results
  - [ ] Lazy evaluation of metadata

- [ ] Add performance tests
  - [ ] Test with deep nesting (10+ levels)
  - [ ] Test with many routers (50+)
  - [ ] Test with complex regex routes

#### Acceptance Criteria
- RouteDiscovery completes in <10ms for 100 routes
- Memory usage <5MB for route metadata
- Tests pass for 500+ route apps

---

### 1.3 Spec Generation Optimization

**Goal**: Generate OpenAPI spec in <50ms for 100-route app

#### Tasks
- [ ] Implement lazy schema resolution
  - [ ] Defer validator adapter calls until needed
  - [ ] Cache schema conversions
  - [ ] Share schema references (components/schemas)

- [ ] Optimize spec serialization
  - [ ] Reduce JSON.stringify calls
  - [ ] Pre-allocate buffers for large specs
  - [ ] Stream output for file writes

- [ ] Add incremental generation
  - [ ] Track changed routes
  - [ ] Regenerate only affected paths
  - [ ] Merge with cached spec

#### Acceptance Criteria
- SpecGenerator.generate() completes in <50ms for 100 routes
- Incremental generation 10x faster for single route change
- Spec output is valid OpenAPI 3.1

---

### 1.4 JSDoc Parser Optimization

**Goal**: Parse 50 source files in <100ms

#### Tasks
- [ ] Implement file-based caching
  - [ ] Cache key: file path + mtime + size
  - [ ] Store parsed metadata in `.cache/` directory
  - [ ] Invalidate on file change
  - [ ] Add cache size limits (max 100MB)

- [ ] Add parallel file processing
  - [ ] Use worker threads for large codebases
  - [ ] Process files in batches
  - [ ] Configurable concurrency (default: CPU cores)

- [ ] Optimize comment extraction
  - [ ] Stream-based parsing for large files
  - [ ] Skip files without JSDoc markers
  - [ ] Early exit on parse errors

#### Acceptance Criteria
- JSDocParser.parse() completes in <100ms for 50 files
- Cache hit provides 100x speedup
- Parallel processing scales linearly with cores

---

## Milestone 2: CLI Implementation (Week 2-3)

### 2.1 Generate Command

**Priority**: HIGH

#### Tasks
- [ ] Implement `express-swagger-auto generate`
  ```typescript
  // src/cli/commands/generate.ts
  interface GenerateOptions {
    input: string;      // Entry file (default: ./src/app.ts)
    output: string;     // Output path (default: ./openapi.json)
    watch: boolean;     // Watch mode
    format: 'json' | 'yaml';
    strategies: ('decorator' | 'jsdoc' | 'runtime')[];
    jsDocPatterns?: string[];
  }
  ```

- [ ] Add CLI argument parsing
  - Use `commander` or `yargs`
  - Validate file paths
  - Show progress spinner
  - Pretty-print errors

- [ ] Implement dynamic app loading
  - [ ] Require/import Express app
  - [ ] Handle both default and named exports
  - [ ] Support TypeScript via `tsx` or `ts-node`
  - [ ] Handle async app initialization

- [ ] Add watch mode
  - [ ] Use `chokidar` for file watching
  - [ ] Debounce: 500ms
  - [ ] Throttle: 1Hz max
  - [ ] Show diff on changes

- [ ] Add tests
  - [ ] Unit tests for CLI parsing
  - [ ] E2E tests with fixture apps
  - [ ] Test watch mode behavior

#### Acceptance Criteria
- `generate` command works on all example apps
- Watch mode regenerates on file changes
- Errors display helpful messages
- Progress feedback during generation

---

### 2.2 Validate Command

**Priority**: HIGH

#### Tasks
- [ ] Implement `express-swagger-auto validate`
  ```typescript
  interface ValidateOptions {
    spec: string;           // Spec file path
    strict: boolean;        // Strict mode
    security: boolean;      // Check security practices
    format: 'table' | 'json';
  }
  ```

- [ ] Add OpenAPI schema validation
  - [ ] Use `ajv` + OpenAPI 3.1 schema
  - [ ] Validate paths, components, schemas
  - [ ] Check for required fields
  - [ ] Detect invalid references

- [ ] Add security best practices checker
  - [ ] Warn on missing security schemes
  - [ ] Detect unauthenticated endpoints
  - [ ] Check for sensitive data in examples
  - [ ] Recommend HTTPS-only

- [ ] Add consistency checks
  - [ ] Parameter name consistency
  - [ ] Response schema consistency
  - [ ] Tag usage consistency
  - [ ] Example validity

- [ ] Pretty output formatting
  - [ ] Table format (default)
  - [ ] JSON format for CI
  - [ ] Color-coded severity
  - [ ] Summary stats

#### Acceptance Criteria
- Validates valid OpenAPI 3.0 and 3.1 specs
- Detects common errors with helpful messages
- Security checker identifies 10+ best practices
- Exit code 0 on success, 1 on validation errors

---

### 2.3 Serve Command

**Priority**: MEDIUM

#### Tasks
- [ ] Implement `express-swagger-auto serve`
  ```typescript
  interface ServeOptions {
    spec: string;     // Spec file or URL
    port: number;     // Port (default: 3000)
    watch: boolean;   // Watch spec file
    open: boolean;    // Open browser
  }
  ```

- [ ] Create standalone server
  - [ ] Express app with Swagger UI only
  - [ ] Serve spec at /openapi.json
  - [ ] Custom HTML page
  - [ ] CORS enabled

- [ ] Add live reload
  - [ ] Watch spec file for changes
  - [ ] WebSocket connection to browser
  - [ ] Auto-refresh Swagger UI
  - [ ] Show toast on reload

- [ ] Add browser open
  - [ ] Use `open` package
  - [ ] Detect default browser
  - [ ] Fallback to URL in console

#### Acceptance Criteria
- Serves Swagger UI on specified port
- Live reload works on spec changes
- Browser opens automatically with `--open`
- Graceful shutdown on Ctrl+C

---

### 2.4 Migrate Command

**Priority**: LOW

#### Tasks
- [ ] Implement `express-swagger-auto migrate`
  ```typescript
  interface MigrateOptions {
    source: 'swagger-jsdoc' | 'tsoa' | 'express-oas-generator';
    config?: string;        // Source config file
    output: string;         // Migration guide output
    dryRun: boolean;
  }
  ```

- [ ] swagger-jsdoc migration
  - [ ] Parse swagger-jsdoc config
  - [ ] Map JSDoc format differences
  - [ ] Generate migration guide
  - [ ] Convert route definitions

- [ ] tsoa migration
  - [ ] Parse tsoa decorators
  - [ ] Map to express-swagger-auto decorators
  - [ ] Generate migration guide
  - [ ] Identify manual steps

- [ ] express-oas-generator migration
  - [ ] Identify runtime capture usage
  - [ ] Map to runtimeCapture middleware
  - [ ] Generate migration guide

#### Acceptance Criteria
- Generates migration guide markdown
- Identifies incompatible features
- Provides code examples
- Links to documentation

---

## Milestone 3: Security Detection (Week 3-4)

### 3.1 Security Scheme Auto-Detection

**Goal**: Automatically detect and document security schemes

#### Tasks
- [ ] JWT/Bearer token detection
  - [ ] Scan middleware for `authorization` header checks
  - [ ] Detect `jwt.verify()` calls
  - [ ] Identify bearer token patterns
  - [ ] Auto-generate Bearer security scheme

- [ ] API key detection
  - [ ] Detect API key in headers/query
  - [ ] Common names: `x-api-key`, `apikey`, `key`
  - [ ] Auto-generate API key security scheme

- [ ] OAuth2 detection
  - [ ] Identify OAuth middleware
  - [ ] Detect authorization flows
  - [ ] Map scopes from middleware

- [ ] Add configuration
  ```typescript
  interface SecurityDetectionConfig {
    enabled: boolean;
    detectJWT: boolean;
    detectAPIKey: boolean;
    detectOAuth: boolean;
    customPatterns?: RegExp[];
  }
  ```

#### Acceptance Criteria
- Detects JWT middleware (jsonwebtoken, passport-jwt)
- Detects API key middleware (custom, express-api-key)
- Generates correct security schemes
- Configurable detection patterns

---

### 3.2 Sensitive Data Sanitization

**Goal**: Enhanced security for runtime capture

#### Tasks
- [ ] Configurable field patterns
  - [ ] Default patterns: password, token, secret, key, auth, bearer, api_key
  - [ ] Support regex patterns
  - [ ] Case-insensitive matching
  - [ ] Deep object scanning

- [ ] Custom sanitizer functions
  ```typescript
  interface SanitizerConfig {
    fields: string[] | RegExp[];
    customSanitizer?: (key: string, value: any) => any;
    placeholder?: string; // default: '[REDACTED]'
  }
  ```

- [ ] Add tests for sanitization
  - [ ] Nested objects
  - [ ] Arrays of objects
  - [ ] Query parameters
  - [ ] Headers

#### Acceptance Criteria
- Sanitizes 20+ common sensitive field names
- Supports custom patterns
- Works with nested objects (10+ levels)
- Performance impact <1ms per request

---

### 3.3 Security Best Practices Validator

**Goal**: Validate security best practices in generated specs

#### Tasks
- [ ] Implement security checks
  - [ ] Warn on unauthenticated endpoints
  - [ ] Detect missing security schemes
  - [ ] Check for sensitive data in examples
  - [ ] Recommend HTTPS-only
  - [ ] Validate CORS configuration
  - [ ] Check for rate limiting

- [ ] Add severity levels
  - [ ] ERROR: Critical security issues
  - [ ] WARN: Best practice violations
  - [ ] INFO: Recommendations

- [ ] Integration with validate command
  ```bash
  express-swagger-auto validate --security ./openapi.json
  ```

#### Acceptance Criteria
- Identifies 10+ security best practices
- Clear error messages with remediation
- Configurable severity thresholds
- JSON output for CI pipelines

---

## Milestone 4: Hot Reload & Watch Mode (Week 4-5)

### 4.1 File Watching Infrastructure

#### Tasks
- [ ] Implement file watcher
  - [ ] Use `chokidar` for cross-platform support
  - [ ] Watch source files and routes
  - [ ] Debounce: 500ms (configurable)
  - [ ] Throttle: 1Hz max

- [ ] Incremental regeneration
  - [ ] Track file → route mapping
  - [ ] Regenerate only changed routes
  - [ ] Merge with cached spec
  - [ ] Notify watchers of changes

- [ ] Add configuration
  ```typescript
  interface WatchConfig {
    enabled: boolean;
    debounce: number;      // ms
    throttle: number;      // Hz
    patterns: string[];    // glob patterns
    ignored: string[];     // ignore patterns
  }
  ```

#### Acceptance Criteria
- Watches source files for changes
- Debounce prevents rapid rebuilds
- Throttle limits rebuild frequency
- Works on macOS, Linux, Windows

---

### 4.2 Live Swagger UI Refresh

#### Tasks
- [ ] WebSocket server
  - [ ] Embed in Swagger UI middleware
  - [ ] Send `spec-updated` events
  - [ ] Handle client reconnection

- [ ] Browser client
  - [ ] WebSocket client in Swagger UI HTML
  - [ ] Auto-reconnect on disconnect
  - [ ] Toast notification on update
  - [ ] Smooth UI refresh

- [ ] Add configuration
  ```typescript
  interface LiveReloadConfig {
    enabled: boolean;
    websocketPort?: number;
    notificationDuration: number;
  }
  ```

#### Acceptance Criteria
- Browser refreshes on spec changes
- Toast notification appears
- No page reload (smooth refresh)
- Works with generate --watch and serve --watch

---

## Milestone 5: Testing & Documentation (Week 5-6)

### 5.1 Comprehensive Testing

#### Tasks
- [ ] Performance tests
  - [ ] Benchmark suite in CI
  - [ ] Performance regression detection
  - [ ] Memory leak detection

- [ ] CLI e2e tests
  - [ ] Test all CLI commands
  - [ ] Test with example apps
  - [ ] Test watch mode
  - [ ] Test error handling

- [ ] Cross-platform tests
  - [ ] Test on macOS (GitHub Actions)
  - [ ] Test on Linux (GitHub Actions)
  - [ ] Test on Windows (GitHub Actions)

- [ ] Compatibility tests
  - [ ] Node 16, 18, 20, 22
  - [ ] Express 4.x and 5.x
  - [ ] TypeScript 4.5, 5.0, 5.3

- [ ] Coverage improvements
  - [ ] Target: ≥85% for src/core/*
  - [ ] Add missing edge case tests
  - [ ] Test error paths

#### Acceptance Criteria
- All tests pass on all platforms
- Coverage ≥85% for core modules
- Performance benchmarks pass
- No memory leaks detected

---

### 5.2 Documentation Updates

#### Tasks
- [ ] Update README.md
  - [ ] Mark Phase 3 as complete
  - [ ] Add Phase 4 features
  - [ ] Update CLI examples
  - [ ] Add performance notes

- [ ] Update jsdoc-example README
  - [ ] Remove "Phase 3 pending" notes
  - [ ] Confirm JSDoc parser working
  - [ ] Add advanced examples

- [ ] Create new docs
  - [ ] `docs/CLI.md` - CLI usage guide
  - [ ] `docs/PERFORMANCE.md` - Performance tuning
  - [ ] `docs/SECURITY.md` - Security best practices
  - [ ] `docs/MIGRATION.md` - Migration guides
  - [ ] `docs/TROUBLESHOOTING.md` - Common issues

- [ ] Update CLAUDE.md
  - [ ] Add Phase 4 guardrails
  - [ ] Update decision rules
  - [ ] Add performance budgets

- [ ] API documentation
  - [ ] Generate TypeDoc
  - [ ] Add code examples
  - [ ] Document all config options

#### Acceptance Criteria
- All Phase 4 features documented
- CLI usage examples complete
- Migration guides for 3 tools
- Performance tuning guide available

---

### 5.3 Example Apps Enhancement

#### Tasks
- [ ] Add security-example
  - [ ] JWT authentication
  - [ ] API key validation
  - [ ] OAuth2 integration
  - [ ] Security scheme detection

- [ ] Add performance-example
  - [ ] 100+ routes
  - [ ] Demonstrate caching
  - [ ] Show incremental generation

- [ ] Update all examples
  - [ ] Add CLI usage instructions
  - [ ] Add watch mode examples
  - [ ] Add validation examples

#### Acceptance Criteria
- 5 working example apps
- All examples documented
- All examples pass CI tests

---

## Timeline

### Week 1: Performance Baseline
- Create benchmark suite
- Establish baselines
- Identify bottlenecks

### Week 2: Performance Optimization + CLI Start
- Optimize route discovery
- Optimize spec generation
- Implement generate command

### Week 3: CLI Completion + Security Start
- Implement validate command
- Implement serve command
- Start security detection

### Week 4: Security + Hot Reload
- Complete security features
- Implement file watching
- Implement live reload

### Week 5: Testing + Migration
- CLI e2e tests
- Implement migrate command
- Cross-platform testing

### Week 6: Documentation + Polish
- Complete all documentation
- Example apps enhancement
- Final testing & validation

---

## Dependencies

### New Dependencies to Add
```json
{
  "dependencies": {
    "chokidar": "^3.5.3",      // File watching
    "ws": "^8.14.2"            // WebSocket for live reload
  },
  "devDependencies": {
    "commander": "^11.1.0",    // CLI framework (or yargs)
    "autocannon": "^7.12.0",   // Benchmarking
    "clinic": "^13.0.0",       // Profiling
    "0x": "^5.5.0",           // Flamegraph profiling
    "@types/ws": "^8.5.8"
  }
}
```

### Peer Dependencies (Already Defined)
- express: ^4.18.0 || ^5.0.0
- zod: ^3.0.0 (optional)
- joi: ^17.0.0 (optional)
- yup: ^1.0.0 (optional)

---

## Risk Mitigation

### Performance Risks
- **Risk**: Phase 4 optimizations break functionality
- **Mitigation**: Comprehensive benchmark suite, regression tests

### CLI Risks
- **Risk**: Dynamic app loading fails on complex setups
- **Mitigation**: Support multiple load strategies, clear error messages

### Security Risks
- **Risk**: False positives in security detection
- **Mitigation**: Configurable detection, allow disable per-endpoint

### Watch Mode Risks
- **Risk**: File watching causes high CPU usage
- **Mitigation**: Proper debounce/throttle, configurable limits

---

## Success Metrics

### Performance Metrics
- Route discovery: <10ms for 100 routes
- Spec generation: <50ms for 100 routes
- JSDoc parsing: <100ms for 50 files
- Package size: <500KB

### Quality Metrics
- Test coverage: ≥85% for core
- All tests pass on 3 platforms
- Zero critical vulnerabilities
- Documentation complete

### User Experience Metrics
- CLI commands work out-of-the-box
- Clear error messages
- Live reload <1s latency
- Examples demonstrate all features

---

## Post-Phase 4 Validation

Before marking Phase 4 complete, validate:

1. ✅ All CLI commands functional (generate, validate, serve, migrate)
2. ✅ Performance budgets met (<50ms for 100 routes)
3. ✅ Security detection working (JWT, API key, OAuth)
4. ✅ Hot reload implemented and tested
5. ✅ Test coverage ≥85% for core modules
6. ✅ Documentation complete and accurate
7. ✅ Example apps working and documented
8. ✅ CI/CD pipeline passing on all platforms
9. ✅ No critical security vulnerabilities
10. ✅ Package ready for npm publish

---

## Next: Phase 5

Upon completion of Phase 4, proceed to Phase 5 (Release):
- Create docs site
- Set up CI/CD pipeline
- npm publish preparation
- Community setup
- Marketing and promotion

---

**Document Maintained By**: Claude Code Agent
**Last Updated**: 2025-11-22
