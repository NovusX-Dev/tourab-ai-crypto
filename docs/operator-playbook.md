# Operator Playbook

This runbook covers a full operator session from startup to first closed trade in Mission Control.

## 0) Preconditions
1. Start app: `npm run mission-control:start`
2. Open UI: `http://localhost:5173`
3. Top badges should show:
- `LIVE_BACKEND`
- `EXCHANGE_DEMO_OK`
- `Live`

If not, stop here and fix backend/exchange config first.

## 1) Set Operator Context
1. Top bar role: set to `Operator` (or `Admin`).
2. Set `user id` (example: `operator-1`).
3. If auth is enabled, paste `auth token`.
4. Left sidebar keep `Primary Bot` selected unless you want symbol-specific view.

## 2) Readiness Gate Check
1. Left `Demo Readiness` card:
- Backend data source: pass
- WebSocket stream: pass
- OKX demo auth: pass
- Portfolio snapshot: pass
- Open orders snapshot: pass
- Approval window: pass
- Autonomy guardrails: pass
2. Left `M5 Evidence` card:
- Check today status, streak, closure %, errors.

If readiness is not green, do not start trading session.

## 3) Configure (or Verify) Automation Settings
Go to right tab `Autonomy`.

1. `Auto-Exit Config (M5)`:
- `Enabled = On`
- verify `Max Hold`, `TP R-Multiple`, `Exit Offset`
- click `Save Auto-Exit`

2. `Entry Autonomy (M6)`:
- `Approval Mode`:
  - `manual` = safest/most controlled
  - `policy_auto` = constrained auto-entry mode
- verify allowed symbols and risk caps
- click `Save Entry Policy`

3. Click `Refresh Trades` to ensure panel is current.

## 4) Start Runtime
Use `Control Deck`:
1. Click `Start` (if state is stopped).
2. Bot status should move to `RUNNING` (or `PAUSED`/`RESUME` flow if already active).
3. Event stream should show new system/order events.

## 5) Handle Approvals (If Required)
Go to `Approvals` tab:
1. Click `Refresh`.
2. For pending items:
- click `Approve & Execute`
- for emergency-stop actions, note multi-approval requirements
3. Watch queued demo intents section.

If approval is missing/expired/rejected, action will not execute.

## 6) Watch Live Execution
Use these tabs in parallel:

1. `Event Stream`
- Filter by symbol/severity/type
- Look for `OrderSubmitted`, `OrderCancelled`, reconciliation/managed-trade events

2. `Orders`
- Watch open orders (`Sz`, `accFillSz`, state)

3. `Autonomy -> Managed Trades`
- Open trades show entry/exit progress, stop/take-profit, age/max hold.

## 7) Confirm First Closed Trade
In `Autonomy`:
1. Wait until a trade moves from open list to `Closed`.
2. Read:
- `Realized $...`
- `fee $...`
- `exitReason`
- `closedAt`

In `Portfolio -> Trade PnL`:
1. Confirm row appears with:
- `Qty @ Price`
- `Notional $...`
- `Realized $...`
- `Net $... (fee $...)`

## 8) Determine Profitability and Size Quickly
For each trade:

1. Profitability:
- Positive `Realized` / `Net` = profitable
- Negative = loss

2. Trade size:
- Qty: `requestedQty`, `entryFilledQty`, `exitFilledQty`
- Dollar size: `Notional` in Portfolio panel

3. Session performance:
- `Portfolio` KPIs:
  - Session Delta
  - Realized Today
  - Unrealized
  - Win Rate

## 9) Safety Controls During Run
Use `Control Deck`:
1. `Pause` to halt new cycle actions
2. `Cancel-all` to cancel open orders
3. `Stop` for normal stop
4. `Emergency Stop` for immediate hard stop path

Use `Alerts`/`Incidents`:
1. `Acknowledge` then `Resolve` after verified recovery.
2. Use `Open M7 Trend` for learning-related alert triage.

## 10) End-of-Session Checklist
1. Confirm bot state (`Paused` or `Stopped`) as intended.
2. `Orders` tab: no unintended open orders.
3. `Autonomy` managed trades: no stuck error states.
4. `Portfolio` capture session PnL.
5. `Incidents/Alerts`: acknowledge/resolve outstanding items.
6. Optionally export M7 incidents JSON for records.
