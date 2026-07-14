# Trading Oracle Skill for Tourab Crypto AI

## Purpose

This skill defines how Tourab moves from supervised demo execution to safe, bounded trading autonomy that can learn from outcomes without violating risk controls.

It is intentionally practical:
- What to automate now
- What to never automate
- How to upgrade safely
- How to measure whether learning actually improves performance

## Non-goals
- one-run forensic diagnosis
- exact rollout gate adjudication for current promotion status
- exchange adapter bugs
- UI implementation details
- pretending signal design can override safety or evidence gates

## Current Gap (updated 2026-03-23)

Current stack now supports proposal -> gatekeeper -> bounded `policy_auto` entry approval -> deterministic demo exits -> closed-trade accounting.

Current weakness is no longer "missing exits." The real gap is promotion-quality economics:
- clean runtime execution does not yet imply positive net expectancy
- fee and microstructure effects can crush tiny-notional runs
- run forensics must separate strategy failure from sizing/configuration bugs before promotion decisions
- entry quality needs an actual signal gate; blind always-buy behavior is not a strategy
- the repo now also needs a full intelligence loop: observation, regime, playbook selection, trade planning, thesis monitoring, and governed review

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

## 2026-03-24 Entry Design Note

Recent BTC diagnostics showed a specific anti-pattern:
- tiny-notional trades can have positive gross expectancy before fees
- but still lose net because the worker is allowed to enter without a meaningful recent-move signal

What to enforce for Tourab now:
- prefer side selection from recent move context over static buy-only bias
- block entries during signal dead zones instead of forcing activity
- treat entry-signal quality gates as part of profitability control, not optional tuning
- after direction is chosen, validate recent `symbol + side` realized expectancy before letting the worker recycle the same weak side again
- if a side is dominated by `time_stop` exits with non-positive expectancy, treat that as a weak-edge warning and block it

## 2026-03-25 BTC Strategy Note

Recent research and repo evidence support a sharper BTC rule:

- default BTC should be cost-aware continuation / time-series momentum, not reversal-first logic
- aggressive `entryOffsetBps=-250` is structurally mismatched to that strategy and should not remain the launcher baseline
- if the signal family is continuation, prefer passive pullback entries and let the expected-move hurdle decide whether the setup is worth fees
- do not let signal logic and cost logic duplicate each other; keep net-of-fee gating explicit and separate

## 2026-03-31 Regime Threshold Note

Recent BTC starvation runs exposed another anti-pattern:

- static absolute trend thresholds can choke valid low-volatility BTC continuation regimes
- this creates a bad loop: stale-cancel when entries are too passive, then zero-trade starvation when thresholds are tightened bluntly

What to enforce for Tourab now:
- keep execution bugs separate from signal calibration bugs
- for intraday BTC continuation, scale signal trend thresholds with realized volatility instead of using one fixed bps hurdle across all regimes
- keep a hard absolute floor so the bot does not trade meaningless noise
- let explicit cost gates and expected-move hurdles handle fee economics; do not force the signal layer to carry that alone
- for strong continuation setups, prefer bounded entry refresh/reprice over pure stale-cancel loops; otherwise the bot learns nothing except how to wait and give up

## 2026-04-03 BTC And ETH Thesis Note

The repo now has a sharper symbol thesis split:

- BTC is the anchor market:
  - cost-aware continuation with no-trade as the default
  - allowed in aligned trend regimes only
  - buy-side should require stronger confirmation until stored evidence improves
- ETH is the higher-beta confirmer:
  - do not treat ETH as an independent auto-trading thesis yet
  - require BTC and ETH directional agreement
  - keep ETH shadow/manual until symbol-level evidence exists

## 2026-04-03 Trading Intelligence Note

Recent research on successful discretionary and systematic traders reinforced a harder rule:

- do not define intelligence as "more indicators" or "let the LLM decide"
- define intelligence as a structured loop:
  - observe
  - classify regime
  - select one named playbook or no-trade
  - build a trade plan
  - monitor thesis health while open
  - review and update playbook confidence after close

Implementation implication for Tourab:

- `trading-oracle` covers signal/oracle design and autonomy boundaries
- use `trading-intelligence-loop` when the task is about how the bot should think end-to-end

Adaptive behavior rule:

- runtime may adapt by tightening or blocking entry using recent symbol-side-regime expectancy
- runtime may not self-promote strategy changes live
- learning should mainly make the bot trade less when edge decays, not more when it feels active

Source of truth for this thesis:

- `docs/btc-eth-trading-thesis-2026-04-03.md`

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
