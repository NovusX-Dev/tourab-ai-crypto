# Tourab Crypto AI

Tourab Crypto AI is a local, supervised trading operator.

Safety model:
1. Propose: the system can suggest a trading action.
2. Gatekeeper: risk checks and policy checks evaluate the proposal.
3. Human approve: nothing executes until you explicitly approve.
4. Execute: only approved actions can be sent to exchange APIs.

Current milestone status: Milestone 3 is production-grade complete (gatekeeper + human approval + fail-closed invariants).

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
- No autonomous trading in early milestones.
- No withdrawals/transfers.
- No leverage/derivatives/margin in v0.

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

## Demo Readiness Gate
- Checklist: `docs/demo-readiness-checklist.md`

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
- Event store JSONL: `logs/mission-events.jsonl` (override via `TOURAB_EVENT_STORE_PATH`)
- Approval endpoints (Phase 3 start):
  - `GET /approvals?status=pending|approved|rejected|expired`
  - `POST /approvals` with body `{ "action": "stop|cancel_all|emergency_stop", "reason": "..." }`
  - `POST /approvals/:id/approve`
  - `POST /approvals/:id/reject`
  - Expiry: approvals auto-expire based on `TOURAB_APPROVAL_TTL_MS` (default `300000`)
