# Release v0.2.2 - Improved Error Handling

**Status**: ✅ PUBLISHED

**Release Date**: December 2024

**npm URL**: https://www.npmjs.com/package/express-swagger-auto@0.2.2

## Overview

Version 0.2.2 improves the user experience with better error handling and helpful guidance for users encountering ES module and TypeScript compilation issues.

## What's New in v0.2.2

### ✅ Better Error Messages for ES Module Issues

When users try to load an Express app that uses ES modules (ESM) or imports directories without explicit index.js, they now receive:

1. **Clear Error Detection**: Identifies ES module directory import errors
2. **Helpful Explanation**: Explains why the error occurs (ESM vs CommonJS mismatch)
3. **Actionable Solutions**: Provides 3 specific solutions:
   - Build TypeScript/ESM code first
   - Point to the compiled/built output
   - Use CommonJS imports instead

### Example Error Output

**Before v0.2.2**:
```
✗ Failed to load Express app: Directory import
'/path/to/middlewares' is not supported resolving ES modules
```

**After v0.2.2**:
```
✗ ES Module Import Error

Your project uses ES modules (ESM), but express-swagger-auto
loads apps using CommonJS require().

Solutions:

1. Build your TypeScript/ESM code first:
   npm run build

2. Point to the compiled/transpiled file:
   npx express-swagger-auto generate -i dist/index.js ...

3. Or ensure your entry file uses CommonJS require():
   const middlewares = require("./middlewares");
```

### ✅ Enhanced Module Error Handling

- Detects directory import errors specifically
- Distinguishes between "Cannot find module" and "directory import" errors
- Provides different solutions for each error type
- Guides users to proper file paths

## Installation

### From npm
```bash
npm install express-swagger-auto@0.2.2
pnpm add express-swagger-auto@0.2.2
yarn add express-swagger-auto@0.2.2
```

### Update from v0.2.1
```bash
npm update express-swagger-auto
```

### Via npx
```bash
npx express-swagger-auto@0.2.2 generate -i dist/index.js -o openapi.json
```

## How to Use with TypeScript/ESM Projects

If you're using TypeScript or ES modules, follow these steps:

### Step 1: Build Your Project
```bash
npm run build
# This compiles TypeScript to JavaScript
```

### Step 2: Point to Compiled Output
```bash
npx express-swagger-auto generate \
  -i dist/index.js \
  -o openapi.json \
  --title "My API"
```

### Step 3: Or Use CommonJS Imports
```javascript
// Instead of:
import middlewares from "./middlewares";

// Use:
const middlewares = require("./middlewares");
```

## Changes

### Code Changes
- **src/cli.ts**: Enhanced error detection and messaging
  - Added specific error type detection
  - Added helpful solution guides
  - Improved error message formatting

### Commits
- `0f92dd9` - improve: Add helpful error messages for ES module issues
- `f4d48af` - 0.2.2

### Impact
- **User Experience**: Significantly improved for TypeScript/ESM projects
- **Support Load**: Reduces questions from users confused by vague errors
- **Learning Curve**: Helps users understand CommonJS vs ESM differences
- **Tests**: All 191 tests passing

## Backward Compatibility

**✅ Fully compatible with v0.2.1 and v0.2.0**

No breaking changes. Pure improvement to error messages.

Migration from earlier versions:
```bash
npm update express-swagger-auto
```

## Bundle Size

| Metric | Value | Change |
|--------|-------|--------|
| Tarball | 121.8 KB | +2.2 KB |
| Unpacked | 558.3 KB | +9.0 KB |
| Files | 31 | - |

*Increase is due to more helpful error messages in CLI code*

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
- Node 20.x ✅
- Node 22.x ✅

## Known Issues

None reported at release time.

## When to Update to v0.2.2

Update immediately if you're experiencing:

- ES module import errors
- Directory import errors
- Confusion about TypeScript/ESM compatibility
- Trouble loading Express apps with the CLI

Updating just improves error messages - no functional changes to the core library.

## What's Next

- Phase 6: Documentation website and tutorials
- Enhanced support for monorepos
- Better TypeScript integration guide
- Video tutorials for common setup patterns

## Support & Resources

### Documentation
- **GitHub**: https://github.com/iAn-P1nt0/express-swagger-auto
- **npm**: https://www.npmjs.com/package/express-swagger-auto@0.2.2
- **Issues**: https://github.com/iAn-P1nt0/express-swagger-auto/issues
- **Discussions**: https://github.com/iAn-P1nt0/express-swagger-auto/discussions

### Common Issues & Solutions

**Q: I'm getting "Directory import is not supported"**
A: Your project uses ESM. Build it first (`npm run build`), then point to `dist/index.js`.

**Q: Should I use TypeScript or JavaScript?**
A: Either works! TypeScript users should build first, JavaScript users should ensure CommonJS imports.

**Q: Can I use both ESM and CommonJS?**
A: Yes, as long as your entry file uses CommonJS require() for express-swagger-auto.

## Release Notes Summary

Version 0.2.2 significantly improves the developer experience by providing clear, actionable error messages when encountering ES module compatibility issues. Users can now quickly understand and fix import problems without confusion.

---

**Release Status**: ✅ PUBLISHED ON npm

**npm Package**: https://www.npmjs.com/package/express-swagger-auto@0.2.2

**GitHub Release**: https://github.com/iAn-P1nt0/express-swagger-auto/releases/tag/v0.2.2

**Latest Version**: v0.2.2

**Previous Versions**: v0.2.1, v0.2.0, v0.1.0
