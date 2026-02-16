# Phase 1
1) Review Strong prompt overall. It is clear, detailed, and gives good UX direction, component boundaries, and data-flow assumptions.
   Main issue: it is too broad for one implementation pass and mixes critical operator UX with optional gamification, which can dilute the first production step.
2) How good as next step For your current repo stage, I’d rate it 7/10 as-is for the next step.
   Why not higher:
   •
   Scope is large for a first UI increment.
   •
   It assumes backend APIs/WS already exist, but your project is still CLI-first.
   •
   In trading ops, reliability, permissions, and safety affordances should come before “surprise factor” extras.
3) Updated prompt to execute Use this tightened version:
   You are a senior front-end engineer and product designer working in an existing monorepo.

Goal:
Implement a v1 local web dashboard for Tourab Crypto AI that prioritizes operational safety, real-time observability, and control. Style should be modern “mission control”, but safety and clarity come first.

Current context:
- Existing system is CLI-first (gatekeeper, approval flow, demo execution, reconciliation).
- Build UI in a way that can connect to a thin backend API + WebSocket layer.
- If backend endpoints are missing, provide a mock service layer with the same interfaces.

Tech requirements:
- React + Vite + TypeScript
- Tailwind CSS (or equivalent utility-first approach)
- Theme tokens via CSS variables (no hard-coded semantic colors)
- Clean component boundaries and typed models

Implement now (v1 scope only):
1. App shell
- Top bar: app name, env badge (Demo/Live), role badge (Read-only/Operator/Admin), connection status.
- Main layout: center Event Stream, right panel tabs (Risk / Audit / Logs), compact Bot Status + Control Deck always visible.
- Responsive desktop-first layout that remains usable on laptop widths.

2. Real-time Event Stream
- Typed events and mock/live adapter:
  ProposalCreated, GatekeeperDecision, ProposalApproved, OrderSubmitted, OrderFilled, OrderCancelled, Error, RiskLimitHit, ReconciliationComplete.
- Event row shows timestamp, type, symbol, summary, tags.
- Quick filters: All, Orders, Risk, Errors, System.
- Auto-scroll toggle + pause stream toggle.

3. Bot Status + Control Deck
- Status: Running/Paused/Stopped, cycle count, active symbol, mode, heartbeat age.
- Controls: Start, Pause, Resume, Stop, Cancel-all, Emergency Stop.
- Confirmation required for Stop/Cancel-all/Emergency Stop.
- Role-aware controls: Read-only cannot trigger actions.
- Disabled-state logic based on current bot state.

4. Risk / Audit / Logs panels
- Risk: limits, usage bars, active blocks, recent reject reasons.
- Audit: timeline of major milestones with clickable items.
- Logs: searchable/filterable by severity and symbol.

5. Theme system
- Tokenized theme variables and at least 2 themes:
  Neon Terminal, Solar Arcade.
- Theme switcher in UI.
- Ensure contrast and status readability with icon+label (not color-only).

Out of scope for v1 (do not implement unless trivial):
- XP bars, achievements, streak systems, cosmetic gamification extras.
- Risk-limit editing UI (admin placeholder only).

Architecture and data layer:
- Create a typed client abstraction:
    - REST: POST /start, /pause, /resume, /stop, /cancel-all
    - WS: /events
- If backend not available, provide `MockBotApiClient` + `MockEventStream`.
- Keep interfaces stable so real backend can be swapped in later.

Code quality requirements:
- Strong TypeScript typing for event union and bot state.
- Reusable, focused components:
  BotStatusCard, ControlDeck, EventStream, RiskPanel, AuditTimeline, LogsPanel, ThemeSwitcher.
- No dead code or placeholder TODO spam.
- Include minimal tests for:
    - control enable/disable logic
    - event filtering
    - role-based action gating

Deliverables:
- Working local web app with mock data and live-updating UI.
- Clear README section: run instructions, architecture, and how to switch from mock to real API.
- Brief note listing backend contracts expected by the UI.

# Phase 2
You are a senior backend engineer implementing Phase 2 for Tourab Crypto AI.

Objective:
Integrate the existing CLI-first trading operator with a real local API + WebSocket backend so the v1 dashboard can monitor and control the system in real time.

Context:
- Phase 1 delivered a React dashboard using a typed client abstraction and mock adapters.
- Existing project already has gatekeeper, human approval token flow, demo execution, cancellation, order lifecycle ledger, and reconciliation logic in TypeScript.
- This phase must preserve safety-first behavior and remain local-first.

Primary outcomes:
1. Replace mock adapters with a real backend service layer.
2. Stream typed runtime events over WebSocket.
3. Expose role-aware control endpoints.
4. Keep all execution paths gatekeeper-first and approval-gated.

Tech constraints:
- Node.js + TypeScript
- Keep architecture simple and maintainable
- Prefer explicit typed contracts shared with frontend (`packages/shared` if available)
- Local run only (no cloud assumptions)

Implement:

1) API server foundation
- Add a lightweight HTTP server (Express/Fastify acceptable).
- Add WebSocket endpoint `/events`.
- Add health endpoint `/health`.
- Use structured JSON responses and structured error payloads.

2) Control endpoints (POST)
- `/start`
- `/pause`
- `/resume`
- `/stop`
- `/cancel-all`
  Requirements:
- Validate current lifecycle state and reject invalid transitions with clear error codes.
- Emit events for accepted and rejected commands.
- Enforce role permissions:
    - `read_only`: no control actions
    - `operator`: start/pause/resume/stop/cancel-all
    - `admin`: same as operator for now (future extension point)
- Keep authentication simple for local dev (header-based role stub), but isolate in middleware for easy replacement.

3) Runtime lifecycle manager
- Create a single in-process lifecycle controller that represents bot state:
    - `stopped | running | paused`
    - cycle count
    - active symbol
    - mode
    - last heartbeat timestamp
- Ensure concurrency safety:
    - prevent duplicate starts
    - idempotent stop
    - safe pause/resume transitions
- Publish state-change events to the event bus.

4) Typed event bus + WebSocket fanout
- Define discriminated union event types shared with frontend:
    - ProposalCreated
    - GatekeeperDecision
    - ProposalApproved
    - OrderSubmitted
    - OrderFilled
    - OrderCancelled
    - Error
    - RiskLimitHit
    - ReconciliationComplete
    - BotStateChanged
    - ControlCommandAccepted
    - ControlCommandRejected
- Implement in-process pub/sub.
- Broadcast every event to connected WS clients.
- On WS connect, send:
    - current bot snapshot
    - optional last N events replay (configurable, e.g., 200)

5) Persistence for audit/replay
- Persist events to local storage (JSONL or SQLite).
- Implement append-only writes with timestamps and event IDs.
- Add a small query endpoint:
    - `GET /events?limit=&cursor=&type=&symbol=&severity=`
- Ensure frontend can request historical events and then continue with live stream.

6) Integrate with existing execution pipeline
- Do not bypass current safety model.
- All execute/cancel paths must still go through:
    - proposal/context validation
    - gatekeeper decision
    - human approval checks (where required)
- Wrap existing execution/reconciliation calls and emit typed events at each stage.
- Map runtime exceptions to structured `Error` events with safe messages.

7) Risk/reconciliation read endpoints
- `GET /risk/status` returns:
    - configured limits
    - current usage
    - active blocks
    - recent rejects
- `GET /reconciliation/status` returns:
    - positions/orders/pnl states (ok/drift/error/in_progress)
    - last reconciliation timestamp
- If full data not yet available, provide best-effort adapters from existing logs/ledger with clear TODO boundaries.

8) Reliability and safety
- Graceful shutdown:
    - stop accepting new commands
    - close WS clients cleanly
    - flush event persistence
- Add request logging with correlation ID.
- Rate-limit control endpoints minimally to avoid accidental command spam.
- Do not add risky autonomous behavior.

Testing requirements:
- Unit tests:
    - lifecycle transitions
    - role gating
    - event schema/type guards
    - command validation
- Integration tests:
    - start/pause/resume/stop/cancel-all flows
    - WS receives emitted events
    - persisted events can be queried and replayed
    - invalid transitions and unauthorized roles return correct errors
- Include at least one test proving gatekeeper rejection blocks execution.

Deliverables:
1. Backend server code wired into repo structure.
2. Shared typed contracts for API/WS payloads.
3. Event persistence + query endpoint.
4. README update with:
    - how to run backend
    - env vars
    - role header usage for local dev
    - endpoint list
    - mock-to-real frontend switch instructions
5. Short “known limitations” section.

Non-goals for this phase:
- Production-grade auth/SSO
- Distributed scaling
- Admin risk-limit editing workflows
- Exchange support beyond current implemented adapters

Implementation style:
- Keep modules small and explicit.
- Prefer clear names over abstraction-heavy patterns.
- Minimize breaking changes to existing CLI flows.
- If you must change existing behavior, document why and update tests.

# Phase 3
You are a principal engineer leading Phase 3 of Tourab Crypto AI.

Objective:
Harden the system from a local prototype into a production-grade supervised trading control platform, without compromising the safety-first model.

Current baseline:
- Phase 1: operational dashboard UI (real-time monitoring + controls, mock/live adapters).
- Phase 2: real API + WebSocket backend, lifecycle manager, typed event bus, persistence, role-aware controls.
- Existing safety foundations: gatekeeper checks, human approval gates, demo execution support, reconciliation flow.

Phase 3 goals (must deliver):
1. Security hardening and real access control.
2. Reliability, fail-safe automation boundaries, and operational resilience.
3. Deep observability and incident response readiness.
4. Operator workflow maturity for audits, replay, and explainability.
5. Production deployment readiness with strict change controls.

Non-negotiable safety constraints:
- Keep “propose -> gatekeeper -> approve -> execute” as the core execution path.
- No silent bypasses of risk checks or approvals.
- No destructive action without attributable user identity and auditable trail.
- Default to fail-closed behavior on uncertain state.

Implement:

1) Authentication + authorization (replace dev-role stub)
- Add real auth (OIDC/JWT-based) with short-lived access tokens.
- Implement RBAC with at least:
    - Viewer: read-only
    - Operator: control run state + non-admin actions
    - Admin: policy/config operations (guarded)
- Add server-side authorization middleware and per-endpoint policy checks.
- Log user identity (`who`, `what`, `when`, `why`) on every control action.

2) Action governance and approvals
- Add approval workflow for critical actions:
    - Stop, cancel-all, emergency stop, mode switch to live
- Add configurable policies:
    - single approval vs dual approval (4-eyes) for selected actions
- Add approval expiry and tamper-evident approval records.
- Expose approval status via API and emit approval events via WS.

3) Safety automation and circuit breakers
- Implement policy engine for hard stop conditions:
    - max daily loss breach
    - repeated order failures
    - heartbeat/data staleness
    - reconciliation drift beyond threshold
- Add automatic transition to `paused` or `stopped` with explicit reason codes.
- Add cooldown and manual reset rules after auto-halt events.

4) Configuration and policy management
- Introduce versioned config store for risk and runtime policies.
- Track config changes with:
    - version ID
    - author identity
    - diff summary
    - timestamp
- Add rollback capability to previous known-good policy version.
- Enforce validation and schema checks before policy activation.

5) Observability and incident readiness
- Add structured logs, metrics, and traces across API, lifecycle, execution, and exchange adapters.
- Minimum metrics:
    - command success/failure rate
    - gatekeeper reject rate
    - event lag / WS fanout lag
    - reconciliation drift counts
    - uptime and halt frequency
- Add alert rules for high-risk scenarios (risk breach, repeated rejects, stuck paused state, stale heartbeat).
- Create incident timeline export endpoint (JSON/CSV) for postmortems.

6) Event durability and audit quality
- Move event persistence to robust storage (SQLite with migrations or equivalent durable store).
- Add integrity guarantees:
    - monotonic sequence IDs
    - checksum/hash chain per event batch (or equivalent tamper-evidence)
- Add query APIs for compliance/audit:
    - filter by user, action, symbol, severity, time window
- Ensure replay can reconstruct state deterministically from event log + snapshots.

7) Reconciliation and explainability maturity
- Expand reconciliation outputs with root-cause categories:
    - missing fill
    - orphan order
    - quantity mismatch
    - price mismatch
    - stale snapshot
- Add explainability payloads for rejects/halts:
    - machine-readable code
    - human-readable reason
    - contributing signals/thresholds
- Surface these as typed events and API fields for dashboard drill-down.

8) Reliability engineering + deployment readiness
- Containerize services with environment profiles (`local`, `staging`, `prod`).
- Add DB migration workflow and startup safety checks.
- Add graceful shutdown and restart recovery tests.
- Add backup/restore procedure for event and config stores.
- Add CI/CD quality gates:
    - lint/typecheck/tests
    - migration verification
    - security/dependency scanning
    - contract tests for frontend/backend compatibility.

Testing requirements:
- Unit tests:
    - RBAC policy matrix
    - approval workflows and expiry
    - circuit breaker triggering and reset logic
    - config versioning and rollback
- Integration tests:
    - end-to-end critical action with approval + audit attribution
    - auto-halt on simulated risk breach
    - replay state reconstruction from persisted events
    - restart recovery without state corruption
- Security tests:
    - unauthorized action rejection
    - token validation edge cases
    - audit trail completeness checks

Deliverables:
1. Hardened backend implementation with real auth/RBAC and approval workflows.
2. Policy engine for circuit breakers and auto-halt rules.
3. Durable audit/event storage with replay and compliance query APIs.
4. Observability stack integration (logs/metrics/traces) and alert definitions.
5. Updated dashboard integrations for:
    - approval states
    - halt reasons
    - explainability details
6. Documentation:
    - security model
    - operations runbook
    - incident response playbook
    - backup/restore and rollback procedures
    - deployment guide for staging/prod

Out of scope for this phase:
- Multi-region distributed architecture
- Full exchange abstraction beyond currently supported adapters
- Advanced strategy research tooling unrelated to runtime safety/ops

Implementation style:
- Prefer explicit, testable modules and stable contracts.
- Keep backward compatibility where feasible; document breaking changes.
- Prioritize correctness, auditability, and operator trust over feature breadth.