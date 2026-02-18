# Tourab Crypto AI

Tourab Crypto AI is a local trading operator moving toward bounded autonomy.

Safety model (current default):
1. Propose: the system can suggest a trading action.
2. Gatekeeper: risk checks and policy checks evaluate the proposal.
3. Human approve: nothing executes until you explicitly approve.
4. Execute: only approved actions can be sent to exchange APIs.

Current milestone status: Milestone 4 is production-grade complete; Milestone 3 remains production-grade complete.

Autonomy target:
- Full trade lifecycle automation (entry + deterministic exit + post-trade learning)
- Under strict policy controls, auditability, and immediate kill-switch authority

## Delivery rule: backend + web-app parity
- Any new operator-facing backend capability, control, safety check, state, or error code must be reflected in `apps/mission-control/` UI in the same milestone/phase.
- "Reflected in UI" means: visible state, actionable controls (if applicable), and clear operator feedback (audit/event/toast/log) with no silent backend-only behavior.
- Do not mark a milestone/phase complete unless backend behavior and Mission Control UI behavior are aligned.

## Tooling prerequisites
- PowerShell (Windows PowerShell 5+ or PowerShell 7+)
- Git
- Recommended: `ripgrep` (`rg`) for fast code/file search used in dev workflows

Install `ripgrep` on Windows:

```powershell
winget install BurntSushi.ripgrep.MSVC
```

Verify:

```powershell
rg --version
```

If `rg` is still not found after install, restart the terminal (or sign out/in) so PATH updates are applied.

## Repository layout
- `apps/dashboard/`: Node.js + TypeScript local control plane/dashboard
- `apps/mission-control/`: React + Vite real-time operator web dashboard (Phase 1)
- `apps/research/`: Python research and signal science workspace
- `packages/shared/`: shared schemas and types (proposal, risk, events)
- `skills/`: living operational knowledge in Markdown
- `docs/`: reports, decisions, roadmap
- `tests/`: test workspace

## Local-first constraints
- Runs only when started locally by the operator.
- No unbounded autonomous trading.
- No withdrawals/transfers.
- No leverage/derivatives/margin in v0.

## Current limitation (important)
- Entry execution exists.
- Deterministic automatic exit engine (TP/SL/time-stop/session-flatten) is implemented in demo with stale-exit cancel/reprice and forced-flatten escalation.
- Milestone 5 acceptance still requires accumulating 7 qualifying calendar demo days of evidence.

## Demo execution flow (Milestone 4)
- Execution path is hard-gated: `evaluateTradeProposal` must return `APPROVE` before any OKX call.
- Demo adapter sends private requests with `x-simulated-trading: 1`.
- Use demo-only env vars (`OKX_TRADING_MODE=demo` + `OKX_DEMO_*`).
- Human approval token gate is enabled by default for execution CLI.

Validate proposal/context without execution:

```powershell
npm run gatekeeper:cli -- --proposal-file tests/fixtures/proposal.valid.json --context-file tests/fixtures/context.valid.json
```

Check signed OKX demo connectivity and private balance:

```powershell
npm run okx:demo:health -- --ccy USDT
```

Auto-build a valid proposal from live ticker + instrument constraints (+ price bands when available):

```powershell
npm run okx:demo:build-proposal -- --symbol BTC-USDT --side buy --out-file tests/fixtures/proposal.auto.json
```

Optional: refresh a context file with live `instrument` + `market` values at the same time:

```powershell
npm run okx:demo:build-proposal -- --symbol BTC-USDT --side buy --out-file tests/fixtures/proposal.auto.json --context-file tests/fixtures/context.valid.json --out-context-file tests/fixtures/context.auto.json
```

Execute via OKX demo adapter (still gatekeeper-first):

```powershell
npm run okx:demo:execute -- --proposal-file tests/fixtures/proposal.valid.json --context-file tests/fixtures/context.valid.json --approval-token <your_token>
```

Human-approval gate is mandatory for executable actions:
- Set `TOURAB_HUMAN_APPROVAL_ENABLED=1` and `TOURAB_HUMAN_APPROVAL_TOKEN=<token>`.
- Expiry must be provided via `TOURAB_HUMAN_APPROVAL_EXPIRES_AT=<ISO timestamp>`.

## Order Lifecycle + Reconciliation (Milestone 4)
- Every successful submission appends to local ledger JSONL (`TOURAB_ORDER_LEDGER_PATH`, default `logs/order-intents.jsonl`).
- Snapshot open orders + recent fills:

```powershell
npm run okx:demo:orders -- --symbol BTC-USDT --out-file logs/okx-snapshot.json
```

- Reconcile local ledger against exchange state:

```powershell
npm run okx:demo:reconcile -- --symbol BTC-USDT --out-file logs/reconcile-report.json
```

- Cancel one order (token-gated):

```powershell
npm run okx:demo:cancel -- --symbol BTC-USDT --ord-id <ordId> --approval-token <your_token>
```

- Cancel all open orders for a symbol (token-gated):

```powershell
npm run okx:demo:cancel -- --symbol BTC-USDT --all --approval-token <your_token>
```

## Strategy Automation (Milestone 4, safe start)
- Start with proposal automation only (`--mode propose`).
- `--mode execute` is available, but still guarded by drift checks, same-side open-order blocking, gatekeeper, and human token.

## Autonomy Program (next)

The project now targets staged autonomy:

1. Milestone 5: autonomous exit engine + closed-trade accounting (demo first).
2. Milestone 6: bounded auto-entry + strategy promotion pipeline (shadow/canary/rollback).
3. Milestone 7: governed adaptive learning from closed trades.
4. Milestone 8: live small-notional trading with strict limits + kill-switch.
5. Milestone 9: research/backtesting integration loop in production workflow.

Design principles:
- No model or strategy change goes directly to production.
- Every trade and decision path is attributable to policy + strategy version.
- Kill-switch and circuit-breaker always override autonomous flow.
- Performance claims are based on net results (fees/slippage included), not gross PnL.

Milestone 5 evidence collection (intermittent-friendly):

```powershell
npm run soak:m5 -- --base-url http://localhost:7071 --duration-sec 900 --drain-sec 180 --poll-ms 2000 --max-hold-sec 40 --tp-r 0.5 --exit-offset-bps 1
npm run evidence:m5 -- --base-url http://localhost:7071
```

- The rollup reads accumulated soak artifacts and reports qualifying day count (`qualifiedDays/7`) and current streak.

Run one automated proposal cycle:

```powershell
npm run okx:demo:auto-loop -- --mode propose --symbol BTC-USDT --side buy --max-cycles 1 --context-file tests/fixtures/context.valid.json
```

Run periodic proposal cycles:

```powershell
npm run okx:demo:auto-loop -- --mode propose --symbol BTC-USDT --side buy --interval-sec 300 --max-cycles 12 --context-file tests/fixtures/context.valid.json
```

## Project indexing
- Current index file: `docs/project-index.md`
- Generator script: `scripts/update-project-index.ps1`
- Hook installer: `scripts/install-index-hooks.ps1`
- Git hooks used: `.githooks/pre-commit`, `.githooks/post-merge`, `.githooks/post-checkout`

Run this once per clone to keep indexing automatic:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-index-hooks.ps1
```

Manual index refresh:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/update-project-index.ps1
```

## Mission Control Web App (Phase 1)
Run locally (backend + UI together):

```powershell
npm run mission-control:start
```

You can still run them separately when debugging:

```powershell
npm run mission-control:dev
npm run mission-control:server
```

Build:

```powershell
npm run mission-control:build
```

Run unit tests:

```powershell
npm run mission-control:test
```

Phase 2 defaults:
- API base: `http://localhost:7071`
- WS base: `ws://localhost:7071`
- Role header for controls: `x-tourab-role` (`read_only`, `operator`, `admin`)
- User identity header (Phase 3): `x-user-id` (attributed approvals/audit)
- Event store SQLite: `logs/mission-events.sqlite` (override via `TOURAB_EVENT_STORE_PATH`)
- Approval endpoints (Phase 3 start):
  - `GET /approvals?status=pending|approved|rejected|expired`
  - `POST /approvals` with body `{ "action": "stop|cancel_all|emergency_stop", "reason": "..." }`
  - `POST /approvals/:id/approve`
  - `POST /approvals/:id/reject`
  - Expiry: approvals auto-expire based on `TOURAB_APPROVAL_TTL_MS` (default `300000`)

Mission Control auth modes:
- Header mode (legacy/default): uses `x-tourab-role` + `x-user-id`.
- Signed mode (recommended for serious demo):
  - set `TOURAB_REQUIRE_SIGNED_AUTH=1`
  - set `TOURAB_AUTH_SECRET=<shared_secret>`
  - UI sends bearer token via top-bar `auth token` field (stored in browser local storage)
  - local helper endpoint: `POST /auth/dev-token` with `{ "userId": "...", "role": "operator|admin|read_only", "ttlSec": 3600 }`

Mission Control operator readiness + trust signals:
- Top bar source badge:
  - `LIVE_BACKEND`: UI is reading from live backend endpoints.
  - `MOCK_FALLBACK`: UI fell back to mock data because backend/ws path is degraded.
  - `MOCK_FORCED`: UI started in forced mock mode (`VITE_TOURAB_USE_MOCK=1`).
- Top bar exchange badge:
  - `EXCHANGE_DEMO_OK`: backend private OKX demo health check is passing.
  - `EXCHANGE_AUTH_FAIL`: backend cannot authenticate to OKX demo (check credentials/allowlist/passphrase).
- Top bar now also shows:
  - `EQ <value> USD` from latest portfolio snapshot.
  - `OPEN ORDERS <count>` from latest open orders snapshot.
- Demo Readiness card checks:
  - backend data source
  - websocket stream health
  - OKX demo auth
  - portfolio snapshot freshness
  - open orders snapshot freshness
  - approval window validity
  - autonomy guardrail status
- Milestone 5 evidence signals:
  - backend endpoint: `GET /milestone5/evidence`
  - sidebar card: daily pass/fail, blockers, streak, and `qualifiedDays/7`

Mission Control portfolio/orders visibility:
- Right panel tabs:
  - `Portfolio`: total equity + per-asset balances (`eq`, `availBal`, `cashBal`) and last update timestamp.
  - `Orders`: open orders list (`instId`, `side`, `state`, `px`, `sz`, `accFillSz`, `ordId`, update time).
- Data source:
  - Snapshot payload now includes `exchange`, `portfolio`, and `openOrders`.
  - Backend polls OKX demo private APIs on interval (default `TOURAB_EXCHANGE_HEALTH_INTERVAL_MS=15000`).

Milestone 4 alert workflow baseline:
- Alert store JSONL: `logs/mission-alerts.jsonl` (override via `TOURAB_ALERT_STORE_PATH`)
- Ops store SQLite (durable audit + incidents): `logs/mission-ops.sqlite` (override via `TOURAB_OPS_STORE_PATH`)
- Alert APIs:
  - `GET /alerts?status=open|acknowledged|resolved`
  - `POST /alerts/:id/ack`
  - `POST /alerts/:id/resolve`
- Incident APIs:
  - `GET /incidents?status=open|acknowledged|resolved`
  - `POST /incidents/:id/ack`
  - `POST /incidents/:id/resolve`
  - `GET /incidents/export`
- Mission Control UI includes an `Alerts` tab for operator acknowledge/resolve actions.
  - and an `Incidents` tab with runbook-linked incident lifecycle actions.

Milestone 4 circuit-breaker + freshness guards:
- Reconciliation endpoint for operator simulation/testing:
  - `POST /reconciliation` body `{ "positions"|"pnl"|"orders": "ok|drift|error|in_progress" }`
- Drift/error can auto-`pause` (default) or auto-`stop` the bot via `TOURAB_DRIFT_CIRCUIT_ACTION=pause|stop`.
- Drift trigger calibration:
  - `TOURAB_DRIFT_CIRCUIT_MIN_CONSECUTIVE` (default `2`)
  - `TOURAB_DRIFT_CIRCUIT_MAX_GRACE_MS` (default `90000`)
- Circuit-breaker events are emitted into audit/events and surfaced in Mission Control alerts/toasts.
- Execution freshness guard before order submit (market/account/orders age):
  - `TOURAB_FRESHNESS_GUARD_ENABLED=1` (default)
  - `TOURAB_MAX_MARKET_AGE_MS` (default `15000`)
  - `TOURAB_MAX_ACCOUNT_AGE_MS` (default `60000`)
  - `TOURAB_MAX_ORDERS_AGE_MS` (default `60000`)

Worker coupling baseline:
- `start` / `resume` controls start real background worker cycles.
- `pause` halts worker cycles.
- `stop` / `emergency-stop` halts and resets worker progress.
- Worker calibration envs:
  - `TOURAB_WORKER_SYMBOLS` (default `BTC-USDT,ETH-USDT,SOL-USDT`)
  - `TOURAB_WORKER_INTERVAL_MS` (default `7500`)
  - `TOURAB_WORKER_MAX_RISK_USD` (default `0.2`)
  - `TOURAB_WORKER_MAX_NOTIONAL_USD` (default `10`)
