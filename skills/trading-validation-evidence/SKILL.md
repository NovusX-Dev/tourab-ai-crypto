# Trading Validation Evidence

## Summary

Validation discipline for crypto trading strategies and autonomous policies, focused on avoiding backtest overfitting and promoting only on net-of-cost evidence.

## Trigger cues

- "backtest"
- "walk-forward"
- "forward test"
- "profitability proof"
- "evidence gate"
- "strategy validation"

## Non-goals
- designing the exact runtime profile for one session
- diagnosing a single contaminated run in depth
- runtime failover or safety policy
- exchange transport/debugging details
- granting rollout promotion without fresh evidence

## Workflow

1. Separate train, validation, walk-forward, and forward-demo windows.
2. Evaluate by symbol and combined portfolio, not combined only.
3. Always score net of fees and slippage.
4. Require closed-trade counts before promotion; do not trust tiny samples.
5. Compare demo and live-shadow execution assumptions before live promotion.
6. Promote only with a packet containing:
   - hypothesis
   - data windows
   - cost model
   - walk-forward results
   - forward-demo results
   - failure modes
7. Reject strategies that win only in one narrow regime or collapse after realistic cost haircuts.

## Minimum evidence rules

- At least 30 closed trades per symbol for any symbol entering autonomous policy review.
- Positive net expectancy in both walk-forward and forward-demo.
- Stable drawdown and slippage profile.
- No promotion on gross PnL, win rate, or a single lucky week.

## Failure modes

- Backtest overfitting from repeated parameter search.
- Ignoring slippage and fees.
- Aggregating symbols and hiding weak-symbol behavior.
- Declaring victory from demo without validating live-shadow differences.

## What we decided for Tourab Crypto AI

- Promotion packets are mandatory for strategy or autonomy upgrades.
- Net expectancy after costs is the primary performance signal.
- Symbol-level evidence gates are required for BTC, ETH, and SOL independently.
- Routine validation resets must not wipe durable trade evidence. Clearing runtime streams is not a license to delete `managed_trades` or `closed_trade_features`.

## References

- `docs/autonomy-master-plan.md`
- `apps/dashboard/src/learning/m7-research-pipeline.ts`
- `scripts/m7-walk-forward.ts`
- https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253
- https://www.nber.org/papers/w23476
- https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3772294
- https://www.nber.org/papers/w25882
