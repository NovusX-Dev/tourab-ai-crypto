# Risk Gatekeeper

## Summary
The gatekeeper is the pre-execution policy layer between strategy proposals and exchange execution.

Use this skill for decisions about whether a proposal is allowed to proceed at all:
- schema validity
- policy validity
- position and exposure checks
- approval token requirements
- reject reason shape and idempotency

Do not use this skill as the main guide for runtime pause/fallback/drift handling after execution has already been allowed. That belongs to `trading-safety-guardrails`.

## Trigger cues
- "gatekeeper"
- "approve or reject"
- "proposal validation"
- "risk limit"
- "approval token"
- "idempotency"
- "reject reason"

## Non-goals
- runtime incident response
- reconcile drift escalation
- emergency stop UX
- live session fallback policy after submit/exit failures

## Workflow
1. Verify the proposal schema and required context fields.
2. Apply deterministic policy checks:
   - symbol allowlist
   - mode constraints
   - per-trade and open-exposure limits
   - stale-context rejection
3. Verify approval requirements:
   - token present
   - token freshness
   - approval context attribution
4. Enforce idempotency requirements:
   - proposal hash
   - idempotency key
   - duplicate-submit prevention rules
5. Return machine-readable outcome:
   - approve
   - reject
   - reject reason code
   - operator-readable explanation

## References
- Stripe idempotent request design: https://docs.stripe.com/api/idempotent_requests
- NIST authenticated time service (clock discipline context): https://www.nist.gov/programs-projects/authenticated-ntp-service

## Examples
- Flow:
  1. Strategy proposes action JSON.
  2. Validator checks schema and allowed instrument scope.
  3. Gatekeeper checks risk limits and mode (demo/live).
  4. Await explicit operator approval token.
  5. Execution layer can proceed only with approval token.

## Gotchas / failure modes
- Missing idempotency keys can duplicate execution during retries.
- Clock drift can invalidate signatures and time-based policy checks.
- Allowing direct strategy-to-execution bypass defeats safety model.

## What we decided for Tourab Crypto AI
- Enforce `propose -> gatekeeper -> human approve -> execute` with no bypass path.
- Require idempotency key and proposal hash for every action request.
- Block all executions if approval context is missing or stale.

## Boundary rule
- Use `risk-gatekeeper` when the main question is "should this order/proposal be allowed?"
- Use `trading-safety-guardrails` when the main question is "what should the system do after runtime conditions become unsafe?"
