# AGENTS.md instructions for D:\Tourab Crypto AI

## Session startup memory
- At the start of every substantive session, read `Summary-Session.md` first if it exists.
- Then read any project files needed to recover working memory before acting, especially relevant `README.md` files and roadmap/plan files.
- Minimum default startup set unless clearly unnecessary:
  - `Summary-Session.md`
  - root `README.md`
  - `docs/project-charter.md` if it exists
  - `docs/autonomy-master-plan.md` if it exists
  - `docs/roadmap.md` if it exists
- Read only the README and roadmap files necessary for the current task, but do not skip them when they are relevant to project state, safety, autonomy, rollout, or architecture.
- If the user says `update summary session`, update `Summary-Session.md` with the current session summary before finishing the turn.

## Project north star and realism rules
- The main project goal is defined in `docs/project-charter.md`. If another doc drifts from it, the charter wins unless the user explicitly changes the goal.
- Treat the project as an AI-assisted trading operator, not a magical LLM trader. "AI" here means explainable market observation, hypothesis formation, risk-bounded execution, trade monitoring, and evidence-driven learning.
- The objective is positive net expectancy after fees, slippage, and operational mistakes. Profit is the target, not a guarantee.
- A no-trade decision is valid progress if the evidence says the setup is weak. Forced activity is not intelligence.
- Do not present online charts, reports, news, or model outputs as trade reasons unless they are translated into an explicit, testable trade hypothesis with invalidation and cost hurdle.

## Operating rules for strategy and autonomy work
- Treat execution-path fixes, strategy-economics fixes, and promotion/readiness claims as separate workstreams. A calm runtime is not proof of profitable strategy.
- Default to net-of-fees and slippage reasoning for trading work. Gross PnL, win rate, or a clean session alone are not enough.
- Before recommending strategy changes, inspect current cohort evidence from repo artifacts, logs, or stored closed-trade features. Do not jump straight to "more AI" or parameter twitching.
- If analysis is blocked by missing trade context, expand the feature contract and persistence path before making stronger trading claims. Missing data is a schema problem, not permission to guess.
- Any strategy-economics feature-contract change must update all affected layers in the same pass:
  - shared types
  - runtime persistence
  - extractors/backfills
  - reporting/analysis code
  - tests
- Treat decision-time attribution as first-class data. Policy version, strategy version, model version, approval mode, sizing context, and exit geometry should be captured from the trade's own decision-time state, not inferred later from current config.
- Use primary or official sources for market-structure, exchange-behavior, or trading-governance claims when research is required. If evidence is thin, say so bluntly.
- Never describe the bot as "smart" in a meaningful sense unless stored evidence shows positive net edge after costs. Intelligence without expectancy is just expensive choreography.

## Skills
A skill is a set of local instructions stored in a dedicated skill folder with a `SKILL.md` entrypoint. Below is the list of project skills available in this repository.

### Available skills
- architecture: Architecture decisions, boundaries, and evolution guidance for this codebase. (file: D:/Tourab Crypto AI/skills/architecture/SKILL.md)
- backend-ws-contracts: WebSocket contracts, event schemas, and backend integration rules. (file: D:/Tourab Crypto AI/skills/backend-ws-contracts/SKILL.md)
- logging-audit-replay: Logging strategy and audit/replay patterns for traceability. (file: D:/Tourab Crypto AI/skills/logging-audit-replay/SKILL.md)
- mission-control-ui-patterns: UI patterns for mission control views and operator workflows. (file: D:/Tourab Crypto AI/skills/mission-control-ui-patterns/SKILL.md)
- node-dashboard-patterns: Node-based dashboard implementation patterns and conventions. (file: D:/Tourab Crypto AI/skills/node-dashboard-patterns/SKILL.md)
- phase-delivery-playbook: Phase-based delivery sequencing, gates, and rollout workflow. (file: D:/Tourab Crypto AI/skills/phase-delivery-playbook/SKILL.md)
- python-research-pipeline: Python research/data pipeline patterns and execution workflow. (file: D:/Tourab Crypto AI/skills/python-research-pipeline/SKILL.md)
- release-hardening: Pre-release hardening, verification, and rollout safety checks. (file: D:/Tourab Crypto AI/skills/release-hardening/SKILL.md)
- risk-gatekeeper: Risk controls, gate checks, and safe execution criteria. (file: D:/Tourab Crypto AI/skills/risk-gatekeeper/SKILL.md)
- security-api-keys: API key storage, handling, and operational security practices. (file: D:/Tourab Crypto AI/skills/security-api-keys/SKILL.md)
- skill-factory-governor: Master meta-skill for deciding when to create, update, merge, or retire project skills and for capturing reusable lessons automatically after new research or solved failures. (file: D:/Tourab Crypto AI/skills/skill-factory-governor/SKILL.md)
- autonomy-rollout-governor: Stage-gated rules for moving from demo supervision to bounded live autonomy without promoting stale evidence. (file: D:/Tourab Crypto AI/skills/autonomy-rollout-governor/SKILL.md)
- trading-validation-evidence: Validation discipline for backtests, walk-forward, forward-demo, and net-of-cost promotion evidence. (file: D:/Tourab Crypto AI/skills/trading-validation-evidence/SKILL.md)
- trading-run-forensics: Structured workflow for diagnosing why a trading/demo/policy-auto run passed operationally but failed economically, or vice versa. (file: D:/Tourab Crypto AI/skills/trading-run-forensics/SKILL.md)
- trade-sizing-microstructure: Validate whether normalized trade size remains economically meaningful after exchange constraints, fees, and min-size or lot-size effects. (file: D:/Tourab Crypto AI/skills/trade-sizing-microstructure/SKILL.md)
- validation-session-design: Design demo and `policy_auto` validation sessions that produce promotable evidence rather than clean but uninformative runtime artifacts. (file: D:/Tourab Crypto AI/skills/validation-session-design/SKILL.md)
- market-intelligence-research: Build tradeable market briefs from OKX market data plus high-trust external research, and separate actionable context from narrative noise. (file: D:/Tourab Crypto AI/skills/market-intelligence-research/SKILL.md)
- strategy-hypothesis-lab: Convert market observations and research into explicit, testable trading hypotheses with regime, hold window, cost hurdle, invalidation, and no-trade rules. (file: D:/Tourab Crypto AI/skills/strategy-hypothesis-lab/SKILL.md)
- trading-intelligence-loop: Design and review the full observation-to-review trading intelligence loop so the bot behaves like a structured trading operator instead of a blind execution engine. (file: D:/Tourab Crypto AI/skills/trading-intelligence-loop/SKILL.md)
- trading-oracle: Trading signal/oracle design and decision integration guidance. (file: D:/Tourab Crypto AI/skills/trading-oracle/SKILL.md)
- trading-safety-guardrails: Trading guardrails, limits, and failure containment rules. (file: D:/Tourab Crypto AI/skills/trading-safety-guardrails/SKILL.md)
- okx-overview: OKX platform/domain overview and integration fundamentals. (file: D:/Tourab Crypto AI/skills/okx/okx-overview/SKILL.md)
- okx-auth-signing: OKX authentication and request-signing requirements. (file: D:/Tourab Crypto AI/skills/okx/okx-auth-signing/SKILL.md)
- okx-demo-vs-live: OKX demo-vs-live environment differences and safe usage. (file: D:/Tourab Crypto AI/skills/okx/okx-demo-vs-live/SKILL.md)
- okx-rate-limits-errors: OKX rate limits, error handling, and retry/backoff behavior. (file: D:/Tourab Crypto AI/skills/okx/okx-rate-limits-errors/SKILL.md)

### How to use skills
- Discovery: The list above defines the project skills available in this session when this repository is opened.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Enforcement rule: Skill use is mandatory whenever a task materially overlaps an existing project skill or when using the skill would meaningfully reduce error risk, speed up execution, or improve consistency. Do not wait for the user to name the skill explicitly.
- Minimum bar: Before making recommendations, changing code, or judging readiness in a covered domain, check whether a project skill applies. If yes, use it.
- Gap-closing rule: If no current skill cleanly covers a recurring, high-risk, or research-heavy task, invoke `skill-factory-governor` in the same turn. If the gap is real, create or update the skill before ending the task.
- Research capture rule: When a new challenge is solved or new durable research materially changes how the repo should operate, capture that lesson in an existing skill or a newly created skill in the same turn unless the lesson is obviously one-off.
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
- Review rule: If repeated work appears 3+ times or a new failure pattern keeps recurring, evaluate whether an existing skill should be updated or a new skill should be added before ending the task.
- Completion rule: A strategy/research/governance task is not fully complete if it produced a reusable lesson and the skill library was left stale.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from the skill file unless blocked.
  - When variants exist (frameworks, providers, domains), pick only relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
