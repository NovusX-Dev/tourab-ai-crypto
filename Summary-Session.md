# Summary Session

## Purpose

This file is the persistent cross-session memory for this repository.

## Update rule

When the user says `update summary session`, update this file with a concise summary of the current session.

Each update should capture:

1. What changed
2. What decisions were made
3. What remains open
4. Which files matter most next
5. Any important warnings, regressions, or blockers

## Format

Add each session as a new dated section at the top of the file.

Suggested structure:

## YYYY-MM-DD - Session Summary
- Changes:
- Decisions:
- Open items:
- Key files:
- Risks/blockers:

## Current memory

## 2026-03-19 - Late Session Summary
- Changes:
  - Updated the BTC exit path so stale sell-side retries no longer live in cancel/re-submit churn: stale exits only amend while still on a normal `limit` path, sell-side `take_profit` and `stop_loss` retries use `market`, and sell-side `time_stop` and `flatten` also use `market`.
  - Hardened OKX response handling so parsed API `code` and `msg` survive non-200 responses, allowing transient trade-order `401`s to be treated differently from permanent auth failures such as IP-whitelist problems.
  - Verified the repaired exit behavior in multiple live demo captures, including a forced `time_stop` validation run and a clean normal 30-minute BTC run with zero fallback, zero auto-exit submit failures, zero stale forced closes, and zero reprices in the closed sample.
  - Added a 2-hour BTC validation launcher and progress logs, then corrected an initial bad launch where short-hold validation settings accidentally leaked into the long run profile.
  - Confirmed that the later normal-baseline 30-minute run with `maxHoldSec=1800` produced a waiting-room sample: 29 BTC trades remained `entry_filled`, no exit decisions fired, and the artifact is not valid exit evidence.
- Decisions:
  - The strongest current BTC execution baseline is still the clean normal run at `logs/auto-exit-diag-2026-03-19T13-07-01-281Z/summary.md`.
  - The final 30-minute artifact at `logs/auto-exit-diag-2026-03-19T16-54-36-262Z/summary.md` must not be used as proof of exit quality because it never exercised the exit engine.
  - Tomorrow’s work should treat validation policy and evidence-window design as the bottleneck, not core exit correctness.
- Open items:
  - Decide whether to use a shorter-hold evidence profile for exit validation or a longer runtime window for the normal baseline.
  - Re-run BTC validation only after choosing an evidence profile that can actually exercise exits.
  - If the next run uses the normal baseline, expect it to need more than 30 minutes before it says anything useful about exits.
- Key files:
  - `apps/dashboard/src/mission-control-server.ts`
  - `packages/okx-demo-adapter/src/index.ts`
  - `packages/shared/src/types.ts`
  - `scripts/start-btc-policy-auto-2h.ps1`
  - `logs/auto-exit-diag-2026-03-19T12-50-00-235Z/summary.md`
  - `logs/auto-exit-diag-2026-03-19T13-07-01-281Z/summary.md`
  - `logs/auto-exit-diag-2026-03-19T16-54-36-262Z/summary.md`
  - `logs/btc-policy-auto-2h-progress-20260319-125318.out.log`
- Risks/blockers:
  - The repo is still demo-capable, not live-ready.
  - Exit mechanics are materially healthier, but evidence gathering is now bottlenecked by session design and cooldown/hold-time policy rather than obvious execution bugs.
  - A clean-looking short run can still be useless if it never reaches any exit decisions.

## 2026-03-19 - Session Summary
- Changes:
  - Re-ran BTC-only `policy_auto` validation after the earlier amend-order hardening and found that hard submit failures were gone, but many trades still ended `stale_forced_closed` after repeated repricing.
  - Added order-type-aware exit execution so stale sell-side `take_profit` and `stop_loss` retries can switch away from resting limit churn, and stale exits only attempt `amend-order` while they remain on a normal `limit` path.
  - Hardened the OKX adapter to preserve parsed API `code` and `msg` on non-200 responses, so permanent auth failures stay distinguishable from transient trade-order `401`s.
  - Updated submit-failure classification so non-permanent `401` trade submit failures are treated as transient, while whitelist/API-key auth failures remain non-transient.
  - Reworked sell-side safety exits so `time_stop` and `flatten` now use `market` instead of the old IOC loop that disappeared instantly and got resubmitted every poll.
  - Verified the new market-path behavior in live demo validation: a forced `time_stop` run showed `timeStopMarketOk=27`, `timeStopIocOk=0`, `timeStopFailed=0`.
  - Verified a fresh normal 30-minute BTC run on the updated profile with `policyAutoViolations=0`, `fallbackViolations=0`, `autoExitSubmitFailCount=0`, `closed=17`, `staleForcedClosedCount=0`, and `timeStopMarketOk=17`.
- Decisions:
  - BTC remains the only symbol for `policy_auto` evidence rebuilding.
  - The current BTC exit baseline is now exchange-native enough to keep measuring: stale sell-side TP/SL retries use `market`, and sell-side `time_stop`/`flatten` exits also use `market`.
  - Non-permanent trade-order `401`s should not poison autonomy metrics as hard submit failures; permanent auth failures such as whitelist problems still fail loud.
- Open items:
  - Continue fresh BTC evidence accumulation with longer `policy_auto` sessions from the 2026-03-19 baseline.
  - Confirm the 30-minute result repeats over a longer 2-hour run.
  - If longer runs stay clean, move back to evidence-packet rebuilding instead of more execution firefighting.
- Key files:
  - `apps/dashboard/src/mission-control-server.ts`
  - `packages/okx-demo-adapter/src/index.ts`
  - `packages/shared/src/types.ts`
  - `tests/auto-exit-stale-cancel.spec.ts`
  - `tests/mission-control-submit-failure.spec.ts`
  - `tests/okx-demo-adapter.spec.ts`
  - `logs/auto-exit-diag-2026-03-19T12-50-00-235Z/summary.md`
  - `logs/auto-exit-diag-2026-03-19T13-07-01-281Z/summary.md`
- Risks/blockers:
  - The repo is still demo-capable, not live-ready.
  - A clean 30-minute BTC run now exists, but evidence is still too thin for promotion beyond demo policy validation.
  - Longer runs still need to confirm that the new exit path stays boring and does not regress into auth noise or venue-specific edge cases.

## 2026-03-18 - Session Summary
- Changes:
  - Fixed policy-auto fallback policy so warning-grade `LEARNING_*` alerts no longer auto-open incidents and immediately demote `policy_auto`.
  - Preserved rich OKX diagnostics in Mission Control error details for both auto-exit and policy-auto entry submit failures, including `method`, `requestPath`, `requestBodyHash`, and auth-probe fields when present.
  - Hardened policy-auto submit failure classification so transient HTTP/server failures and proposal-level exchange rejects (`51016`, `51137`, `51138`, including embedded `sCode` payloads under `OKX_API_ERROR`) no longer trigger global fallback.
  - Added duplicate `clOrdId` recovery in the OKX demo adapter by reconciling against existing pending/fill state instead of failing immediately.
  - Added OKX `amend-order` support and changed stale live exit handling to try amend-in-place before cancel/re-submit.
  - Unified entry-submit and exit-submit transient/fatal classification rules to avoid inconsistent fallback behavior.
- Decisions:
  - BTC remains the only active `policy_auto` validation symbol.
  - Proposal-level exchange rejects and transient venue failures should fail the proposal, not globally demote autonomy.
  - Long-run exit efficiency is now the main weak area, not stale learning incidents or immediate policy-auto entry fallback.
  - The next serious upgrade should continue along the exchange-native path: prefer amend/reconcile over repeated cancel/re-submit churn.
- Open items:
  - Run a fresh 10-15 minute BTC `policy_auto` validation after the new amend-order path and compare cancel/reprice churn versus previous runs.
  - Specifically measure whether `AUTO_EXIT_CANCEL_FAILED`, repeated reprices, and `stale_forced_closed` counts drop.
  - If amend still churns, investigate whether certain exit states should switch to immediate force-flatten pricing sooner instead of repeated repricing.
- Key files:
  - `apps/dashboard/src/mission-control-server.ts`
  - `packages/okx-demo-adapter/src/index.ts`
  - `tests/mission-control-incident-policy.spec.ts`
  - `tests/mission-control-okx-error-detail.spec.ts`
  - `tests/mission-control-submit-failure.spec.ts`
  - `tests/okx-demo-adapter.spec.ts`
  - `logs/auto-exit-diag-2026-03-18T16-44-24-114Z/summary.md`
  - `logs/mission-alerts.jsonl`
- Risks/blockers:
  - The repo is still demo-capable, not live-ready.
  - Exit efficiency over longer runs is still weak; repricing/forced-close churn remains the largest operational quality problem.
  - The new amend-order path is code-complete and verified by tests/typecheck, but still needs a fresh longer live validation run to prove it reduces churn materially.

## 2026-03-17 - Session Summary
- Changes:
  - Added rollout-stage reporting and promotion-confidence reset logic to Mission Control, including a `/rollout/status` API and UI card.
  - Fixed `policy_auto` readiness to use fresh completed demo evidence instead of intraday `m5.today.pass`.
  - Hardened clean reset behavior so `clear-streams` also clears alert/audit/runtime residue such as auto-exit traces, pending approvals, and policy-auto transient state.
  - Added stale-entry order aging and cancel logic so resting `entry_submitted` demo orders no longer pin exposure indefinitely.
  - Fixed a late-fill reconciliation bug that could revive canceled entries with zero remaining quantity.
  - Added OKX price-band correction for auto-exit submit retries, eliminating the live `AUTO_EXIT_SUBMIT_FAILED` storm caused by `51138`/`51137`.
  - Added worker backlog-aware entry throttling with `TOURAB_WORKER_MAX_PENDING_ENTRIES_PER_SYMBOL`, plus regression coverage.
- Decisions:
  - BTC remains the only symbol to validate in `policy_auto` until a fresh evidence packet is rebuilt.
  - Old readiness remains invalidated by the 2026-02-27 regression; only fresh post-fix evidence counts.
  - The best-known BTC validation profile at end of day is:
    - `TOURAB_WORKER_SYMBOLS=BTC-USDT`
    - `entryOffsetBps=-250`
    - `TOURAB_WORKER_INTERVAL_MS=5000`
    - `TOURAB_ENTRY_STALE_TIMEOUT_SEC=90`
    - `TOURAB_WORKER_MAX_PENDING_ENTRIES_PER_SYMBOL=4`
  - Longer stale timeout (`150s`) was worse than `90s` and should not be used as the current baseline.
- Open items:
  - Tune or suppress `WORKER_STALLED_NO_PROPOSAL` so backlog-throttled quiet periods do not raise misleading stall alerts.
  - Improve BTC proposal/fill efficiency further if needed, but only after preserving the current low-cancel baseline.
  - Continue rebuilding fresh Phase 4 BTC demo evidence with longer clean `policy_auto` sessions.
- Key files:
  - `apps/dashboard/src/mission-control-server.ts`
  - `apps/dashboard/src/mission-control/worker-manager.ts`
  - `tests/mission-control-contract.spec.ts`
  - `tests/autonomy-rollout.spec.ts`
  - `tests/entry-order-aging.spec.ts`
  - `tests/okx-price-band-hint.spec.ts`
  - `tests/worker-manager.spec.ts`
  - `scripts/auto-exit-decision-diagnostic.ts`
  - `logs/auto-exit-diag-2026-03-17T17-44-26-102Z/summary.md`
- Risks/blockers:
  - The repo is still demo-capable, not live-ready.
  - Current evidence is strong enough to continue BTC demo validation, but not enough to promote beyond Phase 4 gates.
  - Worker stall alerting now risks operator noise because proposal throttling is intentional under backlog.

- 2026-03-17: Added `Summary-Session.md` as persistent cross-session memory for the repo.
- 2026-03-17: Updated `AGENTS.md` so future substantive sessions must read `Summary-Session.md` first, then relevant README and roadmap files, with the default startup set including `README.md`, `docs/autonomy-master-plan.md`, and `docs/roadmap.md`.
- 2026-03-17: Cleaned up roadmap ownership.
  - Removed obsolete `docs/automation-roadmap.md`.
  - Kept `docs/autonomy-master-plan.md` as the only source-of-truth roadmap.
  - Kept `docs/roadmap.md` only as a pointer to the master plan.
  - Marked `docs/m5-soak-plan.md` and `docs/m7-research-pipeline.md` as reference-only.
  - Marked `docs/tomorrow-work.md` as a daily handoff log, not a roadmap.
- 2026-03-09: Added `docs/autonomy-master-plan.md` as the source of truth for autonomy rollout, demo validation, live promotion gates, rollback rules, and success criteria.
- 2026-03-09: Added project skills `skills/autonomy-rollout-governor.md` and `skills/trading-validation-evidence.md`.
- 2026-03-09: The project source of truth for autonomy was moved to `docs/autonomy-master-plan.md`.
- 2026-03-09: New project skills were added for rollout governance and trading validation evidence.
- The project should be treated as demo-capable but not live-ready until fresh post-regression evidence is rebuilt.
