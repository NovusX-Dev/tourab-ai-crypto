# Release Hardening

## Summary
Checklist-driven hardening for shipping reliable, observable, and recoverable releases of trading control software.

Use this skill for late-stage readiness and release gating:
- pre-ship verification
- rollback readiness
- incident/runbook readiness
- observability coverage
- recovery-path verification

Do not use this skill as the main planner for roadmap slicing or milestone implementation order. That belongs to `phase-delivery-playbook`.

## Trigger cues
- "prepare release"
- "production readiness"
- "hardening"
- "incident readiness"
- "ship checklist"
- "rollback plan"
- "soak readiness"

## Non-goals
- roadmap decomposition
- milestone slicing
- deciding implementation order
- broad feature planning

## Hardening workflow
1. Verify build + type + tests pass in CI equivalent locally.
2. Validate config and env schema before startup.
3. Validate observability coverage (logs, metrics, alerts).
4. Validate recovery paths (restart, replay, reconcile).
5. Validate rollback path and data backup procedure.

## Release gate checklist
- Security: role enforcement, secrets handling, no debug bypass flags enabled.
- Reliability: lifecycle transitions idempotent and tested.
- Data durability: append-only event persistence verified.
- Operability: runbook updated with known failure scenarios.
- Compatibility: frontend/backend contract checks pass.

## Pre-release test matrix
- Happy path control lifecycle.
- Unauthorized action attempts.
- Invalid transition attempts.
- WS reconnect and replay behavior.
- Reconciliation drift scenario.

## Gotchas / failure modes
- Shipping without tested rollback.
- Alert definitions exist but are not actionable.
- Unversioned policy changes that cannot be audited.

## What we decided for Tourab Crypto AI
- No phase close without reproducible validation logs.
- Keep runbook and incident checklist in sync with shipped behavior.
- Treat observability as a release feature, not post-release work.

## Boundary rule
- Use `release-hardening` when the main question is "can this be shipped, promoted, or soaked safely?"
- Use `phase-delivery-playbook` when the main question is "how should this phase be executed?"

## References
- `README.md`
- `tests/TEST_PLAN.md`
- `docs/roadmap.md`
- `docs/decisions.md`
