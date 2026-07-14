# Architecture

## Summary
Tourab Crypto AI uses explicit boundaries between the operator control plane, exchange adapters, shared schemas, persistence, and research workflows.

Use this skill when the main question is where logic should live, how modules should depend on each other, or how to avoid coupling that will poison later autonomy stages.

This skill is about repo-specific boundaries and ownership, not generic software-architecture theory.

## Trigger cues
- "where should this logic live"
- "architecture"
- "boundary"
- "ownership"
- "coupling"
- "split this module"
- "shared schema"
- "who should own this behavior"

## Non-goals
- release-readiness checklist
- UI layout or component composition
- transport choice details when `node-dashboard-patterns` is the real fit
- OKX protocol specifics when an `okx/*` skill is the real fit

## Boundary map
1. `apps/dashboard/`
   - Mission Control backend, execution orchestration, approval policy, runtime services
2. `apps/mission-control/`
   - operator-facing UI, control surfaces, real-time visibility
3. `packages/shared/`
   - shared types, contracts, machine-readable payload shapes
4. `packages/okx-demo-adapter/`
   - exchange-facing OKX interaction and venue-specific execution behavior
5. `packages/risk-gatekeeper/`
   - pre-execution allow/deny policy
6. `apps/research/`
   - research, offline analysis, model/strategy iteration
7. `logs/*.sqlite`, JSONL, and evidence artifacts
   - runtime truth, auditability, replay, and validation evidence

## Workflow
1. Identify the primary responsibility of the change:
   - policy
   - exchange integration
   - orchestration/runtime
   - UI/operator workflow
   - shared contract
   - offline research
2. Place logic in the lowest-level module that can own it without importing higher-level concerns.
3. Push shared payloads and enums into `packages/shared/` only when multiple modules truly depend on them.
4. Keep venue-specific behavior out of general orchestration unless abstraction would be fake.
5. Keep UI presentation concerns out of backend state-transition logic.
6. Require explicit interfaces at boundaries:
   - typed payloads
   - versioned event/decision shapes
   - testable pure logic where practical
7. Check whether the proposed placement makes future rollout stages safer or more coupled.

## References
- Node.js docs: https://nodejs.org/en/docs
- Python docs: https://docs.python.org/3/
- JSON Schema: https://json-schema.org/

## Examples
- Initial interface choice:
  - Node spawns local Python worker process.
  - JSON messages over stdin/stdout.
  - Shared schema definitions in `packages/shared/`.

## Gotchas / failure modes
- Implicit ad-hoc payloads break compatibility over time.
- Tight coupling to Python internals blocks dashboard evolution.
- No schema versioning causes silent data mismatches.
- Putting venue-specific execution quirks into generic policy layers makes later exchange work harder.
- Letting Mission Control UI concerns leak into backend orchestration creates brittle tests and hidden behavior.
- Promoting everything into `packages/shared/` too early creates fake reuse and harder refactors.

## What we decided for Tourab Crypto AI
- Start with local JSON-over-stdin/stdout bridge.
- Define proposal and event schemas in shared package.
- Add explicit protocol version field from day one.
- Keep policy, exchange adapter behavior, orchestration, and UI responsibilities separate even when one person is touching all of them.

## Boundary rule
- Use `architecture` when the main question is "what module should own this behavior and how should the boundary look?"
- Prefer a more specific skill when the question is already clearly about UI, release gating, OKX behavior, or runtime safety policy.
