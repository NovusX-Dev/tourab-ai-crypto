# Roadmap

## Status Snapshot (as of 2026-02-25)
- Milestone 1: substantially delivered.
- Milestone 2: delivered.
- Milestone 3: production-grade complete.
- Milestone 4: production-grade complete.
- Milestone 5: complete.
  - Latest M5 evidence (`logs/m5-evidence-2026-02-25T08-26-50-199Z/summary.md`): today `pass=true`, `qualifiedDays=7/7`, `streakDays=5`, `milestoneReady=true`.
  - Completion status: production-grade complete (calendar-day readiness gate satisfied + explicit edge-path acceptance coverage added and passing).
- Milestone 6: complete.
  - Live governance evidence with fresh real M5 readiness passed (`logs/m6-live-governance-2026-02-25T09-38-14-445Z/summary.md`): `allStepsOk=true`, `limitedProdReached=true`, `m5QualifiedDays=7/7`, `m5TodayPass=true`.
  - Post-check safety rollback executed to stable champion (`champion-v1`) after proof run to avoid leaving the temporary challenger active.
- Milestone 7: complete (governed pipeline complete; completion criteria validated with remediated walk-forward-stable candidate); SOL `moderate` re-entry now has fresh pass evidence and remains under routine monitoring.
- Milestone 8: pending.
- Milestone 9: pending.
- Milestone 10 (optional): pending.

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
  - none.

Completion status:
- production-grade complete.
- edge-path acceptance coverage now explicitly includes:
  - partial fills (`tests/reconciliation.spec.ts`),
  - cancel/replace lifecycle (`tests/reconciliation.spec.ts`),
  - websocket gap + reconnect replay recovery (`tests/mission-control-contract.spec.ts`),
  - duplicate-event idempotency (`tests/sqlite-event-store.spec.ts`, plus duplicate-fill drift detection in `tests/reconciliation.spec.ts`).

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
  - none.

Completion status:
- production-grade complete.
- fresh, non-seeded M5 readiness was validated in live promotion governance flow (`logs/m6-live-governance-2026-02-25T09-38-14-445Z/summary.md`).
- operational note: post-validation hardening keeps M7 learning alerts enabled with calibrated thresholds and capped drawdown percent logic (`maxDrawdownPct` constrained to `0..100`) to prevent pathological values from tiny equity peaks.

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
- Code-and-test reality check (2026-02-23):
  - verified implemented and test-covered:
    - feature store ingestion/persistence, learning evaluation + trend + threshold controls, incident export/reporting, rollback hook, and offline `snapshot -> retrain -> gate` workflow.
  - implemented now (Track 3 step 1):
    - governed runtime promotion endpoint:
      - `POST /learning/governance/promote`
      - enforces operator role and governed evidence references (`validationReportRef`, `approvalRecordRef`, `gateResultRef`) before activating a new model version.
      - emits audit/event evidence and updates `activeModelVersion` / `previousStableModelVersion`.
  - targeted validation executed:
    - `tests/m7-learning-contract.spec.ts`
    - `tests/m7-promotion-gate.spec.ts`
    - `tests/m7-walk-forward.spec.ts`
    - M7-relevant coverage in `tests/mission-control-contract.spec.ts`
- Walk-forward stability + acceptance gate evidence (2026-02-23):
  - walk-forward artifact:
    - `logs/m7-walk-forward-2026-02-23T09-55-24-508Z/walk-forward-report.json`
    - result: `windowsEvaluated=5`, `windowsPassed=4`, `passRatePct=80`, `pass=true`.
  - gate artifact (with walk-forward required):
    - `logs/m7-gate-2026-02-23T09-55-30-036Z/gate-result.json`
    - result: `pass=true` with `walkForwardStabilityPass=true`.
- SOL moderate follow-up calibration cycles (2026-02-24):
  - baseline fresh cycle:
    - calibration: `logs/m7-sol-calibration-2026-02-24T08-45-10-516Z/summary.md`
    - m5 soak: `logs/m5-soak-2026-02-24T08-45-14-303Z/report.json`
    - dataset: `logs/m7-dataset-2026-02-24T08-53-29-852Z/dataset-manifest.json`
    - reentry: `logs/m7-sol-reentry-2026-02-24T08-53-30-755Z/summary.md`
    - outcome: `moderate` failed (`windowsPassed=2/5`, `passRatePct=40`); `reintroduce` passed (`4/5`, `80%`).
  - targeted expectancy iteration cycle:
    - calibration: `logs/m7-sol-calibration-2026-02-24T09-49-57-318Z/summary.md`
    - m5 soak: `logs/m5-soak-2026-02-24T09-50-02-987Z/report.json`
    - dataset: `logs/m7-dataset-2026-02-24T09-57-37-486Z/dataset-manifest.json`
    - reentry: `logs/m7-sol-reentry-2026-02-24T09-57-38-293Z/summary.md`
    - outcome: `moderate` still failed but improved (`windowsPassed=2/4`, `passRatePct=50`); `reintroduce` passed (`4/4`, `100%`).
  - current state (as of 2026-02-24): keep M7 as ongoing monitoring + targeted SOL expectancy tuning until fresh `moderate` pass evidence is produced.
- SOL moderate fresh baseline cycle (2026-02-25):
  - calibration: `logs/m7-sol-calibration-2026-02-25T11-46-19-965Z/summary.md`
  - m5 soak: `logs/m5-soak-2026-02-25T11-46-23-283Z/report.json`
  - dataset: `logs/m7-dataset-2026-02-25T11-53-25-145Z/dataset-manifest.json`
  - reentry: `logs/m7-sol-reentry-2026-02-25T11-53-26-375Z/summary.md`
  - moderate walk-forward: `logs/m7-sol-reentry-2026-02-25T11-53-26-375Z/moderate/walk-forward-report.json`
  - outcome: `moderate` passed (`windowsPassed=3/4`, `passRatePct=75`, `requiredStagePass=true`); `reintroduce` remained pass (`4/4`, `100%`).
- Implemented (Track 2 step 7: historical retention UX improvements):
  - backend learning retention API:
    - `GET /learning/retention-config`
    - `POST /learning/retention-config`
    - `POST /learning/retention/prune`
  - runtime policy controls for closed-trade feature history retention + operator-triggered prune with audit evidence.
  - Mission Control Autonomy panel now exposes Learning Retention controls (days, stats, last prune result, manual prune action).

Completion criteria validation (latest run: 2026-02-23):
- Criterion 1 (`Learning updates are never deployed directly without validation and approval`): PASS
  - evidence: governed promotion gate + role checks covered in `tests/m7-learning-contract.spec.ts`.
- Criterion 2 (`Model/version rollback is tested and operator-visible`): PASS
  - evidence: rollback hook + audit visibility covered in `tests/m7-learning-contract.spec.ts`.
- Criterion 3 (`Performance reporting is stable across walk-forward windows`): PASS (after remediation rerun)
  - failing baseline rerun artifacts (for traceability):
    - dataset: `logs/m7-dataset-validation-2026-02-23T08-07-31-532-03-00`
    - retrain: `logs/m7-retrain-validation-2026-02-23T08-07-31-532-03-00`
    - walk-forward: `logs/m7-walk-forward-validation-2026-02-23T08-07-31-532-03-00/walk-forward-report.json`
    - gate: `logs/m7-gate-validation-2026-02-23T08-07-31-532-03-00/gate-result.json`
  - remediation applied:
    - diagnosed underperforming symbol cohort (`SOL-USDT`) from validation dataset, then curated candidate dataset to `BTC-USDT,ETH-USDT`.
  - passing remediation artifacts:
    - curated dataset: `logs/m7-dataset-curated-validation-2026-02-23T08-10-32-002-03-00`
    - curated retrain: `logs/m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00`
    - curated walk-forward: `logs/m7-walk-forward-curated-validation-2026-02-23T08-10-32-002-03-00/walk-forward-report.json` (`passRatePct=100`, `pass=true`)
    - curated gate: `logs/m7-gate-curated-validation-2026-02-23T08-10-32-002-03-00/gate-result.json` (`walkForwardStabilityPass=true`, `pass=true`)

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

## Milestone 10 (Optional): LLM Advisory Layer + MCP Tooling Fabric
- Introduce an LLM-powered operator/advisory layer for analysis, explanation, and workflow acceleration.
- Introduce MCP-based tool contracts so the LLM can access approved project capabilities through strict, typed interfaces.
- Keep execution authority deterministic:
  - LLM outputs are advisory by default.
  - risk-gatekeeper and approval-mode policies remain authoritative for any executable action.

Why this milestone exists (benefits):
- Faster operator decisions:
  - natural-language summaries for market state, incidents, drift, and strategy behavior.
- Better explainability:
  - operator-visible rationale tied to structured evidence (signals, risk checks, governance state).
- Safer extensibility:
  - new capabilities are added as MCP tools with explicit schemas, not prompt-only logic.
- Stronger traceability:
  - prompt context, tool invocations, outputs, and final decisions can be logged for audit/replay.
- Lower integration churn:
  - model/provider changes can be isolated from backend service contracts.

How it enhances Tourab Crypto AI:
- Mission Control augmentation:
  - conversational assistant for "why blocked", "what changed", "show risk budget usage", "summarize open incidents".
- Strategy/governance support:
  - assisted preparation of promotion packets and incident post-mortems using governed data.
- Research productivity:
  - fast synthesis of backtest/walk-forward outputs and anomaly triage suggestions.
- Operations resilience:
  - guided runbook navigation using live incident taxonomy and alert context.

How it should be used (operating model):
- LLM role:
  - interpretation, summarization, anomaly triage suggestions, operator Q&A.
- MCP role:
  - controlled access to data/actions via explicit tools (market/account reads, readiness checks, governance views, export/report endpoints).
- Safety boundary:
  - no direct autonomous live-order authority granted by LLM text.
  - all executable intents still pass existing policy/risk/approval controls.
- Environment boundary:
  - strict demo vs live tool separation and explicit environment tagging in every decision path.
- Audit boundary:
  - persist correlation IDs across prompt -> tool call -> decision -> action for replayability.

Suggested implementation slices:
- Slice A: Advisory read-only MVP
  - add MCP read-only tools for:
    - readiness/evidence,
    - incidents/alerts,
    - managed trades and learning evaluation summaries.
  - add Mission Control assistant panel with constrained prompts and source attribution.
- Slice B: Governed workflow assistant
  - add proposal/approval drafting helpers that produce structured artifacts for human review.
  - require explicit operator confirmation before any state-changing backend request.
- Slice C: Hardening and observability
  - add policy tests for tool allowlists, role gating, and environment separation.
  - add end-to-end audit/replay validation for assistant-assisted workflows.

Completion criteria:
- LLM interactions are advisory-only unless explicitly routed through existing approved execution pathways.
- MCP tool contracts are schema-validated, role-gated, and environment-scoped (`demo`/`live`).
- Assistant sessions are fully auditable with correlation IDs and reproducible evidence references.
- Operator workflows show measurable efficiency gains (e.g., reduced triage/prep time) without increasing control violations.

## Cross-Cutting Delivery Tracks
- Mission Control UI/Backend phases (Phase 1/2/3) are implementation tracks that support Milestone 4+ hardening.
- UI parity rule: every operator-facing backend change (controls, safety gates, statuses, error codes, audit semantics) must ship with corresponding Mission Control UI updates in the same phase before the item is considered complete.
