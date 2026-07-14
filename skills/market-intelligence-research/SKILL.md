# Market Intelligence Research

## Summary

Workflow for building a tradeable market brief from OKX market data plus high-trust external research.

Use this skill when the task is not just "fetch price," but:

- read the chart before changing strategy
- inspect current regime or catalyst context
- compare exchange data with external reports or news
- decide whether the market supports a hypothesis or should be left alone

This skill exists to stop screenshot astrology and headline cosplay.

## Trigger cues

- "read the chart"
- "market research"
- "what is BTC or ETH doing"
- "use online reports"
- "catalyst"
- "market context"
- "current regime"
- "before taking a trade"

## Non-goals

- placing orders directly
- replacing symbol-level economics analysis from closed trades
- treating news flow as a trade by itself
- inventing confidence when current data is thin or contradictory

## Workflow

1. Define the decision question first:
   - entry now or no-trade
   - strategy redesign
   - regime classification
   - catalyst assessment
2. Pull exchange-first market context from OKX or stored repo artifacts:
   - candles across relevant horizons
   - order book
   - spread
   - recent trades
   - mark or index context when relevant
   - funding or open interest when the instrument and question justify it
3. Collect only high-trust external sources that matter to the question:
   - official exchange docs or notices
   - official token/project sources
   - reputable research or market-structure references
   - dated news only when timing matters to the decision
4. Separate observations into three buckets:
   - tradeable facts
   - contextual but non-tradeable background
   - noise or unsupported narrative
5. Translate findings into a structured market brief:
   - current regime
   - directional bias or no-trade verdict
   - catalyst summary
   - invalidators
   - execution implications
   - confidence and missing evidence
6. If the lesson is durable and recurring, update a skill or strategy document before ending the task.

## Required outputs

- Decision question
- Exchange facts used
- External sources used
- Regime verdict
- Trade implication or no-trade implication
- Confidence and what is still unknown

## Failure modes

- letting headlines override exchange data
- using stale articles without checking publication date
- confusing descriptive macro commentary with a valid entry trigger
- calling the setup "bullish" or "bearish" without naming invalidation
- using a chart screenshot when structured candles and order-book data are available

## What we decided for Tourab Crypto AI

- Exchange data is the first layer of market truth.
- External research is supportive context, not an execution bypass.
- A market brief must end in a trade implication or an explicit no-trade call.
- If the data does not support a clear edge after costs, the correct answer is often "wait."

## References

- `docs/project-charter.md`
- `docs/strategy-reset-plan-2026-03-30.md`
- `apps/dashboard/src/mission-control/market-intelligence.ts`
- `apps/dashboard/src/mission-control/signal-intelligence.ts`
- https://app.okx.com/docs-v5/en/
