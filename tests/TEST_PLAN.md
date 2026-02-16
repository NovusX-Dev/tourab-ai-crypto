# Milestone 1 Test Plan Scaffold

This scaffold defines how coverage expands from the current unit slice to professional-grade validation.

## 1) Unit Tests (current + near-term)

- [x] Approve valid proposal path.
- [x] Reject leverage enabled (`LEVERAGE_DISABLED`).
- [x] Reject per-trade risk breach (`PER_TRADE_RISK_EXCEEDED`).
- [x] Reject daily loss stop hit (`DAILY_STOP_HIT`).
- [x] Reject weekly loss stop hit (`WEEKLY_STOP_HIT`).
- [x] Reject exposure breach (`OPEN_EXPOSURE_EXCEEDED`).
- [x] Reject exchange constraint violations (`MIN_SIZE_VIOLATION`, `LOT_SIZE_VIOLATION`, `TICK_SIZE_VIOLATION`).
- [x] Reject averaging down (`AVERAGING_DOWN_BLOCKED`).
- [x] Reject invalidation/stop logic issues (`INVALIDATION_MISSING`).
- [ ] Boundary checks at exact thresholds (equal-to limits should reject/allow by policy).
- [ ] Numeric precision stress tests for very small `lotSz` and `tickSz`.
- [ ] Multi-violation reporting consistency (stable ordering and deterministic payloads).

## 2) Contract Tests

- [ ] JSON schema snapshots for `TradeProposal`, `RiskContext`, and `RiskDecision`.
- [ ] Backward-compatibility tests for schema evolution (versioned fixtures).
- [ ] Dashboard CLI contract tests (inputs and deterministic outputs).

## 3) Integration Tests (next milestone)

- [ ] `proposal -> gatekeeper -> approve/reject event` end-to-end path.
- [ ] Gatekeeper plus mock exchange constraints refresh (`minSz`, `lotSz`, `tickSz`).
- [ ] Idempotency checks for repeated proposal IDs.
- [ ] Reconciliation pre-check stubs before execution attempts.

## 4) Replay and Regression Harness

- [ ] Fixture-driven replay from historical proposal logs.
- [ ] Golden outputs for known scenarios (accepted/rejected decisions).
- [ ] Regression suite auto-run on every risk rule change.

## 5) Adversarial and Failure Tests

- [ ] Malformed JSON input handling in CLI.
- [ ] Missing fields and type mismatches.
- [ ] Extreme values: zero, negative, very large numbers, NaN, Infinity.
- [ ] Simulated stale market mark prices and empty instrument constraints.

## 6) Operational Quality Gates

- [ ] CI gates: `typecheck`, `test`, lint.
- [ ] Minimum coverage targets for risk package (line + branch).
- [ ] Rule-change checklist requiring updated tests and decision log.

## 7) Demo-Mode Readiness (pre-OKX adapter)

- [ ] No open blockers in unit/integration suites.
- [ ] Confirm hard stop behavior under sequential losses.
- [ ] Confirm no-trade behavior when any hard rule fails.
- [ ] Final review: risk oracle alignment checklist signed off.
