# Risk Gatekeeper

## Summary
The gatekeeper is a mandatory policy layer between strategy proposals and exchange execution. It validates schema, safety policies, position limits, and operator approval state.

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