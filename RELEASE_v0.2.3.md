# Release v0.2.3 - Babel/TypeScript Project Support

**Status**: ✅ PUBLISHED

**Release Date**: December 2024

**npm URL**: https://www.npmjs.com/package/express-swagger-auto@0.2.3

## Overview

Version 0.2.3 significantly improves support for projects using Babel, TypeScript, or ES modules with directory imports. The error messages now specifically guide users with transpiled/compiled projects.

## What's New in v0.2.3

### ✅ Better Support for Babel Projects

Your Bandhan API Common Service project uses Babel to transpile ES6 code. v0.2.3 now:

1. **Detects Babel/TypeScript projects** using directory imports
2. **Recommends the build-first approach** (npm run build)
3. **Points to dist/index.js** as the entry point
4. **Provides npm script example** for automation

### ✅ Clear Error Guidance for Directory Imports

When express-swagger-auto encounters directory imports like:
```
/src/controllers/v1/folio
/src/middlewares
```

It now clearly explains:
- ✅ What the problem is (directory imports need CommonJS)
- ✅ The recommended solution (build first)
- ✅ How to run the command with dist/ output
- ✅ How to automate in package.json

### ✅ Babel-Specific Examples

The error message now mentions Babel alongside TypeScript/ESM:
```
RECOMMENDED SOLUTION:

1. Build your Babel/TypeScript/ESM code first:
   npm run build

2. Point to the compiled output:
   npx express-swagger-auto generate -i dist/index.js -o openapi.json ...

3. Add to package.json scripts for automation:
   "swagger:generate": "npm run build && npx express-swagger-auto generate -i dist/index.js -o openapi.json --title \"My API\""
```

## For Bandhan API Common Service

Your complete solution is now just 2 commands:

### Quick Setup

```bash
# Install the latest version
npm install express-swagger-auto@0.2.3

# Build and generate spec (in one command)
npm run build && npx express-swagger-auto generate \
  -i dist/index.js \
  -o openapi.json \
  --title "Bandhan Common Service API" \
  --description "Common service API for Bandhan investor platform"
```

### Or Add to npm Scripts

Update your `package.json`:
```json
{
  "scripts": {
    "swagger:generate": "npm run build && npx express-swagger-auto generate -i dist/index.js -o openapi.json --title 'Bandhan Common Service API' --description 'Common service API for Bandhan investor platform'"
  }
}
```

Then run:
```bash
npm run swagger:generate
```

## Installation

### From npm
```bash
npm install express-swagger-auto@0.2.3
pnpm add express-swagger-auto@0.2.3
yarn add express-swagger-auto@0.2.3
```

### Update from v0.2.2
```bash
npm update express-swagger-auto
```

### Via npx
```bash
npx express-swagger-auto@0.2.3 generate -i dist/index.js -o openapi.json
```

## Why This Works

### Your Project Structure
1. **Source Code**: Uses ES6 imports/exports (`src/index.js`)
2. **Directory Imports**: Imports entire folders (e.g., `src/controllers/v1`)
3. **Build Process**: Babel transpiles to CommonJS (`npm run build` → `dist/`)
4. **express-swagger-auto**: Works with CommonJS require()

### The Solution
```
src/index.js (ES6, with directory imports)
    ↓
npm run build (Babel transpilation)
    ↓
dist/index.js (CommonJS, no directory issues)
    ↓
express-swagger-auto generate -i dist/index.js
    ↓
openapi.json (✅ Success!)
```

## Changes

### Code Changes
- **src/cli.ts**: Enhanced error detection for directory imports
  - Mentions Babel specifically
  - Recommends build-first approach
  - Shows automation example
  - Clearer solution guidance

### Commits
- `56be9ee` - improve: Better guidance for Babel/TypeScript projects

### Impact
- **User Experience**: Much better for Babel/TypeScript projects
- **Clarity**: No more cryptic "directory import not supported" errors
- **Automation**: Easy npm script for CI/CD integration
- **Tests**: All 191 tests passing

## Backward Compatibility

**✅ Fully compatible with v0.2.0, v0.2.1, v0.2.2**

No breaking changes. Pure improvement to error guidance.

Migration from earlier versions:
```bash
npm update express-swagger-auto
```

## Bundle Size

| Metric | Value | Change |
|--------|-------|--------|
| Tarball | 122.3 KB | +0.5 KB |
| Unpacked | 560.4 KB | +2.0 KB |
| Files | 31 | - |

## Testing

All quality checks passed:

- ✅ 191 tests passing (100% success rate)
- ✅ Build succeeds
- ✅ TypeScript compilation clean
- ✅ ESLint linting passes
- ✅ Error handling tested
- ✅ Cross-platform compatibility verified

## Supported Node Versions

- Node 16.x ✅
- Node 18.x ✅
- Node 20.x ✅ (Your project)
- Node 22.x ✅

## Common Workflow

For projects using Babel (like yours):

```bash
# 1. Make sure latest version is installed
npm update express-swagger-auto

# 2. Build your project
npm run build

# 3. Generate OpenAPI spec from built output
npx express-swagger-auto generate \
  -i dist/index.js \
  -o openapi.json \
  --title "My API" \
  --description "API Description"

# 4. View the generated spec
cat openapi.json

# 5. (Optional) Serve with Swagger UI
npx express-swagger-auto serve -s openapi.json -p 3000
```

## For CI/CD Integration

Add to your `package.json`:
```json
{
  "scripts": {
    "build": "rimraf dist && babel ./src -d dist",
    "swagger:generate": "npm run build && npx express-swagger-auto generate -i dist/index.js -o openapi.json --title 'Bandhan Common Service API'",
    "generate:all": "npm run build && npm run swagger:generate"
  }
}
```

## Known Issues

None reported at release time.

## What's Next

- Phase 6: Documentation website
- Enhanced monorepo support
- Better TypeScript integration
- Video tutorials for Babel projects

## Support & Resources

### Documentation
- **GitHub**: https://github.com/iAn-P1nt0/express-swagger-auto
- **npm**: https://www.npmjs.com/package/express-swagger-auto@0.2.3
- **Issues**: https://github.com/iAn-P1nt0/express-swagger-auto/issues
- **Discussions**: https://github.com/iAn-P1nt0/express-swagger-auto/discussions

### FAQ

**Q: Why do I need to build first?**
A: Babel transpiles ES6 modules to CommonJS. express-swagger-auto uses CommonJS require(), so it needs the built version.

**Q: Can I use src/index.js directly?**
A: No, the src/ version uses ES6 imports which create directory import conflicts. Always use dist/ (built version).

**Q: How do I automate this in my pipeline?**
A: Add the script to package.json as shown above, then run `npm run swagger:generate`.

**Q: Does this work with TypeScript?**
A: Yes! TypeScript projects should also build first (`npm run build` or `npm run tsc`), then use `dist/index.js`.

## Release Notes Summary

Version 0.2.3 brings first-class support for Babel and TypeScript projects. Users no longer face cryptic directory import errors—they get clear, actionable guidance to build first and point to the compiled output.

This is perfect for projects like Bandhan Common Service API that use Babel for ES6 transpilation.

---

**Release Status**: ✅ PUBLISHED ON npm

**npm Package**: https://www.npmjs.com/package/express-swagger-auto@0.2.3

**GitHub Release**: https://github.com/iAn-P1nt0/express-swagger-auto/releases/tag/v0.2.3

**Latest Version**: v0.2.3

**Previous Versions**: v0.2.2, v0.2.1, v0.2.0, v0.1.0
