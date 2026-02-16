# Backend WS Contracts

## Summary
Contract-first patterns for building a thin backend API plus WebSocket stream for bot monitoring and controls.

## Trigger cues
- "phase 2 backend"
- "websocket events"
- "typed contracts"
- "snapshot + stream"

## Contract-first workflow
1. Define shared discriminated union event types.
2. Define control command responses and structured errors.
3. Define initial snapshot payload shape.
4. Implement adapters/services after types are stable.
5. Add contract tests before wiring frontend.

## Event contract checklist
- `id`
- `timestamp` (ISO)
- `type`
- `severity`
- `symbol` (optional where not applicable)
- `message`
- `tags` (optional)
- `correlationId` for command flows when available

## API baseline
- `GET /health`
- `GET /snapshot`
- `POST /start`
- `POST /pause`
- `POST /resume`
- `POST /stop`
- `POST /cancel-all`
- `GET /events` (WS)

## Runtime rules
- Reject invalid state transitions explicitly.
- Emit accepted/rejected control events.
- Replay recent N events on WS connect.
- Keep event persistence append-only.

## Gotchas / failure modes
- Frontend and backend drifting on event field names.
- Missing idempotency behavior for repeated commands.
- WS stream without a snapshot bootstrap path.

## What we decided for Tourab Crypto AI
- Stable typed contracts before broad backend implementation.
- Local-first API and WS only.
- Structured errors for operator clarity and test assertions.

## References
- `packages/shared/src/types.ts`
- `apps/mission-control/src/api/BotApiClient.ts`
- `docs/decisions.md`
