# Control Plane Incident Runbook

## Trigger
- Incident taxonomy: `control_plane`
- Includes unauthorized actions, invalid transitions, or unexpected control path failures.

Common operator-visible symptoms:
- Top bar source shows `MOCK_FALLBACK` unexpectedly.
- Top bar exchange shows `EXCHANGE_AUTH_FAIL`.
- Demo Readiness card shows one or more `FAIL` checks.
- Control actions return `UNAUTHORIZED`, `INVALID_STATE_TRANSITION`, `APPROVAL_REQUIRED`, `APPROVAL_EXPIRED`, or `APPROVAL_REJECTED`.

## Immediate actions
1. Verify role/identity headers and control permissions.
2. Confirm expected lifecycle state transition rules.
3. Audit related approval and command events.
4. Confirm backend/source trust state in Mission Control:
   - `LIVE_BACKEND` expected for real demo ops.
   - If `MOCK_FALLBACK` or `MOCK_FORCED`, do not use UI state for trading decisions.
5. Verify exchange path:
   - Check `EXCHANGE_DEMO_OK` vs `EXCHANGE_AUTH_FAIL`.
   - Run CLI health check:
     - `npm run okx:demo:health -- --ccy USDT`

## Investigation checklist
1. Backend and websocket availability
   - Ensure mission-control server is running (`npm run mission-control:server`).
   - Ensure UI is using expected API/WS base (`VITE_TOURAB_API_BASE`, `VITE_TOURAB_WS_BASE`).
   - Force strict mode for incident isolation:
     - `VITE_TOURAB_API_FALLBACK=0`
2. Auth/role path
   - Validate `x-tourab-role` and `x-user-id` values.
   - If signed auth enabled, validate token and server secret (`TOURAB_REQUIRE_SIGNED_AUTH=1`, `TOURAB_AUTH_SECRET`).
3. Approval path
   - Check pending approvals and expiry windows in Approvals tab.
   - Verify approval ID used for control execution.
4. Exchange path (demo)
   - Ensure `OKX_TRADING_MODE=demo`.
   - Validate `OKX_DEMO_API_KEY`, `OKX_DEMO_API_SECRET`, `OKX_DEMO_API_PASSPHRASE`.
   - Verify API key IP allowlist matches current public IP.
   - Re-check `okx:demo:health` before retrying operator actions.
5. Readiness card triage
   - Resolve failures top-to-bottom: backend source, ws health, exchange auth, portfolio/orders snapshot, approval window.

## Recovery steps
1. Restore trusted data source (`LIVE_BACKEND`) and healthy websocket stream.
2. Restore exchange auth (`EXCHANGE_DEMO_OK`) and confirm portfolio/orders are updating.
3. Re-run blocked control action with correct role and valid approval flow.
4. Confirm no recurring control-plane alerts for one verification window.

## Recovery criteria
- Control path behavior is deterministic and policy-conformant.
- No repeated control-plane alerts in verification window.
- Mission Control trust/readiness indicators are green for intended operation:
  - `LIVE_BACKEND`
  - `EXCHANGE_DEMO_OK`
  - Demo Readiness card overall `READY`
