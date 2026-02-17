# Incident Taxonomy and SLO Baseline

This document defines Milestone 4 incident taxonomy and response expectations.

## Taxonomy
- `reconciliation_drift`
- `freshness_guard`
- `approval_governance`
- `control_plane`
- `exchange_reliability`
- `stream_health`
- `ops_durability`

## Severity baseline
- `sev1`: immediate safety risk; must be acknowledged in <= 5 minutes.
- `sev2`: major operational impact; acknowledge in <= 15 minutes.
- `sev3`: degraded but controlled; acknowledge in <= 60 minutes.

## Default policy calibration
- Drift circuit action: `TOURAB_DRIFT_CIRCUIT_ACTION=pause`
- Drift trigger count: `TOURAB_DRIFT_CIRCUIT_MIN_CONSECUTIVE=2`
- Drift grace: `TOURAB_DRIFT_CIRCUIT_MAX_GRACE_MS=90000`
- Freshness thresholds:
  - `TOURAB_MAX_MARKET_AGE_MS=15000`
  - `TOURAB_MAX_ACCOUNT_AGE_MS=60000`
  - `TOURAB_MAX_ORDERS_AGE_MS=60000`

## Operational rule
Incidents must include a runbook reference and lifecycle updates (`open -> acknowledged -> resolved`) with actor attribution.
