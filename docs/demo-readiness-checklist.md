# Demo Readiness Checklist (OKX Demo Trading)

Use this checklist as the release gate before calling the system "fully fledged demo trading".

Status legend:
- `DONE`: implemented and validated
- `PARTIAL`: implemented but missing depth/coverage
- `PENDING`: not yet implemented

## Scope Clarification
- This checklist is **not Milestone 2 only**.
- Based on `docs/roadmap.md`, demo trading readiness mainly spans:
  - Milestone 4 (demo trading + full audit)
  - Phase 3 hardening work (approval governance, operator workflows, reliability)

## A. Execution Path and Safety Gates
- [ ] `A1` Propose -> gatekeeper -> human approval -> execute path is enforced for every execution-capable action.
  - Status: `PARTIAL`
  - Pass criteria: no code path can execute/cancel without policy + approval checks.
- [ ] `A2` Start/pause/resume/stop controls operate real worker jobs (not only lifecycle state transitions).
  - Status: `PENDING`
  - Pass criteria: backend controls directly drive live loop workers.
- [ ] `A3` Emergency stop dual-approval policy is enforced with distinct users.
  - Status: `DONE`
  - Evidence: contract tests in `tests/mission-control-contract.spec.ts`.

## B. Approvals Governance
- [ ] `B1` Approval lifecycle supports `pending/approved/rejected/expired`.
  - Status: `DONE`
- [ ] `B2` Approval expiry prevents stale approval reuse.
  - Status: `DONE`
- [ ] `B3` Approvals are attributed to real user identity (`x-user-id`) and visible in UI.
  - Status: `DONE`
- [ ] `B4` Approval events are reflected in audit timeline with actor IDs.
  - Status: `DONE`

## C. Reconciliation and Trading State
- [ ] `C1` Orders/fills/positions/PnL reconciliation is continuous and surfaced live in UI.
  - Status: `PARTIAL`
  - Pass criteria: live API endpoints feed UI with up-to-date reconciliation states and drift details.
- [ ] `C2` Drift thresholds can auto-halt or pause trading safely.
  - Status: `PENDING`
  - Pass criteria: policy-based circuit breakers tied to reconciliation outcomes.

## D. Reliability and Fault Handling
- [ ] `D1` Structured error handling and retry budgets for exchange/API failures.
  - Status: `PARTIAL`
- [ ] `D2` Stale data protections (market/account/order freshness checks) auto-block execution.
  - Status: `PENDING`
- [ ] `D3` Restart/recovery preserves correct runtime state and audit continuity.
  - Status: `PENDING`

## E. Observability and Auditability
- [ ] `E1` Durable event persistence supports filtering/cursor pagination for operations.
  - Status: `PARTIAL` (JSONL with query/cursor exists)
  - Pass criteria: durable structured store (preferred SQLite) + replay integrity checks.
- [ ] `E2` Operator-facing metrics and alerts exist for critical failure modes.
  - Status: `PENDING`
  - Minimum: command failure rate, reconnect/lag, reject rate, drift count, heartbeat gaps.
- [ ] `E3` Incident timeline export and runbook-level diagnostics are available.
  - Status: `PENDING`

## F. Security and Access Control
- [ ] `F1` Role enforcement is complete for all control and approval endpoints.
  - Status: `PARTIAL`
- [ ] `F2` Authentication is stronger than header-stub identity for serious internal demo.
  - Status: `PENDING`
  - Pass criteria: signed auth/session with immutable actor attribution.

## G. UI Operational Completeness
- [ ] `G1` Control responses/toasts are structured and actionable.
  - Status: `DONE`
- [ ] `G2` Connection degraded/restored behavior is visible and non-blocking.
  - Status: `DONE`
- [ ] `G3` Approval queue supports approve/reject/execute with countdown and state clarity.
  - Status: `DONE`

## H. Validation Gate (must all pass)
- [ ] `H1` Type checks pass (`npm run typecheck`, `npm run mission-control:typecheck`).
- [ ] `H2` Test suite passes (`npm test`, `npm run mission-control:test`).
- [ ] `H3` UI build passes (`npm run mission-control:build`).
- [ ] `H4` End-to-end demo scenarios pass:
  - start run
  - proposal + gatekeeper
  - approval-required action
  - dual-approval emergency stop
  - expired approval rejection
  - rejected approval rejection
  - reconciliation drift scenario

## Current Recommendation
- Treat demo readiness as: **Milestone 4 + Phase 3 hardening checkpoint**, not Milestone 2 closure.
