# Roadmap

Last updated: 2026-03-19

## Source of Truth

The project roadmap, autonomy rollout policy, demo validation gates, and live promotion rules now live in:

- `docs/project-charter.md` for project objective and AI definition
- `docs/autonomy-master-plan.md`

## Current posture

- Demo-capable
- Not live-ready until fresh post-regression evidence is rebuilt
- Rollout path: demo hardening -> demo policy_auto -> live shadow -> live manual -> live bounded auto
- Current BTC validation baseline after 2026-03-19 hardening:
  - `policy_auto`
  - BTC only
  - `entryOffsetBps=-250`
  - `TOURAB_ENTRY_STALE_TIMEOUT_SEC=90`
  - `TOURAB_WORKER_MAX_PENDING_ENTRIES_PER_SYMBOL=4`
  - transient/proposal-level OKX submit rejects no longer auto-fallback `policy_auto`
  - stale live exits only amend while they remain on the normal `limit` path
  - sell-side stale TP/SL retries use `market`
  - sell-side `time_stop` and `flatten` exits use `market`
  - latest clean normal-run artifact: `logs/auto-exit-diag-2026-03-19T13-07-01-281Z/summary.md`
  - latest 30-minute normal-baseline artifact `logs/auto-exit-diag-2026-03-19T16-54-36-262Z/summary.md` is not valid exit evidence because it never reached any exit decisions

## Rule

If this file conflicts with `docs/autonomy-master-plan.md`, the master plan wins.
