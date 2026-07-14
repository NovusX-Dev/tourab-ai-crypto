# Strategy Hypothesis Lab

## Summary

Workflow for turning research, regime observations, and run forensics into explicit trading hypotheses.

Use this skill when the task is not just "tune parameters," but:

- rethink the strategy
- explain why the bot is looping between no-trades and bad trades
- decide what should be traded, when, and why
- define a testable strategy change before code edits or new validation sessions

## Trigger cues

- "strategy reset"
- "rethink everything"
- "new hypothesis"
- "why no trades"
- "why are trades unprofitable"
- "entry redesign"
- "regime model"
- "trade thesis"

## Non-goals

- adjudicating rollout readiness by itself
- debugging exchange transport bugs
- pretending a hypothesis is validated before evidence exists
- mixing execution fixes with strategy claims

## Workflow

1. Start from evidence:
   - recent run artifacts
   - strategy economics reports
   - regime segmentation
   - external research only if it changes the edge claim
2. State the proposed market inefficiency or behavioral claim in one sentence.
3. Define the hypothesis card:
   - symbol
   - side or side logic
   - market regime
   - setup conditions
   - expected hold window
   - expected move or capture target
   - cost hurdle
   - invalidation condition
   - explicit no-trade conditions
4. Check whether the current repo has enough data to evaluate the claim:
   - if not, expand the feature contract before stronger claims
5. Decide the next action class:
   - reject the idea
   - test offline first
   - run controlled demo validation
   - collect missing data before changing strategy
6. Record the chosen hypothesis in a durable doc or skill if it should survive the session.

## Required outputs

- One-sentence edge claim
- Hypothesis card
- Why this should beat costs
- What evidence would falsify it
- Single next action

## Failure modes

- hiding a weak hypothesis behind AI vocabulary
- changing multiple strategy dimensions at once and calling the result "learning"
- ignoring no-trade conditions
- assuming gross edge is enough
- moving to demo validation before offline or cohort evidence says the idea is plausible

## What we decided for Tourab Crypto AI

- Strategy work must be hypothesis-first, not parameter-first.
- Trade/no-trade quality matters more than trade frequency.
- Every meaningful strategy change should declare regime, cost hurdle, and invalidation before testing.
- If the hypothesis cannot be stated clearly, it is not ready for autonomy.

## References

- `docs/project-charter.md`
- `docs/strategy-reset-plan-2026-03-30.md`
- `docs/strategy-economics-program-2026-03-25.md`
- `skills/trading-validation-evidence/SKILL.md`
- `skills/trading-run-forensics/SKILL.md`
- `skills/trading-oracle/SKILL.md`
- https://www.nber.org/papers/w23476
- https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3772294
