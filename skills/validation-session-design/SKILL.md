# Validation Session Design

## Summary
Workflow for designing demo and `policy_auto` validation sessions that produce promotable evidence instead of clean but uninformative runtime logs.

Use this skill when the problem is not basic uptime, but session usefulness:
- exits never triggered during the run
- hold times are longer than the evidence window
- intraday readiness turns red only because trades are still in flight
- a run is "clean" operationally but says nothing about closure quality or economics

## Trigger cues
- "evidence window"
- "validation profile"
- "session design"
- "why was this run useless"
- "2h run"
- "intraday red"
- "not enough exits"
- "qualifying day"

## Workflow
1. Start from the goal of the session:
   - exit-path verification
   - qualifying-day evidence
   - 2-hour uninterrupted autonomy evidence
   - economics sanity check
2. Match the runtime window to the exit geometry:
   - `maxHoldSec`
   - TP/SL distances
   - expected fill pace
   - cooldowns and pending-entry limits
3. Reject profiles that cannot reasonably produce enough closures inside the planned session.
4. Separate session judgments:
   - intraday status while trades are open
   - end-of-run status after expected drains/closures
5. Require each session plan to define:
   - objective
   - runtime
   - drain expectation
   - minimum useful signals
   - failure conditions
6. Classify the session result:
   - qualifying evidence
   - useful diagnostic only
   - runtime-clean but evidence-invalid
   - contaminated by config/code drift
7. End with one next action:
   - rerun same baseline longer
   - shorten hold/adjust profile for diagnostics
   - keep baseline and judge only at run-end
   - stop using the artifact for promotion claims

## Required outputs
- session objective
- expected exit opportunity within the chosen runtime
- verdict on whether the artifact is promotion-valid
- explicit note on intraday versus run-end interpretation
- single recommended next action

## Failure modes
- Treating a calm session with zero exits as strong evidence
- Mixing exit-debug runs with promotion-grade economics runs
- Using intraday closure-rate red as proof of broken autonomy when trades are merely unfinished
- Changing profile and runtime at the same time, then pretending results are comparable
- Counting a contaminated session toward the 7-day gate

## What we decided for Tourab Crypto AI
- A clean run with `autoExitDecisionCount=0` is not progress evidence.
- Phase 4 Step 6 is judged at run-end or day-end, not mid-session.
- Session design is part of validation discipline, not operator intuition.
- Diagnostic artifacts should record whether a post-run drain was attempted and whether unsettled exits remained after the drain window.

## References
- `docs/autonomy-master-plan.md`
- `Summary-Session.md`
- `scripts/start-btc-policy-auto-2h.ps1`
- `scripts/auto-exit-decision-diagnostic.ts`
- `skills/trading-validation-evidence/SKILL.md`
- `skills/autonomy-rollout-governor/SKILL.md`
