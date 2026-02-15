# OKX Overview

## Summary
OKX API v5 provides REST and WebSocket interfaces for market data, account data, and order workflows. Tourab Crypto AI starts read-only and demo-first.

## References
- OKX docs home: https://www.okx.com/docs-v5/en/
- Trading account section: https://www.okx.com/docs-v5/en/#trading-account
- Place order endpoint: https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order

## Examples
- Read-only milestone endpoints:
  - public ticker endpoint(s)
  - private balance endpoint(s)
- Future order lifecycle reference states observed in docs:
  - `live`
  - `partially_filled`
  - `filled`
  - `canceled`
- Reconciliation pattern:
  - use REST snapshots as source of truth
  - merge stream updates
  - force resync after disconnect/gap detection

## Gotchas / failure modes
- Exchange errors may be in response payload even when HTTP status is 200.
- Missing reconciliation drifts local order/position state.
- Partial fills require cumulative quantity and residual tracking.

## What we decided for Tourab Crypto AI
- Start with read-only OKX connectivity and dashboard visibility.
- Keep execution logic disabled until gatekeeper and approval workflow are complete.
- No withdrawals/transfers and no leverage/derivatives/margin in v0.
