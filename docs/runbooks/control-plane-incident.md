# Control Plane Incident Runbook

## Trigger
- Incident taxonomy: `control_plane`
- Includes unauthorized actions, invalid transitions, or unexpected control path failures.

## Immediate actions
1. Verify role/identity headers and control permissions.
2. Confirm expected lifecycle state transition rules.
3. Audit related approval and command events.

## Recovery criteria
- Control path behavior is deterministic and policy-conformant.
- No repeated control-plane alerts in verification window.
