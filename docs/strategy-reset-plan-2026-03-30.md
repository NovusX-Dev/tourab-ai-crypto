# Strategy Reset Plan

Date: 2026-03-30
Status: Active
Owner: Operator + Codex

## Blunt Diagnosis

The bot is looping for structural reasons, not because one more parameter tweak is missing.

Current failure pattern:

1. One regime/profile is loose enough to trade, but the realized edge is too small after costs.
2. The next profile is strict enough to avoid bad trades, but it starves into zero evidence.
3. Run launchers clear runtime state so aggressively that strategy memory and evidence continuity are weakened.
4. The worker mostly reasons from short lookback price movement plus static thresholds, not from a richer market-state model.

That is not a smart trading system yet.
It is a guarded execution engine with thin signal logic.

## What The Codebase Was Actually Doing

### 1. Evidence memory was being wiped on run reset

`/maintenance/clear-streams` was deleting:

- `managed_trades`
- `closed_trade_features`

That means repeated BTC validation runs were resetting the very dataset used by:

- symbol quality gates
- side quality gates
- economics reports
- learning/reporting flows

This is a serious architecture bug for any system that claims to learn or adapt.

### 2. The signal stack was too thin

The live worker mainly relied on:

- recent move over a short lookback
- recent short-move confirmation
- realized volatility threshold
- expected-move hurdle

This is not enough market context for a cost-sensitive crypto bot.

Missing capability:

- multi-timeframe candle context
- spread awareness
- order-book imbalance awareness
- explicit regime snapshot attached to each trade decision

### 3. Strategy and execution were being mixed

Some earlier runs failed because of real execution bugs.
Later runs were mechanically cleaner but still economically weak.

That distinction matters:

- runtime health is necessary
- positive net expectancy is separate

The repo already had some governance for this, but the resets and thin signal context undermined it.

## Reliable Research Basis

The plan below uses primary or high-trust sources only.

- AQR, trend-following evidence:
  - [A Century of Evidence on Trend-Following Investing](https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing)
- Moskowitz, Ooi, Pedersen:
  - [Time Series Momentum](https://www.sciencedirect.com/science/article/pii/S0304405X11002613)
- NBER, crypto factors:
  - [Common Risk Factors in Cryptocurrency](https://www.nber.org/papers/w25882)
- NBER, backtesting discipline:
  - [Backtesting](https://www.nber.org/papers/w23476)
- SSRN, ML validation discipline:
  - [A Backtesting Protocol in the Era of Machine Learning](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3772294)
- OKX public market data / exchange behavior:
  - [OKX API Docs](https://www.okx.com/docs-v5/en/)
- OKX fee behavior:
  - [OKX Trading Fee Rules FAQ](https://www.okx.com/en-us/help/trading-fee-rules-faq)

## Practical Research Conclusions

1. Trend/continuation can be a valid crypto base signal, but only when net-of-cost capture is large enough.
2. Micro-scalps with fee drag near the same order of magnitude as expected move are structurally fragile.
3. A trading bot needs a regime model, not just a trigger.
4. Trade/no-trade is often more important than side selection.
5. Adaptive behavior is only trustworthy if the evidence store is durable.

## Corrective Plan

### Workstream 1. Preserve Evidence

Goal:
- Never wipe closed-trade evidence during normal validation resets.

Required:
- `clear-streams` clears transient streams, alerts, incidents, and in-memory runtime residue only.
- Closed-trade evidence remains durable across sessions.

Status:
- implemented

### Workstream 2. Add Real Market Intelligence

Goal:
- Give the worker a richer view of the market before entry.

Required:
- pull recent OKX 1-minute candles
- read public order book
- compute:
  - 1m / 5m / 15m move
  - realized volatility
  - spread in bps
  - order-book imbalance
  - regime classification
  - confidence score
  - recommended side
  - recommended entry offset

Status:
- implemented as first tranche

### Workstream 3. Attach Decision-Time Market Context To Trades

Goal:
- Every trade should remember the regime it was entered under.

Required:
- persist:
  - market regime
  - confidence score
  - trend alignment score
  - 1m / 5m / 15m move
  - realized volatility
  - spread bps
  - order-book imbalance

Status:
- implemented

### Workstream 4. Use Market Context In Entry Gating

Goal:
- Stop taking trades that the richer market snapshot does not support.

Required:
- confidence floor
- spread ceiling
- optional side-alignment requirement between strategy signal and market snapshot

Status:
- implemented

### Workstream 5. Analyze By Regime, Not Just By Side

Goal:
- Learn which market regimes actually pay net of costs.

Required:
- strategy economics reporting should segment by market regime

Status:
- implemented in report pipeline

## Code Changes Executed In This Session

### Evidence durability

- `apps/dashboard/src/mission-control/sqlite-ops-store.ts`
  - `clearTransientOps()` now preserves `managed_trades` and `closed_trade_features`
- `apps/dashboard/src/mission-control-server.ts`
  - `/maintenance/clear-streams` now calls the transient clear path instead of deleting trade evidence

### Market intelligence

- added `apps/dashboard/src/mission-control/market-intelligence.ts`
  - fetches candles and order book from OKX public APIs
  - computes regime and confidence snapshot

### Worker integration

- `apps/dashboard/src/mission-control/worker-manager.ts`
  - worker can request market intelligence
  - blocks on weak confidence
  - blocks on excessive spread
  - can require side alignment
  - passes market snapshot into queued trade approval

### Decision-time attribution expansion

- `apps/dashboard/src/mission-control-server.ts`
- `apps/dashboard/src/mission-control/sqlite-ops-store.ts`
- `packages/shared/src/mission-control.ts`

Added persisted fields for regime-aware analysis.

### Reporting

- `apps/dashboard/src/learning/strategy-economics.ts`
- `scripts/strategy-economics-report.ts`

Added regime segmentation.

### Launcher activation

Updated BTC launchers to enable the new market-intelligence gate:

- `scripts/start-btc-policy-auto-30m-tight-exit.ps1`
- `scripts/start-btc-policy-auto-1h.ps1`
- `scripts/start-btc-policy-auto-2h-signal-gated.ps1`

## What This Still Does Not Solve

This does not magically create a profitable strategy.

It solves three foundational problems:

1. the bot keeps its memory
2. the bot has a richer market-state view
3. the evidence layer can now analyze trades by regime

What remains open:

1. Run a fresh BTC economics report on the preserved evidence base.
2. Validate whether `trend_down` / `quiet_down` BTC regimes are net-positive and whether `buy` should remain heavily restricted.
3. Decide whether BTC should remain sell-biased for now.
4. Add chart/operator visibility for market regime and candle context in Mission Control if the backend evidence proves useful.

## Recommended Next Execution Sequence

1. Run `npm run economics:strategy -- --db-path logs/mission-ops.sqlite --symbol BTC-USDT`
2. Inspect regime buckets:
   - `trend_up`
   - `trend_down`
   - `quiet_up`
   - `quiet_down`
   - `chop`
   - `dead_zone`
3. If one regime is clearly net-negative, fail closed there.
4. Run a controlled BTC validation session only after the regime buckets say which conditions are worth trading.

## Verification

- `npx vitest run tests/worker-manager.spec.ts`
- `npm run typecheck`
