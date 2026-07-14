# BTC And ETH Trading Thesis Reset

Date: 2026-04-03
Status: Active strategy thesis
Owner: Operator + Codex

## Executive Verdict

The project should stop treating BTC and ETH as "trade whatever moves."

The new design is:

1. BTC becomes the anchor market.
   - Thesis family: cost-aware continuation with no-trade as the default.
2. ETH becomes the higher-beta follower.
   - Thesis family: continuation only when both ETH and BTC agree.
3. Adaptation is allowed in gating and version selection.
   - Live self-modifying strategy logic is not allowed.

Bluntly:

- BTC has thin but real durable evidence.
- ETH currently has no durable closed-trade evidence in `logs/mission-ops.sqlite`.
- So BTC can have a thesis plus immediate controlled validation.
- ETH can have a thesis today, but not a proof claim.

## Repo Evidence Used

Durable evidence pulled on 2026-04-03 from `logs/mission-ops.sqlite`:

- `BTC-USDT`
  - closed trades: `10`
  - net expectancy: `-0.007219 USD`
  - total net PnL: `-0.072191 USD`
- `ETH-USDT`
  - closed trades: `0`

BTC regime buckets:

- `trend_up`
  - trades: `5`
  - expectancy: `-0.009283 USD`
- `trend_down`
  - trades: `2`
  - expectancy: `+0.000120 USD`
- `chop`
  - trades: `2`
  - expectancy: `-0.008479 USD`

BTC side buckets:

- `buy`
  - trades: `5`
  - expectancy: `-0.009283 USD`
- `sell`
  - trades: `5`
  - expectancy: `-0.005155 USD`

Interpretation:

- BTC buy-side continuation is currently not earning its keep.
- BTC sell-side is still negative, but materially less bad than buy-side in the stored sample.
- Chop remains a tax payment machine and should be fail-closed.
- ETH has no business being auto-promoted from vibes.

## Research Basis

Primary and high-trust sources support a continuation-first foundation, not a reversal-first default:

1. Moskowitz, Ooi, Pedersen, *Time Series Momentum*.
   - Core implication: intermediate-horizon continuation is a valid starting family.
2. Hurst, Ooi, Pedersen, *A Century of Evidence on Trend-Following Investing*.
   - Core implication: robust directional systems cut losers and let winners run instead of fading everything.
3. Liu, Tsyvinski, Wu, *Common Risk Factors in Cryptocurrency*.
   - Core implication: market and momentum are among the core priced crypto factors.
4. Kogan, Makarov, Niessner, Schoar, *Are Cryptos Different?*
   - Core implication: crypto investor behavior is more momentum-like than classic contrarian retail stock behavior.
5. Ethereum official docs.
   - Core implication: ETH has distinct staking and network-usage demand channels, which makes it structurally more narrative-sensitive and event-sensitive than BTC.

Sources:

- [Time Series Momentum](https://www.sciencedirect.com/science/article/pii/S0304405X11002613)
- [A Century of Evidence on Trend-Following Investing](https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing)
- [Common Risk Factors in Cryptocurrency](https://www.nber.org/papers/w25882)
- [Are Cryptos Different?](https://www.nber.org/system/files/working_papers/w31317/w31317.pdf)
- [Ethereum staking docs](https://ethereum.org/en/staking/)

## Thesis Design Principles

1. No-trade is the baseline state.
2. One symbol can have one primary thesis family at a time.
3. Entry logic, cost logic, and learning logic must stay separate.
4. Strategy adaptation must happen through governed version changes, not live self-editing.
5. BTC and ETH do not need identical rules just because they share a quote currency.

## BTC Thesis

### Thesis ID

- `btc-trend-pullback-v2`

### One-sentence edge claim

BTC intraday spot is most worth trading when multi-horizon direction is aligned and the bot can buy or sell a pullback into the prevailing move with enough projected travel to clear fees and slippage.

### Allowed regimes

- `trend_up`
- `quiet_up`
- `trend_down`
- `quiet_down`

### Blocked regimes

- `chop`
- `dead_zone`
- any regime with spread above the configured cap
- any regime flagged as continuation-overextended

### Side logic

- Default stance:
  - allow both sides in theory
  - require asymmetric skepticism in practice
- Immediate fail-closed rule from stored evidence:
  - BTC `buy` should require stronger confirmation than BTC `sell`
  - BTC `trend_up` should not auto-trade on weak confidence just because direction is up

### Setup conditions

1. `15m`, `5m`, and short-horizon direction are aligned or only mildly retracing.
2. Realized volatility is high enough to avoid dead-zone fee farming.
3. Spread is contained.
4. Order-book imbalance does not materially contradict the trade.
5. Projected move budget can support the target without consuming an absurd share of expected travel.

### Entry style

- Quiet trend:
  - passive pullback entry
  - do not cross aggressively
- Full trend:
  - modest momentum continuation entry only if not overextended
  - otherwise prefer pullback refresh instead of forced chasing

### Hold window

- target working window: `5m` to `30m`

Reason:

- repo evidence already says `0-5m` is structurally fee-sensitive
- repo evidence also warns that `30m+` is not automatically paying

### Cost hurdle

Every BTC trade must satisfy both:

1. projected target move > round-trip fee burden by a clear margin
2. volatility-budget usage stays bounded

Suggested policy baseline:

- fee coverage multiple: `>= 2.0x`
- minimum extra net edge: `>= 8bps`
- max projected move budget usage: `<= 65%`

### Invalidation

Exit or block fresh entries when any of the following happens:

- regime flips to `chop` or `dead_zone`
- short-horizon move sharply breaks against the thesis
- spread blows out
- side expectancy turns non-positive over the configured lookback with heavy `time_stop` dominance
- entry would require chasing an already overextended move

### No-trade rules

- do not trade BTC because it is merely moving
- do not trade BTC in low-vol dead zones
- do not auto-buy BTC trend-up unless the stronger buy-side confirmation gate passes

## ETH Thesis

### Thesis ID

- `eth-beta-confirm-v1`

### One-sentence edge claim

ETH intraday spot is worth trading only when it behaves as a high-beta confirmer of the broader crypto move, with ETH direction aligned to BTC and enough local strength to justify its higher noise.

### Truth status

This is a design thesis, not a validated edge.

Reason:

- stored durable ETH closed-trade evidence is currently `0`

### Allowed regimes

- ETH trend aligned with BTC trend
- ETH quiet trend aligned with BTC quiet trend

### Blocked regimes

- BTC `chop` or `dead_zone`
- ETH `chop` or `dead_zone`
- ETH-only move that is not confirmed by BTC
- widened spread or overextension

### Side logic

- ETH should not act as a free-standing thesis initially
- ETH entries require cross-asset confirmation:
  - BTC regime must agree with ETH regime direction
  - ETH should be at least directionally as strong as BTC after volatility adjustment

### Entry style

- prefer deeper passive pullbacks than BTC
- avoid aggressive momentum chasing
- avoid thin or emotional candles that look exciting and settle into fee compost

### Hold window

- target working window: `5m` to `45m`

Reason:

- ETH is noisier and often needs more room than BTC
- but micro-scalping ETH with spot fees is still a bad hobby

### Cost hurdle

ETH should be stricter than BTC on:

- spread ceiling
- overextension filter
- projected move budget required to justify entry

Suggested policy baseline:

- fee coverage multiple: `>= 2.25x`
- minimum extra net edge: `>= 10bps`
- max projected move budget usage: `<= 60%`

### Invalidation

Exit or block fresh entries when:

- BTC loses directional agreement
- ETH impulse becomes purely idiosyncratic without broader market support
- spread or order-book imbalance degrades
- ETH starts printing `time_stop`-dominated non-positive expectancy in the side/regime bucket

### Deployment rule

ETH remains:

- `shadow` or `manual` until it has its own symbol-level evidence
- not eligible for `policy_auto` based on BTC success alone

## Adaptive Learning Model

This project should be adaptive in a governed way, not in a self-corrupting way.

### Runtime adaptation allowed

The live runtime may adapt by:

1. tightening or blocking symbol-side-regime entry when recent expectancy decays
2. tightening or blocking when `time_stop` dominance rises with non-positive expectancy
3. scaling thresholds with realized volatility
4. shrinking trade frequency when market structure is weak

This is adaptive gating, not autonomous self-reprogramming.

### Runtime adaptation not allowed

The live runtime must not:

- invent new strategies
- rewrite core thresholds permanently
- promote its own candidate model
- override risk or approval controls because recent PnL looked good

### Learning loop design

1. Persist every trade with:
   - symbol
   - side
   - regime
   - signal context
   - spread
   - volatility
   - order-book imbalance
   - strategy version
   - policy version
   - model version
2. Score rolling expectancy by:
   - symbol
   - side
   - regime
   - hold bucket
3. Use those scores to fail closed at runtime.
4. Use M7 offline workflow to create challengers.
5. Promote only after walk-forward plus forward-demo evidence.

## Strategy Versioning Decision

Use explicit versions instead of leaving everything under generic champion labels.

Recommended next version names:

- BTC strategy version:
  - `btc-trend-pullback-v2`
- ETH strategy version:
  - `eth-beta-confirm-v1`
- umbrella portfolio thesis tag:
  - `major-spot-adaptive-v1`

## Immediate Design Consequences

1. BTC should stay the first autonomous symbol.
2. BTC buy-side should be harder to approve than BTC sell-side until evidence improves.
3. ETH should require BTC confirmation and should not go autonomous from zero evidence.
4. Chop and dead-zone trading should remain blocked, not debated.
5. "Learning" should primarily make the system trade less when edge decays, not more when it gets bored.

## What Still Needs Implementation

1. Add explicit cross-asset confirmation for ETH using BTC regime and relative-strength context.
2. Make strategy versions symbol-specific instead of one vague champion label.
3. Extend reporting to segment expectancy by `symbol + side + regime + strategyVersion`.
4. Add a shadow-first ETH validation path before any ETH auto-approval claim.
5. Add adaptive gating thresholds that read rolling regime buckets instead of symbol-only buckets.

## Final Blunt Rule

If the bot cannot say:

- what regime it sees
- why the trade exists
- why this symbol is allowed
- why this side is allowed
- why the projected move clears cost

then the correct action is no-trade.

That is not timidity.
That is the first sign of intelligence.
