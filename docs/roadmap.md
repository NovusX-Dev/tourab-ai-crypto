# Roadmap

## Milestone 1: read-only OKX connectivity (fetch ticker + balances) + dashboard displays it
- Build signed private-read client and public market-read client.
- Add dashboard views for ticker and balances.
- No trading endpoints.
- Add logging for request/response metadata (redacted).

## Milestone 2: proposal schema + validator (no trading)
- Define proposal JSON schema in `packages/shared/`.
- Add validation library and schema tests.
- Add proposal lifecycle states in dashboard.

## Milestone 3: risk gatekeeper (still no trading)
- Implement policy engine for risk limits and mode checks.
- Require manual approval token before any executable action state.
- Add deny reasons and audit events.

## Milestone 4: demo trading only (manual approval) + full audit log
- Enable demo-only execution path behind gatekeeper.
- Add idempotency and reconciliation jobs.
- Add append-only audit and replay tooling.

## Milestone 5: live small $50 (manual approval) + strict limits + kill switch
- Enable live mode only behind explicit config + startup warnings.
- Enforce max notional, instrument allowlist, daily cap, and immediate kill switch.
- Require clean reconciliation and audit checks before each session.

## Milestone 6: research/backtesting integration loop (Python generates signals -> Node proposes -> gatekeeper -> approve)
- Define Node/Python protocol for proposal candidates.
- Add experiment tracking metadata and promotion criteria.
- Keep human approval mandatory for all executions.