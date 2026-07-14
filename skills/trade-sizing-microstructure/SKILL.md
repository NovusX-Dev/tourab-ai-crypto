# Trade Sizing Microstructure

## Summary
Workflow for validating whether a proposed or executed trade size is economically meaningful after exchange constraints, fees, and tick/lot/min-size normalization.

Use this skill when the question is not just "did the order execute?" but:
- was the size accidentally collapsed to `minSz`?
- are fees dominating the expected edge?
- are price/lot/tick rules distorting intended risk sizing?
- is the configured notional large enough to survive microstructure costs?

## Trigger cues
- "position size"
- "qty is too small"
- "minSz"
- "lotSz"
- "tickSz"
- "fees are crushing pnl"
- "microstructure"
- "sizing bug"

## Workflow
1. Inspect the intended config:
   - `maxRiskUsd`
   - `maxNotionalUsd`
   - `entryOffsetBps`
   - `stopDistanceBps`
   - symbol overrides
2. Inspect exchange constraints:
   - `minSz`
   - `lotSz`
   - `tickSz`
   - price bands when available
3. Recompute the expected order size from proposal math.
4. Compare expected size vs actual persisted `requestedQty`.
5. Compute economic sanity metrics:
   - average notional
   - fee bps
   - gross PnL bps
   - net PnL bps
   - break-even move after fees
   - whether stored realized PnL is gross or net
6. If actual size differs materially from expected size, trace:
   - normalization/rounding logic
   - clamp-to-band behavior
   - risk gate limits
   - per-order and open-exposure policy caps
7. Classify the outcome:
   - valid sizing
   - size collapsed by exchange constraints
   - size collapsed by code bug
   - size valid but too small economically

## Required outputs
- expected size vs actual size
- average notional
- fee bps and break-even move
- whether the run is strategy-valid or sizing-invalid
- single recommended next action

## Failure modes
- Looking only at USD caps and forgetting `lotSz`/`minSz`
- Declaring strategy failure when min-size fee drag invalidates the run
- Treating gross positive move as success when net PnL is still negative
- Ignoring scientific-notation steps such as `1e-8`
- Misreading net PnL fields and subtracting fees twice

## What we decided for Tourab Crypto AI
- BTC demo runs must be rejected as promotion evidence if sizing is unintentionally collapsed.
- Position sizing sanity is part of run validation, not a separate optional check.
- Net economics matter more than nominal risk-cap compliance.
- Trade-size profitability must be judged against round-trip fees, not just fill validity.

## References
- `apps/dashboard/src/proposal-helper.ts`
- `packages/risk-gatekeeper/src/index.ts`
- `logs/mission-ops.sqlite`
- `skills/trading-run-forensics/SKILL.md`
- `skills/trading-validation-evidence/SKILL.md`
