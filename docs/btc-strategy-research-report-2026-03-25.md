# BTC Strategy Research Report

Date: 2026-03-25
Status: Implemented first strategy shift
Scope: BTC demo `policy_auto` entry strategy and economics

## Bottom Line

The current BTC problem is not mainly autonomy plumbing anymore.

It is strategy economics:

- the bot now runs automatically and exits cleanly
- gross edge is small but real in some trades
- fees are still larger than captured gross edge
- the current BTC profile is still structurally too close to fee-paying micro-scalping

The correct shift is:

- stop using an aggressive mean-reversion-style entry baseline
- move BTC auto-entry to a cost-aware time-series momentum / continuation style
- use passive pullback entries instead of crossing hard into the book with `entryOffsetBps=-250`
- keep strong risk gates and net-of-fee expected-move hurdles

## Reliable Research Basis

I did not use influencer threads or strategy-selling blogs.

I relied on:

1. Moskowitz, Ooi, Pedersen, *Time Series Momentum* (Journal of Financial Economics, 2012)
   - [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0304405X11002613)
   - Main takeaway:
     - time-series momentum is persistent across assets over intermediate horizons
     - very long horizons partially reverse
     - trend following performs best in extreme markets

2. Hurst, Ooi, Pedersen, *A Century of Evidence on Trend-Following Investing* (AQR, 2017)
   - [AQR](https://www.aqr.com/insights/research/journal-article/a-century-of-evidence-on-trend-following-investing)
   - Main takeaway:
     - trend following is not a recent fluke
     - the core implementation is time-series momentum
     - the robust lesson is to follow trend, cut losses, and let winners run

3. Liu, Tsyvinski, Wu, *Common Risk Factors in Cryptocurrency* (NBER Working Paper 25882)
   - [NBER PDF](https://www.nber.org/papers/w25882.pdf)
   - Main takeaway:
     - momentum is one of the core priced factors in crypto
     - momentum is especially relevant among larger coins
     - crypto factors can be built from price/volume/market data alone

4. Kogan, Makarov, Niessner, Schoar, *Are Cryptos Different?* (NBER Working Paper 31317)
   - [NBER PDF](https://www.nber.org/system/files/working_papers/w31317/w31317.pdf)
   - Main takeaway:
     - retail investors are momentum-like in crypto, unlike their more contrarian behavior in stocks/gold
     - fading crypto moves is not the natural default behavior of this market

5. Public systematic manager references
   - [Man AHL Alpha](https://www.man.com/ahl-alpha)
   - [Man AHL Crypto Diversified Multi-Strategy Programme](https://www.man.com/ahl-crypto-diversified-multi-strategy-programme)
   - I am using these as public evidence that long-running systematic managers lean on trend-following and directional momentum in liquid markets and in crypto.

## Important Constraint

I cannot honestly produce a trustworthy "top profitable traders" ranking from public internet sources without survivorship bias, marketing bias, or unverifiable claims.

So I used a stricter standard:

- peer-reviewed / NBER / established firm research
- public systematic managers with documented long-term trend-following programs

That is the cleaner basis for a repo change.

## What The Repo Evidence Says

Current BTC evidence from:

- [strategy-economics summary](D:/Tourab%20Crypto%20AI/logs/strategy-economics-2026-03-25T16-07-01-577Z/summary.md)

Current read:

- only `3` recent BTC closed trades in the latest clean packet
- total gross before fees: `+0.004956 USD`
- total fees: `0.023989 USD`
- total net: `-0.019033 USD`
- buy side is worse than sell side in this small packet
- all trades are `<=5 USD`, `<=5m`, and `<=1.0R`
- all use `entryOffsetBps=-250` in the recorded packet

That means:

- the bot is still trading too small
- too fast
- too aggressively
- with a baseline entry style that is misaligned with a momentum market

## Strategy Decision

Adopt this BTC default:

1. Strategy family
   - cost-aware time-series momentum / continuation

2. Entry style
   - passive pullback entry
   - not aggressive crossing

3. Regime handling
   - dead zone: do nothing
   - quiet directional regime: allow continuation if direction is strong and efficient
   - normal trend regime: allow continuation if short-term action is aligned or only mildly pulling back

4. Cost control
   - keep the expected-move hurdle
   - do not let the signal layer double-count fee gating

5. What not to do
   - do not default to fading recent crypto moves
   - do not default to `-250bps` aggressive offset on BTC
   - do not call short-lived gross-positive but fee-negative scalps "working"

## Code Changes Applied

### 1. Signal model changed from reversal-first to continuation-first

Updated:

- [signal-intelligence.ts](D:/Tourab%20Crypto%20AI/apps/dashboard/src/mission-control/signal-intelligence.ts)

Now:

- quiet directional regimes use continuation logic
- normal trend regimes also use continuation logic
- the signal layer no longer pretends its magnitude threshold is a fee hurdle
- signal output now includes a recommended pullback entry offset

### 2. Entry price offset is now signal-driven

Updated:

- [worker-manager.ts](D:/Tourab%20Crypto%20AI/apps/dashboard/src/mission-control/worker-manager.ts)

Now:

- if no explicit symbol override forces a fixed offset
- the worker uses the signal engine's recommended entry offset
- stronger trend impulse leads to a slightly larger passive pullback offset

### 3. BTC launcher defaults no longer force aggressive entry

Updated:

- [start-btc-policy-auto-30m-tight-exit.ps1](D:/Tourab%20Crypto%20AI/scripts/start-btc-policy-auto-30m-tight-exit.ps1)
- [start-btc-policy-auto-1h.ps1](D:/Tourab%20Crypto%20AI/scripts/start-btc-policy-auto-1h.ps1)
- [start-btc-policy-auto-2h-signal-gated.ps1](D:/Tourab%20Crypto%20AI/scripts/start-btc-policy-auto-2h-signal-gated.ps1)

Changed:

- BTC `entryOffsetBps: -250 -> 15`

This is the key repo-level strategy change.

## Why This Is The Right Next Move

Because the previous stack was internally inconsistent:

- signal logic was drifting toward continuation
- but the BTC launcher still forced aggressive `-250bps` entries
- and the old reversal logic still treated strong same-direction moves as something to fade

That is not a coherent crypto strategy.

This new baseline is coherent:

- continuation signal
- pullback entry
- cost-aware hurdle
- bounded risk

## What This Does Not Solve Yet

This does **not** guarantee profitability.

Open issues still to prove:

- whether `<=5 USD` notional can ever beat fees consistently on BTC spot
- whether current stop/TP/max-hold geometry is appropriate for continuation entries
- whether buy-side BTC should require stronger confirmation than sell-side BTC
- whether exit capture quality is still too weak even after reaching target logic

## Next Validation Order

1. Run a fresh 30m or 1h BTC session on the new continuation + pullback baseline
2. Compare:
   - side mix
   - gross before fees
   - fees
   - net P/L
   - stop-loss vs take-profit mix
3. If gross improves materially but net stays bad:
   - notional/fee economics still dominate
4. If both gross and net stay bad:
   - entry hypothesis is still weak
5. If sell improves and buy remains weak:
   - add asymmetric BTC side gating

