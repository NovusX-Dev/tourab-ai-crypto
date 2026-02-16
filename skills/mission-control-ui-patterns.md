# Mission Control UI Patterns

## Summary
Patterns for building and evolving the operator dashboard with real-time visibility, safe controls, and role-aware interaction.

## Trigger cues
- "dashboard"
- "real-time event stream"
- "control deck"
- "risk panel"

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

## References
- `apps/mission-control/src/types.ts`
- `apps/mission-control/src/api/BotApiClient.ts`
- `apps/mission-control/src/logic/controlAvailability.ts`
