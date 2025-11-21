# Copilot Instructions · express-swagger-auto

Use this guide when generating or editing code/content for the hybrid Swagger automation package.

## 1. Source of Truth
- Align all work with `CLAUDE.md` (architecture guardrails) and `AGENTS.md` (role expectations).
- Reference the uploaded research blueprint for differentiators (hybrid strategy, validator adapters, zero-config).

## 2. Coding Standards
- Language: TypeScript (ES2022 target). Use strict mode and keep files ASCII unless legacy content requires otherwise.
- Build: `tsup` bundles (`tsup.config.ts`), outputting CJS + ESM + d.ts.
- Tests: Vitest. Run `pnpm test` plus focused suites touched by your change. Snapshot OpenAPI fragments for schema logic.
- Formatting: Prettier defaults (2-space indent). ESLint with `@typescript-eslint` rules; fix warnings before PR.
- Folder layout (do not rename without approval):
  - `src/core`: route discovery, spec generation, schema extraction.
  - `src/parsers`: AST, JSDoc, decorator, runtime capture helpers.
  - `src/validators`: Zod/Joi/Yup adapters + plugin SDK.
  - `src/middleware`: Express middlewares (doc server, capture, validation helper).
  - `decorators/`: TypeScript decorator exports.
  - `examples/`: Minimal apps demonstrating each strategy.

## 3. Feature Expectations
- **Hybrid support**: Every major feature must consider decorators, JSDoc, and runtime capture unless scoped otherwise.
- **Validator adapters**: Require fixtures + docs updates. Mark experimental features visibly in README + docs.
- **Security**: Mask sensitive fields in runtime capture logs/specs. Production mode disables capture by default.
- **Performance**: Respect budgets from `CLAUDE.md` (e.g., spec generation <50 ms/100 routes by Phase 4).

## 4. Tooling & Models
- Default coding/model choice: `GPT-5.1-Codex (Preview)`.
- Use **Microsoft Agent Framework** for orchestrated automation. Install with `pip install agent-framework-azure-ai --pre` (flag required).
- For lightweight experiments, prefer GitHub models (e.g., `openai/gpt-5.1-codex` via `https://models.github.ai/inference/`). Document any alternative model/host in PR notes.

## 5. Documentation & Examples
- Update README + `docs/*` whenever CLI flags, middleware signatures, or adapters change.
- Keep example apps runnable with `pnpm install && pnpm dev`. Add scenario-specific instructions inside each example folder.
- Ensure `docs/QA.md`, `docs/ai-model-evals.md`, and `docs/AGENT_LOG.md` (once created) receive relevant updates.

## 6. Git & Review Workflow
- Small, focused commits (<400 LOC). Include context in commit messages (e.g., `feat(core): add zod adapter snapshot tests`).
- Never revert user changes without explicit direction. Avoid destructive git commands (`reset --hard`, etc.).
- When touching generated assets, describe how they were produced and reference the exact command.

## 7. Safety + Compliance Checks
- Remove secrets from captured payloads and logs before committing.
- Do not ship runtime capture enabled in production configs.
- Validate OpenAPI output with `@apidevtools/swagger-parser` as part of QA flow.

Follow this playbook to keep assistants aligned with the hybrid Swagger automation strategy while producing high-quality, reviewable changes.