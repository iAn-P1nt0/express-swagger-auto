# express-swagger-auto Roadmap

This document outlines the vision and planned phases for express-swagger-auto. Our goal is to make OpenAPI spec generation from Express apps as effortless and comprehensive as possible.

## Current Status

**Phase 6: Documentation & Examples** - In Progress

Phase 5 (Release Preparation) completed successfully. Phase 6 is now underway with major CLI enhancements delivered.

### ✨ Recent CLI Enhancements (November 2025)

- **Config file support** via cosmiconfig (JS, JSON, YAML formats)
- **YAML output format** with auto-detection from file extension
- **CI mode** with JSON and SARIF output formats
- **`init` command** for interactive project setup
- **Strategy selection** (`--strategies jsdoc,decorator,runtime`)
- **Route filtering** (`--include-paths`, `--exclude-paths`, `--tags`)
- **Full OpenAPI validation** with strict mode and security audit
- **322 tests passing** with comprehensive coverage

## Phases Overview

### ✅ Phase 1: Core Foundation (Completed)
**Focus**: Establish solid technical foundation

- TypeScript scaffolding and build infrastructure
- Route discovery engine for Express apps
- Basic OpenAPI 3.1 spec generation
- Swagger UI integration via middleware
- Vitest test harness with baseline coverage

**Status**: Complete - 40 tests passing

### ✅ Phase 2: Schema Extraction (Completed)
**Focus**: Multi-validator support and schema inference

- Zod validator adapter with full schema conversion
- Joi validator adapter with pattern/rules support
- Yup validator adapter with constraint mapping
- Plugin architecture for custom validators
- Runtime schema inference from request/response examples

**Status**: Complete - 60 tests passing (+20)

### ✅ Phase 3: Advanced Parsing (Completed)
**Focus**: Metadata extraction and intelligent analysis

- AST-based JSDoc parser with YAML extraction
- TypeScript decorator support (experimental decorators)
- Example and type inference engine
- Response schema generation from return types
- Automatic security scheme detection
- TypeInferenceEngine for TypeScript type parsing

**Status**: Complete - 302 tests passing

### ✅ Phase 4: Production Polish (Completed)
**Focus**: CLI, performance, and developer experience

- Full-featured CLI (generate, validate, serve, migrate, init)
- File watching with hot reload capability
- SecurityDetector for automatic scheme identification
- Performance optimization (<50ms for 100 routes)
- Comprehensive logging and debugging
- Benchmark suite for regression detection
- **Config file support** (cosmiconfig)
- **YAML output format**
- **CI mode with JSON/SARIF output**
- **Route filtering and strategy selection**
- **Full OpenAPI schema validation**

**Status**: Complete - 322 tests passing

### ✅ Phase 5: Release Preparation (Completed)
**Focus**: Community and publication readiness

**Completed Deliverables:**
- [x] CHANGELOG.md with release notes
- [x] CONTRIBUTING.md development guide
- [x] GitHub CI/CD workflows (test, lint, publish)
- [x] GitHub issue/PR templates (bug, feature)
- [x] CODE_OF_CONDUCT.md
- [x] SECURITY.md vulnerability policy
- [x] ROADMAP.md
- [x] API documentation (docs/API.md)
- [x] Example app updates
- [x] npm publish (v0.2.3)

**Status**: Complete - Package published to npm

### 🚀 Phase 6: Documentation & Examples (Current)
**Focus**: Comprehensive guides and real-world examples

**Completed:**
- [x] CLI documentation (docs/CLI.md) - Updated with new features
- [x] `init` command for quick project setup
- [x] Example route generation with JSDoc annotations

**In Progress:**
- Docs site with dedicated domain
- Migration guides (Swagger 2.0 → OpenAPI 3.1)
- Integration guides (GitHub Actions, Docker, CI/CD)
- Video tutorials for common workflows
- Interactive API explorer
- Troubleshooting guides

**Example Apps:**
- Next.js + Express with TypeScript decorators
- Monorepo with shared validators
- GraphQL → OpenAPI bridging example
- Microservices with shared spec generation
- Real-time API with WebSocket documentation

### Phase 7: Advanced Features (Q1-Q2 2025)
**Focus**: Enterprise and advanced use cases

**Planned Features:**
- **Schema Evolution**: Track breaking changes between versions (`diff` command)
- **Mock Server**: Generate functioning mock servers from specs (`mock` command)
- **API Testing**: Generate integration tests from operations
- **Server-side Validation**: Generate validators from OpenAPI specs
- **Documentation Generation**: Auto-generate API docs from specs
- **Analytics Integration**: Track API usage patterns
- **Rate Limiting Documentation**: Auto-detect and document rate limits
- **SDK Generation**: Generate TypeScript client SDKs

**Validator Support:**
- [ ] Zod schema introspection improvements
- [ ] Joi latest version support
- [ ] GraphQL validators (GraphQL-core)
- [ ] TypeORM/Prisma schema support
- [ ] JSON Schema native support

### Phase 8: Performance & Scale (Q2 2025)
**Focus**: Handle large enterprise APIs

**Planned Features:**
- [ ] Spec generation under 10ms for 500+ routes
- [ ] Incremental generation (only changed routes)
- [ ] Schema caching with invalidation
- [ ] Lazy loading of route metadata
- [ ] Parallel processing for multi-file analysis
- [ ] Memory profiling and optimization

**Target Metrics:**
- Startup time: < 100ms
- Spec generation: < 10ms for typical apps
- Memory usage: < 50MB for 1000+ routes
- Bundle size: Keep under 100KB gzipped

### Phase 9: Ecosystem Integration (Q2-Q3 2025)
**Focus**: First-class tooling integration

**Planned Integrations:**
- [ ] VS Code extension for live preview
- [ ] WebStorm/IntelliJ plugin
- [ ] GitHub Actions workflow templates
- [ ] CI/CD platform support (GitHub, GitLab, CircleCI)
- [ ] API gateway integrations (Kong, AWS API Gateway)
- [ ] Documentation platform bridges (Stoplight, SwaggerHub)
- [ ] APM integrations (New Relic, DataDog)

### Phase 10: AI-Assisted Features (Q3 2025)
**Focus**: Intelligent automation

**Planned Features:**
- [ ] AI description generation from code
- [ ] Security recommendation engine
- [ ] API design suggestions based on patterns
- [ ] Automatic error response documentation
- [ ] Smart example generation
- [ ] API compatibility checking

## Public API Stability

### Current (v0.1.x)
- Core API is **UNSTABLE** - breaking changes possible
- CLI is relatively stable but may have command changes
- Expect breaking changes between minor versions

### Planned (v1.0.0)
- Core API becomes **STABLE** - semantic versioning enforced
- No breaking changes without major version bump
- 12-month deprecation notice for removed features
- Backwards compatibility guides for upgrades

## Community Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| GitHub Stars | 100 | Pending release |
| npm Weekly Downloads | 500 | Pending release |
| Contributing Developers | 5+ | In progress |
| Example Apps | 8+ | In progress |
| Documented Validators | 10+ | Phase 6 |
| Documentation Pages | 20+ | Phase 6 |
| Third-party Integrations | 5+ | Phase 7+ |

## Breaking Changes Policy

Starting with v1.0.0:

1. **Announcement**: Breaking changes announced in CHANGELOG with migration guide
2. **Deprecation Period**: Features are deprecated one minor version before removal
3. **Migration Guides**: Comprehensive guides provided for all breaking changes
4. **Community Input**: RFC (Request for Comment) for major changes before implementation

## Support Windows

| Version | Released | Support Until | Status |
|---------|----------|---------------|--------|
| 0.1.x   | Dec 2024 | Dec 2025      | Active |
| 1.0.x   | Q1 2025  | Q1 2026       | Planned |
| 2.0.x   | Q3 2026  | Q3 2027       | Planned |

## How to Contribute

We welcome contributions at any phase! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Some good areas for community involvement:

### High-Priority Help Needed
- [ ] Writing example apps (Phase 6)
- [ ] Documentation and tutorials (Phase 6)
- [ ] Bug reports and edge cases (All phases)
- [ ] Validator adapter improvements (Phase 7)
- [ ] Integration development (Phase 9)

### Low Barrier Entry
- Documentation improvements
- Example code contributions
- Bug reports with reproduction steps
- Feature requests with use cases
- Questions in GitHub Discussions (helps improve docs)

## Feedback & Suggestions

Have ideas for the roadmap? We'd love to hear them!

- **Feature Requests**: Open an issue with the `enhancement` label
- **Discussions**: Use [GitHub Discussions](https://github.com/iAn-P1nt0/express-swagger-auto/discussions) for ideas
- **Surveys**: Follow our Twitter/social for community surveys
- **Direct Input**: Maintainers available in [GitHub Discussions](https://github.com/iAn-P1nt0/express-swagger-auto/discussions/categories/ideas)

## Key Metrics We Track

- **Test Coverage**: Maintain ≥85% for new code
- **Build Time**: Keep under 30 seconds
- **Bundle Size**: Keep < 100KB gzipped
- **Performance**: Spec generation < 50ms for demo app
- **Code Health**: ESLint clean, zero TypeScript errors
- **Security**: Zero critical vulnerabilities, regular audits

## References

- [Semantic Versioning](https://semver.org/)
- [OpenAPI Specification](https://spec.openapis.org/)
- [Express.js Documentation](https://expressjs.com/)
- [Swagger/OpenAPI Tools](https://openapis.org/)

---

**Last Updated**: December 2024

**Next Review**: January 2025

This roadmap is a living document and will be updated as the project evolves. Major changes will be announced in [GitHub Discussions](https://github.com/iAn-P1nt0/express-swagger-auto/discussions).
