# Tomorrow Work

This file is our daily handoff so we never lose momentum.
When you say we are done for today, I will append the next day plan here.

## 2026-02-23
- Daily M5 qualification/evidence status:
  - latest rollup remains `qualifiedDays=5/7`, `streakDays=3`, `milestoneReady=false`.
- M7 governance rehearsal follow-up status:
  - candidate still constrained to non-production promotion path; keep promotion gated by fresh M5 readiness.
  - latest governance capture remains: `logs/m7-governance-2026-02-23T05-48-24-372-03-00`.
- M7 SOL stability work completed today:
  - added repeatable calibration runner: `npm run sol-calibrate:m7 -- --require-stage moderate`.
  - hardened process orchestration to avoid stop/cleanup hangs (bounded/idempotent shutdown).
  - codified SOL side logic support (`buy|sell|auto`) and switched calibration to `auto`.
  - tuned SOL calibration profile to target expectancy (entry/stop/auto-exit).
  - committed reproducible changes: `b220f46` (`m7: harden sol calibration orchestration and add auto-side expectancy tuning`).
- Latest evidence from fresh cycles:
  - cycle 1:
    - calibration: `logs/m7-sol-calibration-2026-02-23T19-23-15-136Z/summary.md`
    - reentry: `logs/m7-sol-reentry-2026-02-23T19-32-21-677Z/summary.md`
    - outcome: `moderate` failed (`1/5`), `reintroduce` passed (`4/5`, 80%).
  - cycle 2 (latest):
    - calibration: `logs/m7-sol-calibration-2026-02-23T19-32-58-696Z/summary.md`
    - dataset: `logs/m7-dataset-2026-02-23T19-43-04-692Z`
    - reentry: `logs/m7-sol-reentry-2026-02-23T19-43-05-435Z/summary.md`
    - moderate walk-forward: `logs/m7-sol-reentry-2026-02-23T19-43-05-435Z/moderate/walk-forward-report.json`
    - outcome: `moderate` still failed (`2/4`, 50%), `reintroduce` passed (`4/4`, 100%).

## 2026-02-24
- Daily M5 qualification/evidence cycle completed (priority run before M7 work):
  - soak: `logs/m5-soak-2026-02-24T08-25-13-639Z/report.json`
  - evidence: `logs/m5-evidence-2026-02-24T08-43-18-170Z/evidence.json`
  - summary: `logs/m5-evidence-2026-02-24T08-43-18-170Z/summary.md`
  - result: `today.pass=true`, `qualifiedDays=6/7`, `streakDays=4`, `milestoneReady=false`.
  - today metrics: `closureRatePct=100`, `filledEntries=19`, `deterministicClosed=19`, `tradeErrors=0`, `reconciliationPass=true`.
- M7 status carry-forward:
  - moderate still unresolved from latest reference evidence: `logs/m7-sol-reentry-2026-02-23T19-43-05-435Z/summary.md` (`2/4`, 50%).
- M7 moderate closure execution (today):
  - Step 1 baseline run (`npm run sol-calibrate:m7 -- --require-stage moderate`):
    - calibration: `logs/m7-sol-calibration-2026-02-24T08-45-10-516Z/summary.md`
    - m5 soak: `logs/m5-soak-2026-02-24T08-45-14-303Z/report.json`
    - dataset: `logs/m7-dataset-2026-02-24T08-53-29-852Z/dataset-manifest.json`
    - reentry: `logs/m7-sol-reentry-2026-02-24T08-53-30-755Z/summary.md`
    - moderate result: failed (`windowsPassed=2/5`, `passRatePct=40`, `requiredStagePass=false`).
  - Step 2 targeted expectancy iteration (SOL entry/stop/exit profile tuning, no stage-threshold changes) + rerun:
    - calibration: `logs/m7-sol-calibration-2026-02-24T09-49-57-318Z/summary.md`
    - m5 soak: `logs/m5-soak-2026-02-24T09-50-02-987Z/report.json`
    - dataset: `logs/m7-dataset-2026-02-24T09-57-37-486Z/dataset-manifest.json`
    - reentry: `logs/m7-sol-reentry-2026-02-24T09-57-38-293Z/summary.md`
    - moderate result: still failed but improved (`windowsPassed=2/4`, `passRatePct=50`, `requiredStagePass=false`).
    - reintroduce remains pass (`4/4`, `100%`).

## 2026-02-25 (next session)
- Goal: close M5 readiness to `7/7`, then continue M7 moderate closure.
- Step 1: run daily M5 cycle first (non-negotiable gate):
  - `npm run soak:m5 -- --base-url http://localhost:7071 --duration-sec 900 --drain-sec 180 --poll-ms 2000 --max-hold-sec 40 --tp-r 0.5 --exit-offset-bps 1`
  - `npm run evidence:m5 -- --base-url http://localhost:7071`
  - update this file with `qualifiedDays/7`, `streakDays`, and `milestoneReady`.
- Step 2: run M7 moderate-gated SOL baseline after M5 evidence:
  - `npm run sol-calibrate:m7 -- --require-stage moderate`
  - record artifacts (`m5-soak`, `m7-dataset`, `m7-sol-reentry`) plus calibration summary.
- Step 3: targeted expectancy iteration only if moderate still fails:
  - focus on realized expectancy improvements and rerun the same command.
  - compare against latest reference: `logs/m7-sol-reentry-2026-02-24T09-57-38-293Z/summary.md`.
- Step 4: acceptance/docs sync:
  - verify M7 completion criteria against latest artifacts.
  - update `docs/roadmap.md` with current M5/M7 status and evidence paths.
