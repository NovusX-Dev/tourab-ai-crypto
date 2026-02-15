# Architecture and Product Decisions

## D-001: Split stack into Node + Python
- Date: 2026-02-15
- Decision: Node.js + TypeScript for control plane/dashboard; Python for research pipeline.
- Why: UI and operator workflow in Node ecosystem; quantitative research speed in Python ecosystem.
- Consequence: Define explicit schema contract and process boundary.

## D-002: Safety model is mandatory and non-bypassable
- Date: 2026-02-15
- Decision: `propose -> gatekeeper -> human approve -> execute` for all execution-capable actions.
- Why: supervised operation and risk control.
- Consequence: direct strategy-to-exchange paths are prohibited.

## D-003: Demo-first progression
- Date: 2026-02-15
- Decision: no live execution until demo milestones and audit/reconciliation controls are stable.
- Why: reduce operational risk and validate behavior safely.
- Consequence: maintain separate demo/live configuration namespaces.

## D-004: No withdrawals/transfers, no leverage/derivatives/margin in v0
- Date: 2026-02-15
- Decision: exclude these capabilities from architecture and permissions.
- Why: safety, scope control, and reduced blast radius.
- Consequence: API key scopes and code paths remain constrained.

## D-005: Shared schema package
- Date: 2026-02-15
- Decision: keep proposal, risk, and event schemas in `packages/shared/`.
- Why: consistent contract between dashboard, gatekeeper, and research engine.
- Consequence: schema versioning and compatibility checks become first-class.

## D-006: Event streaming preference is SSE-first
- Date: 2026-02-15
- Decision: start with SSE for dashboard streaming; adopt WebSockets only if needed.
- Why: simpler implementation for one-way updates and lower protocol complexity.
- Consequence: design UI state updates around server-push event feed.

## D-007: Research-first rule
- Date: 2026-02-15
- Decision: confirm official docs and pitfalls before meaningful milestone coding.
- Why: avoid incorrect assumptions in exchange integration and risk logic.
- Consequence: maintain `skills/` as living memory and update it continuously.