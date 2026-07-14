# Trading Intelligence Research Reset

Date: 2026-04-03
Status: Active research memo
Owner: Operator + Codex

## Executive Verdict

If we want the bot to be more intelligent, the answer is not "add more indicators" and not "put an LLM directly on the order button."

The research points to a harsher but more useful conclusion:

1. Strong traders are selective.
2. Strong traders adapt to regime changes.
3. Strong traders use multiple playbooks, not one permanent pattern.
4. Strong traders obsess over execution quality and market depth.
5. Strong traders review and learn from trades systematically.

So the right objective for Tourab is:

- build a structured trading intelligence system
- not a blind rules engine
- not a chatty LLM with opinions
- not an unconditional momentum bot

The bot should think in a loop:

1. Observe market state.
2. Classify regime and market quality.
3. Select a valid playbook or choose no-trade.
4. Build a trade plan with entry, invalidation, and expected edge.
5. Execute with microstructure awareness.
6. Monitor whether the original thesis still holds.
7. Review outcomes and update playbook confidence offline.

That is what "AI-like" should mean here.

## Research Sources Used

### Trend, Momentum, And Risk

1. AQR, *A Century of Evidence on Trend-Following Investing*
   - https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing
2. AQR, trend-following research hub
   - https://www.aqr.com/insights/trend-following

### Successful Trader Process And Adaptation

3. Brett Steenbarger, *Two Best Practices I See Among Successful Developing Traders*
   - https://traderfeed.blogspot.com/2020/06/two-best-practices-i-see-among.html
4. Brett Steenbarger, *The Single Most Important Trait of Successful Traders*
   - https://traderfeed.blogspot.com/2015/09/the-single-most-important-trait-of.html
5. Linda Bradford Raschke, *The Discerning Trader*
   - https://lindaraschke.net/wp-content/uploads/2013/11/Discerning-trader.pdf
6. Linda Bradford Raschke interview summary
   - https://tradersaccountability.com/ep-048-linda-raschke/

### Market Microstructure And OKX Execution Reality

7. OKX, *Guide to Liquidity in Crypto Trading*
   - https://www.okx.com/en-us/learn/smart-trader-debrief-guide-to-liquidity
8. OKX, *What is an order book in crypto?*
   - https://www.okx.com/en-us/learn/what-is-an-order-book-crypto
9. OKX, *What is slippage in crypto trading?*
   - https://www.okx.com/en-us/learn/what-is-slippage

### Crypto Regime Research

10. *State transitions and momentum effect in cryptocurrency market*
   - https://www.sciencedirect.com/science/article/abs/pii/S1544612325016101
11. *Exploring the predictability of cryptocurrencies via Bayesian hidden Markov models*
   - https://www.sciencedirect.com/science/article/pii/S0275531921001756
12. *Risk assessment in cryptocurrency portfolios: a composite hidden Markov factor analysis framework*
   - https://www.iapress.org/index.php/soic/article/view/1837

## What The Research Actually Says

### 1. Intelligence starts with selectivity, not activity

AQR's long-horizon work supports trend and momentum as valid starting families, but that does not justify trading all the time.

Brett Steenbarger emphasizes that successful traders use rigorous planning and review, and develop a playbook of different opportunities for different conditions. The implication for Tourab is simple:

- no-trade must be a first-class decision
- the bot needs a playbook selector
- the bot should spend more time waiting than trading

Linda Raschke is even blunter: a lot of the time she does not know what the market is going to do, so she waits for something she recognizes. That is a much better model for Tourab than "always scan, always fire."

### 2. Adaptation matters more than rigid discipline

Steenbarger argues that adaptability is the single most important trait of successful traders because patterns that work in one regime can fail in another.

Crypto-specific regime research supports that. Recent work on state transitions in crypto momentum warns against unconditional momentum and points to regime-aware approaches as the more realistic path.

Implication for Tourab:

- strategy logic must be regime-conditional
- one static champion is not enough
- adaptation should happen through regime-aware playbook selection and governed promotion, not live self-rewriting

### 3. Multiple playbooks beat one generic "strategy"

Steenbarger explicitly describes successful traders as having a deep playbook.

Raschke describes a library of patterns with specific rules.

Rob Carver's systematic framework also points in the same direction from the quant side: multiple forecasts and rules should be combined thoughtfully rather than betting everything on one raw signal family.

Implication for Tourab:

- the bot should not have one "trading strategy"
- it should have a small set of named playbooks
- each playbook should define:
  - allowed regime
  - side bias
  - setup confirmation
  - entry style
  - invalidation
  - exit geometry
  - confidence weighting

### 4. Crypto intelligence must include microstructure

OKX's own execution guides reinforce what the repo has already been learning the painful way:

- order book depth matters
- spread matters
- slippage matters
- fake walls and disappearing liquidity matter

In other words, a bot that "predicts direction" but ignores current tradability is not intelligent. It is just forecasting without execution awareness.

Implication for Tourab:

- market-quality assessment must be separate from directional thesis
- every trade decision needs a microstructure score
- entry style should adapt to depth/spread conditions
- there should be a real distinction between:
  - good thesis, bad execution conditions
  - bad thesis, good execution conditions

Both should block a trade.

### 5. Learning requires review, not just PnL storage

Steenbarger repeatedly emphasizes film review, deliberate practice, and post-trade analysis.

Raschke emphasizes nightly analysis and repeated study of patterns.

Implication for Tourab:

- closed trades alone are not enough
- the system needs a structured post-trade review layer
- every trade should be scored on:
  - setup quality
  - execution quality
  - thesis adherence
  - exit quality
  - avoidability of loss
  - missed opportunity if exited early

The current repo stores more trade context than before, which is good. But to become more intelligent, Tourab needs to transform that data into playbook-level learning and operator-readable review packets.

## What "Intelligent" Should Mean For Tourab

Tourab should not imitate a human trader's personality.

It should imitate a professional trading process.

That means the bot should be able to answer, for every trade:

1. Why is this market tradable right now?
2. What regime are we in?
3. Which playbook applies?
4. Why this side?
5. Why now instead of five minutes ago or five minutes later?
6. Why this entry style?
7. What would invalidate the thesis?
8. What changed while the trade was open?
9. Why did we exit?
10. What should update after the trade closes?

If the bot cannot answer those questions from stored state, it is not thinking. It is only executing.

## Target Intelligence Architecture

### Layer 1: Observation

Inputs:

- price and returns across multiple horizons
- realized volatility
- spread
- order-book depth and imbalance
- cross-asset context:
  - BTC anchor
  - ETH relative behavior vs BTC
- time-of-day and session context
- recent execution quality

Output:

- market observation snapshot

### Layer 2: Regime Engine

Purpose:

- classify current environment into a small number of actionable states

Suggested classes:

- trend_up
- quiet_up
- trend_down
- quiet_down
- expansion_breakout
- mean_revert_chop
- dead_zone
- disorderly_microstructure

This should be a dedicated engine, not scattered thresholds.

### Layer 3: Playbook Selector

Purpose:

- choose a single valid playbook or no-trade

Suggested starting playbooks:

1. BTC continuation pullback
2. BTC downside continuation
3. BTC breakout expansion
4. ETH beta confirmation
5. no-trade

The selector should rank playbooks by:

- regime fit
- side evidence
- execution conditions
- recent playbook expectancy

### Layer 4: Trade Planner

Purpose:

- turn a playbook into a concrete plan

Outputs:

- entry style:
  - passive pullback
  - passive join
  - controlled momentum
- invalidation condition
- stop location
- take-profit logic
- max hold logic
- expected edge estimate
- confidence score

This is where the bot should "think" explicitly.

### Layer 5: Execution Planner

Purpose:

- decide whether the plan is actually executable on OKX spot

Rules should include:

- minimum depth near top of book
- maximum spread
- allowed market impact
- order slicing or not
- cancel/reprice logic
- do not cross the spread aggressively unless the setup justifies it

### Layer 6: Active Trade Monitor

Purpose:

- continuously re-check whether the thesis still holds

The monitor should reassess:

- regime drift
- spread deterioration
- BTC/ETH relationship drift
- order-book reversal
- realized progress vs expected progress
- time decay of the setup

The current bot already monitors trades mechanically.
The next step is to monitor thesis health, not just stop/TP geometry.

### Layer 7: Review And Learning

Purpose:

- update confidence in playbooks without letting the bot self-rewrite live

This should produce:

- playbook-level stats
- symbol-side-regime-playbook stats
- post-trade review packets
- challenger proposals
- demotion suggestions

## Concrete Design Principles For The Codebase

1. Replace "defaultSide" thinking with "playbook first" thinking for BTC and ETH.
2. Make regime classification a named module with explicit outputs and tests.
3. Create a playbook registry instead of burying thesis logic in worker thresholds.
4. Store trade rationale at decision time:
   - regime
   - selected playbook
   - rejected playbooks
   - confidence
   - execution-quality score
   - invalidation logic
5. Add active-thesis monitoring for open trades, not only static exits.
6. Build a nightly review job that produces:
   - best trades
   - worst trades
   - avoidable losses
   - missed follow-through
   - playbook degradation flags
7. Keep model adaptation offline and governed.

## What We Should Not Do

1. Do not wire a general-purpose LLM directly to autonomous order submission.
2. Do not treat more indicators as more intelligence.
3. Do not let the bot trade without an identified playbook.
4. Do not let the bot rely on one strategy family forever.
5. Do not declare the bot intelligent because it can narrate its trades.
6. Do not let learning mean live self-editing of thresholds.

## Immediate Build Priorities

### Priority A: Playbook Architecture

Build:

- `regime-engine`
- `playbook-registry`
- `trade-planner`
- `thesis-monitor`

### Priority B: Better Stored Reasoning

Persist for every proposal/trade:

- selected playbook
- rejected alternatives
- tradability score
- execution-quality estimate
- thesis confidence
- thesis invalidation snapshot

### Priority C: Review Loop

Build a post-trade review pipeline that grades:

- thesis quality
- entry quality
- execution quality
- exit quality
- discipline quality

### Priority D: BTC First, ETH Shadow

Keep ETH shadow/manual until:

- it has enough closed trades
- its playbook-level expectancy is positive after costs
- its cross-asset confirmation logic proves useful in forward-demo

## Final Judgment

The repo is no longer as blind as it was, but it is still closer to a guarded execution engine than to an intelligent trading system.

The research says the missing ingredients are:

- regime awareness
- explicit playbooks
- execution-aware planning
- active thesis monitoring
- disciplined review and learning
- adaptation without live self-rewriting

That is the path to making Tourab more intelligent.
Not more noise.
