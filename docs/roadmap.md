# Roadmap

## Status Snapshot (as of 2026-02-23)
- Milestone 1: substantially delivered.
- Milestone 2: delivered.
- Milestone 3: production-grade complete.
- Milestone 4: production-grade complete.
- Milestone 5: in progress.
  - Latest M5 evidence (`logs/m5-evidence-2026-02-23T08-28-23-766Z/summary.md`): today `pass=true`, `qualifiedDays=5/7`, `streakDays=3`, `milestoneReady=false`.
- Milestone 6: engineering acceptance complete (production promotion remains gated by real M5 readiness evidence).
- Milestone 7: in progress.
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

Implementation status (current):
- Implemented:
  - entry autonomy policy config/status API (`GET/POST /entry-autonomy/config`) with `approval_mode = manual | policy_auto`,
  - policy-auto guardrails (symbol allowlist, notional/exposure caps, loss budgets, cooldown, readiness/incident/critical-alert/reconciliation checks),
  - automatic fallback to `manual` on drift circuit, critical alerts/incidents, and `stop`/`emergency-stop` control actions with audit/event evidence,
  - strategy promotion framework (`register/promote/rollback`) with stage ordering and limited-prod gate enforcement,
  - degradation-triggered strategy rollback and persisted strategy/degradation state,
  - Mission Control M6 Autonomy UI for entry policy, strategy promotion, and degradation thresholds,
  - contract coverage for promotion gates and fallback-trigger evidence (drift, stop, emergency-stop),
  - deterministic attribution verification for submitted orders (`approval_mode`, `strategy_version`, `policy_version`) via `tests/m6-attribution-contract.spec.ts`,
  - M6 promotion-pipeline acceptance walkthrough passed (`logs/m6-acceptance-2026-02-19T15-24-28-150Z/summary.md`) with `allStepsOk=true` and `limitedProdReached=true`.
- Remaining operational gate (outside M6 engineering acceptance):
  - run promotion decisions against fresh, real (non-seeded) M5 readiness evidence as part of live rollout governance.

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

Implementation status (current):
- Implemented (Slice 1):
  - shared M7 contracts for closed-trade feature records + learning-governance state/snapshot payloads,
  - SQLite `closed_trade_features` store with idempotent upsert/list + retention pruning,
  - automatic feature extraction/write on managed-trade `closed` transitions and startup backfill from existing closed trades,
  - operator-visible governance hooks:
    - `GET /learning/features`
    - `GET /learning/governance`
    - `POST /learning/governance/rollback` (audit + event evidence).
- Implemented (Slice 2):
  - offline dataset snapshot pipeline from Mission Control feature API:
    - `npm run snapshot:m7 -- --base-url http://localhost:7071 --lookback-days 90`
    - emits `dataset-manifest.json` + `closed-trade-features.ndjson` artifacts.
  - deterministic offline retraining skeleton:
    - `npm run retrain:m7 -- --dataset-dir <m7-dataset-dir>`
    - emits governed training artifacts (`training-run.json`, `metrics.json`, `model-card.md`, `promotion-packet.json`) with deployment blocked until validation/approval checks.
- Implemented (Slice 3 start):
  - independent validation + approval promotion gate workflow:
    - `npm run gate:m7 -- --retrain-dir <m7-retrain-dir> --min-trades 30`
  - gate checks enforced:
    - dataset volume threshold (`min-trades`),
    - independent validation passed,
    - risk review signed,
    - shadow/canary evidence attached,
    - operator approval recorded,
    - candidate model version consistency.
  - if validation/approval files are missing, gate writes JSON templates for operator completion.
- Implemented (Track 2 start: online evaluation visibility):
  - backend endpoint `GET /learning/evaluation` with lookback/limit query support,
  - evaluation rollups for:
    - expectancy net fees,
    - cumulative net pnl + max drawdown,
    - slippage proxy bps,
    - control violations by model/strategy version,
  - Mission Control Autonomy panel now shows M7 learning evaluation summary + by-model breakdown.
- Implemented (Track 2 step 2: drift/instability alerting):
  - periodic learning evaluation monitor with configurable thresholds:
    - `TOURAB_LEARNING_ALERT_*` (expectancy, drawdown, slippage, control-violation-rate, min-trades, lookback),
  - emits and auto-resolves `LEARNING_*` alerts as conditions breach/recover,
  - escalates `LEARNING_*` alerts into incidents with runbook:
    - `docs/runbooks/learning-evaluation-guard.md`.
- Implemented (Track 2 step 3: operator threshold controls):
  - backend runtime config API for learning guards:
    - `GET /learning/alert-config`
    - `POST /learning/alert-config` (operator/admin only),
  - threshold config persisted in ops runtime state (`learning_alert_thresholds`) and applied immediately after updates,
  - Mission Control Autonomy panel now provides editable M7 learning guard threshold controls.
- Implemented (Track 2 step 4: trend slices + triage context):
  - backend trend endpoint `GET /learning/evaluation-trend` with `lookbackDays`, `bucketDays`, and `limit`,
  - each trend bucket includes breach flags mapped against current runtime learning thresholds,
  - Mission Control Autonomy panel now surfaces recent trend buckets with breach tags and threshold overlays for faster incident triage.
- Implemented (Track 2 step 5: triage ergonomics + deep links):
  - trend panel filters for:
    - breach type (`all`, `any breach`, expectancy, drawdown, slippage, control-violation-rate),
    - model version cohort,
    - strategy version cohort,
  - `LEARNING_*` alerts/incidents now provide one-click "Open M7 Trend" deep links that switch to Autonomy and focus matching breach filter.
- Implemented (Track 2 step 6: learning incident export/report actions):
  - backend learning incident export endpoint:
    - `GET /learning/incidents/export?lookbackDays=30&status=open|acknowledged|resolved`
  - report includes filtered `LEARNING_*` incidents plus by-code/severity/status totals and current learning evaluation/config snapshot.
  - Mission Control Incidents panel now exposes `Export M7 Incidents` JSON download action for operator reporting workflows.
- Operational follow-up evidence (2026-02-23):
  - governance rehearsal artifact capture:
    - `logs/m7-governance-2026-02-23T05-48-24-372-03-00`
    - challenger `m7-offline-2026-02-20-79f28d9b` remains `paper_canary` (`candidate`) and production promotion remains gated by M5 readiness.
  - learning incident export/report validation artifact:
    - `logs/m7-incidents-export-validation-2026-02-23T05-52-05-317-03-00`
    - `GET /learning/incidents/export?lookbackDays=30` returned `count=3`, `openCount=3`, all `LEARNING_*`, in-window.
- Pending:
  - optional historical retention UX improvements.

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
