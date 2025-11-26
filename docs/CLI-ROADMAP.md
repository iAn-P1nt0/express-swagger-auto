# CLI Enhancement Roadmap

This document outlines the planned CLI enhancements for express-swagger-auto, prioritized by implementation phase.

## Phase 7.1: Quick Wins (v0.3.1)

Target: Low effort, high impact features that improve developer experience immediately.

---

### `stats` Command

**Purpose:** Provide comprehensive statistics about an OpenAPI specification.

**Value:** Quality metrics, documentation completeness tracking, governance dashboards.

**Complexity:** Low

**Usage:**
```bash
express-swagger-auto stats [specPath] [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--format` | Output format (text\|json\|markdown) | `text` |
| `--ci` | CI mode with structured output | `false` |

**Output Metrics:**
- **Operations:** Total count, by method (GET, POST, PUT, DELETE, PATCH)
- **Paths:** Total unique paths, nested depth analysis
- **Schemas:** Component schemas count, referenced vs inline
- **Parameters:** Path, query, header, cookie counts
- **Security:** Coverage percentage, schemes used
- **Documentation:** Description/summary coverage percentage
- **Tags:** Distribution and usage

**Example Output:**
```
📊 API Statistics: My API v1.0.0

Operations
  Total:     42
  GET:       18 (43%)
  POST:      12 (29%)
  PUT:       6  (14%)
  DELETE:    4  (10%)
  PATCH:     2  (5%)

Paths
  Total:     28
  Max Depth: 4

Schemas
  Components:  15
  Inline:      8

Documentation Coverage
  Summaries:     95% (40/42)
  Descriptions:  78% (33/42)
  Examples:      45% (19/42)

Security
  Coverage:  85% (36/42 operations)
  Schemes:   Bearer, API Key

Tags
  users:     12 operations
  products:  10 operations
  orders:    8 operations
  auth:      6 operations
  admin:     6 operations
```

**JSON Output:**
```json
{
  "title": "My API",
  "version": "1.0.0",
  "operations": {
    "total": 42,
    "byMethod": { "get": 18, "post": 12, "put": 6, "delete": 4, "patch": 2 }
  },
  "paths": { "total": 28, "maxDepth": 4 },
  "schemas": { "components": 15, "inline": 8 },
  "documentation": {
    "summaries": { "count": 40, "total": 42, "percentage": 95 },
    "descriptions": { "count": 33, "total": 42, "percentage": 78 },
    "examples": { "count": 19, "total": 42, "percentage": 45 }
  },
  "security": {
    "coverage": 85,
    "protectedOperations": 36,
    "totalOperations": 42,
    "schemes": ["bearer", "apiKey"]
  },
  "tags": { "users": 12, "products": 10, "orders": 8, "auth": 6, "admin": 6 }
}
```

---

### Shell Completion

**Purpose:** Auto-completion for bash, zsh, fish, and PowerShell.

**Value:** Improved developer experience, command discoverability, reduced typos.

**Complexity:** Low

**Usage:**
```bash
express-swagger-auto completion [shell]
```

**Supported Shells:**
- `bash` - Bash completion script
- `zsh` - Zsh completion script  
- `fish` - Fish completion script
- `powershell` - PowerShell completion script

**Installation Examples:**

**Bash:**
```bash
express-swagger-auto completion bash >> ~/.bashrc
source ~/.bashrc
```

**Zsh:**
```bash
express-swagger-auto completion zsh >> ~/.zshrc
source ~/.zshrc
```

**Fish:**
```bash
express-swagger-auto completion fish > ~/.config/fish/completions/express-swagger-auto.fish
```

**PowerShell:**
```powershell
express-swagger-auto completion powershell >> $PROFILE
. $PROFILE
```

**Implementation:** Use Commander.js built-in completion or [tabtab](https://github.com/mklabs/tabtab) package.

---

### Extended Output Formats

**Purpose:** Additional output formats for better CI/CD and tooling integration.

**Value:** IDE integration, CI tool compatibility, reporting dashboards.

**Complexity:** Low

**New Formats:**

| Format | Description | Use Case |
|--------|-------------|----------|
| `checkstyle` | XML format | Jenkins, static analysis tools |
| `junit` | JUnit XML | Test runners, CI dashboards |
| `stylish` | Condensed terminal | Terminal output |
| `github-actions` | GitHub annotations | PR annotations |
| `codeclimate` | Code Climate JSON | Quality tracking |
| `markdown` | Markdown table | PR comments, docs |

**Usage:**
```bash
express-swagger-auto validate ./openapi.yaml --ci --ci-format github-actions
express-swagger-auto validate ./openapi.yaml --ci --ci-format junit > report.xml
express-swagger-auto validate ./openapi.yaml --ci --ci-format checkstyle > checkstyle.xml
```

**GitHub Actions Format Example:**
```
::error file=openapi.yaml,line=45,col=12::Missing required field: operationId
::warning file=openapi.yaml,line=67,col=8::Operation lacks description
```

---

## Phase 7.2: API Governance (v0.4.0)

Target: Medium effort features for API governance and versioning workflows.

---

### `diff` Command

**Purpose:** Compare two OpenAPI specs to detect breaking changes, additions, and deprecations.

**Value:** API versioning, backward compatibility guarantees, migration planning, CI/CD gates.

**Complexity:** Medium

**Approach:** Hybrid - Use existing diff libraries where suitable, build Express-specific insights for middleware and route pattern analysis.

**Usage:**
```bash
express-swagger-auto diff <source> <target> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<source>` | Base/old OpenAPI spec file |
| `<target>` | New/updated OpenAPI spec file |

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--fail-on-breaking` | Exit with error on breaking changes | `false` |
| `--fail-on-any` | Exit with error on any changes | `false` |
| `--format` | Output format (text\|json\|markdown) | `text` |
| `--breaking-only` | Show only breaking changes | `false` |
| `--ci` | CI mode with structured output | `false` |

**Change Categories:**

1. **Breaking Changes** (🔴)
   - Removed endpoints
   - Removed required parameters
   - Changed parameter types (incompatible)
   - Narrowed response types
   - Removed response status codes
   - Changed authentication requirements

2. **Non-Breaking Changes** (🟢)
   - Added endpoints
   - Added optional parameters
   - Added response properties
   - Added response status codes
   - Widened parameter types

3. **Deprecations** (🟡)
   - Deprecated endpoints
   - Deprecated parameters
   - Deprecated schemas

**Example Output:**
```
🔄 API Diff: v1.0.0 → v2.0.0

🔴 Breaking Changes (3)
  • DELETE /api/users/{id}
    Endpoint removed
  
  • POST /api/orders
    Required parameter added: customerId (query)
  
  • GET /api/products
    Response property removed: legacyId

🟢 Non-Breaking Changes (5)
  • POST /api/webhooks
    New endpoint added
  
  • GET /api/users
    Optional parameter added: sortBy (query)
  
  • GET /api/orders/{id}
    Response property added: tracking

🟡 Deprecations (1)
  • GET /api/legacy/products
    Endpoint deprecated

Summary: 3 breaking, 5 non-breaking, 1 deprecation
```

**Express-Specific Insights:**
- Middleware changes detection
- Route pattern evolution (e.g., `/users/:id` → `/users/{userId}`)
- Security middleware changes
- Rate limiting changes

---

### `lint` Command

**Purpose:** Advanced linting with configurable rules (subset of Spectral features).

**Value:** API governance, style guide enforcement, consistent API design.

**Complexity:** Medium-High

**Design Principle:** Implement subset without breaking existing validation. Extend, don't replace.

**Usage:**
```bash
express-swagger-auto lint [specPath] [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--ruleset` | Built-in ruleset (recommended\|minimal\|strict) | `recommended` |
| `--config` | Custom ruleset file path | Auto-detected |
| `--format` | Output format | `stylish` |
| `--fail-severity` | Fail on severity level (error\|warn) | `error` |
| `--ignore` | Paths to ignore (glob patterns) | None |

**Built-in Rulesets:**

**`minimal`** - Essential checks only:
- Valid OpenAPI structure
- Required fields present
- Valid $ref references

**`recommended`** - Best practices:
- All operations have operationId
- All operations have summary
- All operations have tags
- Response schemas defined
- Parameters have descriptions
- No unused schemas

**`strict`** - Full governance:
- All recommended rules
- All operations have description
- All parameters have examples
- All schemas have descriptions
- Security defined on all operations
- No inline schemas (use $ref)

**Express-Specific Rules:**
- `express/consistent-path-params` - Path parameters match Express conventions
- `express/middleware-documented` - Middleware effects documented
- `express/error-responses` - Error responses follow Express patterns

**Custom Ruleset File (`.swagger-auto-lint.yaml`):**
```yaml
extends: recommended

rules:
  operation-operationId: error
  operation-summary: warn
  operation-description: off
  
  # Express-specific
  express/consistent-path-params: error
  express/error-responses: warn
```

**Example Output (stylish):**
```
openapi.yaml
  45:12  error    Missing operationId           operation-operationId
  67:8   warning  Missing operation description operation-description
  89:4   error    Unused schema: LegacyUser     no-unused-schemas

✖ 3 problems (2 errors, 1 warning)
```

---

## Phase 7.3: Advanced Workflows (v0.5.0)

Target: High effort features for advanced API development workflows.

---

### `bundle` Command

**Purpose:** Combine multi-file API descriptions into a single file with $ref resolution.

**Value:** Large API management, team collaboration, tooling compatibility.

**Complexity:** Medium

**Usage:**
```bash
express-swagger-auto bundle <specPath> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--output` | Output file path | stdout |
| `--format` | Output format (json\|yaml) | Auto from extension |
| `--dereference` | Fully inline all $ref references | `false` |
| `--remove-unused` | Tree shake unused schemas | `false` |
| `--keep-external` | Keep external URL references | `false` |

**Example:**
```bash
# Bundle with dereferencing
express-swagger-auto bundle ./api/openapi.yaml -o ./dist/openapi.yaml --dereference

# Bundle and remove unused schemas
express-swagger-auto bundle ./api/openapi.yaml -o ./dist/openapi.yaml --remove-unused
```

---

### `mock` Command

**Purpose:** Generate a functioning mock server from the OpenAPI spec.

**Value:** Frontend development decoupling, API-first workflows, integration testing.

**Complexity:** High

**Usage:**
```bash
express-swagger-auto mock [specPath] [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--port` | Server port | `4010` |
| `--host` | Server host | `localhost` |
| `--delay` | Response delay (ms) | `0` |
| `--validate-request` | Validate incoming requests | `true` |
| `--dynamic` | Generate dynamic responses from schemas | `false` |
| `--cors` | Enable CORS | `true` |

**Features:**
- Serve example responses from spec
- Dynamic response generation from schemas (using Faker.js patterns)
- Request validation against spec
- Configurable response delays for latency simulation
- CORS support for frontend development

**Example:**
```bash
# Basic mock server
express-swagger-auto mock ./openapi.yaml

# With dynamic responses and delay
express-swagger-auto mock ./openapi.yaml --dynamic --delay 200
```

---

### `score` Command

**Purpose:** Calculate an overall API quality score with actionable recommendations.

**Value:** Gamification, quality gates, API governance metrics, continuous improvement.

**Complexity:** Medium

**Usage:**
```bash
express-swagger-auto score [specPath] [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--format` | Output format (text\|json) | `text` |
| `--threshold` | Minimum passing score (0-100) | `70` |
| `--fail-below` | Exit with error below threshold | `false` |

**Scoring Categories:**
- **Documentation** (30 points) - Descriptions, summaries, examples
- **Security** (25 points) - Auth schemes, HTTPS, sensitive data handling
- **Consistency** (20 points) - Naming conventions, response patterns
- **Completeness** (15 points) - All operations documented, schemas defined
- **Best Practices** (10 points) - Versioning, pagination, error handling

**Example Output:**
```
🏆 API Quality Score: 78/100 (B+)

Documentation       24/30  ████████░░
  ✓ 95% operations have summaries
  ✗ 45% operations lack examples
  ✓ 78% schemas have descriptions

Security            20/25  ████████░░
  ✓ Bearer authentication defined
  ✓ 85% endpoints have security
  ✗ No rate limiting documented

Consistency         18/20  █████████░
  ✓ Consistent naming conventions
  ✓ Standard error response format
  ✗ Mixed path parameter styles

Completeness        12/15  ████████░░
  ✓ All operations have responses
  ✗ 3 schemas missing from components

Best Practices       4/10  ████░░░░░░
  ✗ No API versioning in paths
  ✗ No pagination on list endpoints
  ✓ Standard HTTP methods used

💡 Recommendations:
  1. Add examples to 23 operations (potential +6 points)
  2. Document rate limiting headers (potential +3 points)
  3. Add API version prefix to paths (potential +4 points)
```

---

### `preview` Command

**Purpose:** Hot-reloading documentation preview server.

**Value:** Documentation authoring workflow, real-time feedback during development.

**Complexity:** Low (extends existing `serve` command)

**Usage:**
```bash
express-swagger-auto preview [specPath] [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--port` | Server port | `3000` |
| `--theme` | Documentation theme (swagger\|redoc\|rapidoc) | `swagger` |
| `--watch` | Watch for spec changes | `true` |
| `--open` | Open browser automatically | `true` |

**Features:**
- Multiple documentation renderers (Swagger UI, ReDoc, RapiDoc)
- Live reload on spec changes
- Theme customization
- Auto-open browser

---

## Implementation Dependencies

### Phase 7.1 (v0.3.1)
```json
{
  "dependencies": {
    "tabtab": "^3.0.2"  // Shell completion (optional, can use Commander built-in)
  }
}
```

### Phase 7.2 (v0.4.0)
```json
{
  "dependencies": {
    "openapi-diff": "^0.23.0",  // Or build custom for Express insights
    "json-diff": "^1.0.6"       // For schema comparison
  }
}
```

### Phase 7.3 (v0.5.0)
```json
{
  "dependencies": {
    "@stoplight/json-ref-resolver": "^3.1.6",  // For $ref resolution
    "@faker-js/faker": "^8.4.0",               // For dynamic mock data
    "json-schema-faker": "^0.5.6"              // For schema-based mocking
  }
}
```

---

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| `stats` | Adoption | Used in 50% of CI pipelines |
| `completion` | Satisfaction | 90% positive feedback |
| `diff` | CI Integration | Used in 30% of PR workflows |
| `lint` | Rule Coverage | 20+ built-in rules |
| `mock` | Usage | 40% of frontend teams using |
| `score` | Quality | Average score improvement of 15 points |

---

## References

- [Redocly CLI](https://redocly.com/docs/cli/) - Industry leader for OpenAPI tooling
- [Spectral](https://github.com/stoplightio/spectral) - OpenAPI linting
- [OpenAPI Generator](https://openapi-generator.tech/) - Code generation
- [Prism](https://github.com/stoplightio/prism) - Mock server reference
- [openapi-diff](https://github.com/OpenAPITools/openapi-diff) - Diff library reference
