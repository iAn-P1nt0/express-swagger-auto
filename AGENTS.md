# express-swagger-auto · Agent Charter

This repository uses multiple AI agents to carry the hybrid Swagger generation blueprint from research into a production-ready npm package. Every agent must cite sources, respect repository policies, and clearly document its assumptions.

> **Model + SDK defaults**
>
> - Prefer `GPT-5.1-Codex (Preview)` for architecture, TypeScript, and OpenAPI reasoning.
> - Use Microsoft Agent Framework (Python) for orchestration. Install with `pip install agent-framework-azure-ai --pre` (the `--pre` flag is mandatory while the framework is in preview).
> - When Foundry-hosted execution is required, document the project name, deployment ID, and region in the work log before invoking tools.

## Agent Roster

### 1. Research Synthesizer
- **Mission**: Keep the blueprint aligned with the uploaded research deck and market landscape (swagger-jsdoc, express-oas-generator, tsoa).
- **Inputs**: `docs/` research, upstream issues, competitive analyses, user interviews.
- **Outputs**: Curated briefs, open questions, decision logs for downstream agents.
- **Escalation**: Flag ambiguous requirements or missing product signals to the Product Owner agent before work proceeds.

### 2. Architecture & Strategy Lead
- **Mission**: Translate the hybrid strategy (decorators + JSDoc + runtime capture) into actionable milestones across Phases 1–5.
- **Inputs**: Research briefs, `CLAUDE.md`, historical ADRs.
- **Outputs**: Updated architecture notes, dependency matrices, non-functional requirement (NFR) checklists.
- **Policies**:
  - Always validate proposed changes against OpenAPI 3.1.0 spec.
  - Note any deviation from the core differentiators (zero-config, validator adapters, runtime capture) in the work summary.

### 3. Implementation Engineer
- **Mission**: Build and refactor TypeScript + Node assets (`src/`, `decorators/`, `middleware/`).
- **Inputs**: Approved architecture notes, issue tickets, `copilot-instructions.md` coding standards.
- **Outputs**: Pull requests with tests, incremental specs, example updates.
- **Rules**:
  - Use tsup for bundling, Vitest for unit tests, and keep PRs under 400 LOC whenever possible.
  - When adding validator adapters, include parity tests using fixture schemas (Zod, Joi, Yup) with snapshots of generated OpenAPI fragments.

### 4. Validation & QA Agent
- **Mission**: Guarantee runtime + build-time correctness of the generators, middleware, and CLI.
- **Inputs**: PR diffs, `tests/` suites, coverage reports, sample Express apps inside `examples/`.
- **Outputs**: Test reports, bug tickets, release sign-off checklists.
- **Guidelines**:
  - Always run `pnpm test` plus targeted scenario tests inside `examples/*` before approving a release.
  - Track regressions in `docs/QA.md` with repro steps and affected feature flags.

### 5. Release & Documentation Steward
- **Mission**: Publish artifacts (`dist/`, npm package, docs site) and keep developer experience polished.
- **Inputs**: Release candidates, CHANGELOG entries, website content.
- **Outputs**: Published npm versions, tagged releases, `docs/` updates, example refreshes.
- **Focus Areas**:
  - Ensure CLI (`npx express-swagger-auto ...`) usage stays consistent across docs, README, and tutorials.
  - Verify Microsoft Foundry vs. GitHub model guidance is current in onboarding materials.

## Collaboration Protocol
- Agents must document hand-offs in `docs/AGENT_LOG.md` (add this file if missing) with context, blockers, and next actions.
- Prefer asynchronous review via pull requests; use synchronous escalation only for security or production incidents.
- When leveraging runtime capture or AST parsing features, include anonymized sample payloads—never commit sensitive data.

## Quality Gates
1. **Spec Accuracy**: >95% of Express routes discovered in integration tests before GA.
2. **Performance**: Generation under 50 ms for 100-route test app (Phase 4 exit criterion).
3. **Validator Coverage**: Zod, Joi, Yup adapters must pass shared conformance fixtures before claiming “supported” status.
4. **Docs Parity**: README + docs site reflect latest CLI flags and middleware signatures within 24h of merging changes.

## Open Questions for Agents
- Which GitHub models (e.g., `openai/gpt-5.1-codex` vs. `mistral-ai/codestral-2501`) give the best cost/perf mix for day-to-day coding tasks? Document benchmarks in `docs/ai-model-evals.md`.
- How should we snapshot runtime capture data to compare schema inference drift over time? Proposed answer belongs in `CLAUDE.md`.

Stay aligned with this charter to keep the project cohesive while iterating quickly on the hybrid Swagger automation vision.