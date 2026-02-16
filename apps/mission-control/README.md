# Mission Control Dashboard (Phase 1)

Local web dashboard for Tourab Crypto AI operations.

## Run

```powershell
npm run mission-control:dev
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

1. Keep `BotApiClient` contract unchanged.
2. Add a real implementation (for example `LiveBotApiClient`) using:
   - REST: `POST /start`, `POST /pause`, `POST /resume`, `POST /stop`, `POST /cancel-all`
   - WS: `GET /events`
3. Replace `mockBotApiClient` in `src/App.tsx` with the real client.
4. Keep events typed as shared discriminated unions in `packages/shared` during Phase 2.

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
