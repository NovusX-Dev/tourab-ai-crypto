# Trading Run Forensics

## Summary
Structured workflow for diagnosing why a demo or policy-auto trading run passed operationally but failed economically, or vice versa.

Use this skill to separate:
- execution-path failures
- policy guardrail failures
- sizing/configuration bugs
- fee/slippage compression
- weak strategy edge

The goal is to avoid hand-wavy postmortems. A run should end with a concrete statement of what failed, where, and whether the next move is a code fix, parameter change, or evidence-policy decision.

## Trigger cues
- "trace it"
- "why did this run lose"
- "forensics"
- "analyze this trading run"
- "policy_auto session lost money"
- "execution was clean but pnl was bad"
- "break down this validation run"

## Workflow
1. Start from the run artifact, not memory:
   - `logs/auto-exit-diag-<timestamp>/summary.md`
   - `logs/auto-exit-diag-<timestamp>/report.json`
   - matching progress/server logs if present
2. Split the diagnosis into two layers:
   - operational quality: fallback, submit failures, drift, stuck trades, alert state
   - economic quality: gross PnL, fees, net PnL, win/loss mix, exit-reason mix
3. Verify whether the run is strategy-invalid because of a code/config bug:
   - quantity unexpectedly at `minSz`
   - price/lot/tick alignment issue
   - time-stop dominating because exits never had room to work
   - fees larger than typical gross move
   - non-resting exits (`ioc` / `market`) vanishing and getting resubmitted forever
4. Query durable evidence when the summary is insufficient:
   - `logs/mission-ops.sqlite`
   - `managed_trades`
   - `closed_trade_features`
5. Compute the minimum breakdown:
   - closed trade count
   - win/loss/breakeven count
   - gross realized PnL before fees
   - fees
   - net realized PnL
   - average net PnL per trade
   - exit reason distribution
   - average hold time
   - average notional and fee bps
6. Validate PnL field semantics before drawing conclusions:
   - confirm whether stored `realized_pnl_usd` is gross or already net
   - do not subtract fees twice
   - if report labels are ambiguous, verify against `managed_trades` and closure logic
7. Decide the failure class:
   - execution bug
   - evidence-scoring artifact
   - sizing/microstructure bug
   - strategy edge failure
   - mixed failure
8. End with one next action only:
   - rerun after code fix
   - tune sizing/entry/exit profile
   - adjust evidence interpretation
   - stop promotion claims

## Required outputs
- One-paragraph verdict
- Evidence paths used
- Root cause category
- Key metrics table or bullet list
- Single next action

## Failure modes
- Confusing gross move with net expectancy
- Declaring strategy failure when fees or min-size distortion caused the loss
- Declaring execution healthy without checking drift/fallback/submit failures
- Using only the top-20 trade summary when the SQLite store holds the real answer
- Treating one bad run as strategy truth when the run was contaminated by config drift or a normalization bug
- Misreading net PnL fields as gross and double-subtracting fees
- Mistaking repeated non-resting exit resubmits for normal venue behavior when they are really a state-machine loop
- Letting price-band rejects fall into generic transient retry without first trying a band-corrected resubmit

## What we decided for Tourab Crypto AI
- Runtime cleanliness and profitability must be reported together.
- A policy-auto run is not promotable if net expectancy is negative, even when execution is clean.
- When a run loses uniformly, first rule out sizing, fee, or exit-geometry bugs before blaming the signal logic.
- PnL accounting semantics must be verified before a report is trusted.
- If a run used a drain window, forensics should check whether unresolved exits remained after drain timeout before calling the packet ambiguous.
- If a run produces zero proposals, check whether the active blocker is a static absolute signal threshold that should be volatility-scaled rather than assuming the worker is hung.
- If a `time_stop` packet looks implausible, verify whether hold time is measured from first fill or merely from order/trade creation. Wrong hold clocks can invalidate both exit forensics and strategy conclusions.

## References
- `docs/autonomy-master-plan.md`
- `Summary-Session.md`
- `scripts/auto-exit-decision-diagnostic.ts`
- `logs/mission-ops.sqlite`
- `apps/dashboard/src/proposal-helper.ts`
- `apps/dashboard/src/mission-control-server.ts`
- `skills/trading-validation-evidence/SKILL.md`
- `skills/autonomy-rollout-governor/SKILL.md`
