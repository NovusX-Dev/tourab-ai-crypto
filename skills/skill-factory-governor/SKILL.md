# Skill Factory Governor

## Summary

Master meta-skill for evolving the Tourab skills library.

Use this skill to decide when to create, update, merge, split, or retire project skills so the repo captures durable operating knowledge instead of relearning the same lesson every week.

This skill is mandatory whenever:

- a task exposes a real skill gap
- a repeated failure pattern has just been solved
- new external research materially changes how Tourab should operate
- the user asks to rethink the skill system

## Trigger cues

- "create a new skill"
- "update the skills"
- "do we need a skill for this"
- "rethink AGENTS"
- recurring workflow appears in multiple tasks
- a new solved failure pattern should become reusable memory

## Non-goals

- solving the entire domain task by itself
- duplicating domain skills that already exist
- growing the library for vanity
- keeping obsolete skills alive because they have nice names

## Decision ladder

1. Check whether an existing skill already covers at least `60%` of the workflow.
2. If yes, update that skill instead of creating a sibling.
3. If no, create a new skill when at least one condition is true:
   - the workflow repeated `2+` times and is likely to recur again
   - the error cost is high enough that checklisting pays for itself
   - the task depends on durable research or stable domain knowledge
   - the workflow defines a core part of the project operating model
4. Retire or merge a skill when:
   - it is largely duplicated by another skill
   - its scope drifted so far that trigger boundaries are muddy
   - the project no longer needs the workflow

## On-the-fly creation rule

Do not wait for separate approval if the user has asked for skill-system improvement or if the active task clearly benefits from a new reusable skill.

If a challenge was overcome or research was completed and the lesson is durable, this skill should:

1. decide whether the lesson belongs in an existing skill or a new one
2. update/create the skill in the same turn
3. register it in `skills/README.md`
4. register it in root `AGENTS.md`

Leaving the skill library stale after a reusable lesson is a process failure.

## Creation and update protocol

1. Start from repo evidence, not vibes:
   - recent docs
   - repeated bug/failure patterns
   - reports or postmortems
2. Capture the outcome the skill should produce.
3. Write only the minimum durable workflow:
   - summary
   - trigger cues
   - non-goals
   - workflow
   - required outputs if useful
   - failure modes
   - repo references
   - what we decided for Tourab
4. Keep the scope tight enough that another skill can coexist beside it.
5. Prefer concrete repo paths, scripts, and metrics over generic advice.
6. Update indexes and registration files in the same pass.

## Quality gates

- The skill solves one clear recurring problem.
- The trigger boundary is obvious.
- The workflow is actionable under real repo conditions.
- The skill names real files, evidence, or commands where possible.
- The skill does not duplicate another skill unnecessarily.
- The skill captures decisions that should survive this session.

## Failure modes

- Creating overlapping skills with cosmetic wording differences
- Waiting for explicit permission even after the user asked for a stronger skill system
- Documenting a lesson in a report but not in the skill library
- Writing vague skills that sound wise but do not change execution quality
- Keeping stale skills because deleting them feels risky

## What we decided for Tourab Crypto AI

- The skills library is part of the operating system of the project, not optional documentation.
- Reusable research and solved failure patterns should be captured immediately.
- Skill creation is allowed on the fly when the gap is real and the lesson is durable.
- Lean and sharp beats broad and sleepy.

## References

- `skills/README.md`
- `AGENTS.md`
- `docs/project-charter.md`
- `docs/autonomy-master-plan.md`
- `docs/strategy-reset-plan-2026-03-30.md`
- https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview
