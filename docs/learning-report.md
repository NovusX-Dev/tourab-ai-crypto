# Learning and Tooling Report

## Scope for this milestone
This report documents what we must verify before writing any execution code, plus tool recommendations for the Node dashboard and Python research stack.

## Verification status
- Verified on 2026-02-15.
- Source-by-source access log: docs/okx/source-verification.md.
- Note: OKX docs are now validated via shell-based fetch and local parsing (see docs/okx/source-verification.md).

## What must be confirmed from OKX docs before any execution code
1. Exact signing algorithm details and timestamp formatting requirements for every private endpoint group.
2. Mandatory headers for demo vs live calls, including simulated trading behavior.
3. Endpoint-specific rate limits, especially order placement/amend/cancel and account endpoints.
4. Error code taxonomy and retry policy boundaries (retryable vs non-retryable).
5. Order lifecycle semantics:
   - status transitions
   - partial fill handling
   - cancel/replace behavior
   - finality conditions
6. WebSocket auth flow and sequence/recovery expectations.
7. Reconciliation pattern requirements (authoritative REST snapshots + stream merge).
8. Precision/lot-size/min-notional constraints for symbols we will allow.
9. API key permission model and security controls (IP binding, read/trade scopes).

Primary references:
- https://www.okx.com/docs-v5/en/
- https://www.okx.com/docs-v5/en/#overview-rest-authentication
- https://www.okx.com/docs-v5/en/#overview-demo-trading-services
- https://www.okx.com/docs-v5/en/#overview-rate-limits
- https://www.okx.com/docs-v5/en/#error-code
- https://www.okx.com/docs-v5/en/#overview-api-key-security

## Recommended libraries and tools

### OKX connectivity
- Recommendation now: direct OKX REST/WebSocket client (custom wrapper).
- Why: strict control over signing, headers, error normalization, and rate-limit logic from day one.
- Alternative: CCXT for portability and faster multi-exchange support.
- Decision: begin direct; revisit CCXT adapter after stable schema and safety workflows.

References:
- OKX docs: https://www.okx.com/docs-v5/en/
- CCXT manual: https://docs.ccxt.com/

### Local dashboard
- Candidate A: Next.js (full-stack React framework, built-in routing/SSR).
- Candidate B: Express + React/Vite (lighter control-plane style).
- Event channel:
  - SSE for one-way stream updates (logs, risk state, proposal events).
  - WebSocket only if we need high-frequency bi-directional control.
- Decision now: Node + TypeScript control plane with SSE-first event streaming.

References:
- Next.js docs: https://nextjs.org/docs
- MDN SSE: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- MDN WebSockets: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

### Research pipeline
- Data and analysis: pandas.
- Backtest engine candidates: backtesting.py, vectorbt.
- Local analytical storage: DuckDB (+ optional Parquet).
- Reproducibility: pinned dependencies, deterministic configs, logged dataset/time windows.
- Decision now: Python research workspace with pandas + DuckDB baseline; choose backtest engine after first signal experiments.

References:
- pandas: https://pandas.pydata.org/docs/
- backtesting.py: https://kernc.github.io/backtesting.py/
- vectorbt: https://vectorbt.dev/
- DuckDB: https://duckdb.org/docs/

## Key risks and mitigations

### Security
- Risk: key leakage in code/logs.
- Mitigations: `.env` only, gitignore, secret redaction, least-privilege keys, separate demo/live keys.
- References:
  - https://www.okx.com/docs-v5/en/#overview-api-key-security
  - https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

### Rate limiting
- Risk: API throttling and unstable behavior under retries.
- Mitigations: endpoint-scoped limiter, retry only transient failures, exponential backoff + jitter.
- References:
  - https://www.okx.com/docs-v5/en/#overview-rate-limits
  - https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/

### Clock drift
- Risk: auth signature failures and policy timing mismatch.
- Mitigations: NTP-synced host, drift checks, reject when drift exceeds threshold.
- Reference:
  - https://www.nist.gov/programs-projects/authenticated-ntp-service

### Partial fills and reconciliation
- Risk: local position/order state diverges from exchange truth.
- Mitigations: combine streaming updates with periodic REST snapshots and deterministic merge/reconcile job.
- Reference:
  - https://www.okx.com/docs-v5/en/

### Idempotency
- Risk: duplicated side effects during retries/reconnects.
- Mitigations: proposal id + idempotency key + hash checks at gatekeeper and execution boundaries.
- Reference:
  - https://docs.stripe.com/api/idempotent_requests

### Logging integrity
- Risk: inability to prove what happened during incidents.
- Mitigations: append-only structured logs, correlation IDs, payload hashes, replay tooling.
- References:
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - https://opentelemetry.io/docs/

## Current milestone conclusion
Research and scaffold are complete. No trading execution logic has been written.


