# Trading Oracle Skill for Tourab Crypto AI

## Purpose

This skill defines how Tourab moves from supervised demo execution to safe, bounded trading autonomy that can learn from outcomes without violating risk controls.

It is intentionally practical:
- What to automate now
- What to never automate
- How to upgrade safely
- How to measure whether learning actually improves performance

## Current Gap (as of 2026-02-17)

Current stack supports proposal -> gatekeeper -> human approval -> entry order execution.

Current stack does **not** yet include a full autonomous exit engine (TP/SL/time exit/position flatten by policy). Without deterministic exits, realized trade outcomes and stable learning labels stay weak.

## Non-Negotiable Invariants

These invariants apply in all autonomy levels:

1. No order path without pre-trade controls and hard limits.
2. No strategy/model update directly into production.
3. No silent behavior changes. Every policy/model change is versioned and auditable.
4. No autonomous mode without kill-switch and circuit-breaker.
5. No withdrawals/transfer permissions on exchange API keys.

## Autonomy Ladder

Tourab should progress in stages, not by flipping one switch.

### Level A: Supervised Execution (already mostly present)
- Human approval required for entry.
- Gatekeeper enforces risk limits before submit.
- Reconciliation + drift alerts active.

### Level B: Supervised Auto-Exit (next required step)
- Keep human approval for entries.
- Add deterministic automatic exits:
  - Stop-loss exit
  - Take-profit exit
  - Max-hold-time exit
  - Session flatten rule (no overnight if configured)
- Exit policy is generated at entry time and persisted with immutable order linkage.

### Level C: Bounded Entry Autonomy
- Allow auto-entry only within strict allowlist and notional caps.
- Use two-man rule for changing autonomy level or risk caps.
- Keep emergency-stop and cancel-all always human accessible.

### Level D: Adaptive Learning Loop
- Learning updates run offline/shadow first.
- Promote only if canary criteria beat baseline net of fees/slippage.
- Auto-rollback when live metrics breach degradation thresholds.

## Required Architecture Additions

### 1) Exit Policy Object (must exist per trade)

For each approved entry, persist:
- `trade_id`
- `entry_order_id`
- `stop_loss`
- `take_profit`
- `time_stop_sec`
- `max_adverse_excursion_limit`
- `flatten_deadline`
- `policy_version`

This creates deterministic closure conditions and label quality for training.

### 2) Trade State Machine

Implement strict states:
- `planned`
- `entry_submitted`
- `entry_partially_filled`
- `entry_filled`
- `exit_pending`
- `exit_submitted`
- `closed`
- `canceled`
- `error`

Transitions must be idempotent and event-sourced. No ad hoc status mutation.

### 3) Learning Data Contract

For each closed trade, store:
- Setup features (market regime, spread, volatility, signal context)
- Decision features (side, size, entry basis, policy version)
- Execution quality (slippage, queue/fill timing, fees)
- Outcome labels (realized pnl, max drawdown during trade, hold time, exit reason)

Only closed-trade labels should drive model updates.

### 4) Strategy Promotion Pipeline

- `research` -> `shadow` -> `paper canary` -> `limited prod` -> `full prod`
- Promotion gate requires:
  - positive expectancy net fees
  - bounded drawdown
  - stable performance across walk-forward windows
  - no control violations
- Degradation trigger auto-demotes to previous stable version.

## Policy Controls to Enforce

At minimum, enforce:
- Max order notional
- Max daily loss
- Max weekly loss
- Max open exposure
- Max concurrent open trades
- Symbol allowlist
- Trading session windows
- Cooldown after loss streak
- Hard kill-switch

## How Tourab Learns Safely

1. Learn from **closed** trades, not open/unrealized snapshots.
2. Separate alpha changes from execution changes.
3. Re-run replay/backtest with realistic fees and slippage before promotion.
4. Use canary allocation (small notional) for new strategy versions.
5. Keep champion/challenger framework:
  - champion = currently deployed strategy
  - challenger = candidate under evaluation
6. Stop learning updates during incident mode.

## Anti-Patterns to Block

- Self-modifying strategy parameters live without approval gates.
- Averaging down or martingale behavior.
- Optimizing only win rate without expectancy and drawdown.
- Evaluating results without transaction costs.
- Overfitting by selecting best backtest slice only.
- Deploying model changes without version pinning and rollback.

## Metrics That Matter

Report and alert on:
- Net expectancy per trade
- Realized PnL and equity curve
- Max drawdown and time-to-recovery
- Profit factor
- Hit rate plus average win/average loss
- Slippage and fee ratio
- Control violations count
- Model/version attribution of PnL

## Implementation Priority for Tourab

1. Implement auto-exit engine (TP/SL/time-stop/session-flatten) with persisted exit policy.
2. Add closed-trade ledger with deterministic state machine.
3. Add strategy versioning and promotion workflow (shadow/canary/rollback).
4. Add bounded auto-entry mode behind strict policy and feature flag.
5. Add adaptive retraining jobs with approval gates and incident lockout.

## Source Basis (Primary / High-Trust)

- SEC Rule 15c3-5 (Market Access Rule): pre-trade risk controls and supervisory controls.
  - https://www.law.cornell.edu/cfr/text/17/240.15c3-5
- ESMA RTS 6 (MiFID II algorithmic trading controls): testing, kill functionality, controls/governance.
  - https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R0589
- Federal Reserve SR 11-7 (Model Risk Management): model validation, governance, change control.
  - https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm
- NIST AI RMF 1.0: govern/map/measure/manage for AI risk lifecycle.
  - https://www.nist.gov/itl/ai-risk-management-framework
- SEC staff statement on broker-dealer AI conflicts (control/governance relevance).
  - https://www.sec.gov/newsroom/speeches-statements/sauter-statement-artificial-intelligence-conflicts-073123
- OKX API docs (orders and algo/conditional capabilities for exits).
  - https://www.okx.com/docs-v5/en/
- Binance Spot API docs (OCO/order-list patterns useful as design benchmark).
  - https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints
- Bailey and Lopez de Prado, Probability of Backtest Overfitting.
  - https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253
- Bailey and Lopez de Prado, Deflated Sharpe Ratio.
  - https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551
- Sculley et al., Hidden Technical Debt in ML Systems.
  - https://papers.nips.cc/paper/5656-hidden-technical-debt-in-machine-learning-systems
