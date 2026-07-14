# Security for API Keys

## Summary
API key handling must follow least privilege, environment isolation, and strict secret hygiene.

## Non-goals
- general exchange execution logic
- runtime fallback policy
- signer implementation details beyond key-handling hygiene
- UI auth-token UX
- broad security review outside secret handling

## References
- OKX API key security: https://www.okx.com/docs-v5/en/#overview-api-key-security
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- OWASP Logging: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Examples
Verified OKX permission model:
- `Read`: account info/history reads
- `Trade`: place/cancel orders and related write actions
- `Withdraw`: withdrawals

Verified key-lifecycle detail:
- Keys with `trade` or `withdraw` permissions that are not IP-bound expire after 14 days of inactivity.
- Demo trading API keys do not expire under that rule.

Operational patterns:
- Use read-only keys during initial connectivity milestones.
- Keep demo and live keys separate.
- Redact secrets and auth headers in logs.

## Gotchas / failure modes
- Accidentally granting `Withdraw` permission increases risk surface.
- Logging signed headers can leak credentials.
- Storing real secrets in repo files causes permanent leakage.

## What we decided for Tourab Crypto AI
- Never request/paste real secrets in chat.
- Use `.env.example` placeholders only.
- For v0, do not use withdrawal/transfer-capable keys.
- Prefer IP binding for any key with trade capability.
