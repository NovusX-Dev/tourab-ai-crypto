# OKX Rate Limits and Errors

## Summary
OKX uses endpoint-specific rate limits and returns both HTTP-level and business-level error semantics. Clients must normalize both.

## Non-goals
- auth-signature construction
- demo/live credential separation
- strategy-quality judgment
- operator UI behavior
- broad architecture ownership outside exchange error handling

## References
- OKX rate limits: https://www.okx.com/docs-v5/en/#overview-rate-limits
- OKX error code index: https://www.okx.com/docs-v5/en/#error-code
- OKX place order endpoint: https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order
- AWS retry/backoff guidance: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/

## Examples
Verified OKX details:
- Place order endpoint: `POST /api/v5/trade/order`
- Place order rate limit: `60 requests per 2 seconds`
- Place order rate limit rule (except options): `User ID + Instrument ID`
- Documented limit reject code: `50011` (rate limit reached)
- Error semantics can appear as:
  - `code`/`msg`
  - `sCode`/`sMsg` (for some batched/embedded results)

Recommended client behavior:
- Normalize `{ http_status, code_or_sCode, message, retryable }`.
- Retry transient cases only (network, 429/50011, selected 5xx) with jittered backoff.

## Gotchas / failure modes
- Assuming HTTP 200 means success can miss `code`/`sCode` failures.
- Global retries without endpoint budgets amplify throttling.
- Blind retries on non-idempotent operations can duplicate side effects.

## What we decided for Tourab Crypto AI
- Implement endpoint-scoped limiter before any execution code.
- Treat `50011` and transport-level throttling as retryable with bounded backoff.
- Log both HTTP and exchange error fields for audit and debugging.
