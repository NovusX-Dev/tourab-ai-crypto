# BTC Entry Forensics And Profit Report

Date: 2026-03-24
Scope: BTC `policy_auto` diagnostics, entry-quality research, profitability controls, and module updates

## Executive Summary

The current BTC autonomy problem is not a broken execution path.

It is a weak entry-selection path operating at tiny notionals where round-trip fees are large enough to erase a modest gross edge.

The most important correction from this report is accounting:

- `managed_trades.realized_pnl_usd` is already net of fees
- the previous diagnostic script mislabeled that sum as gross and subtracted fees again
- that double-counted losses in prior summaries

Corrected result for the 2026-03-24 tight-exit BTC packet:

- closed trades: `19`
- wins: `2`
- losses: `17`
- gross before fees: `+0.042846 USD`
- fees: `0.152094 USD`
- net realized PnL: `-0.109248 USD`
- average net per closed trade: `-0.005750 USD`
- average hold time: `318.84 sec`
- all closed trades exited via `time_stop`

Interpretation:

- the bot produced a small positive gross edge before fees
- that edge was nowhere near large enough to survive fees at about `5 USD` notional
- entry quality is too weak and too indiscriminate for this BTC configuration

## Repo Forensics

Artifacts and evidence used:

- `logs/auto-exit-diag-2026-03-24T06-24-39-085Z/summary.md`
- `logs/auto-exit-diag-2026-03-24T06-24-39-085Z/report.json`
- `logs/btc-policy-auto-30m-tight-exit-progress-20260324-032425.out.log`
- `logs/mission-ops.sqlite`

Observed run pattern:

- all entries in the packet were `buy`
- requested size stayed near `0.000071 BTC` (`~5 USD`)
- fee per closed trade stayed near `0.008 USD`
- the packet generated small gross wins early, then a larger cluster of small losers
- no take-profit exits fired
- no stop-loss exits fired
- all closes happened by `time_stop`

Practical diagnosis:

1. The worker is active and the exit engine works.
2. The economics are still negative after fees.
3. The strategy is not "completely dead" because gross before fees was positive in aggregate.
4. The real weakness is entry selectivity plus fee drag, not exchange plumbing.

## Research Findings

### What profitable entry design consistently requires

Across official/primary sources and credible operator guidance, the repeated pattern is:

1. Net expectancy matters more than win rate.
2. Edge must be larger than transaction costs.
3. Entry selectivity matters; dead-zone trading is where fees farm the trader.
4. Validation must survive out-of-sample, walk-forward, and forward-demo checks.
5. In crypto specifically, liquidity and reversal effects exist, but they are regime-dependent and can disappear after costs.

What that means for Tourab:

- do not enter just because the worker is allowed to cycle
- require a recent directional move strong enough to justify a reversal or continuation hypothesis
- keep trade horizons aligned with the size of the move being targeted
- treat tiny-notional BTC runs as fee-sensitive diagnostics, not proof of scalable profitability

### Crypto-specific research implications

- Crypto markets show common factors, including momentum and market-related risk, but those effects are unstable across regimes.
- Liquidity and reversal effects exist, but implementation cost matters heavily.
- Backtest overfitting risk is high; short-run demo wins are weak evidence.

### Widely cited top traders

This is an informed, non-authoritative list based on public reputation, long-term impact, and widely cited market literature, not a single official ranking:

1. Jim Simons
2. George Soros
3. Stanley Druckenmiller
4. Paul Tudor Jones
5. Ed Seykota
6. Bruce Kovner
7. Richard Dennis
8. Ray Dalio
9. Michael Marcus
10. David Tepper

Why this list matters:

- the common pattern is not "trade more"
- it is "trade fewer, higher-conviction setups with disciplined loss control and cost awareness"

### Top 3 AI bots / AI trading systems

Blunt truth:

There is no clean, universally trusted public ranking of "top 3 proven successful AI bots" with independent audited apples-to-apples performance.

The closest credible examples I found are:

1. Trade Ideas Holly
   - public documentation of strategy/risk modes and daily signal workflow
   - useful as a retail-facing AI trading assistant reference
   - proof quality is marketing-grade, not institutional-audit-grade
2. Numerai Meta Model ecosystem
   - real capital allocation and staking-based feedback
   - strong proof of live model-governance mechanics
   - not a copy-paste retail bot for direct personal trading
3. Man AHL machine-learning stack
   - institutional systematic trading platform with documented ML research and live fund context
   - strong credibility as an AI-driven trading system
   - not a consumer bot and not fully transparent at the signal level

Conclusion:

- if the bar is "publicly documented and clearly real", these qualify
- if the bar is "fully transparent, independently audited, directly comparable retail bots", the market does not give you a clean top-3 list

## Code And Skill Updates Completed

### Trading/reporting fixes

- Fixed `scripts/auto-exit-decision-diagnostic.ts` so it now reports:
  - gross before fees
  - fees
  - net realized PnL
  - average gross before fees
  - average net PnL
- This removes the fee double-subtraction error from future reports.

### Worker/trader logic upgrades

- Added signal gating to `apps/dashboard/src/mission-control/worker-manager.ts`
- New worker policy controls:
  - `signalLookbackSec`
  - `signalMinMoveBps`
- New behavior:
  - if signal filter is enabled, the worker waits for enough recent price history
  - `auto` side now chooses direction from recent move context instead of blind static bias
  - fixed-side entries can also be blocked when recent move does not support the hypothesis

### BTC diagnostic launcher improvement

- Updated `scripts/start-btc-policy-auto-30m-tight-exit.ps1`
- New experimental defaults for that diagnostic:
  - `TOURAB_WORKER_DEFAULT_SIDE=auto`
  - `TOURAB_WORKER_SIGNAL_LOOKBACK_SEC=180`
  - `TOURAB_WORKER_SIGNAL_MIN_MOVE_BPS=20`

### Skill updates

Updated skills:

- `skills/trading-run-forensics/SKILL.md`
- `skills/trade-sizing-microstructure/SKILL.md`
- `skills/trading-oracle/SKILL.md`

New documented lesson:

- always verify whether stored realized PnL is gross or net before interpreting run economics
- entry quality gates are profitability controls, not optional tuning

## Recommended Next Actions

1. Re-run the 30-minute BTC tight-exit diagnostic on the new signal-gated worker path.
2. Compare corrected metrics:
   - gross before fees
   - fees
   - net realized PnL
   - exit-reason mix
   - win/loss count
3. If gross edge improves materially, keep refining entry selectivity before touching live stages.
4. If gross edge stays weak, stop pretending this BTC profile is promotable and redesign the entry logic.
5. After at least `20` closed BTC trades on the new logic, raise the worker symbol quality floor from permissive to strictly positive expectancy.

## Sources

- Probability of Backtest Overfitting:
  - https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253
- Common Risk Factors in Cryptocurrency:
  - https://www.nber.org/papers/w25882
- Liquidity Risk in Crypto Assets:
  - https://www.nber.org/papers/w30506
- Crypto Return Reversals and Liquidity Provision:
  - https://www.nber.org/papers/w30566
- Numerai tournament overview:
  - https://docs.numer.ai/numerai-tournament
- Trade Ideas Holly guide:
  - https://www.trade-ideas.com/hollyguide/What_Holly_Does.html
- Trade Ideas Holly risk modes:
  - https://trade-ideas.com/hollyguide/AI_Risk_Mode.html
- Man AHL machine learning overview:
  - https://www.man.com/documents/download/0DtEB-AyxAP-6giw2-bnVlM/Man_AHL_Insights_The_Rise_of_Machine_Learning_at_Man_AHL_English_%28United_States%29_17-11-2021.pdf
