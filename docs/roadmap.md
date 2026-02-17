# Roadmap

## Status Snapshot (as of 2026-02-17)
- Milestone 1: substantially delivered.
- Milestone 2: delivered.
- Milestone 3: production-grade complete.
- Milestone 4: production-grade complete.
- Milestone 5: pending.
- Milestone 6: pending.

## Milestone 1: Read-Only OKX Connectivity + Operator Visibility
- Build signed private-read client and public market-read client.
- Display ticker and balances in operator surfaces.
- Keep trading endpoints disabled.
- Add request/response metadata logging (redacted).

## Milestone 2: Proposal Schema + Validation (No Trading)
- Define proposal JSON schema in `packages/shared/`.
- Add validation library and schema tests.
- Add proposal lifecycle handling.

## Milestone 3: Risk Gatekeeper + Human Approval Gate (No Autonomous Trading)
- Implement policy engine for risk limits and mode checks.
- Require human approval before any executable action.
- Add reject reasons and audit events.
- Completion status: production-grade complete (invariants formalized + enforced by unit/property/integration tests).

## Milestone 4: Demo Trading (Manual Approval) + Lifecycle + Audit/Reconciliation
- Enable OKX demo-only execution path behind gatekeeper.
- Add order lifecycle operations (submit/cancel/cancel-all) with approval controls.
- Add reconciliation and drift reporting.
- Add mission-control backend/UI with:
  - REST + WS runtime monitoring/control,
  - approval workflows (including dual-approval emergency stop),
  - approval expiry/reject states,
  - attributed audit trail entries,
  - incident/alert workflow baseline (persistent alert store + acknowledge/resolve in UI),
  - drift-triggered circuit-breaker baseline (auto pause/stop + alert/audit/UI integration),
  - execution freshness guard baseline (market/account/orders staleness checks before submit),
  - real worker/control-plane coupling baseline (start/pause/resume/stop tied to active worker loop),
  - signed auth baseline (HMAC bearer token support with enforce mode),
  - structured persistent ops store baseline (SQLite-backed audit + incidents),
  - incident taxonomy + runbook-linked lifecycle (`open/acknowledged/resolved`) and export endpoint.
- Completion status: production-grade complete (all previously listed demo-readiness partials C1/D1/D3/E1/E2 closed).

## Milestone 5: Live Small Notional ($50) + Strict Limits + Kill Switch
- Enable live mode only behind explicit config and startup warnings.
- Enforce max notional, instrument allowlist, daily cap, and immediate kill switch.
- Require clean reconciliation and audit checks before each session.

## Milestone 6: Research/Backtesting Integration Loop
- Integrate Python signal generation into Node proposal pipeline.
- Add experiment tracking metadata and promotion criteria.
- Keep human approval mandatory for all executions.

## Cross-Cutting Delivery Tracks
- Mission Control UI/Backend phases (Phase 1/2/3) are implementation tracks that support Milestone 4+ hardening.
- UI parity rule: every operator-facing backend change (controls, safety gates, statuses, error codes, audit semantics) must ship with corresponding Mission Control UI updates in the same phase before the item is considered complete.
