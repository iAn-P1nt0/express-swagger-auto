# CLAUDE.md - Hybrid Swagger Automation Guardrails

This document translates the uploaded research blueprint into actionable policies for Claude-based agents (and any architecture reviewers) contributing to `express-swagger-auto`.

## Mission Snapshot
- Deliver a production-ready npm package that **automatically generates OpenAPI 3.0/3.1 specs + Swagger UI** from Express.js REST APIs.
- Differentiate via **hybrid generation** (decorators + JSDoc + runtime capture) and **validator-aware schema extraction** (Zod/Joi/Yup + plugin architecture).
- Guarantee **zero-config onboarding** for legacy apps while scaling to TypeScript-first teams.

## Architectural Pillars
1. **Route Discovery Layer**: Parse Express router stacks, nested routers, and middleware chains safely. Must handle Express 4 & 5.
2. **Metadata Harvesters**:
   - Decorator parser (TypeScript) with experimental decorators.
   - JSDoc parser (JavaScript/TypeScript) with YAML payload extraction.
   - Runtime capture middleware with opt-out toggles for production.
3. **Schema Extraction Pipeline**: Validator adapters convert runtime or declared schemas to OpenAPI.
4. **Spec Orchestrator**: `SpecGenerator` composes paths, components, security schemes, and examples with caching + watch mode.
5. **DX Surfaces**: CLI (`npx express-swagger-auto generate|serve|validate|init|stats|export|examples|completion`) + middleware to expose `/api-docs` + `/openapi.json`.

## Phase Roadmap (Current Status)
| Phase | Focus | Status |
| --- | --- | --- |
| 1 | Core foundation | Complete |
| 2 | Schema extraction | Complete |
| 3 | Advanced parsing | Complete |
| 4 | Production polish | Complete |
| 5 | Release | Complete |
| 6 | Documentation & Examples | Current |

## Decision Rules
- **Spec Target**: Default to OpenAPI 3.1. Downgrade to 3.0 only with documented constraint; update README + issue tracker accordingly.
- **Strategy Coverage**: No feature should land if it benefits only ONE strategy unless the other two have a roadmap item tracked.
- **Validator Support**: A validator adapter is "supported" only after conformance fixtures + docs + example app exist.
- **Runtime Capture Safety**: Always sanitize payloads (password/token/API key). Production flag must default to disabled.
- **Performance Budgets**:
  - Route discovery: O(n) relative to layer count.
  - Spec generation: Under 50 ms for 100-route app.
  - CLI file watching: Debounce >= 500 ms, throttle <= 1 Hz.

## AI + Tooling Guidance
- Claude agents should call **`GPT-5.1-Codex (Preview)`** when reasoning about code, ASTs, or decorators.
- Use **Microsoft Agent Framework** for orchestrated tasks (`pip install agent-framework-azure-ai --pre`). Document selected model + SDK per run.
- Prefer GitHub-hosted models for quick experiments (`openai/gpt-5.1-codex` via `https://models.github.ai/inference/`).

## Testing & Quality Gates
- Unit tests: Vitest + tsup build verification on every PR.
- Integration tests: Sample Express apps under `examples/*` covering each generation strategy.
- Schema snapshot tests for adapters (serialize OpenAPI fragments to fixtures).
- CLI e2e tests (using `pnpm vitest run --config vitest.config.ts --runInBand`).
- **Current test count**: 474 tests passing with 100% success rate.
- Coverage target: >=85% for `src/core/*`.

## Security & Compliance
- Never log full request/response bodies in production runtime capture mode; use hashed placeholders.
- User-provided secrets (Bearer tokens, API keys) must be masked before caching specs on disk.
- Doc site and examples must clarify that runtime capture is dev-time only unless explicitly enabled.
- SecurityDetector automatically identifies JWT/Bearer, API Key, OAuth2, and Basic auth schemes.

## Key Components (v0.3.2)

### Core
- `RouteDiscovery` - Express app route extraction
- `SpecGenerator` - OpenAPI specification generation
- `MiddlewareAnalyzer` - Middleware analysis
- `PathParameterExtractor` - Path parameter extraction
- `RouteMetadataEnricher` - Route metadata enrichment
- `SnapshotStorage` - Runtime snapshot persistence
- `ExampleMerger` - Example merging logic

### Schema
- `JoiSchemaParser` - Joi schema parsing
- `ControllerAnalyzer` - Controller function analysis
- `SchemaExtractor` - Unified schema extraction

### Validators
- `ZodAdapter` - Zod to OpenAPI conversion
- `JoiAdapter` - Joi to OpenAPI conversion
- `YupAdapter` - Yup to OpenAPI conversion
- `ValidatorRegistry` - Plugin architecture

### Parsers
- `JsDocParser` - JSDoc comment parsing
- `JsDocTransformer` - JSDoc to OpenAPI transformation
- `CommentExtractor` - Source file comment extraction

### Inference
- `TypeInferenceEngine` - TypeScript type parsing

### Security
- `SecurityDetector` - Security scheme detection

### Watch
- `FileWatcher` - File change monitoring

### Config
- `ConfigLoader` - Configuration file loading (cosmiconfig)

## Pending Questions
- How to persist runtime inference samples for drift analysis? (Candidate: `data/runtime-snapshots/*.json` with hashing.)
- Should validator adapters support Ajv/JSON Schema out of the box, or ship later via plugins?
- Which Microsoft Foundry deployments will back CI inference steps? Capture details in `docs/ai-model-evals.md` when decided.

Stay aligned with these guardrails when proposing architecture changes or reviewing contributions. Deviations must cite rationale, risk mitigation, and rollback plans.
