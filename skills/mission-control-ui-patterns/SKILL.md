# Mission Control UI Patterns

## Summary
Patterns for building and evolving the operator dashboard with real-time visibility, safe controls, and role-aware interaction.

Use this skill for operator-facing UX:
- control deck behavior
- panel composition
- view models and disabled reasons
- event stream presentation
- confirmation UX for destructive actions

Do not use this skill as the primary guide for transport choice, SSE/WS architecture, or API client layering. That belongs to `node-dashboard-patterns`.

## Trigger cues
- "dashboard"
- "real-time event stream"
- "control deck"
- "risk panel"
- "operator workflow"
- "status card"
- "disabled reason"

## Non-goals
- SSE vs WebSocket choice
- client transport protocol design
- backend-to-frontend adapter boundaries
- app-wide transport state architecture

## UI architecture pattern
1. Separate view components from transport/client adapters.
2. Use typed models for bot state, events, risk, reconciliation, and logs.
3. Keep control availability logic in pure functions for testability.
4. Prefer composable panels:
   - BotStatusCard
   - ControlDeck
   - EventStream
   - RiskPanel
   - AuditTimeline
   - LogsPanel

## Real-time behavior pattern
- Load initial snapshot first.
- Subscribe to stream for deltas.
- Allow stream pause and auto-scroll toggles.
- Highlight critical events (errors/risk) without blocking workflow.

## Safety UX rules
- Confirm destructive actions (`stop`, `cancel-all`, `emergency_stop`).
- Show disabled reason by state/role.
- Do not rely on color only; include icon/text labels.

## Theming pattern
- Use tokenized CSS variables.
- Keep semantic tokens only (`--danger`, `--success`, etc.).
- Support at least two themes via data attribute switch.

## Gotchas / failure modes
- Mixing domain logic inside components.
- Unbounded event lists causing UI slowdowns.
- Missing keyboard support for key control actions.

## What we decided for Tourab Crypto AI
- Desktop-first operator layout with responsive fallback.
- Mission-control visual style with restrained animation.
- Mock adapter first, backend swap later through stable client interface.

## Boundary rule
- Use `mission-control-ui-patterns` when the main question is "how should operators see, understand, and control the system?"
- Use `node-dashboard-patterns` when the main question is "how should the dashboard communicate with the backend?"

## References
- `apps/mission-control/src/types.ts`
- `apps/mission-control/src/api/BotApiClient.ts`
- `apps/mission-control/src/logic/controlAvailability.ts`
