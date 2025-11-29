# Mutation Testing Guide

This guide explains how to use mutation testing in the express-swagger-auto project to validate and improve test suite quality.

## What is Mutation Testing?

Mutation testing evaluates the quality of your test suite by introducing small changes (mutations) to the source code and checking if your tests detect these changes. A mutation that goes undetected by tests is called a "survived mutant" and indicates a potential weakness in test coverage.

### Key Concepts

- **Mutant**: A modified version of the source code with a small change
- **Killed Mutant**: A mutant that causes at least one test to fail (good!)
- **Survived Mutant**: A mutant that passes all tests (indicates weak tests)
- **Mutation Score**: Percentage of mutants killed (higher is better)
- **Equivalent Mutant**: A mutation that doesn't change program behavior

## Getting Started

### Prerequisites

- Node.js 16+
- pnpm 8+
- All tests passing (`pnpm test`)

### Running Mutation Tests

```bash
# Run full mutation testing
pnpm test:mutation

# Run dry-run to check configuration
pnpm test:mutation:dry-run

# Run only on core modules (faster)
pnpm test:mutation:core
```

### Viewing Reports

After running mutation tests, reports are generated in `reports/mutation/`:

- `index.html` - Interactive HTML report (open in browser)
- `mutation-report.json` - Machine-readable JSON report

Generate a summary:

```bash
# Text summary
pnpm mutation-report

# Markdown summary
pnpm mutation-report --format markdown

# Save to file
pnpm mutation-report --format markdown --output MUTATION_SUMMARY.md
```

## Understanding Results

### Mutation Score Targets

| Module | Target Score | Priority |
|--------|--------------|----------|
| Core (RouteDiscovery, SpecGenerator) | 85% | P0 |
| Parsers (JsDocParser, etc.) | 80% | P1 |
| Validators (Zod, Joi, Yup) | 80% | P1 |
| CLI | 75% | P2 |

### Score Interpretation

- **≥85%**: Excellent - Your tests are thorough
- **70-84%**: Good - Some gaps exist but coverage is reasonable
- **50-69%**: Fair - Significant test improvements needed
- **<50%**: Poor - Many untested code paths

### Common Mutator Types

| Mutator | Description | Example |
|---------|-------------|---------|
| ArithmeticOperator | Changes +, -, *, / | `a + b` → `a - b` |
| ConditionalExpression | Changes <, >, <=, >= | `a < b` → `a <= b` |
| EqualityOperator | Changes ==, ===, !=, !== | `a === b` → `a !== b` |
| LogicalOperator | Changes &&, \|\| | `a && b` → `a \|\| b` |
| UnaryOperator | Changes !, ++, -- | `!valid` → `valid` |
| BooleanLiteral | Swaps true/false | `return true` → `return false` |
| BlockStatement | Removes code blocks | Removes entire if blocks |

## Improving Test Quality

### Step 1: Identify Survived Mutants

1. Open `reports/mutation/index.html` in a browser
2. Navigate to files with survived mutants
3. Click on mutants to see what was changed

### Step 2: Analyze Why Mutants Survived

Common reasons:

1. **Missing test case**: No test exercises the mutated code path
2. **Weak assertion**: Test runs the code but doesn't verify results
3. **Equivalent mutant**: Mutation doesn't change behavior (false positive)
4. **Missing edge case**: Test doesn't cover boundary conditions

### Step 3: Add or Improve Tests

```typescript
// ❌ Weak assertion - survives mutations
it('should process data', () => {
  const result = process(data);
  expect(result).toBeTruthy(); // Doesn't verify actual value
});

// ✅ Strong assertion - catches mutations
it('should process data', () => {
  const result = process(data);
  expect(result).toEqual({ status: 'success', count: 5 });
});

// ✅ Test boundary conditions
it('should handle edge cases', () => {
  expect(process([])).toEqual({ status: 'empty', count: 0 });
  expect(process([1])).toEqual({ status: 'single', count: 1 });
  expect(() => process(null)).toThrow('Invalid input');
});
```

### Test Improvement Checklist

- [ ] Replace `toBeTruthy()` with specific value assertions
- [ ] Add negative test cases for all functions
- [ ] Test error messages, not just error throwing
- [ ] Add boundary value tests (empty, single, max values)
- [ ] Test all conditional branches (if/else paths)
- [ ] Test all switch statement cases
- [ ] Test early returns and guard clauses

## Tracking Progress

### Record Trend Data

After each mutation test run:

```bash
pnpm mutation-trends record
```

### View Trends

```bash
# Show recent trend data
pnpm mutation-trends show

# Show more entries
pnpm mutation-trends show --count 20

# Compare entries
pnpm mutation-trends compare
```

### Trend File Location

Trend data is stored in `reports/mutation/trends.json`.

## CI/CD Integration

Mutation tests run automatically:

- **Weekly**: Full mutation testing on main branch (Sunday 2:00 AM UTC)
- **On push to main**: When source files change
- **Manual trigger**: Via GitHub Actions workflow dispatch

### Workflow Artifacts

After CI runs, download mutation reports from GitHub Actions artifacts:

1. Go to Actions tab in GitHub
2. Find the "Mutation Tests" workflow run
3. Download `mutation-report` artifact

## Configuration

### Stryker Configuration

The configuration is in `stryker.config.mjs`:

```javascript
export default {
  // Files to mutate
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    '!src/types.ts',
  ],
  
  // Score thresholds
  thresholds: {
    high: 85,   // Green badge
    low: 70,    // Yellow warning
    break: 65,  // Fail CI
  },
  
  // Enable incremental mode
  incremental: true,
};
```

### Customizing for Specific Files

Run mutation testing on specific modules:

```bash
# Core modules only
npx stryker run --mutate 'src/core/**/*.ts' --mutate '!src/core/**/*.test.ts'

# Single file
npx stryker run --mutate 'src/core/RouteDiscovery.ts'
```

## Troubleshooting

### Tests timeout during mutation testing

Increase timeout in `stryker.config.mjs`:

```javascript
timeoutMS: 60000,
timeoutFactor: 3,
```

### Out of memory errors

Reduce concurrency:

```javascript
concurrency: 2,
```

### Mutation testing is too slow

1. Use incremental mode (enabled by default)
2. Run on specific modules: `pnpm test:mutation:core`
3. Exclude slow tests from mutation testing

### Many equivalent mutants

Exclude specific mutations that produce equivalent mutants:

```javascript
mutator: {
  excludedMutations: [
    'StringLiteral',    // Avoid string mutations
  ],
},
```

## Best Practices

1. **Run mutation tests locally** before pushing significant changes
2. **Focus on core modules first** - they have the highest impact
3. **Don't aim for 100%** - some equivalent mutants are unavoidable
4. **Review survived mutants** - not all need fixing (some may be equivalent)
5. **Incremental improvement** - fix a few mutants at a time
6. **Use trends** - track progress over time

## Resources

- [Stryker Mutation Testing](https://stryker-mutator.io/)
- [Mutation Testing Handbook](https://stryker-mutator.io/docs/)
- [Vitest Runner Plugin](https://stryker-mutator.io/docs/stryker-js/vitest-runner/)
