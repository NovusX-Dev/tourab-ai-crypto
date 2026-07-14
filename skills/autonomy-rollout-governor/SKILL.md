# Autonomy Rollout Governor

## Summary

Stage-gated rollout rules for moving Tourab Crypto AI from demo supervision to bounded live autonomy without promoting stale or misleading evidence.

## Trigger cues

- "go live"
- "fully autonomous"
- "rollout plan"
- "promotion gate"
- "demo first"
- "policy_auto"

## Non-goals
- detailed run forensics for one finished session
- strategy research methodology details
- session-parameter tuning for one diagnostic run
- exchange adapter implementation specifics
- replacing the master plan with ad hoc rollout decisions

## Workflow

1. Treat the latest regression as more important than older success evidence.
2. Require fresh evidence after any major failure in closure, drift, or fallback behavior.
3. Promote one symbol at a time: BTC first, then ETH, then SOL.
4. Promote one autonomy level at a time:
   - demo manual
   - demo policy_auto
   - live shadow
   - live manual
   - live bounded auto
5. Keep per-order and total exposure caps tiny until live net expectancy is proven.
6. Force fallback to manual on any critical alert, reconcile drift, repeated submit failure, or exit failure.
7. Never allow governed learning to auto-promote directly into live bounded-auto.

## Quality gates

- Evidence is fresh and not older than 7 calendar days.
- Net expectancy is positive after fees and slippage.
- Reconciliation drift is within threshold.
- Auto-exit reliability is stable.
- Fallback-to-manual frequency is near zero in the stage being promoted.
- All critical incidents have documented root cause and fix status.

## Failure modes

- Promoting from stale evidence after a later regression.
- Combining symbols and hiding one symbol's failure behind another symbol's success.
- Moving from demo straight to live auto.
- Letting learning or strategy changes outrun operational controls.

## What we decided for Tourab Crypto AI

- BTC is the first live candidate.
- Any serious regression resets confidence and requires fresh demo evidence.
- Live autonomy starts only after live shadow and manual-live stages pass.

## References

- `docs/autonomy-master-plan.md`
- `docs/roadmap.md`
- `docs/automation-roadmap.md`
- `logs/autonomy-demo-20260227-051319/readiness-note-2026-02-27.md`
- https://www.okx.com/docs-v5/en/#overview-demo-trading-services
- https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3772294
