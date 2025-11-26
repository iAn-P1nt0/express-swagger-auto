# Release v0.2.1 - Chalk Library Fix

**Status**: ✅ PUBLISHED

**Release Date**: December 2024

**npm URL**: https://www.npmjs.com/package/express-swagger-auto@0.2.1

## Overview

Version 0.2.1 is a critical patch that resolves the chalk library compatibility issue that was preventing the CLI from working correctly.

## What's Fixed in v0.2.1

### ✅ Chalk Library Compatibility
- **Issue**: `TypeError: chalk.red is not a function` when running CLI commands
- **Root Cause**: chalk v5 is ESM-only and uses a different API than v4
- **Solution**: Replaced chalk dependency with native ANSI color codes
- **Benefit**: Removes external dependency, reduces bundle size, improves compatibility

### ✅ Native ANSI Color Implementation
- Red, green, blue, and yellow color codes implemented natively
- Zero dependency impact - uses only Node.js built-in capabilities
- Works across all terminal environments
- Maintains all existing CLI color functionality

### ✅ Dependency Cleanup
- Removed chalk from package.json (no longer needed)
- Reduced dependency count from 8 to 7
- Slightly reduced bundle size

## Installation

### From npm
```bash
npm install express-swagger-auto@0.2.1
pnpm add express-swagger-auto@0.2.1
yarn add express-swagger-auto@0.2.1
```

### Update from v0.2.0
```bash
npm update express-swagger-auto
```

### Global CLI
```bash
npm install -g express-swagger-auto@0.2.1
```

### Via npx
```bash
npx express-swagger-auto@0.2.1 generate --help
```

## Verification

Test that the CLI works correctly:

```bash
# Install the latest version
npm install express-swagger-auto@0.2.1

# Generate a spec
npx express-swagger-auto generate \
  --input ./src/app.js \
  --output ./openapi.json \
  --title "My API"

# The output should show colored success messages
# ✓ Updated spec (XX routes, XXkB)
# ✅ Done!
```

## Changes

### Code Changes
- **src/cli.ts**: Replaced chalk library calls with native ANSI color codes
- **package.json**: Removed chalk dependency

### Commits
- `9fb3d7d` - fix: Replace chalk library with native ANSI colors
- `437be53` - chore: Remove chalk dependency
- `0de669c` - 0.2.1

### Impact
- **File Size**: Slightly reduced (chalk removed)
- **Performance**: No impact (native ANSI codes)
- **Compatibility**: Improved (no ESM/CJS compatibility issues)
- **Tests**: All 191 tests passing

## Fixes from v0.2.0 to v0.2.1

| Issue | Fix | Impact |
|-------|-----|--------|
| `chalk.red is not a function` | Native ANSI colors | CLI now works |
| Chalk v5 ESM incompatibility | Removed chalk dependency | Better compatibility |
| Extra external dependency | Removed chalk | Smaller bundle |

## Backward Compatibility

**✅ Fully compatible with v0.2.0**

No API changes, no configuration changes. Simply update the package and the CLI will work correctly.

Migration from v0.2.0:
```bash
npm update express-swagger-auto
```

## Testing

All testing completed successfully:

- ✅ 191 tests passing (100% pass rate)
- ✅ Build succeeds
- ✅ TypeScript compilation clean
- ✅ ESLint linting passes
- ✅ CLI generate command works
- ✅ CLI validate command works
- ✅ File watching works
- ✅ Cross-platform compatibility verified

## Bundle Size

| Metric | Value | Change |
|--------|-------|--------|
| Tarball | 119.6 KB | -0.1 KB |
| Unpacked | 549.3 KB | +0.1 KB |
| Dependencies | 7 | -1 |

## Known Issues

None reported at release time.

## What's Next

- Continue with Phase 6 planning (documentation site, examples, integrations)
- Monitor for community feedback and issues
- Track performance and compatibility across platforms

## Support & Resources

### Documentation
- **GitHub**: https://github.com/iAn-P1nt0/express-swagger-auto
- **npm**: https://www.npmjs.com/package/express-swagger-auto
- **Issues**: https://github.com/iAn-P1nt0/express-swagger-auto/issues
- **Discussions**: https://github.com/iAn-P1nt0/express-swagger-auto/discussions

### Bug Reports
If you encounter any issues with v0.2.1, please report them at:
https://github.com/iAn-P1nt0/express-swagger-auto/issues

## Release Notes Summary

**Before v0.2.1**: CLI would crash with "chalk.red is not a function" error

**After v0.2.1**: CLI works perfectly with native ANSI colors

---

**Release Status**: ✅ PUBLISHED ON npm

**npm Package**: https://www.npmjs.com/package/express-swagger-auto@0.2.1

**GitHub Release**: https://github.com/iAn-P1nt0/express-swagger-auto/releases/tag/v0.2.1

**Latest Version**: v0.2.1

**Previous Versions**: v0.2.0, v0.1.0
