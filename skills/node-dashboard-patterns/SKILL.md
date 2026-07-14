# Node Dashboard Patterns

## Summary
The local dashboard is the operator control-plane transport and application-shape layer. It should be local-first, low-latency, and explicit about pending approvals and system state.

Use this skill for backend/client integration shape:
- SSE vs WebSocket vs polling choice
- API client boundaries
- server-to-client transport model
- adapter layering
- app-level state flow between backend and frontend

Do not use this skill as the main guide for visual layout, control affordances, or operator panel design. That belongs to `mission-control-ui-patterns`.

## Trigger cues
- "SSE"
- "WebSocket"
- "stream transport"
- "API client"
- "dashboard architecture"
- "frontend/backend boundary"

## Non-goals
- card layout
- panel composition
- button copy or visual affordances
- theme and presentation decisions

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

## Boundary rule
- Use `node-dashboard-patterns` when the main question is "how should data and events move between backend and operator client?"
- Use `mission-control-ui-patterns` when the main question is "how should the operator experience present that state and those actions?"
