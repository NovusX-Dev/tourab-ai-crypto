# Learning Evaluation Guard Runbook

## Trigger
- Alert code prefix: `LEARNING_*`
- Incident taxonomy: `ops_durability`
- Typical causes:
  - negative expectancy over configured lookback window,
  - elevated drawdown,
  - elevated slippage proxy,
  - elevated control-violation rate.

## Immediate actions
1. Confirm the latest summary from `GET /learning/evaluation`.
2. Verify closed-trade sample count is above the configured minimum (`TOURAB_LEARNING_ALERT_MIN_TRADES`).
3. Check current active strategy/model versions and recent promotions.
4. Keep approval mode in `manual` until degradation cause is understood.

## Investigation checklist
1. Data integrity
   - Verify `closedAt`, `entryAvgPrice`, `exitAvgPrice`, and `realizedPnlUsd` fields in recent managed trades.
   - Confirm no stale/duplicated rows in the ops store.
2. Strategy behavior
   - Compare by-model and by-strategy buckets for concentration of losses or violations.
   - Review recent rollback/promotion history for version transitions.
3. Execution quality
   - Inspect spread/volatility context around degraded trades.
   - Check exchange health and order lifecycle errors.
4. Guardrail quality
   - Validate stop/TP/circuit-breaker behavior on affected trades.
   - Confirm expected control-violation semantics.

## Recovery actions
1. If degradation is real, rollback to previous stable strategy/model.
2. Re-run M7 snapshot/retrain/gate with the latest closed trades.
3. Require updated validation + risk review artifacts before any re-promotion.
4. Resolve incidents only after metrics recover across a fresh evaluation window.

## Recovery criteria
- `LEARNING_*` alerts remain resolved through at least one full check interval.
- Evaluation totals are within thresholds.
- Promotion gates pass with current dataset and artifacts.
