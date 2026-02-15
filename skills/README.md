# Skills Knowledge Base

This folder stores practical, reusable operating knowledge for Tourab Crypto AI.

## Purpose
- Capture verified facts from official docs and reputable engineering sources.
- Record implementation decisions and failure modes early.
- Keep a local memory so later milestones reuse proven patterns.

## File standard
Each skill file should include:
- Summary
- References (links)
- Examples
- Gotchas / failure modes
- What we decided for Tourab Crypto AI

## Update rule
1. Research first.
2. Update the relevant skill file immediately after learning something important.
3. Keep entries practical and tied to concrete implementation choices.
4. If a previous decision changes, append a short dated decision note instead of deleting context.

## OKX research access method (mandatory)
- Use shell-based fetch for OKX docs in this environment.
- Canonical command:
  - `Invoke-WebRequest -UseBasicParsing 'https://www.okx.com/docs-v5/en/' -OutFile docs/okx/okx-docs-v5-en.html`
- Parse local file with `Select-String` for anchor sections and exact phrases.
- Do not rely on the built-in web fetcher for OKX docs when it returns HTTP 400.
- Record verification updates in `docs/okx/source-verification.md`.

## Current skill set
- `okx/okx-overview.md`
- `okx/okx-auth-signing.md`
- `okx/okx-demo-vs-live.md`
- `okx/okx-rate-limits-errors.md`
- `security-api-keys.md`
- `risk-gatekeeper.md`
- `logging-audit-replay.md`
- `architecture.md`
- `node-dashboard-patterns.md`
- `python-research-pipeline.md`



