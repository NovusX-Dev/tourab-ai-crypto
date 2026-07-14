# Auto-Exit Decision Diagnostics

Last updated: 2026-02-27

## Purpose
Capture per-trade auto-exit decision attempts (trigger reason, submit attempts, retries, failures, forced closes) to debug deterministic close regressions.

## Endpoints
- `GET /auto-exit/decision-trace?limit=500`
  - Optional: `tradeId=<managed_trade_id>`
  - Returns newest-first trace items from in-memory ring buffer.

## Diagnostic script
Run a focused capture window while the bot is running:

```powershell
npm run diag:auto-exit -- --base-url http://localhost:7071 --duration-sec 300 --poll-ms 5000
```

Outputs:
- `logs/auto-exit-diag-<timestamp>/report.json`
- `logs/auto-exit-diag-<timestamp>/summary.md`
- `logs/auto-exit-diag-<timestamp>/decision-trace.json`
- `logs/auto-exit-diag-<timestamp>/samples.json`

## What to look for
1. `submit_attempt` events with no corresponding `submit_ok`.
2. Repeated `submit_retry` or `submit_failed` for the same `tradeId`.
3. Excessive forced closures (`forced_closed`, `stale_forced_closed`, `dust_closed`, `min_size_closed`).
4. Correlation with `policy_auto` fallback or `today.pass=false`.

## Fast triage checklist
1. Confirm exchange refresh loop is healthy (`/snapshot.exchange.lastError` empty).
2. Confirm decision trace continues to append during runtime.
3. Inspect top failing trade IDs in `summary.md`.
4. Cross-check matching alerts (`AUTO_EXIT_*`, `APPROVAL_MODE_FALLBACK`).
