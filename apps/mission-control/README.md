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
