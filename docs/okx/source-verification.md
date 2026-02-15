# Source Verification Log

Date: 2026-02-15
Scope: verification of sources cited in Milestone 1 docs and skills.

## Access status legend
- Direct (shell): page fetched in this session with terminal HTTP tooling.
- Direct (tool): page opened directly in this session by tool fetch.

## OKX verification method (standard from now on)
1. Fetch docs HTML:
   - `Invoke-WebRequest -UseBasicParsing 'https://www.okx.com/docs-v5/en/' -OutFile docs/okx/okx-docs-v5-en.html`
2. Verify details with local search:
   - `Select-String -Path docs/okx/okx-docs-v5-en.html -Pattern '<pattern>'`
3. Record confirmed details in `skills/` and this log.

## Verified sources
- Direct (shell): https://www.okx.com/docs-v5/en/
- Direct (shell): https://www.okx.com/docs-v5/en/#overview-rest-authentication
- Direct (shell): https://www.okx.com/docs-v5/en/#overview-demo-trading-services
- Direct (shell): https://www.okx.com/docs-v5/en/#overview-rate-limits
- Direct (shell): https://www.okx.com/docs-v5/en/#error-code
- Direct (shell): https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order
- Direct (shell): https://www.okx.com/docs-v5/en/#overview-api-key-security
- Direct (tool): https://docs.ccxt.com/
- Direct (tool): https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Direct (tool): https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
- Direct (tool): https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Direct (tool): https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Direct (tool): https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- Direct (tool): https://docs.stripe.com/api/idempotent_requests
- Direct (tool): https://opentelemetry.io/docs/
- Direct (tool): https://nextjs.org/docs
- Direct (tool): https://pandas.pydata.org/docs/
- Direct (tool): https://kernc.github.io/backtesting.py/
- Direct (tool): https://vectorbt.dev/
- Direct (tool): https://duckdb.org/docs/stable/
- Direct (tool): https://www.nist.gov/programs-projects/authenticated-ntp-service

## Confirmed OKX facts (sample)
- Private REST headers include `OK-ACCESS-KEY`, `OK-ACCESS-SIGN`, `OK-ACCESS-TIMESTAMP`, `OK-ACCESS-PASSPHRASE`.
- Signature formula uses `timestamp + method + requestPath + body`, HMAC-SHA256, Base64.
- Demo requests require `x-simulated-trading: 1`.
- Place order endpoint: `POST /api/v5/trade/order` with documented rate limit `60 requests per 2 seconds`.
- Rate-limit reject code includes `50011`.
- Error model can use `code/msg` or `sCode/sMsg`.
- Documented order states include `live`, `partially_filled`, `filled`, `canceled`.
- Unbound keys with `trade`/`withdraw` permissions expire after 14 days inactivity (demo key exception documented).

