# OKX Auth Signing

## Summary
Private OKX REST endpoints require signature generation from `timestamp + method + requestPath + body`, signed with HMAC-SHA256 and Base64 encoded.

## Non-goals
- demo versus live environment selection policy
- retry/backoff semantics
- order-strategy economics
- runtime rollout decisions
- general secret-storage policy beyond what signing needs

## References
- OKX REST authentication: https://www.okx.com/docs-v5/en/#overview-rest-authentication
- OKX docs root: https://www.okx.com/docs-v5/en/

## Examples
```text
prehash = timestamp + method + requestPath + body
sign = Base64(HMAC_SHA256(prehash, SecretKey))
```

Required private request headers:
- `OK-ACCESS-KEY`
- `OK-ACCESS-SIGN`
- `OK-ACCESS-TIMESTAMP` (UTC millisecond ISO format, e.g. `2020-12-08T09:08:57.715Z`)
- `OK-ACCESS-PASSPHRASE`
- `Content-Type: application/json`

Verified implementation notes from docs:
- `method` must be uppercase (`GET`, `POST`).
- `requestPath` is endpoint path, e.g. `/api/v5/account/balance`.
- `body` is empty string when no request body is present.

## Gotchas / failure modes
- Signing host/domain instead of `requestPath` breaks signatures.
- Timestamp drift or wrong format causes auth failures.
- Request body mismatch between signed string and sent payload invalidates signature.

## What we decided for Tourab Crypto AI
- Keep a single signer utility used by all private OKX requests.
- Add signer unit tests with fixed vectors (timestamp/method/path/body/signature).
- Block request dispatch when local clock drift exceeds policy threshold.
