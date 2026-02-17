# Exchange Reliability Runbook

## Trigger
- Incident taxonomy: `exchange_reliability`
- Typical alert code: `RUNTIME_ERROR_EVENT`.

## Immediate actions
1. Inspect recent exchange/API error logs.
2. Validate API credentials and rate-limit posture.
3. Check retry budget and failure cadence.
4. Keep bot paused if repeated failures continue.

## Recovery criteria
- Error rate returns to normal baseline.
- Successful health checks and order snapshots observed.
- Incident resolved with root-cause summary.
