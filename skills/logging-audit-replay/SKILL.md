# Logging, Audit, Replay

## Summary
Trading operators need immutable, structured event logs that support audit, incident response, and deterministic replay of decisions. Every proposal, risk decision, approval action, and exchange response should be captured.

## Non-goals
- runtime risk-policy design
- strategy validation or profitability judgment
- UI presentation of logs or timelines
- exchange-specific auth or retry policy
- replacing primary business logic with logging side effects

## References
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- CNCF OpenTelemetry docs: https://opentelemetry.io/docs/

## Examples
- Event envelope fields:
  - `event_id`, `timestamp_utc`, `component`, `event_type`
  - `correlation_id`, `proposal_id`, `approval_id`
  - `payload_hash`, `redaction_version`
- Replay mode reads append-only events to reconstruct state transitions.

## Gotchas / failure modes
- Unstructured text logs are hard to reconcile after partial fills.
- Missing correlation IDs prevents end-to-end tracing.
- Mutable logs weaken audit trust.

## What we decided for Tourab Crypto AI
- Use JSON structured logs only.
- Keep append-only local audit storage.
- Implement replay tooling before enabling live trading milestones.
