# Skill Factory Governor

## Summary
Meta-skill for deciding when new project skills should be created, how to scope them, and how to keep the skills library lean and useful.

## Trigger cues
- "create a new skill"
- "do we need a skill for this"
- recurring workflow appears in multiple tasks

## Governance rules
1. Create a new skill only when at least one condition is true:
   - workflow repeats 3+ times
   - task has high error cost and benefits from checklisting
   - domain knowledge is stable and non-obvious
2. Prefer updating an existing skill if overlap is >50%.
3. Keep each skill focused on one domain outcome.
4. Retire or merge stale skills when no longer referenced.

## Skill creation protocol
1. Capture 2-3 real usage examples from recent work.
2. Define trigger cues and non-goals.
3. Write shortest useful workflow and quality gates.
4. Link canonical project files and tests.
5. Add/update `skills/README.md` current skill list.
6. Register the skill in root `AGENTS.md` under `### Available skills` with name, description, and file path.
7. Validate that new skill does not duplicate an existing one.

## Proactive behavior policy
- When a new recurring pattern is detected, propose a skill addition in end-of-task notes.
- Do not auto-create skills for one-off tasks.
- If approved by user, create the skill immediately and register it in both `skills/README.md` and `AGENTS.md`.

## Skill quality checklist
- Clear summary and trigger cues.
- Actionable steps, not generic advice.
- Concrete failure modes and project decisions.
- References to real repo paths.

## What we decided for Tourab Crypto AI
- Build a compact, high-signal skills library tied to roadmap phases.
- Optimize skills for execution speed and safety, not documentation volume.
- Continuously improve skills based on real task friction.

## References
- `skills/README.md`
- `AGENTS.md`
- `docs/roadmap.md`
- `docs/project-index.md`
