# Trading Safety Guardrails

## Summary
Operational guardrails that enforce safe supervised trading behavior across propose, approve, execute, cancel, and reconciliation paths.

## Trigger cues
- "risk policy"
- "approval flow"
- "emergency stop"
- "safety checks"

## Core invariants
1. Never execute without a gatekeeper approve decision.
2. Never perform destructive controls without explicit operator intent.
3. Never hide safety-critical failures; emit event + structured error.
4. Fail closed on unknown or stale state.

## Guardrail checklist by stage
### Proposal
- Validate schema and symbol constraints.
- Reject stale context.

### Gatekeeper
- Apply risk limits and policy checks deterministically.
- Return machine-readable reject reasons.

### Approval
- Enforce token/human gate for execution paths.
- Log who approved and when.

### Execution
- Enforce trading mode constraints (demo vs live).
- Block duplicate/same-side conflicting orders if policy requires.

### Cancel / Emergency stop
- Require confirmation and role checks.
- Emit lifecycle and audit events.

### Reconciliation
- Detect drift and classify severity.
- Escalate to halt/pause policy when thresholds are crossed.

## Gotchas / failure modes
- "Temporary" bypasses left in production code.
- Ambiguous reject reasons that operators cannot act on.
- Safety checks only in UI, not backend.

## What we decided for Tourab Crypto AI
- Safety path is non-optional: propose -> gatekeeper -> approve -> execute.
- Human approval remains central during early automation.
- Reconciliation and drift awareness are first-class safety signals.

## References
- `packages/risk-gatekeeper/src/index.ts`
- `apps/dashboard/src/human-approval.ts`
- `apps/dashboard/src/execution-service.ts`
- `skills/risk-gatekeeper.md`
