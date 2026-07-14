# Pause-and-Research Runbook

Last updated: 2026-02-26

## Purpose
Define the operational steps when the bot hits loss or drawdown thresholds and must pause, research, and resume within a maximum 3-hour window.

## Trigger Conditions
Any of the following triggers a pause:
- Loss streak >= 3 trades.
- Daily loss cap reached.
- Learning alert breach (expectancy, drawdown, slippage, control-violation rate).
- Manual operator pause.

## Immediate Actions (T+0 to T+5 minutes)
1. Pause runtime (`POST /pause`).
2. Confirm no new approvals are executed.
3. Check open orders and managed trades.
4. If unsafe or unresponsive, invoke `emergency_stop`.

## Snapshot and Research (T+5 to T+120 minutes)
1. Capture learning snapshot (M7):
   - `npm run snapshot:m7 -- --base-url http://localhost:7071 --lookback-days 30`
2. Run retrain pipeline:
   - `npm run retrain:m7 -- --dataset-dir <latest-dataset-dir>`
3. Run gate pipeline:
   - `npm run gate:m7 -- --retrain-dir <latest-retrain-dir> --min-trades 30`
4. If gate fails, stop here and keep champion strategy.

## Resume Decision (T+120 to T+180 minutes)
1. If retrain and gate pass:
   - Keep in `shadow_eval` for next session.
   - Do not promote to limited production during the same pause window.
2. Auto-resume triggers at the 3-hour mark.
3. Auto-resume returns to `policy_auto` approval mode.
4. Limit next session to BTC-only if recent loss was on ETH or SOL.

## Safety Constraints
- Maximum pause duration: 180 minutes.
- Auto-resume is enabled (no manual confirmation required).
- Any open incidents should be acknowledged as soon as possible after resume.

## Evidence to Capture
- Pause time and reason.
- Dataset/retrain/gate artifacts.
- Decision outcome (resume manual, remain paused, or stop).

## Rollback Policy
If losses continue after resume:
- Force `approval_mode = manual`.
- Reduce max per-order notional by 50%.
- Require 10 closed trades with positive expectancy before re-enabling `policy_auto`.
