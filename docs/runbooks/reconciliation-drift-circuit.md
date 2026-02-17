# Reconciliation Drift Circuit Runbook

## Trigger
- Incident taxonomy: `reconciliation_drift`
- Typical alert code: `RECONCILIATION_DRIFT_CIRCUIT`
- Circuit breaker auto-action: pause/stop based on `TOURAB_DRIFT_CIRCUIT_ACTION`.

## Immediate actions
1. Confirm bot state is no longer `running`.
2. Inspect latest reconciliation status (`positions`, `pnl`, `orders`).
3. Review recent order/ledger drift details.
4. Keep execution blocked until drift source is identified.

## Recovery criteria
- Reconciliation fields return to `ok`.
- No new drift alerts for one full verification window.
- Operator acknowledges then resolves incident in Mission Control.
