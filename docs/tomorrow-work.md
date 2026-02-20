# Tomorrow Work

This file is our daily handoff so we never lose momentum.
When you say we are done for today, I will append the next day plan here.

## 2026-02-20
- Completed M5 soak cycle and rollup:
  - soak report: `logs/m5-soak-2026-02-20T08-34-37-063Z/summary.md`
  - evidence rollup: `logs/m5-evidence-2026-02-20T08-52-48-891Z/summary.md`
  - result: today `pass=true`, closure `100%`, tradeErrors `0`
  - readiness progress: `qualifiedDays=3/7`, `streakDays=3`, `milestoneReady=false`
- Continue daily M5 qualification runs until real readiness reaches `7/7`:
  - `npm run soak:m5 -- --base-url http://localhost:7071 --duration-sec 900 --drain-sec 180 --poll-ms 2000 --max-hold-sec 40 --tp-r 0.5 --exit-offset-bps 1`
  - `npm run evidence:m5 -- --base-url http://localhost:7071`
- After M5 reaches real `7/7`, run a non-seeded production promotion decision check before any live rollout change.
- Keep roadmap/evidence notes aligned with real (non-seeded) readiness status.
