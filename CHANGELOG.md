# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2025-11-26

### Added
- Updated documentation to reflect Phase 4 and 5 completion
- Improved error handling for ES module and directory import errors in CLI

### Fixed
- CLI generate command now provides helpful guidance for ES module projects

## [0.2.2] - 2025-11-26

### Added
- Package exports for middleware and decorators subpaths
- Improved build configuration with tsup

## [0.2.1] - 2025-11-26

### Fixed
- Build and packaging improvements
- TypeScript declaration file generation

## [0.2.0] - 2025-11-26

### Added
- FileWatcher with 14 comprehensive tests
- SecurityDetector with 25 tests for auto-detection
- CLI watch mode integration
- Performance benchmarking suite

## [0.1.0] - 2025-11-26

### Added

#### Core Features
- **Hybrid OpenAPI Generation**: Three-pronged approach combining decorators, JSDoc, and runtime capture
- **Route Discovery Engine**: Intelligent parsing of Express router stacks with cycle detection
- **OpenAPI 3.1 Spec Generation**: Full spec orchestration with path composition and component schemas
- **Decorator Support**: TypeScript experimental decorators for metadata-rich route definitions
- **JSDoc Parser**: YAML-formatted JSDoc comment extraction with schema inference
- **Runtime Capture**: Auto-schema detection with sensitive field sanitization
- **Validator Adapters**: Full support for Zod, Joi, and Yup with extensible plugin architecture

#### CLI Interface
- **generate command**: Dynamic app loading with spec output to file
  - Options: `--input`, `--output`, `--watch`, `--title`, `--version`, `--description`
  - Watch mode for development with file system monitoring and hot reload
  - Module cache clearing for live updates
- **validate command**: OpenAPI spec validation with required field checking
  - Options: `--strict` for enhanced validation
  - Detailed error reporting with path and operation counts
- **serve command**: Stub for Swagger UI server (planned)
- **migrate command**: Stub for tool migration helpers (planned)
- **Professional UX**: Color-coded output with chalk, comprehensive help system

#### Security Detection
- **SecurityDetector Class**: Automatic detection of security schemes
  - JWT/Bearer token authentication
  - API Key authentication (header-based)
  - OAuth2 scheme detection
  - HTTP Basic authentication
- **Multi-source Detection**: Analyzes middleware names, route metadata, and HTTP headers
- **Safe Defaults**: Field sanitization for sensitive data (passwords, tokens, API keys)
- **Configurable Patterns**: Custom security scheme pattern matching

#### File Watching & Hot Reload
- **FileWatcher Class**: Debounce-based file monitoring
  - 500ms debounce (configurable)
  - Glob pattern support with excluded paths
  - Error recovery and graceful shutdown
- **CLI Integration**: Watch mode in generate command
- **Development Experience**: Live spec regeneration on file save

#### Testing & Quality
- **Comprehensive Test Suite**: 191 tests across 15 test files
  - 25 security detection tests
  - 14 file watching tests
  - 74 validator tests (Zod, Joi, Yup, Registry)
  - 20 JSDoc parser tests
  - 8 decorator tests
  - 13 snapshot storage tests
  - 12 middleware tests
  - 4 Swagger UI tests
  - 8 integration tests
  - 3 core engine tests
- **100% Pass Rate**: All tests verified and passing
- **TypeScript Support**: Full type definitions and strict compilation

#### Documentation
- **CLI Guide** (`docs/CLI.md`): Complete command reference with 800+ lines
  - All commands with detailed options
  - Real-world usage examples
  - Integration guides (npm, GitHub Actions, Docker)
  - Troubleshooting and error handling
  - Best practices for development workflow
- **Security Guide** (`docs/SECURITY.md`): Production security documentation
  - Automatic security scheme detection guide
  - Best practices for API authentication
  - JWT, API Key, OAuth2 patterns
  - Runtime capture safety
  - Field sanitization documentation
  - Security audit checklist
  - Common security patterns
- **Performance Guide** (`docs/PERFORMANCE.md`): Benchmarking and optimization
  - Performance budgets and targets
  - Benchmarking suite documentation
  - Optimization strategies for large apps
  - Profiling tools and techniques
  - Performance regression detection

#### Example Applications
- **decorator-example**: TypeScript with Zod validation, demonstrating decorator strategy
- **jsdoc-example**: JavaScript with Joi validation, showing JSDoc metadata approach
- **runtime-example**: Zero-config blog API with runtime capture strategy
- All examples include working route handlers and generated specs

#### Build & Distribution
- **Multi-format Output**: CommonJS (.js) and ESM (.mjs) builds
- **Type Definitions**: Generated TypeScript declaration files (.d.ts)
- **Source Maps**: Included for debugging
- **CLI Executable**: Proper shebang and bin entry point
- **Optimized Package**: 119.2 kB tarball, 584 kB dist directory

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- Automatic sanitization of sensitive fields (passwords, tokens, API keys)
- Runtime capture disabled by default in production
- Safe error messages without exposure of internal paths
- No secrets stored in generated specifications

## [Unreleased]

### Planned for Phase 6 (Documentation & Examples)
- Documentation website with VitePress/Docusaurus
- Migration guides from swagger-jsdoc, tsoa
- Video tutorials
- Additional example applications
- Interactive `npx express-swagger-auto init` setup

### Future Considerations
- GraphQL support
- OpenAPI 3.0 downgrade option
- OpenAPI 4.0 support
- Multi-language documentation generation
- SDK auto-generation from specs
- Web-based spec editor
- Advanced schema inference (discriminated unions, recursive types)

---

## Version History Summary

### Phase 1: Core Foundation ✅
- Route discovery with cycle detection
- Basic OpenAPI 3.1 spec generation
- Swagger UI middleware integration
- Vitest testing infrastructure

### Phase 2: Schema Extraction ✅
- Zod, Joi, Yup validator adapters
- Plugin architecture for custom validators
- Runtime schema inference with snapshot storage
- Snapshot-based testing framework

### Phase 3: Advanced Parsing ✅
- TypeScript decorator support
- JSDoc comment parser with YAML extraction
- Example merging and composition
- Type inference engine enhancements

### Phase 4: Production Polish ✅
- Performance benchmarking suite
- Full CLI implementation with all commands
- Security scheme auto-detection
- File watching with hot reload
- Comprehensive documentation (CLI, Security, Performance)
- 191 passing tests with 100% success rate

### Phase 5: Release Preparation ✅
- Community setup (CONTRIBUTING, CODE_OF_CONDUCT)
- CI/CD automation (GitHub workflows)
- npm package published (v0.2.3)
- Documentation organization
- Professional project baseline

### Phase 6: Documentation & Examples (Current)
- Expanding documentation
- Additional examples planned

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting policy.

## License

MIT © 2025 Ian Pinto

## Links

- [GitHub Repository](https://github.com/iAn-P1nt0/express-swagger-auto)
- [npm Package](https://www.npmjs.com/package/express-swagger-auto)
- [Documentation](./README.md)
- [Roadmap](ROADMAP.md)
