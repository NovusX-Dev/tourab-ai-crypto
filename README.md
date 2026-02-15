# Tourab Crypto AI

Tourab Crypto AI is a local, supervised trading operator.

Safety model:
1. Propose: the system can suggest a trading action.
2. Gatekeeper: risk checks and policy checks evaluate the proposal.
3. Human approve: nothing executes until you explicitly approve.
4. Execute: only approved actions can be sent to exchange APIs.

Current milestone status: research and scaffold only. No order execution code is implemented.

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