# Project Charter

Last updated: 2026-04-03
Status: Active
Owner: Operator + Codex

## Main Goal

Build a local-first, AI-assisted crypto trading operator for OKX spot trading.

Start scope:

- symbols: `BTC-USDT` and `ETH-USDT`
- venue: OKX demo first, then tiny live size only after fresh evidence passes
- runtime: local machine only
- operator surface: Mission Control web app

Expansion to additional symbols happens only after symbol-level evidence stays positive net of fees and slippage.

## What "AI Bot" Means In This Project

This project does not define AI as a chatty model that improvises trades.

For Tourab, an acceptable AI trading system must be able to:

1. observe market state using exchange data and approved external research inputs
2. state a concrete trade hypothesis before entry
3. explain why the trade exists, what regime it belongs to, and what would invalidate it
4. size the trade within hard risk caps
5. monitor the open trade continuously
6. decide whether to hold, exit, or fail closed using stored decision-time context
7. record the result so the system can learn from closed-trade evidence instead of memory theater

If the system cannot explain the trade thesis, regime, risk, and exit logic in durable artifacts, it is not "intelligent" enough for promotion.

## Primary Success Standard

The main objective is positive net expectancy after fees, slippage, and operational mistakes.

Not acceptable as a substitute:

- gross PnL
- win rate alone
- clean runtime alone
- "the model sounded confident"
- one lucky session

## Product Truths

1. Profit is the objective, not a promise.
2. Demo success is necessary but not sufficient for live success.
3. Trade frequency is not a KPI by itself. No-trade is often the correct decision.
4. A calm session with zero useful evidence is not progress.
5. External research can inform decisions, but it cannot override cost, risk, or evidence gates.

## Required System Capabilities

### 1. Market understanding

The bot must consume structured market context before entry:

- candles across multiple horizons
- spread and order-book state
- realized volatility
- regime classification
- recent execution quality and expectancy by symbol, side, and regime

When external context is used, prefer high-trust sources and turn them into explicit, testable claims instead of vibe accumulation.

### 2. Trade thesis discipline

Every autonomous trade should have a durable hypothesis card containing at least:

- symbol
- side
- regime
- reason for entry
- expected move or edge claim
- expected hold window
- cost hurdle
- invalidation condition
- exit geometry
- policy version and strategy version

### 3. Trade lifecycle intelligence

The bot must be able to:

- monitor each live trade
- detect stale or degraded conditions
- reassess whether the original thesis still holds
- exit quickly when the thesis breaks or risk limits are hit

### 4. Evidence and learning discipline

The system only learns from durable closed-trade evidence.

Research, strategy changes, and runtime execution are separate workstreams:

- execution health answers "did the system behave correctly?"
- strategy economics answers "did the trades make money after costs?"
- learning governance answers "should this change survive and be reused?"

## Non-Goals

The project is not trying to build:

- an unbounded autonomous trader
- a profit guarantee machine
- a news-reactive LLM that bypasses risk logic
- a chart-screenshot fortune teller
- live expansion before BTC and ETH pass fresh demo gates

## Immediate Design Direction

For the next overhaul, assume this baseline:

1. The current system is a guarded execution engine with partial market intelligence, not a finished trading AI.
2. Strategy redesign must be hypothesis-first and regime-aware.
3. Skills are part of the operating system of the repo and must capture durable research and resolved failure patterns.
4. Any future "AI" claim must be backed by stored evidence, not narrative confidence.
5. The target intelligence loop is observation -> regime classification -> playbook selection or no-trade -> trade planning -> thesis monitoring -> governed post-trade review.

## Source Links

- `README.md`
- `docs/autonomy-master-plan.md`
- `docs/btc-eth-trading-thesis-2026-04-03.md`
- `docs/trading-intelligence-research-2026-04-03.md`
- `docs/strategy-reset-plan-2026-03-30.md`
- `docs/strategy-economics-program-2026-03-25.md`
