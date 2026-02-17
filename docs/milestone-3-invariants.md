# Milestone 3 Safety Invariants

Scope: `Risk Gatekeeper + Human Approval Gate (No Autonomous Trading)`.

## Formal invariants

1. No executable action without gatekeeper approval.
- Predicate: `evaluateTradeProposal(proposal, context).status === "APPROVE"` and `executionIntent` exists.
- Enforced in: `apps/dashboard/src/execution-service.ts`.

2. No executable action without explicit human approval.
- Predicate: `enforceHumanApproval(...)` succeeds with valid token and proposal binding.
- Enforced in: `apps/dashboard/src/human-approval.ts`, `apps/dashboard/src/execution-service.ts`.

3. No executable action with expired approval.
- Predicate: `Date.now() <= Date.parse(expiresAtIso)`.
- Enforced in: `apps/dashboard/src/human-approval.ts`.

4. All rejects emit structured audit events with machine-readable reason.
- Predicate: reject path writes `{proposal_id,timestamp,actor,decision,reason,reason_code}`.
- Enforced in: `apps/dashboard/src/execution-service.ts`.

5. Policy engine is deterministic for same input.
- Predicate: identical `(proposal, context)` always yields identical `RiskDecision`.
- Enforced by tests in: `tests/risk-gatekeeper.property.spec.ts`.

6. Mode checks prevent trading path activation unless explicitly enabled.
- Predicate: execution blocked when mode is not `demo_execution_enabled`.
- Enforced in: `apps/dashboard/src/execution-service.ts`.

7. System is fail-closed on missing approval.
- Predicate: missing/disabled/invalid approval returns rejection; no adapter call.
- Enforced in: `apps/dashboard/src/human-approval.ts`, `apps/dashboard/src/execution-service.ts`.

8. System is fail-closed on malformed proposal/context.
- Predicate: schema validation failure throws invariant error and halts.
- Enforced in: `apps/dashboard/src/execution-service.ts`.

9. System is fail-closed on missing policy config.
- Predicate: absent/invalid policy limits throw invariant error and halt.
- Enforced in: `apps/dashboard/src/execution-service.ts`.

10. System is fail-closed on audit write failure.
- Predicate: audit sink write failure throws `AUDIT_WRITE_FAILED`; execution halts.
- Enforced in: `apps/dashboard/src/execution-service.ts`.

## Repository-level assertion target

No path from proposal creation to adapter execution is valid unless all are true:
- gatekeeper decision is APPROVE,
- human approval is granted and unexpired for the same proposal,
- execution mode allows execution,
- audit writes succeed.
