# Strategy Economics Program

Date: 2026-03-25
Status: Active
Owner: Operator + Codex

## Goal

Improve net trading expectancy methodically.

Not by guessing, not by adding random AI vocabulary, and not by promoting short-run demo noise.

## Non-Negotiable Truth

Positive outcome is the objective, not a promise.

The only honest way to move the outcome in our favor is:

1. measure where edge is dying
2. test narrower hypotheses
3. reject weak ideas quickly
4. only keep changes that improve net results after fees

## Workstreams

### 1. Economics Decomposition

Questions:

- Is the strategy gross-positive but fee-negative?
- Which side is weak?
- Which exit reason is weak?
- Which hold window is weak?

Execution:

- use `closed_trade_features`
- run `npm run economics:strategy -- --db-path logs/mission-ops.sqlite`

Output:

- per-symbol
- per-symbol-side
- per-approval-mode
- per-exit-reason
- per-hold-bucket
- per-requested-notional bucket
- per-entry-offset bucket
- per-stop-distance bucket
- per-take-profit-multiple bucket
- per-configured-max-hold bucket
- per-fee bucket
- findings + recommendations

### 2. Feature Contract Expansion

Current limitation:

This workstream is now partially implemented.

Added fields:

- entry offset bps
- stop distance bps
- take-profit multiple
- max-hold sec
- requested notional
- approval mode at decision
- gross pnl
- fee bps
- target/risk distance bps

Still missing for deeper cohort work:

- realized slippage bps
- signal snapshot at entry

This is required for real cohort analysis.

### 3. Hypothesis Lab

Only test a small number of explicit hypotheses:

1. continuation after strong impulse
2. reversal after strong impulse + stabilization
3. volatility/session filter

Each hypothesis must declare:

- why it should work
- expected hold regime
- expected cost hurdle
- failure conditions

### 4. Offline Validation

Before more live/demo grinding:

- snapshot dataset
- segment BTC by side and exit reason
- run walk-forward on any candidate rule change
- reject changes that only help one narrow slice

### 5. Controlled Demo Validation

Use 1h and 2h sessions only after:

- economics report says the change is directionally plausible
- no major execution regressions
- the expected move should clear cost

## Immediate Execution

This session executed Workstream 1 and the first tranche of Workstream 2:

- added strategy economics helper:
  - `apps/dashboard/src/learning/strategy-economics.ts`
- added reusable CLI report:
  - `scripts/strategy-economics-report.ts`
- added tests:
  - `tests/strategy-economics.spec.ts`
- expanded `closed_trade_features` and decision-time attribution:
  - `packages/shared/src/mission-control.ts`
  - `apps/dashboard/src/mission-control/sqlite-ops-store.ts`
  - `apps/dashboard/src/mission-control-server.ts`

## Latest BTC Evidence

Artifact:

- `logs/strategy-economics-2026-03-25T07-51-45-178Z/summary.md`

Current BTC read:

- `6` closed BTC trades in the current filtered packet
- gross expectancy: `+0.00029 USD`
- mean fee: `0.00799 USD`
- net expectancy: `-0.0077 USD`
- all `6` closed by `take_profit`
- all `6` in hold bucket `0-5m`
- requested-notional cohorts:
  - `<=5 USD`: gross expectancy `-0.000027`, net expectancy `-0.008011`
  - `<=8 USD`: gross expectancy `+0.000925`, net expectancy `-0.007076`

Important limitation:

- older BTC rows were refreshed from managed trades, so requested notional and max-hold data are now visible
- but some newer cohort fields are still `unknown` for this packet because those trades predate the latest decision-context capture

## Chosen Next BTC Hypothesis

Do not keep optimizing aggressive mean-reversion micro-scalps on BTC.

The research-backed BTC hypothesis is now:

1. use cost-aware time-series momentum / continuation as the BTC base strategy
2. enter on passive pullbacks, not aggressive `-250bps` crossing
3. keep the expected-move hurdle so continuation entries still must clear fee drag by margin

Why this hypothesis won:

- peer-reviewed and NBER evidence supports momentum as a core crypto return driver
- public systematic managers with durable trend-following programs use directional momentum as a primary building block
- local BTC evidence shows the previous aggressive micro entry style was fee-dominated and structurally misaligned

What this means operationally:

- the BTC worker should prefer continuation over reversal as the default signal family
- the signal layer should recommend passive pullback entry offsets
- the launchers should stop hard-coding `entryOffsetBps=-250`

Implementation status:

- BTC signal logic now defaults to continuation rather than reversal
- the signal layer outputs a recommended pullback entry offset
- the worker now applies the signal-recommended offset unless an explicit symbol override forces a fixed value
- BTC launcher baselines now use `entryOffsetBps=15`
- the expected-move hurdle remains active

## Next Actions

1. Add an explicit expected-move hurdle gate for BTC so entries are blocked unless projected gross move clears round-trip fee drag by margin.
2. Capture the remaining missing entry context needed for better cohorts:
   - slippage bps
   - signal snapshot at entry
3. Rerun the BTC economics report after the next controlled packet so entry-offset and stop-distance cohorts are no longer mostly `unknown`.
4. Use walk-forward and then a short controlled demo session to judge the expected-move-hurdle hypothesis.
