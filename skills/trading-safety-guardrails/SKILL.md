# Trading Safety Guardrails

## Summary
Operational guardrails that enforce safe runtime trading behavior once the system is live enough to encounter drift, submit failures, stale state, or operator intervention.

Use this skill for containment and fail-closed behavior during runtime:
- pause and resume policy
- fallback to manual
- emergency stop
- drift and reconciliation escalation
- stale-state handling
- critical alert response

Do not use this skill as the primary guide for initial proposal approval logic or approval-token validation. That belongs to `risk-gatekeeper`.

## Trigger cues
- "fallback to manual"
- "pause policy"
- "emergency stop"
- "drift"
- "reconciliation threshold"
- "critical alert"
- "safety checks"

## Non-goals
- proposal schema validation
- pre-execution allow/deny logic
- approval token semantics
- idempotency key requirements

## Core invariants
1. Never execute without a gatekeeper approve decision.
2. Never perform destructive controls without explicit operator intent.
3. Never hide safety-critical failures; emit event + structured error.
4. Fail closed on unknown or stale state.

## Runtime guardrail checklist
### Execution
- Enforce trading mode constraints (demo vs live).
- Block duplicate/same-side conflicting orders if policy requires.
- Demote autonomy or pause when runtime safety thresholds are crossed.

### Cancel / Emergency stop
- Require confirmation and role checks.
- Emit lifecycle and audit events.

### Reconciliation
- Detect drift and classify severity.
- Escalate to halt/pause policy when thresholds are crossed.

### Incident response
- Force fallback on repeated submit failure, exit-path failure, stale market data, or unexpected runtime state.
- Preserve operator-readable reason codes and audit trails.

## Gotchas / failure modes
- "Temporary" bypasses left in production code.
- Ambiguous reject reasons that operators cannot act on.
- Safety checks only in UI, not backend.

## What we decided for Tourab Crypto AI
- Safety path is non-optional: propose -> gatekeeper -> approve -> execute.
- Human approval remains central during early automation.
- Reconciliation and drift awareness are first-class safety signals.

## Boundary rule
- Use `trading-safety-guardrails` when the main question is "how should the running system contain risk or fail closed?"
- Use `risk-gatekeeper` when the main question is "should this proposal be approved before execution?"

## References
- `packages/risk-gatekeeper/src/index.ts`
- `apps/dashboard/src/human-approval.ts`
- `apps/dashboard/src/execution-service.ts`
- `apps/dashboard/src/mission-control-server.ts`
- `apps/dashboard/src/autonomy-rollout.ts`
- `skills/risk-gatekeeper/SKILL.md`
