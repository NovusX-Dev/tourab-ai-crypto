# Milestone 5 Soak Plan

## Purpose

Generate acceptance evidence for Milestone 5:

1. `>=95%` of filled entries are closed by deterministic policy path without manual intervention.
2. Every closed trade has unique trade ID, realized PnL, fees, and exit reason.
3. Reconciliation drift remains within SLO for 7 qualifying calendar demo days (intermittent sessions allowed).

## Evidence Model (new)

- Policy version: `calendar-day-v1`
- Source of truth endpoint: `GET /milestone5/evidence`
- Qualifying rule: a calendar day counts when all required checks pass for that day.
- Completion rule: `qualifiedDays >= 7` (continuous 7-day uptime is not required).

## Tools

1. Soak harness
- Script: `scripts/m5-soak.ts`
- Command: `npm run soak:m5 -- ...args`
- Produces per-run artifacts:
  - `logs/m5-soak-<timestamp>/report.json`
  - `logs/m5-soak-<timestamp>/summary.md`

2. Evidence rollup (resumable)
- Script: `scripts/m5-evidence-rollup.ts`
- Command: `npm run evidence:m5 -- --base-url http://localhost:7071`
- Produces rollup artifacts:
  - `logs/m5-evidence-<timestamp>/evidence.json`
  - `logs/m5-evidence-<timestamp>/summary.md`

3. UI signal
- Mission Control sidebar includes Milestone 5 evidence card:
  - `qualifiedDays/7`
  - current streak
  - today pass/fail
  - blockers

## Baseline Run (short)

```powershell
npm run soak:m5 -- --base-url http://localhost:7071 --duration-sec 900 --poll-ms 2000 --max-hold-sec 90 --tp-r 0.75 --exit-offset-bps 5
```

## Calendar-Day Evidence (recommended)

Run short/intermittent soaks during each demo day, then roll up:

```powershell
npm run soak:m5 -- --base-url http://localhost:7071 --duration-sec 900 --drain-sec 180 --poll-ms 2000 --max-hold-sec 40 --tp-r 0.5 --exit-offset-bps 1
npm run evidence:m5 -- --base-url http://localhost:7071
```

## Backend Configuration

- Evidence directory default: `logs/`
- Override: `TOURAB_M5_EVIDENCE_DIR=<path>`

## Continuous 7-day Run (optional)

```powershell
npm run soak:m5 -- --base-url http://localhost:7071 --duration-sec 604800 --poll-ms 5000 --max-hold-sec 120 --tp-r 0.75 --exit-offset-bps 5
```

## Evidence Required to Mark Milestone 5 Complete

- `checks.closureRatePass == true`
- `checks.closedTradeDataPass == true`
- `checks.reconciliationSloObservedPass == true`
- `/milestone5/evidence` (or `evidence:m5` output) shows:
  - `policyVersion == "calendar-day-v1"`
  - `qualifiedDays >= 7`
  - latest day includes no blockers

## Notes

- The short run is for baseline validation and pipeline verification only.
- Preferred approach is intermittent daily soak + rollup (cloud runner optional, laptop not required 24/7).
