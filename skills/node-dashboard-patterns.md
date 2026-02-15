# Node Dashboard Patterns

## Summary
The local dashboard is the operator control plane. It should be local-first, low-latency, and explicit about pending approvals and system state. For one-way server-to-client updates, SSE is often simpler than WebSockets.

## References
- MDN Server-Sent Events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- MDN WebSockets API: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
- Next.js docs: https://nextjs.org/docs

## Examples
- SSE use cases:
  - Streaming logs
  - Risk check status updates
  - Proposal lifecycle updates
- WebSocket use cases:
  - Bi-directional interactive channels at high frequency.

## Gotchas / failure modes
- WS adds complexity for reconnection and message contracts.
- Long polling can become noisy and expensive locally.
- UI that hides pending approvals can create unsafe operator assumptions.

## What we decided for Tourab Crypto AI
- Start with Node + TypeScript dashboard using SSE for event stream.
- Reserve WebSockets for later if bi-directional real-time control becomes necessary.
- Keep all critical actions explicit and manually confirmed.