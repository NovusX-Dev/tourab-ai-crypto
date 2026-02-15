# OKX Demo vs Live

## Summary
OKX demo and live must be separated by credential sets and configuration. Demo mode requests require simulated-trading header behavior.

## References
- OKX demo trading services: https://www.okx.com/docs-v5/en/#overview-demo-trading-services
- OKX API key security: https://www.okx.com/docs-v5/en/#overview-api-key-security

## Examples
- Separate environment namespaces:
  - `OKX_DEMO_*`
  - `OKX_LIVE_*`
- Demo API request header requirement:
  - `x-simulated-trading: 1`

## Gotchas / failure modes
- Missing `x-simulated-trading: 1` on demo requests leads to confusing failures.
- Mixing live/demo key sets causes avoidable auth errors.
- Unbound keys with `trade`/`withdraw` permissions expire after 14 days of inactivity (demo keys are exempt per docs).

## What we decided for Tourab Crypto AI
- Default runtime profile is demo.
- Live profile remains disabled until later milestone gates are complete.
- Config loader must fail closed when mode and credential namespace do not match.
