# Roadmap

## Status Snapshot (as of 2026-02-17)
- Milestone 1: substantially delivered.
- Milestone 2: delivered.
- Milestone 3: production-grade complete.
- Milestone 4: production-grade complete.
- Milestone 5: in progress.
- Milestone 6: pending.
- Milestone 7: pending.
- Milestone 8: pending.
- Milestone 9: pending.

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

## Milestone 5: Autonomous Exit Engine + Closed-Trade Accounting (Demo First)
- Add deterministic exit policies per trade (TP/SL/time-stop/session flatten).
- Persist exit policy at entry approval time and bind it to order/trade IDs.
- Implement trade lifecycle state machine (`planned` -> `closed`) with idempotent transitions.
- Emit explicit close reason taxonomy (`stop_loss`, `take_profit`, `time_stop`, `manual`, `circuit_breaker`, `flatten`).
- Keep entry approval mandatory while exit execution is automatic per policy.
- Add operator-visible controls:
  - enable/disable auto-exit engine,
  - default exit profile selection,
  - per-symbol overrides with bounded ranges.
- Add acceptance tests for:
  - partial fills, cancel/replace, websocket gaps, reconnect recovery, duplicate events.

Implementation status (current):
- Implemented:
  - persistent managed-trades store (SQLite),
  - auto-exit config API (`GET/POST /auto-exit/config`),
  - managed-trades API (`GET /managed-trades`),
  - backend auto-exit evaluator (TP/SL/time-stop/flatten),
  - Mission Control Autonomy tab (config + managed trade visibility),
  - compact Demo Readiness autonomy guardrail chip,
  - Milestone 5 evidence endpoint (`GET /milestone5/evidence`) + resumable rollup script (`npm run evidence:m5`) + sidebar readiness card (`qualifiedDays/7`, streak, blockers).
- Pending before declaring complete:
  - sustained demo soak + evidence for acceptance criteria below,
  - validation coverage for all listed edge paths under production-like load.

Completion criteria:
- >=95% of filled entries are closed by deterministic policy path without manual intervention.
- Every closed trade has a unique trade ID, realized PnL, fees, and exit reason.
- Reconciliation drift on orders/positions/pnl remains within configured SLO for 7 qualifying calendar demo days (intermittent sessions + resumable evidence rollup allowed).

## Milestone 6: Bounded Entry Autonomy + Promotion Pipeline
- Add feature-flagged auto-entry mode with strict guardrails:
  - symbol allowlist,
  - max per-order notional,
  - max open exposure,
  - daily/weekly loss caps,
  - cooldown after loss streak.
- Add explicit approval mode policy:
  - `approval_mode = manual | policy_auto`.
  - default is `manual`.
  - `policy_auto` is enabled only by explicit config and runtime policy checks.
- Enforce strict `policy_auto` guardrails:
  - small-notional limits only,
  - symbol allowlist only,
  - demo readiness must be fully green,
  - no open incidents/critical alerts,
  - daily/weekly loss caps must have remaining budget.
- Add automatic fallback behavior:
  - fallback to `manual` immediately on any drift state,
  - fallback to `manual` on critical alerts/incidents,
  - fallback to `manual` on kill-switch/emergency-stop activation.
- Add champion/challenger strategy framework with version pinning.
- Add promotion pipeline:
  - `research` -> `shadow` -> `paper canary` -> `limited prod`.
- Add automatic rollback to previous stable strategy on degradation triggers.
- Keep emergency-stop and cancel-all always human-controlled.

Completion criteria:
- New strategy versions cannot reach limited prod without passing promotion gates.
- Auto-entry can be disabled instantly by kill-switch and incident circuit-breaker.
- All live orders are attributable to strategy version and policy version.
- Every submitted order records the effective `approval_mode` at decision time.
- `policy_auto` sessions automatically revert to `manual` under fallback triggers with audit/event evidence.

## Milestone 7: Adaptive Learning System (Governed)
- Add closed-trade feature store for post-trade learning.
- Add offline retraining jobs with reproducible configs, dataset snapshots, and audit trail.
- Add model risk controls aligned to SR 11-7 and AI RMF:
  - independent validation,
  - approval workflow for model promotion,
  - monitoring for drift and instability.
- Add online evaluation dashboards:
  - expectancy net fees,
  - drawdown,
  - slippage,
  - control violations by model/version.

Completion criteria:
- Learning updates are never deployed directly without validation and approval.
- Model/version rollback is tested and operator-visible.
- Performance reporting is stable across walk-forward windows, not only in-sample backtests.

## Milestone 8: Live Small Notional ($50) + Strict Limits + Kill Switch
- Enable live mode only behind explicit config and startup warnings.
- Enforce max notional, instrument allowlist, daily cap, and immediate kill switch.
- Require clean reconciliation and audit checks before each session.

Completion criteria:
- Live trading cannot start unless all readiness and reconciliation checks pass.
- Kill-switch halts new entries and triggers configured flatten/cancel behavior within SLO.
- All live trades remain within configured notional and risk caps for 30 consecutive days.

## Milestone 9: Research/Backtesting Integration Loop
- Integrate Python signal generation into Node proposal pipeline.
- Add experiment tracking metadata and promotion criteria.
- Keep human approval mandatory for all executions.

Completion criteria:
- Every promoted strategy has reproducible research artifacts and experiment lineage.
- Backtest/walk-forward reports are attached to each promotion decision.
- Human approval remains enforced for execution actions unless explicitly superseded by a future approved policy.

## Cross-Cutting Delivery Tracks
- Mission Control UI/Backend phases (Phase 1/2/3) are implementation tracks that support Milestone 4+ hardening.
- UI parity rule: every operator-facing backend change (controls, safety gates, statuses, error codes, audit semantics) must ship with corresponding Mission Control UI updates in the same phase before the item is considered complete.
