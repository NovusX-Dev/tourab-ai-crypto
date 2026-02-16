# Phase Delivery Playbook

## Summary
A reusable delivery workflow for executing roadmap phases (UI, backend, hardening) with clear scope, quality gates, and exit criteria.

## Trigger cues
- "start phase 1/2/3"
- "implement next milestone"
- "what is the next execution plan"

## Workflow
1. Confirm phase objective, in-scope items, and explicit non-goals.
2. Define implementation slices that can be built and tested incrementally.
3. Implement vertical slices in this order:
   - contracts/types
   - core logic
   - interfaces (API/UI/CLI)
   - tests and docs
4. Run validation gates before closing phase:
   - build/typecheck
   - unit tests
   - integration tests where available
   - manual smoke test
5. Publish phase close-out:
   - what shipped
   - known limitations
   - readiness for next phase

## Quality gates
- No silent safety bypass.
- Every state transition has explicit validation.
- Errors are structured and operator-readable.
- Any new runtime path is observable (event/log/metric).

## Deliverable template
- Objective
- Implemented scope
- Files changed
- Validation results
- Deferred items
- Next-step handoff

## Gotchas / failure modes
- Scope creep from optional UX features in safety-critical phases.
- Shipping UI before stable contracts.
- Missing role/action gating tests.

## What we decided for Tourab Crypto AI
- Deliver by phases with strict non-goals.
- Keep each phase independently runnable.
- Require passing tests/build before phase sign-off.

## References
- `docs/roadmap.md`
- `docs/decisions.md`
- `tests/TEST_PLAN.md`
