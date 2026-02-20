# AGENTS.md instructions for D:\Tourab Crypto AI

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file or a project skill markdown file. Below is the list of project skills available in this repository.

### Available skills
- architecture: Architecture decisions, boundaries, and evolution guidance for this codebase. (file: D:/Tourab Crypto AI/skills/architecture.md)
- backend-ws-contracts: WebSocket contracts, event schemas, and backend integration rules. (file: D:/Tourab Crypto AI/skills/backend-ws-contracts.md)
- logging-audit-replay: Logging strategy and audit/replay patterns for traceability. (file: D:/Tourab Crypto AI/skills/logging-audit-replay.md)
- mission-control-ui-patterns: UI patterns for mission control views and operator workflows. (file: D:/Tourab Crypto AI/skills/mission-control-ui-patterns.md)
- node-dashboard-patterns: Node-based dashboard implementation patterns and conventions. (file: D:/Tourab Crypto AI/skills/node-dashboard-patterns.md)
- phase-delivery-playbook: Phase-based delivery sequencing, gates, and rollout workflow. (file: D:/Tourab Crypto AI/skills/phase-delivery-playbook.md)
- python-research-pipeline: Python research/data pipeline patterns and execution workflow. (file: D:/Tourab Crypto AI/skills/python-research-pipeline.md)
- release-hardening: Pre-release hardening, verification, and rollout safety checks. (file: D:/Tourab Crypto AI/skills/release-hardening.md)
- risk-gatekeeper: Risk controls, gate checks, and safe execution criteria. (file: D:/Tourab Crypto AI/skills/risk-gatekeeper.md)
- security-api-keys: API key storage, handling, and operational security practices. (file: D:/Tourab Crypto AI/skills/security-api-keys.md)
- skill-factory-governor: Meta-skill for deciding when to create/update/merge skills and enforcing quality gates. (file: D:/Tourab Crypto AI/skills/skill-factory-governor.md)
- trading-oracle: Trading signal/oracle design and decision integration guidance. (file: D:/Tourab Crypto AI/skills/trading-oracle.md)
- trading-safety-guardrails: Trading guardrails, limits, and failure containment rules. (file: D:/Tourab Crypto AI/skills/trading-safety-guardrails.md)
- okx-overview: OKX platform/domain overview and integration fundamentals. (file: D:/Tourab Crypto AI/skills/okx/okx-overview.md)
- okx-auth-signing: OKX authentication and request-signing requirements. (file: D:/Tourab Crypto AI/skills/okx/okx-auth-signing.md)
- okx-demo-vs-live: OKX demo-vs-live environment differences and safe usage. (file: D:/Tourab Crypto AI/skills/okx/okx-demo-vs-live.md)
- okx-rate-limits-errors: OKX rate limits, error handling, and retry/backoff behavior. (file: D:/Tourab Crypto AI/skills/okx/okx-rate-limits-errors.md)

### How to use skills
- Discovery: The list above defines the project skills available in this session when this repository is opened.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its file. Read only enough to follow the workflow.
  2) When a skill references relative paths, resolve them relative to the skill directory first, and only consider other paths if needed.
  3) If a skill points to extra folders such as `references/`, load only specific files needed for the request; do not bulk-load everything.
  4) If `scripts/` exist for the workflow, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from the skill file unless blocked.
  - When variants exist (frameworks, providers, domains), pick only relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
