# CLAUDE.md · Hybrid Swagger Automation Guardrails

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
4. **Spec Orchestrator**: `OpenAPI31Generator` composes paths, components, security schemes, and examples with caching + watch mode.
5. **DX Surfaces**: CLI (`npx express-swagger-auto generate|serve|validate|migrate`) + middleware to expose `/api-docs` + `/openapi.json`.

## Phase Roadmap (from research)
| Phase | Focus | Definition of Done |
| --- | --- | --- |
| 1 | Core foundation | TypeScript scaffolding, route discovery, baseline spec + Swagger UI integration, Vitest harness |
| 2 | Schema extraction | Zod/Joi/Yup adapters, plugin API, runtime schema inference |
| 3 | Advanced parsing | AST tooling, decorator system, example + type inference engine |
| 4 | Production polish | Security detection, perf tuning (<50 ms/100 routes), hot reload, CLI, migration helpers |
| 5 | Release | Docs site, examples, CI/CD, npm publish, feedback loop |

## Decision Rules
- **Spec Target**: Default to OpenAPI 3.1. Downgrade to 3.0 only with documented constraint; update README + issue tracker accordingly.
- **Strategy Coverage**: No feature should land if it benefits only ONE strategy unless the other two have a roadmap item tracked.
- **Validator Support**: A validator adapter is “supported” only after conformance fixtures + docs + example app exist.
- **Runtime Capture Safety**: Always sanitize payloads (password/token/API key). Production flag must default to disabled.
- **Performance Budgets**:
  - Route discovery: O(n) relative to layer count.
  - Spec generation: Under 50 ms for demo app (Phase 4 exit).
  - CLI file watching: Debounce ≥ 500 ms, throttle ≤ 1 Hz.

## AI + Tooling Guidance
- Claude agents should call **`GPT-5.1-Codex (Preview)`** when reasoning about code, ASTs, or decorators.
- Use **Microsoft Agent Framework** for orchestrated tasks (`pip install agent-framework-azure-ai --pre`). Document selected model + SDK per run.
- Prefer GitHub-hosted models for quick experiments (`openai/gpt-5.1-codex` via `https://models.github.ai/inference/`).

## Testing & Quality Gates
- Unit tests: Vitest + tsup build verification on every PR.
- Integration tests: Sample Express apps under `examples/*` covering each generation strategy.
- Schema snapshot tests for adapters (serialize OpenAPI fragments to fixtures).
- CLI e2e tests (using `pnpm vitest run --config vitest.config.ts --runInBand`).
- Coverage target: ≥85% for `src/core/*` before GA.

## Security & Compliance
- Never log full request/response bodies in production runtime capture mode; use hashed placeholders.
- User-provided secrets (Bearer tokens, API keys) must be masked before caching specs on disk.
- Doc site and examples must clarify that runtime capture is dev-time only unless explicitly enabled.

## Pending Questions
- How to persist runtime inference samples for drift analysis? (Candidate: `data/runtime-snapshots/*.json` with hashing.)
- Should validator adapters support Ajv/JSON Schema out of the box, or ship later via plugins?
- Which Microsoft Foundry deployments will back CI inference steps? Capture details in `docs/ai-model-evals.md` when decided.

Stay aligned with these guardrails when proposing architecture changes or reviewing contributions. Deviations must cite rationale, risk mitigation, and rollback plans.