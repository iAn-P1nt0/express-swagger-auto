# Phase 4 Tasks - Quick Reference

**Use this for step-by-step execution of Phase 4**

---

## Week 1: Performance Baseline

### Day 1-2: Setup Benchmarks
- [ ] Create `benchmarks/` directory structure
- [ ] Create `benchmarks/run.js` benchmark runner
- [ ] Add benchmark scripts to package.json
- [ ] Install `autocannon` and `clinic` (dev deps)

### Day 3-4: Create Test Apps
- [ ] `benchmarks/apps/small-app.ts` (10 routes)
- [ ] `benchmarks/apps/medium-app.ts` (50 routes)
- [ ] `benchmarks/apps/large-app.ts` (100 routes)
- [ ] `benchmarks/apps/xlarge-app.ts` (500 routes)

### Day 5: Run Baselines
- [ ] Run route discovery benchmark
- [ ] Run spec generation benchmark
- [ ] Run JSDoc parsing benchmark
- [ ] Run memory profiling
- [ ] Create `PERFORMANCE.md` with results
- [ ] Identify top 3 bottlenecks

---

## Week 2: Performance Optimization + CLI Start

### Day 1-2: Route Discovery Optimization
- [ ] Implement layer metadata caching
- [ ] Optimize nested router traversal
- [ ] Cache path normalization
- [ ] Add performance tests
- [ ] Verify <10ms for 100 routes

### Day 3-4: Spec Generation Optimization
- [ ] Implement lazy schema resolution
- [ ] Cache validator adapter conversions
- [ ] Optimize spec serialization
- [ ] Add incremental generation
- [ ] Verify <50ms for 100 routes

### Day 5: Start CLI
- [ ] Install `commander` CLI framework
- [ ] Create `src/cli/commands/` directory
- [ ] Refactor `src/cli.ts` to use commander
- [ ] Add version and help commands

---

## Week 3: CLI Generate & Validate

### Day 1-3: Generate Command
- [ ] Create `src/cli/commands/generate.ts`
- [ ] Implement CLI argument parsing
- [ ] Implement dynamic app loading (require/import)
- [ ] Add TypeScript support (tsx/ts-node)
- [ ] Add progress indicators
- [ ] Test with all example apps
- [ ] Add e2e tests

### Day 4-5: Validate Command
- [ ] Create `src/cli/commands/validate.ts`
- [ ] Install `ajv` for OpenAPI validation
- [ ] Implement schema validation
- [ ] Implement consistency checks
- [ ] Add pretty output formatting
- [ ] Add tests

---

## Week 4: Security Detection

### Day 1-2: Security Scheme Detection
- [ ] Implement JWT/Bearer detection
- [ ] Implement API key detection
- [ ] Implement OAuth2 detection
- [ ] Add configuration options
- [ ] Add tests

### Day 3: Enhanced Sanitization
- [ ] Configurable field patterns
- [ ] Custom sanitizer functions
- [ ] Deep object scanning
- [ ] Add tests

### Day 4-5: Security Best Practices
- [ ] Implement security checks (10+ rules)
- [ ] Add severity levels (ERROR/WARN/INFO)
- [ ] Integrate with validate command
- [ ] Add tests
- [ ] Document in `docs/SECURITY.md`

---

## Week 5: Hot Reload + JSDoc Optimization

### Day 1-2: File Watching
- [ ] Install `chokidar`
- [ ] Implement file watcher with debounce
- [ ] Implement incremental regeneration
- [ ] Add watch configuration
- [ ] Test on macOS/Linux/Windows

### Day 3: JSDoc Parser Optimization
- [ ] Implement file-based caching
- [ ] Add cache invalidation (mtime + size)
- [ ] Add parallel file processing
- [ ] Verify <100ms for 50 files

### Day 4-5: Live Reload
- [ ] Install `ws` (WebSocket)
- [ ] Implement WebSocket server in middleware
- [ ] Add browser client in Swagger UI
- [ ] Add toast notifications
- [ ] Test end-to-end

---

## Week 6: Testing, Docs, & Polish

### Day 1: CLI Serve & Migrate
- [ ] Create `src/cli/commands/serve.ts`
- [ ] Implement standalone Swagger UI server
- [ ] Add live reload integration
- [ ] Create `src/cli/commands/migrate.ts`
- [ ] Implement swagger-jsdoc migration (basic)

### Day 2: Cross-Platform Testing
- [ ] Set up GitHub Actions matrix
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Test on Windows
- [ ] Test Node 16, 18, 20, 22

### Day 3: Example Apps
- [ ] Create `examples/security-example`
- [ ] Create `examples/performance-example`
- [ ] Update all example READMEs
- [ ] Add CLI usage to examples

### Day 4-5: Documentation
- [ ] Create `docs/CLI.md`
- [ ] Update `PERFORMANCE.md` with optimization results
- [ ] Create `docs/SECURITY.md`
- [ ] Create `docs/MIGRATION.md`
- [ ] Create `docs/TROUBLESHOOTING.md`
- [ ] Update main README.md
- [ ] Update CLAUDE.md with Phase 4 guardrails
- [ ] Generate TypeDoc API docs

### Day 6: Final Validation
- [ ] Run full test suite (all platforms)
- [ ] Run benchmarks (verify targets met)
- [ ] Check coverage (≥85% for core)
- [ ] Run security audit (`pnpm audit`)
- [ ] Validate all example apps
- [ ] Review all documentation
- [ ] Mark Phase 4 complete

---

## Quick Commands Reference

### Build & Test
```bash
# Build package
npx tsup

# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Benchmarks (Phase 4)
```bash
# Run benchmarks
pnpm bench

# Profile performance
pnpm bench:profile

# Check memory
pnpm bench:memory
```

### CLI Development
```bash
# Build CLI
npx tsup

# Test generate command
node dist/cli.js generate --input ./examples/jsdoc-example/index.js --output ./test-spec.json

# Test validate command
node dist/cli.js validate ./test-spec.json

# Test serve command
node dist/cli.js serve --spec ./test-spec.json --port 3000
```

### Example Apps
```bash
# JSDoc example
cd examples/jsdoc-example && node index.js

# Decorator example
cd examples/decorator-example && pnpm start

# Runtime example
cd examples/runtime-example && node index.js
```

---

## Checkpoints

### Checkpoint 1: Week 2 End
- [ ] Benchmarks running and documented
- [ ] Performance optimizations completed
- [ ] Route discovery <10ms for 100 routes
- [ ] Spec generation <50ms for 100 routes
- [ ] CLI framework in place

### Checkpoint 2: Week 3 End
- [ ] Generate command working
- [ ] Validate command working
- [ ] CLI e2e tests passing
- [ ] Works with all example apps

### Checkpoint 3: Week 4 End
- [ ] Security detection implemented
- [ ] Security best practices validator working
- [ ] 10+ security rules implemented
- [ ] Tests passing

### Checkpoint 4: Week 5 End
- [ ] File watching working
- [ ] Live reload working
- [ ] JSDoc parser optimized (<100ms)
- [ ] Watch mode tested on all platforms

### Checkpoint 5: Week 6 End
- [ ] All CLI commands complete
- [ ] All documentation complete
- [ ] All tests passing (3 platforms)
- [ ] Phase 4 exit criteria met

---

## Exit Criteria (Must Complete All)

Phase 4 is complete when:

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

## Notes

- **Parallel Work**: Weeks 2-5 have some parallelizable tasks
- **Testing**: Write tests alongside implementation, not after
- **Documentation**: Update docs as features are completed
- **Validation**: Test on real-world apps, not just examples
- **Performance**: Re-run benchmarks after each optimization

---

**Start Command**: Create `benchmarks/` directory and begin Week 1 tasks

**Reference**: See PHASE_4_ROADMAP.md for detailed task descriptions
