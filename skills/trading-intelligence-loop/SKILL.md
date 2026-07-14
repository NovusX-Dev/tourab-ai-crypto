# Trading Intelligence Loop

## Summary

Workflow for designing or reviewing Tourab as a structured trading intelligence system instead of a blind execution bot.

Use this skill when the task is about making the bot more "intelligent," more adaptive, or more AI-like in a way that should survive beyond one session.

The goal is not to make the bot sound smart.

The goal is to make the bot able to:

- observe market state
- classify regime
- choose a valid playbook or no-trade
- build a concrete trade plan
- monitor thesis health while the trade is open
- review closed trades and update playbook confidence safely

## Trigger cues

- "make the bot more intelligent"
- "make it more AI-like"
- "how should the bot think"
- "adaptive trader"
- "thinking loop"
- "playbook selector"
- "regime engine"
- "trade planner"
- "post-trade review"

## Non-goals

- promising profitability from architecture alone
- wiring a general-purpose LLM directly to order execution
- replacing risk gates, approval rules, or evidence gates
- confusing richer language with better trading decisions

## Workflow

1. Start from the decision loop, not the model:
   - observation
   - regime classification
   - playbook selection or no-trade
   - trade planning
   - execution planning
   - thesis monitoring
   - post-trade review and governed learning
2. Separate three questions clearly:
   - is the market directional?
   - is the market tradable after spread, depth, and slippage?
   - does any named playbook have edge here?
3. Require a no-trade path at the same priority as any entry path.
4. Define a small playbook registry instead of one generic strategy:
   - each playbook needs allowed regimes, side logic, setup confirmation, invalidation, hold window, exit geometry, and confidence inputs
5. Keep trade planning explicit:
   - why now
   - why this side
   - why this entry style
   - what invalidates
   - what changes the hold or exit decision
6. Treat active-trade monitoring as thesis validation, not only stop-loss enforcement:
   - measure whether regime, market quality, and cross-asset confirmation are still intact
7. Learn only through governed review:
   - update playbook confidence from closed-trade cohorts
   - do not let runtime self-rewrite live strategy logic
8. If the work changes repo operating knowledge, update the relevant docs and skills in the same turn.

## Required outputs

- Intelligence-loop design or review
- Named playbooks or explicit no-trade decision
- Trade-thesis questions the system must answer before acting
- Gaps between current repo behavior and target loop
- Single next implementation step

## Failure modes

- building a chatty explanation layer on top of unchanged blind trading
- using one giant strategy with cosmetic sub-labels
- mixing directional edge and tradability into one vague confidence score
- letting adaptation become live self-modification
- storing PnL without producing playbook-level lessons

## What we decided for Tourab Crypto AI

- "Intelligence" means a professional trading process, not more indicators and not freer execution.
- The bot should spend most of its time rejecting weak setups.
- BTC remains the anchor thesis and ETH remains a confirmer until ETH earns its own evidence.
- Live adaptation should happen through governed playbook confidence and promotion, not runtime self-rewriting.
- If the bot cannot explain the trade in stored state, it is not thinking enough to trade autonomously.

## References

- `docs/project-charter.md`
- `docs/btc-eth-trading-thesis-2026-04-03.md`
- `docs/trading-intelligence-research-2026-04-03.md`
- `skills/market-intelligence-research/SKILL.md`
- `skills/strategy-hypothesis-lab/SKILL.md`
- `skills/trading-oracle/SKILL.md`
- https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing
- https://traderfeed.blogspot.com/2020/06/two-best-practices-i-see-among.html
- https://lindaraschke.net/wp-content/uploads/2013/11/Discerning-trader.pdf
- https://www.okx.com/en-us/learn/smart-trader-debrief-guide-to-liquidity
