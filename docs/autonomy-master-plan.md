# Tourab Crypto AI Autonomy Master Plan

Last updated: 2026-03-20
Status: Source of truth
Owner: Operator + Codex

## Purpose

This file replaces the old roadmap stack as the single source of truth for autonomy, demo validation, and live rollout.

Project objective and AI-definition source of truth:

- `docs/project-charter.md`
- `docs/trading-intelligence-research-2026-04-03.md`

The goal is not to "guarantee profit." That is not realistic in crypto trading. The real goal is:

1. Build a system that survives.
2. Prove positive net expectancy in demo and then in tiny live size.
3. Scale autonomy only when the evidence remains positive after fees, slippage, outages, and operational mistakes.

## Research Basis

This plan is grounded in:

- OKX API docs: demo/live separation, API key security, order semantics, rate limits, and `expTime`.
  - https://www.okx.com/docs-v5/en/#overview-demo-trading-services
  - https://www.okx.com/docs-v5/en/#overview-api-key-security
  - https://www.okx.com/docs-v5/en/#overview-transaction-timeouts
  - https://www.okx.com/docs-v5/en/#overview-rate-limits
  - https://www.okx.com/docs-v5/en/#overview-websocket-connect
- Bailey, Borwein, Lopez de Prado, Zhu: The Probability of Backtest Overfitting.
  - https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253
- Harvey, Liu: Backtesting.
  - https://www.nber.org/papers/w23476
- A Backtesting Protocol in the Era of Machine Learning.
  - https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3772294
- Liu, Tsyvinski, Wu: Common Risk Factors in Cryptocurrency.
  - https://www.nber.org/papers/w25882
- Liquidity risk in crypto assets.
  - https://www.nber.org/papers/w30506
- Crypto return reversals and liquidity provision evidence.
  - https://www.nber.org/papers/w30566

## Non-Negotiable Truths

1. No market, model, or autonomy setting can ensure high profit.
2. Backtests are easy to overfit and must never be the only promotion signal.
3. Demo success is necessary but not sufficient for live success because demo/live microstructure differs.
4. Net PnL after fees and slippage is the only performance number that matters.
5. Fresh evidence beats old evidence. Any serious regression resets promotion confidence.

## Current Baseline

Current repo reality:

- The system already has gatekeeper-first execution, demo execution, reconciliation, Mission Control, bounded entry autonomy, auto-exit controls, auto-pause, and governed learning hooks.
- The repo also contains strong prior demo evidence for Milestone 5 readiness.
- But the latest stored readiness note on 2026-02-27 says the system was not ready for live because `policy_auto` fell back and deterministic closure failed during a later validation run.
- As of 2026-03-18, the main demo execution regressions were addressed:
  - stale `entry_submitted` orders now age out cleanly
  - OKX price-band auto-exit rejects are corrected and resubmitted
  - worker proposal flow is backlog-throttled so BTC validation is no longer dominated by canceled entries
- policy-auto hardening added on 2026-03-18:
  - warning-grade learning alerts no longer auto-open incidents and demote autonomy
  - transient/proposal-level OKX submit failures (`500`, `51016`, `51137`, `51138`) no longer automatically trigger global fallback
  - duplicate client-order-id collisions now attempt reconciliation instead of immediate hard failure
  - stale live exits now try OKX `amend-order` before cancel/re-submit
- exit-path hardening added on 2026-03-19:
  - stale sell-side TP/SL retries switch away from resting limit churn
  - sell-side `time_stop` and `flatten` exits now use `market`
  - non-permanent trade-order `401`s are treated as transient instead of session-killing submit failures
- Latest clean normal BTC demo validation after the 2026-03-19 hardening pass:
  - symbol: BTC only
  - approval mode: `policy_auto`
  - entry profile: `entryOffsetBps=-250`, worker interval `5000ms`
  - stale entry timeout: `90s`
  - max pending resting BTC entries: `4`
  - live 30-minute result: `policyAutoViolations=0`, `fallbackViolations=0`, `autoExitSubmitFailCount=0`, `closed=17`, `staleForcedClosedCount=0`
  - artifact: `logs/auto-exit-diag-2026-03-19T13-07-01-281Z/summary.md`

Implication:

- Treat the system as demo-capable but not live-ready.
- Fresh demo evidence must be rebuilt from zero after regression fixes.

## End-State Definition

The project is considered "fully autonomous" only when all of the following are true:

1. Entry decisions can run without manual approval inside a bounded live policy.
2. Exit handling is deterministic, reliable, and observable.
3. Drift, stale state, partial fills, and exchange failures fail closed.
4. Learning remains governed and cannot self-promote directly into production.
5. Daily and weekly loss caps, cooldowns, and kill-switches are always stronger than strategy logic.
6. Live operation has already passed shadow, manual-live, and tiny-notional bounded-auto phases.

## Core Operating Model

The production autonomy loop remains:

1. Observe
2. Propose
3. Gatekeeper
4. Approval policy
5. Execute
6. Reconcile
7. Manage exit
8. Score and archive evidence
9. Pause or degrade on any safety breach

Human approval is removable only for a narrow live policy after the required demo and live gates below are passed.

## What "Success" Means

Promotion gates must use these metrics, always net of fees:

- Net expectancy per trade
- Profit factor
- Max drawdown
- Daily loss breach count
- Weekly loss breach count
- Slippage distribution by symbol and side
- Fill ratio and time-to-fill
- Reconciliation drift rate
- Auto-exit success rate
- Fallback-to-manual count
- Alert and incident rate per trading hour

Never promote on gross PnL, win rate alone, or short-run headline returns.

## Required Architecture Rules

1. Demo and live credentials remain isolated.
2. Live keys must be trade-only, IP-bound, and never have withdrawal permission.
3. Every order path uses idempotency, audit attribution, and strict timeout handling.
4. REST snapshots remain source of truth after WebSocket gaps or disconnects.
5. Every promotion decision is tied to policy version, strategy version, and evidence package.
6. Any critical alert forces either pause or fallback to manual.

## Rollout Phases

### Phase 0: Reset and Stabilize

Objective:
- Remove ambiguity and make fresh demo evidence mandatory.

Actions:
- Freeze roadmap truth to this file.
- Keep live trading disabled.
- Investigate the 2026-02-27 failure path until deterministic closure is restored.
- Add a "promotion confidence reset" rule: if closure rate, drift, or fallback regresses materially, prior readiness is informational only.

Exit gate:
- Root cause documented.
- Fix implemented.
- Regression test added.

### Phase 1: Demo Execution Hardening

Objective:
- Make exchange interaction boring and predictable.

Actions:
- Add or verify endpoint-scoped rate limiting.
- Add bounded retry with jitter only for retryable transport and exchange errors.
- Add `expTime` on time-sensitive execution requests.
- Measure and store submit latency, ack latency, fill latency, cancel latency, and reconcile latency.
- Verify partial-fill handling, cancel/reprice handling, and stale-order forced flatten handling for BTC, ETH, and SOL.
- Verify REST resync after WS gaps.

Exit gate:
- 24-hour demo soak with:
  - zero unreconciled order drift above threshold
  - zero duplicated submissions
  - exchange-native amend/reprice path validated for stale exits without excessive cancel/re-submit churn
  - zero unknown order terminal states
  - zero database lock incidents in event/ops stores

### Phase 2: Strategy Validation Discipline

Objective:
- Stop false confidence before it reaches autonomy.

Actions:
- Split evaluation into train, validation, walk-forward, and forward-demo windows.
- Reject any strategy claim that lacks net-of-fee and slippage-adjusted reporting.
- Add acceptance metrics by symbol, not just combined.
- Penalize unstable edge: if performance depends on one day, one hour, or one symbol regime, do not promote.
- Track feature and rule turnover to detect hidden overfitting.
- Require a promotion packet with:
  - hypothesis
  - data window
  - fees and slippage assumptions
  - walk-forward results
  - forward-demo results
  - failure modes

Exit gate:
- At least 30 closed trades per symbol for any symbol entering autonomous policy.
- Positive net expectancy in both walk-forward and forward-demo windows.
- No promotion if performance collapses after cost modeling.

### Phase 3: Supervised Demo Autonomy

Objective:
- Keep the bot active in demo while operators still approve execution.

Actions:
- Run worker proposals on BTC only first.
- Keep `approvalMode=manual`.
- Validate gatekeeper rejects, cooldowns, drift pause, and incident workflows during active sessions.
- Build the operator dashboard around promotion metrics, not just runtime status.

Exit gate:
- 5 clean demo days on BTC with:
  - positive net expectancy
  - no severe reconciliation incidents
  - no order duplication
  - no stale market execution

### Phase 4: Bounded Demo Auto-Approval

Objective:
- Prove `policy_auto` in demo before touching live capital.

Actions:
- Enable `policy_auto` only for symbols that have passed Phase 3.
- Enforce tiny caps:
  - BTC max per-order notional: 5 USD
  - ETH max per-order notional: 4 USD
  - SOL max per-order notional: 3 USD
- Enforce max open exposure <= 20 USD total.
- Enforce daily loss cap <= 2 USD and weekly loss cap <= 5 USD.
- Auto-pause for 3 consecutive losses or any critical alert.
- Force fallback to manual on:
  - reconcile drift
  - repeated submit failure
  - elevated slippage
  - stale data
  - unexpected exit-path failure

Exit gate:
- 7 fresh qualifying demo days after the last regression.
- 2 uninterrupted policy-auto sessions of at least 2 hours each on BTC with zero fallback.
- Then repeat for ETH and SOL separately.

### Phase 5: Live Shadow Mode

Objective:
- Use live market conditions without live execution risk.

Actions:
- Run the full proposal, gatekeeper, approval-policy, and exit-decision loop against live data.
- Submit no live orders.
- Compare simulated fill assumptions to actual live order book conditions.
- Measure whether demo slippage assumptions understate live execution costs.

Exit gate:
- 7 live shadow days.
- Symbol-level net expectancy remains positive after conservative slippage haircuts.
- No unexplained divergence between shadow assumptions and live market conditions.

### Phase 6: Live Manual Tiny Notional

Objective:
- Prove live execution safely before autonomy.

Actions:
- Trade BTC only.
- Keep `approvalMode=manual` for the first 2 live days minimum.
- Use 2 USD to 5 USD per order.
- Cap total open exposure at 10 USD.
- Stop for the day after any of:
  - 2 losing trades in a row
  - daily loss cap breach
  - one severe operational incident

Exit gate:
- 2 clean live days minimum.
- Positive net expectancy.
- No severe ops incidents.
- Reconciliation and exits remain clean.

### Phase 7: Live Bounded Auto for BTC

Objective:
- Enable the narrowest viable autonomous live policy.

Actions:
- Move BTC from manual to `policy_auto`.
- Keep the same tiny notional caps for at least 5 more live days.
- Keep auto-pause and fallback-to-manual aggressive.
- Disable learning-driven promotion during this phase; learning stays advisory only.

Exit gate:
- 5 clean live BTC days.
- Positive net expectancy after full costs.
- Zero critical fallback causes that remain unexplained.

### Phase 8: Live Expansion to ETH and SOL

Objective:
- Expand autonomy only after BTC survives.

Actions:
- Add ETH first, then SOL.
- Each symbol repeats the same path:
  - shadow
  - manual live
  - bounded auto
- SOL remains the strictest symbol because of higher volatility and weaker tolerance for execution drift.

Exit gate:
- Each symbol independently passes its own evidence gates.

### Phase 9: Governed Learning Promotion

Objective:
- Improve the system without allowing self-corruption.

Actions:
- Learning runs remain offline or shadow-only.
- Promotion requires:
  - walk-forward success
  - forward-demo success
  - approval artifact
  - rollback candidate
  - stable alert profile
- No model or parameter set can auto-promote itself into live bounded-auto.

Exit gate:
- Promotion packet approved and archived.
- Canary beats champion net of fees and slippage.
- Rollback drill passes.

## Concrete Demo Test Program

Run this sequence in order:

1. Exchange hardening tests
   - auth failure
   - stale context
   - partial fill
   - cancel/reprice
   - WS disconnect and resync
   - rate-limit handling
2. Exit reliability tests
   - TP hit
   - SL hit
   - time stop
   - session flatten
   - stale-exit forced flatten
3. Policy-auto guardrail tests
   - exposure cap
   - loss streak cooldown
   - symbol allowlist
   - fallback on alert
4. Soak tests
   - 30 minutes
   - 2 hours
   - 24 hours
5. Evidence rollup
   - daily
   - 7-day fresh window

## Required Live Controls

Before the first live order:

1. Separate live env from demo env.
2. Confirm live keys are trade-only and IP-bound.
3. Confirm no withdrawal permission.
4. Confirm kill-switch and emergency-stop drills.
5. Confirm restore, replay, and reconcile procedures.
6. Confirm signed operator auth for Mission Control.
7. Confirm alert routing is actionable and tested.

## Promotion and Rollback Policy

Promotion to a more autonomous stage requires:

- all stage-specific gates passed
- no unresolved critical incident
- positive net expectancy at current stage
- latest evidence not older than 7 calendar days

Automatic rollback or fallback to manual occurs on:

- daily loss cap breach
- weekly loss cap breach
- repeated submit failure
- reconcile drift above threshold
- auto-exit failure
- stale state execution attempt
- alert storm or database lock affecting trust in state

## Tracked Execution Plan

This section is the operator progress tracker for full automation. Update status, evidence links, blockers, and next action as work completes. Do not mark a step complete from intent alone. Only mark it complete from code, tests, or fresh evidence.

Status legend:

- `done`: implemented and verified enough for the current stage
- `in_progress`: active work with partial evidence
- `blocked`: cannot advance until an upstream gate passes
- `not_started`: no meaningful execution yet

### Current Progress Snapshot - 2026-03-20

| Step | Status | Success standard | Latest note |
| --- | --- | --- | --- |
| 1. Deterministic closure regression fixed | `done` | regression root cause contained, fix landed, regression coverage added | Closure path materially improved; latest clean BTC artifact is `logs/auto-exit-diag-2026-03-19T13-07-01-281Z/summary.md`. |
| 2. Mission Control stage-status reporting | `done` | rollout stage exposed in backend/UI | Implemented via `/rollout/status` and Mission Control rollout card. |
| 3. Confidence reset after major regression | `done` | stale readiness automatically treated as informational after fallback/drift/closure regressions | Implemented in rollout status logic and tests. |
| 4. OKX request deadline and retry hardening | `in_progress` | bounded retry budgets, retryable-only backoff, and `expTime` or equivalent deadline protection on time-sensitive requests | Retry logic exists; explicit `expTime` adoption still needs confirmation or implementation. |
| 5. Symbol-level validation reporting net of fees/slippage | `in_progress` | symbol-level acceptance metrics and promotion packet inputs exist for BTC, ETH, SOL independently | Governance exists in plan; reporting path still needs to be treated as an active gate, not assumed complete. |
| 6. Fresh BTC Phase 4 evidence rebuild | `in_progress` | 7 fresh qualifying demo days after regression fixes | Current blocker is evidence-window design that actually exercises exits. |
| 7. BTC Phase 4 uninterrupted policy_auto sessions | `in_progress` | 2 BTC sessions of at least 2 hours with zero fallback | One clean 30-minute BTC baseline exists, but that is not enough. |
| 8. ETH Phase 4 repeat | `blocked` | ETH independently passes fresh demo evidence and clean policy_auto sessions | BTC must pass first. |
| 9. SOL Phase 4 repeat | `blocked` | SOL independently passes fresh demo evidence and clean policy_auto sessions | BTC then ETH must pass first. |
| 10. Live shadow mode | `blocked` | 7 live shadow days with positive conservative expectancy and no unexplained divergence | Demo promotion gates must pass first. |
| 11. BTC live manual tiny-notional | `blocked` | 2 clean live BTC days with manual approval, positive expectancy, no severe ops incident | Live shadow must pass first. |
| 12. BTC live bounded auto | `blocked` | 5 clean live BTC days at tiny notional with zero unexplained critical fallback causes | Manual live must pass first. |
| 13. ETH live expansion | `blocked` | ETH repeats shadow -> manual live -> bounded auto | BTC live bounded auto must survive first. |
| 14. SOL live expansion | `blocked` | SOL repeats shadow -> manual live -> bounded auto | ETH should pass before SOL due to higher execution fragility. |
| 15. Governed learning promotion | `blocked` | learning remains offline/shadow until promotion packet, approval artifact, rollback candidate, and canary evidence pass | Never allow self-promotion into live bounded auto. |

### Immediate Critical Path

The next real work is:

1. Choose and lock a BTC evidence profile that reliably exercises exits inside the session window.
2. Run fresh BTC `policy_auto` demo sessions on that profile until evidence is meaningful, not just clean-looking.
3. Rebuild `7` fresh qualifying BTC demo days after the post-regression fixes.
4. Complete `2` uninterrupted BTC `policy_auto` sessions of at least `2` hours each with zero fallback.
5. Confirm remaining OKX execution hardening gaps, especially request-deadline protection (`expTime`) and bounded retry scope.
6. Only then repeat the same gate for ETH, then SOL.
7. Only after Phase 4 is genuinely passed should live shadow begin.

### Step-by-Step Execution Plan

#### Step 4 - OKX deadline and retry hardening

Objective:
- Make time-sensitive exchange requests fail closed instead of lingering into stale execution windows.

Exit gate:
- `expTime` or equivalent request deadline is wired for time-sensitive order/amend paths.
- Retries are bounded, jittered, and limited to retryable transport/exchange conditions.
- Validation confirms no silent duplicate submit behavior under retry pressure.

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers:
- Next action:

#### Step 5 - Symbol-level validation reporting

Objective:
- Make promotion decisions symbol-specific and net-of-cost instead of portfolio-aggregate storytelling.

Exit gate:
- BTC, ETH, and SOL each have independent net expectancy, slippage, drawdown, fill-quality, and fallback metrics.
- Promotion packet inputs are available per symbol.

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers:
- Next action:

#### Step 6 - Fresh BTC demo evidence rebuild

Objective:
- Rebuild fresh post-regression BTC evidence from zero.

Exit gate:
- `7` fresh qualifying demo days after the latest regression fixes.
- Evidence is not older than `7` calendar days at promotion time.
- Evidence sessions actually exercise exits; dead sessions do not count as proof.

Track here:
- Owner: Operator + Codex
- Evidence: `logs/auto-exit-diag-2026-03-20T13-13-20-790Z/summary.md`
- Blockers: `/milestone5/evidence` stayed red from `2026-03-20T13:13:36Z` until `2026-03-20T14:15:19Z` because live M5 scoring counts all filled entries created today before they have time to deterministically close, so the intraday closure-rate gate temporarily failed even though the session later finished `37/37` closed with zero submit failures
- Next action: decide whether this intraday M5 behavior is acceptable as a day-end-only signal or whether live evidence scoring should be adjusted to avoid penalizing healthy in-flight trades

#### Step 7 - BTC Phase 4 policy_auto proof

Objective:
- Prove BTC demo auto-approval is boring before any live exposure.

Exit gate:
- `2` uninterrupted BTC `policy_auto` sessions of at least `2` hours each
- zero fallback
- zero unexplained reconcile drift
- zero unexplained auto-exit failure
- positive net expectancy after fees/slippage assumptions

Track here:
- Owner: Operator + Codex
- Evidence:
  - session 1: `logs/auto-exit-diag-2026-03-20T13-13-20-790Z/summary.md`
  - progress log: `logs/btc-policy-auto-2h-progress-20260320-101310.out.log`
  - session 2: `logs/auto-exit-diag-2026-03-21T06-12-06-607Z/summary.md`
  - session 2 progress log: `logs/btc-policy-auto-2h-progress-20260321-031202.out.log`
- Blockers: the 2026-03-21 economics failure was materially contaminated by a quantity-normalization bug in `buildValidSpotProposal`: BTC `lotSz=1e-8` was parsed incorrectly, quantities collapsed to `0`, then were raised to `minSz=0.00001`, which fee-crushed the run (`closedTrades=47`, `winningTrades=0`, `losingTrades=47`, `netRealizedPnlUsd=-0.098349`)
- Next action: rerun the BTC 2-hour `policy_auto` validation on the fixed quantity-normalization path, then reassess net expectancy before making any strategy-level tuning claim

### BTC Phase 4 Runbook

Use this runbook for Step 6 and Step 7 until BTC Phase 4 is complete.

#### Locked BTC baseline

Keep this baseline stable unless a session proves it is not producing meaningful exit evidence:

- symbol: `BTC-USDT`
- approval mode: `policy_auto`
- worker interval: `5000ms`
- entry offset: `-250 bps`
- stale entry timeout: `90s`
- max pending entries per symbol: `4`
- auto-exit config:
  - `maxHoldSec=1800`
  - `takeProfitRMultiple=1.5`
  - `exitOffsetBps=1`

Current launcher script already applies that baseline:
- [scripts/start-btc-policy-auto-2h.ps1](D:/Tourab Crypto AI/scripts/start-btc-policy-auto-2h.ps1)

If this profile continues to produce sessions with `autoExitDecisionCount=0`, treat that as a measurement failure, not a clean pass.

#### Session types

Use only these BTC session types for Phase 4 tracking:

1. Baseline evidence session
   - Purpose: accumulate a fresh qualifying BTC demo day.
   - Minimum useful duration: `30m`, but only counts if exits are actually exercised.
2. Qualifying policy_auto session
   - Purpose: satisfy the uninterrupted BTC Phase 4 proof gate.
   - Required duration: `2h`.
   - Required count: `2` clean sessions.

#### Launch commands

Start the standard BTC 2-hour run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-btc-policy-auto-2h.ps1
```

What that script does:

- starts `mission-control:server`
- forces clean reset via `pause`, `cancel-all`, and `maintenance/clear-streams`
- sets BTC-only `policy_auto`
- applies the locked BTC baseline above
- launches the 2-hour progress runner

If you need a manual diagnostic capture without the wrapper:

```powershell
npm run diag:auto-exit -- --base-url http://localhost:7071 --duration-sec 7200 --poll-ms 5000
```

If you want the progress logger directly:

```powershell
npm run validate:btc:policy-auto:2h
```

#### Expected artifacts per run

The launcher produces:

- `logs/btc-policy-auto-2h-server-<timestamp>.out.log`
- `logs/btc-policy-auto-2h-server-<timestamp>.err.log`
- `logs/btc-policy-auto-2h-progress-<timestamp>.out.log`
- `logs/btc-policy-auto-2h-progress-<timestamp>.err.log`

The diagnostic produces:

- `logs/auto-exit-diag-<timestamp>/summary.md`
- `logs/auto-exit-diag-<timestamp>/report.json`
- `logs/auto-exit-diag-<timestamp>/decision-trace.json`
- `logs/auto-exit-diag-<timestamp>/samples.json`

For tracker updates, the minimum artifact set is:

- one progress log path
- one diagnostic `summary.md`
- the corresponding `report.json` if the summary is ambiguous
- total run economics:
  - gross realized PnL
  - fees
  - net realized PnL
  - average net PnL per closed trade

#### Minimum pass/fail rules for a useful BTC session

A session is useful only if all of the following are true:

- `policyAutoViolations=0`
- `fallbackViolations=0`
- `autoExitSubmitFailCount=0`
- the session reaches meaningful exit activity:
  - `autoExitDecisionCount > 0`, or
  - closed trades exist with valid exit-path evidence

A session is not useful evidence if any of the following are true:

- `autoExitDecisionCount=0`
- trades mostly remain `entry_filled`
- fallback moved approval mode away from `policy_auto`
- open critical alerts indicate trust in runtime state is broken

#### Minimum pass/fail rules for a qualifying 2-hour BTC session

A qualifying BTC Phase 4 session must satisfy all of the following:

- uninterrupted runtime for at least `2h`
- `policy_auto` for the whole sampled window
- zero fallback
- zero unexplained reconcile drift
- zero unexplained auto-exit failure
- zero duplicated submission behavior
- positive net expectancy after fees/slippage assumptions
- artifact set captured and linked in this document
- total run profit/loss explicitly reported alongside the runtime metrics

If any critical alert opens and remains unexplained, the session is a fail-closed result, not a near-pass.

#### Daily operator loop

For each BTC evidence day:

1. Run one baseline or qualifying BTC session.
2. Review the newest `logs/auto-exit-diag-<timestamp>/summary.md`.
3. Confirm the run was useful, not just clean-looking.
4. If useful, run the evidence rollup flow already used by Milestone 5 tracking.
5. Update Step 6 and Step 7 in this file:
   - paste the newest artifact path under `Evidence:`
   - update `Blockers:`
   - set one concrete `Next action:`
6. If the run regressed, update `Current Progress Snapshot` before doing anything else.

#### Step 6 tracker update template

Use this exact shape under Step 6:

- Evidence: `logs/auto-exit-diag-<timestamp>/summary.md`
- Blockers: `<current real blocker>`
- Next action: `<single next BTC evidence action>`

#### Step 7 tracker update template

Use this exact shape under Step 7:

- Evidence:
  - session 1: `logs/auto-exit-diag-<timestamp>/summary.md`
  - session 2: `pending`
- Blockers: `<current real blocker>`
- Next action: `<single next BTC policy_auto action>`

#### Known invalid evidence pattern

The following pattern must not be counted as Phase 4 progress:

- `policyAutoViolations=0`
- `fallbackViolations=0`
- `autoExitSubmitFailCount=0`
- but `autoExitDecisionCount=0` and trades remain open

That pattern means the runtime stayed calm but the session failed to prove exit behavior. Calm is nice. Proof is nicer.

#### Step 8 - ETH Phase 4 repeat

Objective:
- Prove ETH independently under the same discipline used for BTC.

Exit gate:
- ETH passes fresh demo evidence and clean uninterrupted `policy_auto` sessions under symbol-specific caps.

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers: BTC Phase 4 not complete
- Next action: none until BTC Phase 4 passes

#### Step 9 - SOL Phase 4 repeat

Objective:
- Prove SOL independently under stricter execution skepticism.

Exit gate:
- SOL passes fresh demo evidence and clean uninterrupted `policy_auto` sessions under symbol-specific caps.

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers: BTC and ETH Phase 4 not complete
- Next action: none until ETH Phase 4 passes

#### Step 10 - Live shadow mode

Objective:
- Validate live-market assumptions without live execution risk.

Exit gate:
- `7` live shadow days
- positive expectancy after conservative slippage haircuts
- no unexplained divergence between simulated and live market conditions

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers: demo Phase 4 symbol gates not complete
- Next action: none until BTC, then ETH/SOL demo gates pass as required

#### Step 11 - BTC live manual tiny-notional

Objective:
- Prove live execution safety before live autonomy.

Exit gate:
- `2` clean live BTC days minimum
- manual approval remains enabled
- positive net expectancy
- no severe ops incidents

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers: live shadow not complete
- Next action: none until live shadow passes

#### Step 12 - BTC live bounded auto

Objective:
- Enable the narrowest viable live autonomous policy for BTC only.

Exit gate:
- `5` clean live BTC days
- tiny notional caps remain in force
- positive net expectancy after full costs
- zero unexplained critical fallback causes

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers: live BTC manual stage not complete
- Next action: none until BTC live manual passes

#### Step 13 - ETH live expansion

Objective:
- Expand to ETH only after BTC survives bounded live auto.

Exit gate:
- ETH repeats shadow -> manual live -> bounded auto successfully.

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers: BTC live bounded auto not complete
- Next action: none until BTC bounded auto passes

#### Step 14 - SOL live expansion

Objective:
- Expand to SOL last because execution drift tolerance is weakest.

Exit gate:
- SOL repeats shadow -> manual live -> bounded auto successfully.

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers: ETH live expansion not complete
- Next action: none until ETH live expansion passes

#### Step 15 - Governed learning promotion

Objective:
- Improve the system without permitting self-corruption.

Exit gate:
- promotion packet attached
- approval artifact attached
- rollback candidate attached
- canary or shadow evidence attached
- learning remains unable to self-promote into live bounded auto

Track here:
- Owner: Operator + Codex
- Evidence:
- Blockers: live autonomy path not complete
- Next action: keep learning advisory-only until operational rollout gates are complete

### Update Rule For This Section

After each substantive session:

1. Update the `Current Progress Snapshot` statuses only if fresh code, tests, or evidence justify it.
2. Add the newest artifact path under the relevant `Evidence:` field.
3. Rewrite the `Blockers:` line bluntly if the bottleneck changed.
4. Set exactly one concrete `Next action:` per active step.
5. If a new regression appears, reset downstream statuses to `blocked` or `in_progress` instead of pretending progress survived it.

### Intraday M5 Interpretation Decision - 2026-03-21

Decision:
- Use option 1.
- Treat live `/milestone5/evidence` intraday red states as informational while healthy trades are still in flight.
- Judge Step 6 qualification at run-end/day-end, not from temporary mid-session closure-rate dips caused by open-but-not-overdue trades.

What still fails the day:
- session ends with `today.pass=false`
- closure rate remains below threshold at the end of the run/day
- reconciliation is not fully OK
- managed trade errors are non-zero
- fallback, drift, or exit-path failures occur

Operator rule:
- Do not stop counting a BTC Phase 4 session as useful just because `m5TodayPass` goes red mid-session while entries are waiting to age into deterministic exits.
- Do stop and investigate if the session finishes red or if runtime safety signals degrade.

## Current BTC Validation Note - 2026-03-19

- The best current BTC demo execution baseline is still `logs/auto-exit-diag-2026-03-19T13-07-01-281Z/summary.md`.
- That run showed:
  - `policyAutoViolations=0`
  - `fallbackViolations=0`
  - `autoExitSubmitFailCount=0`
  - `staleForcedClosedCount=0`
  - clean `time_stop` closure with zero reprices in the closed sample
- A later 30-minute normal-baseline run at `logs/auto-exit-diag-2026-03-19T16-54-36-262Z/summary.md` is not valid exit evidence:
  - `autoExitDecisionCount=0`
  - `filledOpenTrades=29`
  - all trades remained `entry_filled`
- Interpretation:
  - exit-path correctness is materially improved
  - evidence collection is now bottlenecked by hold-time/session design
  - short runs on the normal `maxHoldSec=1800` profile may look clean while proving nothing about exits

## Required Repository Truth Updates

The following documents must defer to this file:

- `docs/roadmap.md`
- `docs/automation-roadmap.md`

Project skills that support this plan:

- `skills/autonomy-rollout-governor/SKILL.md`
- `skills/trading-validation-evidence/SKILL.md`
