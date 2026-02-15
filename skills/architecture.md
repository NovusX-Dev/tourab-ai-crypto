# Architecture

## Summary
Tourab Crypto AI uses a split architecture: Node.js + TypeScript for operator control plane/dashboard, and Python for research/science workloads. Interface between them must be explicit, versioned, and testable.

## References
- Node.js docs: https://nodejs.org/en/docs
- Python docs: https://docs.python.org/3/
- JSON Schema: https://json-schema.org/

## Examples
- Initial interface choice:
  - Node spawns local Python worker process.
  - JSON messages over stdin/stdout.
  - Shared schema definitions in `packages/shared/`.

## Gotchas / failure modes
- Implicit ad-hoc payloads break compatibility over time.
- Tight coupling to Python internals blocks dashboard evolution.
- No schema versioning causes silent data mismatches.

## What we decided for Tourab Crypto AI
- Start with local JSON-over-stdin/stdout bridge.
- Define proposal and event schemas in shared package.
- Add explicit protocol version field from day one.