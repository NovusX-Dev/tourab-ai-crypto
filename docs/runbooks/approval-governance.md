# Approval Governance Runbook

## Trigger
- Incident taxonomy: `approval_governance`
- Alert codes include: `APPROVAL_EXPIRED`, `APPROVAL_REJECTED`.

## Immediate actions
1. Confirm operator identity (`x-user-id`) and role.
2. Review approval request details (action, requester, reason, expiry).
3. Re-issue approval if policy allows; otherwise reject with clear reason.

## Recovery criteria
- Critical action has valid approval or is intentionally blocked.
- Incident closed with explicit actor attribution.
