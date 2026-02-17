# Mission Control Dashboard (Phase 1)

Local web dashboard for Tourab Crypto AI operations.

## Run

```powershell
npm run mission-control:dev
```

Start backend in another terminal:

```powershell
npm run mission-control:server
```

## Build

```powershell
npm run mission-control:build
```

## Test

```powershell
npm run mission-control:test
```

## Architecture

- `src/api/BotApiClient.ts`: typed UI contract for data + controls.
- `src/api/MockBotApiClient.ts`: mock implementation for live demo and UI development.
- `src/state/useDashboardData.ts`: dashboard state orchestration (snapshot + stream updates + filters).
- `src/components/*`: focused UI panels.
- `src/theme.ts` + `src/styles.css`: theme tokens and two built-in themes.

## Mock to Real API switch

Phase 2 includes `LiveBotApiClient` already.

Env flags:
- `VITE_TOURAB_API_BASE` (default: `http://localhost:7071`)
- `VITE_TOURAB_WS_BASE` (default: `ws://localhost:7071`)
- `VITE_TOURAB_USE_MOCK=1` forces mock mode
- `VITE_TOURAB_API_FALLBACK=0` disables fallback to mock when backend is unavailable
- Top bar includes `auth token` input for signed-auth mode (`Bearer` token value only).
- Top bar now exposes source badge:
  - `LIVE_BACKEND`: live backend data path
  - `MOCK_FALLBACK`: fallback-to-mock is active due to backend/ws degradation
  - `MOCK_FORCED`: UI started in forced mock mode
- Top bar now exposes exchange badge:
  - `EXCHANGE_DEMO_OK`: OKX demo private auth health check passing
  - `EXCHANGE_AUTH_FAIL`: exchange auth/config check failing (see Demo Readiness card detail)
- Backend polling cadence for exchange/private snapshots:
  - `TOURAB_EXCHANGE_HEALTH_INTERVAL_MS` (default `15000`)

## Expected backend contract (Phase 2)

- `getSnapshot()` equivalent endpoint to load initial state:
  - bot state
  - recent events
  - risk status
  - reconciliation status
  - audit items
  - logs
- Real-time event stream delivering typed events used in `src/types.ts`.
- Role-aware control command responses with clear error codes for invalid transitions/authorization failures.
- Snapshot now includes:
  - `exchange`: `{ connected, mode, source, lastHealthCheckAt, lastError? }`
  - `portfolio`: `{ totalEq, balances[], lastUpdatedAt, lastError? }`
  - `openOrders`: `{ orders[], lastUpdatedAt, lastError? }`

## Operator usage (current UI)

- Right panel tabs now include:
  - `Portfolio`: asset balances and total equity.
  - `Orders`: currently open orders in demo account.
- Top bar now includes:
  - data source trust badge (`LIVE_BACKEND` / `MOCK_FALLBACK` / `MOCK_FORCED`)
  - exchange auth badge (`EXCHANGE_DEMO_OK` / `EXCHANGE_AUTH_FAIL`)
  - compact equity and open-order counters.
- Demo Readiness card:
  - central pass/fail view for backend source, WS health, demo auth, portfolio/orders snapshot status, and approval expiry state.

## Phase 3 start: approval workflow

- Critical controls may return `APPROVAL_REQUIRED`.
- Emergency stop requires two distinct user approvals.
- Use approvals API:
  - `GET /approvals?status=pending`
  - `POST /approvals`
  - `POST /approvals/:id/approve`
- The dashboard includes an `Approvals` tab to approve and execute pending critical actions.
- Set current operator identity in the top bar `user id` field; this is sent as `x-user-id`.
- Approval states are explicit in UI: `pending`, `approved`, `rejected`, `expired`.
- Pending approvals show a live expiry countdown; approval list auto-refreshes every 5 seconds.
- Audit timeline now records approval lifecycle entries (created/approved/rejected/expired) with actor IDs.

## Milestone 4 start: incident/alert workflow baseline

- Alerts are persisted by backend in JSONL (`TOURAB_ALERT_STORE_PATH`, default `logs/mission-alerts.jsonl`).
- Durable ops data (audit + incidents) is persisted in SQLite (`TOURAB_OPS_STORE_PATH`, default `logs/mission-ops.sqlite`).
- Alert APIs:
  - `GET /alerts?status=open|acknowledged|resolved`
  - `POST /alerts/:id/ack`
  - `POST /alerts/:id/resolve`
- UI includes an `Alerts` tab with operator actions to acknowledge/resolve active alerts.
- Incident APIs:
  - `GET /incidents?status=open|acknowledged|resolved`
  - `POST /incidents/:id/ack`
  - `POST /incidents/:id/resolve`
  - `GET /incidents/export`
- UI includes an `Incidents` tab for runbook-linked incident lifecycle management.
- UI includes an `Ops` tab for operator-facing metrics (control failures, WS health, rejects, drift count, heartbeat gaps, reconcile runs).

## Milestone 4 slice: drift circuit breaker + reconciliation control

- Reconciliation card includes simulation controls (`Mark OK`, `Sim Drift`, `Sim Error`) for operator testing.
- Backend endpoint: `POST /reconciliation` to update reconciliation status.
- When reconciliation drifts/errors while bot is running, backend auto-pauses/stops by circuit-breaker policy and emits alert/audit/events.
- Drift trigger calibration env vars:
  - `TOURAB_DRIFT_CIRCUIT_MIN_CONSECUTIVE` (default `2`)
  - `TOURAB_DRIFT_CIRCUIT_MAX_GRACE_MS` (default `90000`)
