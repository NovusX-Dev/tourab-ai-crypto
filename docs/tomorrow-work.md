# Tomorrow Work

This file is our daily handoff so we never lose momentum.
When you say we are done for today, I will append the next day plan here.

## 2026-02-23
- Run daily M5 qualification cycle and evidence rollup:
  - `npm run soak:m5 -- --base-url http://localhost:7071 --duration-sec 900 --drain-sec 180 --poll-ms 2000 --max-hold-sec 40 --tp-r 0.5 --exit-offset-bps 1`
  - `npm run evidence:m5 -- --base-url http://localhost:7071`
  - update readiness in this file (`qualifiedDays/7`, `streakDays`, `milestoneReady`).
  - latest from 2026-02-23 rollup: `qualifiedDays=5/7`, `streakDays=3`, `milestoneReady=false`.
- Complete M7 production-state governance rehearsal follow-up:
  - verify candidate remains at `paper_canary`.
  - collect current artifacts from:
    - `GET /strategy/promotion`
    - `GET /events`
    - `GET /incidents/export`
  - latest capture (`2026-02-23`): `logs/m7-governance-2026-02-23T05-48-24-372-03-00`
    - challenger `m7-offline-2026-02-20-79f28d9b` remains `paper_canary` (`candidate`)
    - events window captured: `99` records
    - incidents export captured: `3` open incidents
  - keep any production promotion decision gated by real M5 readiness evidence (no seeded data).
- Validate M7 learning incident export/report action in live Mission Control:
  - trigger `Export M7 Incidents` from Incidents panel.
  - verify endpoint output: `GET /learning/incidents/export?lookbackDays=30`.
  - latest validation (`2026-02-23`): `logs/m7-incidents-export-validation-2026-02-23T05-52-05-317-03-00`
    - endpoint returned `lookbackDays=30`, `count=3`, `openCount=3`, status `all`
    - all exported items are `LEARNING_*` and inside the 30-day window
- Documentation sync:
  - update `docs/roadmap.md` status snapshot and M7 notes with latest real run outputs.
  - latest M7 close evidence (`2026-02-23`):
    - walk-forward: `logs/m7-walk-forward-2026-02-23T09-55-24-508Z/walk-forward-report.json` (`pass=true`)
    - gate with walk-forward: `logs/m7-gate-2026-02-23T09-55-30-036Z/gate-result.json` (`pass=true`)
  - leave this file as next-day execution only (no historical backlog).
