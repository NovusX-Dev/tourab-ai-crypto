# Skills Knowledge Base

This folder stores practical, reusable operating knowledge for Tourab Crypto AI.

Skill packaging convention:

- each skill lives in `skills/<skill-name>/SKILL.md`
- grouped families may use one extra namespace level, for example `skills/okx/<skill-name>/SKILL.md`
- `skills/README.md` is the only non-skill markdown file that should live directly under `skills/`

## Purpose
- Capture verified facts from official docs and reputable engineering sources.
- Record implementation decisions and failure modes early.
- Keep a local memory so later milestones reuse proven patterns.
- Make the repository operable by forcing recurring research and decision workflows into reusable skills instead of repeating them from scratch.

## File standard
Each skill file should include:
- Summary
- Trigger cues
- Non-goals
- Workflow
- Required outputs when relevant
- Failure modes
- References (links)
- What we decided for Tourab Crypto AI

Authoring standard:

1. Keep the skill narrow, triggerable, and testable.
2. State both what the skill does and when to use it.
3. Prefer progressive disclosure:
   - keep the main skill concise
   - link directly to one-level-deep references when more detail is needed
4. Prefer scripts and concrete repo paths over abstract advice.
5. Capture explicit quality gates for high-risk work.
6. If a solved challenge or research lesson will likely recur, update or create a skill in the same turn.

## Update rule
1. Research first.
2. Update the relevant skill file immediately after learning something important.
3. Keep entries practical and tied to concrete implementation choices.
4. If a previous decision changes, append a short dated decision note instead of deleting context.
5. If no skill exists for a recurring or high-risk workflow, use `skill-factory-governor` to create one before the task is considered complete.

## OKX research access method (mandatory)
- Use shell-based fetch for OKX docs in this environment.
- Canonical command:
  - `Invoke-WebRequest -UseBasicParsing 'https://www.okx.com/docs-v5/en/' -OutFile docs/okx/okx-docs-v5-en.html`
- Parse local file with `Select-String` for anchor sections and exact phrases.
- Do not rely on the built-in web fetcher for OKX docs when it returns HTTP 400.
- Record verification updates in `docs/okx/source-verification.md`.

## Current skill set
- `okx/okx-overview/SKILL.md`
- `okx/okx-auth-signing/SKILL.md`
- `okx/okx-demo-vs-live/SKILL.md`
- `okx/okx-rate-limits-errors/SKILL.md`
- `security-api-keys/SKILL.md`
- `risk-gatekeeper/SKILL.md`
- `trading-oracle/SKILL.md`
- `logging-audit-replay/SKILL.md`
- `architecture/SKILL.md`
- `node-dashboard-patterns/SKILL.md`
- `python-research-pipeline/SKILL.md`
- `phase-delivery-playbook/SKILL.md`
- `mission-control-ui-patterns/SKILL.md`
- `backend-ws-contracts/SKILL.md`
- `trading-safety-guardrails/SKILL.md`
- `release-hardening/SKILL.md`
- `skill-factory-governor/SKILL.md`
- `autonomy-rollout-governor/SKILL.md`
- `trading-validation-evidence/SKILL.md`
- `trading-run-forensics/SKILL.md`
- `trade-sizing-microstructure/SKILL.md`
- `validation-session-design/SKILL.md`
- `market-intelligence-research/SKILL.md`
- `strategy-hypothesis-lab/SKILL.md`
- `trading-intelligence-loop/SKILL.md`



