# Milestone 7 Research Pipeline (Slice 2)

## Purpose

Provide reproducible offline artifacts for governed learning without enabling direct runtime deployment.

## Commands

```powershell
npm run snapshot:m7 -- --base-url http://localhost:7071 --lookback-days 90
npm run retrain:m7 -- --dataset-dir logs/m7-dataset-<timestamp>
npm run gate:m7 -- --retrain-dir logs/m7-retrain-<timestamp> --min-trades 30
```

## Dataset Manifest Schema

- `schemaVersion`: `m7-dataset-manifest-v1`
- `datasetId`: deterministic ID for the snapshot content/filters
- `createdAt`: ISO timestamp
- `source`: API endpoint + governance model version used at snapshot time
- `filters`: `limit`, `lookbackDays`
- `recordCount`, `range`, `distinct` dimensions
- `artifact`: NDJSON filename + sha256

## Retraining Run Schema

- `schemaVersion`: `m7-offline-training-run-v1`
- `runId`: deterministic run ID
- `dataset`: dataset ID + manifest hash + record count
- `trainer`: deterministic baseline trainer metadata
- `candidateModelVersion`: immutable candidate ID
- `metrics`: aggregate + per-symbol summary metrics
- `governance.deployAction`: always `blocked_until_validation_and_approval`

## Guardrail

These artifacts are research-only and do not modify live/runtime strategy or learning governance state.

## Slice 3: Independent Validation + Promotion Gate

- Gate script: `scripts/m7-gate-promotion.ts`
- Command:

```powershell
npm run gate:m7 -- --retrain-dir logs/m7-retrain-<timestamp> --min-trades 30
```

- Behavior:
  - Reads `training-run.json` from `--retrain-dir`.
  - Requires:
    - `validation-report.json`
    - `approval-record.json`
  - If required files are missing, writes templates:
    - `validation-report.json.template.json`
    - `approval-record.json.template.json`
  - Evaluates gate checks:
    - dataset volume threshold (`--min-trades`)
    - independent validation pass
    - risk review signed
    - shadow/canary evidence attached
    - operator approval recorded
    - candidate model version consistency
  - Writes:
    - `logs/m7-gate-<timestamp>/gate-result.json`
    - `logs/m7-gate-<timestamp>/summary.md`

Gate pass is required before any future model promotion flow is considered.
