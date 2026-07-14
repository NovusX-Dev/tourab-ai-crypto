# Trading Intelligence Upgrade Plan

Date: 2026-03-24
Scope: pre-run upgrade before the next long BTC `policy_auto` session

## Problem

The bot is no longer failing because it cannot place and close trades.

The current problem is weaker and more dangerous:

- it can trade autonomously
- it can lose cleanly
- short packets can end with unresolved exits and create fake ambiguity
- entry selection is still too willing to trade weak symbol-side setups

There is no honest way to give the bot "10 years of future trading knowledge."
What we can do is make it less naive, more cost-aware, and more evidence-governed.

## Research Basis

This upgrade is grounded in the same primary-source posture already used in the repo:

- [OKX transaction timeouts / `expTime`](https://www.okx.com/docs-v5/en/#overview-transaction-timeouts)
- [Probability of Backtest Overfitting](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253)
- [Common Risk Factors in Cryptocurrency](https://www.nber.org/papers/w25882)
- [Liquidity Risk in Crypto Assets](https://www.nber.org/papers/w30506)

Practical implication:

- edge must clear cost
- crypto effects are regime-dependent
- recent realized outcomes matter
- unresolved exits should not be mistaken for strategy ambiguity

## Plan

1. Make diagnostics drain-aware.
2. Add a smarter pre-trade gate that uses both:
   - recent price context
   - recent realized symbol-side outcomes
3. Keep the new logic fail-soft:
   - block weak setups
   - do not invent fake confidence when evidence is thin
4. Verify with focused tests before the next 2-hour BTC run.

## Executed

### 1. Drain-aware diagnostics

Updated:

- `scripts/auto-exit-decision-diagnostic.ts`

New run artifact fields:

- `drainApplied`
- `drainSec`
- `pauseOnDrain`
- `drainWaitSec`
- `drainTimedOut`
- `unsettledExitTradesAtDrainStart`
- `unsettledExitTradesAfterDrain`

Why this matters:

- a run can now say whether it ended cleanly after a drain window
- unresolved exits are explicit evidence, not hidden ambiguity

### 2. Smarter trade intelligence

Updated:

- `apps/dashboard/src/mission-control/worker-manager.ts`
- `apps/dashboard/src/mission-control-server.ts`

New behavior:

- the worker still uses recent price action to choose or reject direction
- after direction is chosen, a new side-aware quality gate checks recent closed trades for that exact `symbol + side`
- the gate blocks when:
  - recent side expectancy is below floor
  - or `time_stop` dominates that side while expectancy is non-positive

Current default gate:

- enabled
- lookback: `30` trades
- minimum sample: `8`
- minimum expectancy: `0 USD`
- max allowed `time_stop` rate with non-positive expectancy: `85%`

This is not a full ML model.
It is the correct next layer: outcome-aware filtering without pretending we have enough valid data to self-train a real model live.

### 3. BTC launcher wiring

Updated:

- `scripts/start-btc-policy-auto-2h-signal-gated.ps1`

The 2-hour BTC signal-gated launcher now turns on the new side-quality gate by default.

## Verification

Passed:

- `npx vitest run tests/worker-manager.spec.ts tests/worker-symbol-quality-gate.spec.ts tests/signal-intelligence.spec.ts tests/auto-exit-stale-cancel.spec.ts tests/okx-demo-adapter.spec.ts tests/proposal-helper.spec.ts`
- `npm run typecheck`

## 2026-03-24 Follow-up Tuning

After the first patched 2-hour BTC run, three concrete follow-ups were applied:

1. Exit retry order was fixed.
   - Price-band rejects (`51137` / `51138`) are now given a band-correction attempt before they fall into the generic transient retry path.
   - This matters because the observed stop-loss path hit several price-band rejects and then one unrelated IP-whitelist `401` before finally succeeding with a market exit.

2. Per-symbol cap behavior was tightened semantically and loosened operationally.
   - The policy-auto per-symbol cap now counts only materially active filled inventory, not pure backlog states with zero fill.
   - The BTC 2-hour signal-gated launcher was raised from cap `1` to cap `2` so one active BTC trade does not freeze the whole session.

3. Side-gate thresholds were made more diagnostic-friendly.
   - BTC launcher side-gate `minTrades`: `8 -> 5`
   - BTC launcher side-gate `maxTimeStopRatePct`: `85 -> 95`

Intent:

- keep the bot selective
- reduce fake starvation
- preserve cost-aware gating
- make the next 2-hour BTC run more likely to produce useful evidence

## What this does not solve

- It does not guarantee profit.
- It does not replace research-grade walk-forward validation.
- It does not prove the BTC profile is now good.
- It does not justify live promotion.

## Next move

Run the patched 2-hour BTC signal-gated session and judge:

1. drain result
2. gross before fees
3. fees
4. net P/L
5. exit-reason mix
6. whether side-quality gating reduces low-edge churn without starving the bot completely
