# OKX Overview

## Summary
Router skill for the OKX integration cluster.

Use this skill first when a task touches OKX and you need to decide which specialized OKX skill to use next, or when you need the shared invariants that apply across all OKX work.

This file should stay compact. It is not the place for full auth, demo/live, or retry details.

## Trigger cues
- "OKX"
- "which OKX skill"
- "exchange integration"
- "OKX API"
- "OKX adapter"

## Non-goals
- full signing details
- full demo/live credential procedures
- full retry/backoff policy
- exhaustive endpoint documentation

## Routing guide
- Use `okx-auth-signing` for:
  - signature generation
  - headers
  - timestamp drift
  - signer test vectors
- Use `okx-demo-vs-live` for:
  - credential namespace separation
  - `x-simulated-trading: 1`
  - mode/config mismatch handling
  - rollout-safe environment selection
- Use `okx-rate-limits-errors` for:
  - retryability
  - rate limits
  - `code` vs `sCode`
  - endpoint budgets and backoff behavior

## Shared OKX invariants
1. Demo and live must remain operationally isolated.
2. REST snapshots remain source of truth after stream gaps or uncertainty.
3. Exchange success/failure cannot be judged from HTTP status alone.
4. Order lifecycle handling must expect partial fills, cancel races, and stale local state.
5. Venue-specific behavior belongs in the adapter or exchange-facing layer, not in generic policy code.
6. For SPOT market buys, quantity denomination matters; `tgtCcy` must match how local code interprets size.

## References
- OKX docs home: https://www.okx.com/docs-v5/en/
- Trading account section: https://www.okx.com/docs-v5/en/#trading-account
- Place order endpoint: https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order
- `skills/okx/okx-auth-signing/SKILL.md`
- `skills/okx/okx-demo-vs-live/SKILL.md`
- `skills/okx/okx-rate-limits-errors/SKILL.md`

## Examples
- Task routing examples:
  - "Why is this private request getting auth failures?" -> `okx-auth-signing`
  - "Why does demo fail while live config looks correct?" -> `okx-demo-vs-live`
  - "Should we retry this `50011` or `51138`?" -> `okx-rate-limits-errors`
  - "Where should this OKX-specific workaround live?" -> `architecture` plus the relevant `okx/*` skill

## Gotchas / failure modes
- Letting `okx-overview` grow until it duplicates the specialized OKX skills.
- Solving OKX behavior in generic orchestration code before checking the adapter boundary.
- Mixing auth, environment, and retry concerns in one patch without clear ownership.

## What we decided for Tourab Crypto AI
- Start with read-only OKX connectivity and dashboard visibility.
- Keep execution logic disabled until gatekeeper and approval workflow are complete.
- No withdrawals/transfers and no leverage/derivatives/margin in v0.

## Boundary rule
- Use `okx-overview` to orient and route OKX work.
- After that, switch to the specific OKX skill that owns the concrete problem instead of treating this file as the whole answer.
