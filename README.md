# Tourab Crypto AI

Tourab Crypto AI is a local, supervised trading operator.

Safety model:
1. Propose: the system can suggest a trading action.
2. Gatekeeper: risk checks and policy checks evaluate the proposal.
3. Human approve: nothing executes until you explicitly approve.
4. Execute: only approved actions can be sent to exchange APIs.

Current milestone status: gatekeeper + demo adapter baseline implemented.

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

## Demo execution flow (Milestone 2)
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

Enable/disable human-approval gate quickly:
- Enable (default): set `TOURAB_HUMAN_APPROVAL_ENABLED=1` and `TOURAB_HUMAN_APPROVAL_TOKEN=<token>`.
- Disable: set `TOURAB_HUMAN_APPROVAL_ENABLED=0`.

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
