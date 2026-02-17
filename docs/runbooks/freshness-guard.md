# Freshness Guard Runbook

## Trigger
- Incident taxonomy: `freshness_guard`
- Alert/decision codes: `STALE_MARKET_DATA`, `STALE_ACCOUNT_DATA`, `STALE_ORDER_DATA`.

## Immediate actions
1. Verify source adapters are reachable.
2. Confirm fresh market/account/orders snapshots are being collected.
3. Check freshness thresholds:
   - `TOURAB_MAX_MARKET_AGE_MS`
   - `TOURAB_MAX_ACCOUNT_AGE_MS`
   - `TOURAB_MAX_ORDERS_AGE_MS`

## Recovery criteria
- Fresh snapshots are present and within threshold.
- No new stale-data blocks during verification cycles.
- Incident is acknowledged/resolved with operator notes.
