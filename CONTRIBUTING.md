# Contributing to express-swagger-auto

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the express-swagger-auto project.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- Node.js 16+ (tested with 16, 18, 20, 22)
- pnpm 8+ (monorepo package manager)
- Git 2.x+
- TypeScript knowledge (project is TypeScript-first)

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Visit https://github.com/iAn-P1nt0/express-swagger-auto/fork
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/express-swagger-auto.git
   cd express-swagger-auto
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/iAn-P1nt0/express-swagger-auto.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   ```

5. **Verify setup**
   ```bash
   pnpm build
   pnpm test
   pnpm lint
   ```

   All commands should complete without errors.

## Development Workflow

### Creating a Feature Branch

Use conventional branch naming:

```bash
# Features
git checkout -b feature/security-detector-enhancements

# Bug fixes
git checkout -b fix/route-discovery-cycle-detection

# Documentation
git checkout -b docs/add-migration-guide

# Performance improvements
git checkout -b perf/lazy-schema-loading

# Refactoring
git checkout -b refactor/validator-registry
```

### Local Development

1. **Start development mode** (watches TypeScript changes)
   ```bash
   pnpm dev
   ```

2. **Run tests in watch mode**
   ```bash
   pnpm test:watch
   ```

3. **Generate coverage report**
   ```bash
   pnpm test:coverage
   ```

4. **Type check only** (without building)
   ```bash
   pnpm typecheck
   ```

5. **Lint code**
   ```bash
   pnpm lint
   pnpm lint:fix  # Auto-fix issues
   ```

### Testing Requirements

All contributions must include tests. Here's what's expected:

#### Unit Tests
- Test individual functions and classes
- Place in same directory as source: `src/module/Feature.test.ts`
- Use Vitest (already configured)
- Aim for >85% coverage for new code

#### Integration Tests
- Test how modules work together
- Verify real-world scenarios
- Add to `src/integration.test.ts`
- Test with actual Express apps when applicable

#### Example Tests
- Test example apps work end-to-end
- Run: `cd examples/decorator-example && pnpm test`

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Feature } from './Feature';

describe('Feature', () => {
  let instance: Feature;

  beforeEach(() => {
    instance = new Feature();
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', () => {
    const result = instance.someMethod();
    expect(result).toBe(expectedValue);
  });

  it('should handle errors', () => {
    expect(() => instance.invalidMethod()).toThrow();
  });
});
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (not affecting logic)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies
- `ci`: CI/CD configuration changes

### Scope

Scopes help categorize changes:
- `cli`: CLI interface changes
- `core`: Core engine (RouteDiscovery, SpecGenerator)
- `security`: Security detection module
- `watch`: File watching module
- `validators`: Validator adapters
- `parsers`: JSDoc and decorator parsers
- `middleware`: Express middleware
- `docs`: Documentation files
- `ci`: GitHub workflows
- `build`: Build configuration

### Examples

```bash
git commit -m "feat(cli): add watch mode for development"
git commit -m "fix(security): improve JWT detection regex"
git commit -m "docs(cli): update command examples"
git commit -m "test(validators): add edge case tests for Yup adapter"
git commit -m "perf(core): implement schema caching"
```

### Commit Message Best Practices

1. **Use imperative mood**: "add feature" not "added feature"
2. **Be specific**: "fix route discovery for nested routers" not "fix bug"
3. **Reference issues**: Include `Fixes #123` in body
4. **Keep subject under 50 characters**
5. **Explain why, not what**: The code shows what, commit shows why

## Testing

### Running Tests

```bash
# Run all tests once
pnpm test

# Watch mode (re-runs on changes)
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Run specific test file
pnpm test src/security/SecurityDetector.test.ts
```

### Coverage Requirements

- **New code**: ≥85% coverage required
- **Core modules** (`src/core/*`): ≥85% coverage
- **Overall**: Track and aim for 85%+
- Run `pnpm test:coverage` to check

### Example App Testing

```bash
# Test decorator example
cd examples/decorator-example
pnpm install
pnpm build
pnpm test

# Test jsdoc example
cd examples/jsdoc-example
pnpm install
pnpm test

# Test runtime example
cd examples/runtime-example
pnpm install
node index.js  # Should start server
```

## Documentation

### Where Documentation Lives

- **User Docs**: `docs/` folder
  - `docs/CLI.md` - Command reference
  - `docs/SECURITY.md` - Security guide
  - `docs/PERFORMANCE.md` - Performance tuning
  - `docs/API.md` - API reference (if adding public APIs)
- **Code Comments**: Use JSDoc for public APIs
- **Examples**: `examples/` folder with working apps
- **Release Notes**: `CHANGELOG.md`

### Documentation Standards

1. **Public APIs must have JSDoc**
   ```typescript
   /**
    * Discovers routes in an Express application
    * @param app Express Application or Router
    * @returns Array of discovered routes
    */
   public discover(app: ExpressApp): RouteMetadata[] {
     // ...
   }
   ```

2. **Update docs when changing behavior**
   - If CLI flags change, update `docs/CLI.md`
   - If API changes, update `docs/API.md`
   - If security scheme detection changes, update `docs/SECURITY.md`

3. **Add examples for complex features**
   - Include code snippets in documentation
   - Preferably link to working example apps

## Submitting Changes

### Before Creating a PR

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Build and test**
   ```bash
   pnpm install
   pnpm build
   pnpm test
   pnpm lint:fix
   ```

3. **Check for conflicts**
   ```bash
   git status  # Should be clean
   ```

### Creating a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature
   ```

2. **Create PR on GitHub**
   - Use the PR template (auto-provided)
   - Link related issues: "Fixes #123"
   - Describe what and why
   - List testing steps

3. **PR Title Format**
   ```
   feat(scope): brief description
   fix(scope): brief description
   docs(scope): brief description
   ```

### PR Checklist

Before submitting, ensure:

- [ ] Tests added/updated
- [ ] All tests pass (`pnpm test`)
- [ ] Code linted (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow convention
- [ ] No unrelated changes included
- [ ] No console.logs or debug code
- [ ] No breaking changes (or documented)

### Review Process

1. **Automated Checks**
   - CI/CD workflows must pass
   - Coverage must not decrease significantly
   - All tests must pass

2. **Code Review**
   - At least one maintainer review required
   - Feedback will be provided on design/implementation
   - Discussion on tradeoffs is encouraged

3. **Changes Requested**
   - Address feedback in follow-up commits
   - Push to same branch (PR auto-updates)
   - Re-request review when ready

## Code Style

### TypeScript/JavaScript Standards

- **Formatter**: Prettier (configured in `package.json`)
- **Linter**: ESLint with TypeScript support
- **Auto-fix**: Run `pnpm lint:fix` to fix style issues

### Conventions

```typescript
// ✅ Use const, not let or var
const discovery = new RouteDiscovery();

// ✅ Explicit type annotations for public APIs
public generate(routes: RouteMetadata[]): OpenAPISpec {

// ✅ Use interfaces for public types
export interface OpenAPIInfo {
  title: string;
  version: string;
}

// ✅ Prefer early returns
if (!routes) return [];
if (routes.length === 0) return [];

// ✅ Use meaningful variable names
const routeMetadata = discovery.discover(app);

// ❌ Avoid single-letter variables (except loop counters)
const x = 5; // Bad
const routeCount = 5; // Good

// ✅ Use async/await, not .then()
const spec = await generator.generate(routes);

// ✅ Group related functionality together
describe('RouteDiscovery', () => {
  describe('initialization', () => { ... });
  describe('discovery', () => { ... });
});
```

### File Organization

```
src/
├── core/                    # Core engine
│   ├── RouteDiscovery.ts
│   ├── SpecGenerator.ts
│   └── *.test.ts
├── security/                # Security module
│   ├── SecurityDetector.ts
│   ├── SecurityDetector.test.ts
│   └── index.ts
├── watch/                   # File watching
├── validators/              # Validator adapters
├── parsers/                 # JSDoc/Decorator parsers
├── middleware/              # Express middleware
├── decorators/              # Decorator system
├── types.ts                 # Shared types
├── index.ts                 # Public exports
└── cli.ts                   # CLI entry point
```

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- MAJOR (1.0.0): Breaking changes
- MINOR (0.1.0): New features (backward compatible)
- PATCH (0.0.1): Bug fixes

### Release Checklist

1. **Update Version**
   ```bash
   npm version minor  # or patch/major
   ```

2. **Update CHANGELOG.md**
   - Document all changes since last release
   - Group by: Added, Changed, Fixed, Removed, Security
   - Link to PRs where applicable

3. **Run Full Test Suite**
   ```bash
   pnpm clean
   pnpm install
   pnpm build
   pnpm test
   ```

4. **Create GitHub Tag**
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

5. **Publish to npm**
   ```bash
   npm publish
   ```

6. **Create GitHub Release**
   - Use automated GitHub Releases feature
   - Copy CHANGELOG excerpt to release notes

## Common Questions

### How long does review take?

Usually 1-3 days for maintainer review. Critical fixes may be faster.

### Can I work on multiple features?

Prefer one feature/fix per branch and PR. Easier to review and revert if needed.

### How do I report a bug?

File an issue with:
- Detailed description
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, Express version, OS)

### How do I suggest a feature?

Open an issue with:
- Use case and motivation
- Proposed API (if applicable)
- Any implementation ideas

### What if my PR is stale?

- Maintainer will reach out after 2 weeks
- You can update branch: `git rebase upstream/main`
- Re-request review when ready

## Resources

- **Project Goals**: See [ROADMAP.md](ROADMAP.md)
- **Architecture**: See [CLAUDE.md](CLAUDE.md) (internal guardrails)
- **Setup Guide**: See [README.md](README.md)
- **API Reference**: See `docs/API.md`
- **Security Guide**: See `docs/SECURITY.md`

## Questions?

- **Documentation**: Check `docs/` folder
- **Issues**: Browse [GitHub Issues](https://github.com/iAn-P1nt0/express-swagger-auto/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/iAn-P1nt0/express-swagger-auto/discussions)

---

**Thank you for contributing! Your efforts help make express-swagger-auto better for everyone.** 🎉
