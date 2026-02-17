import {
  DEFAULT_RISK_LIMITS,
  ExecutionIntent,
  RiskPolicyConfig,
  RiskContext,
  RiskDecision,
  RiskLimits,
  RiskViolation,
  TradeProposal
} from "@tourab/shared";

const EPSILON = 1e-9;

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isStepAligned(value: number, step: number): boolean {
  if (!isPositiveNumber(step)) {
    return false;
  }
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < EPSILON;
}

function effectiveLimits(context: RiskContext): RiskLimits {
  return {
    ...DEFAULT_RISK_LIMITS,
    ...context.limits
  };
}

function hasPolicyConfig(policy: RiskContext["policy"]): policy is RiskPolicyConfig {
  if (!policy) {
    return false;
  }
  return (
    Array.isArray(policy.allowedSymbols) &&
    policy.allowedSymbols.length > 0 &&
    Number.isFinite(policy.maxNotionalUsd) &&
    policy.maxNotionalUsd > 0
  );
}

function projectOpenExposure(proposal: TradeProposal, currentExposure: number): number {
  const notional = proposal.qtyBase * proposal.entryPrice;
  if (proposal.side === "buy") {
    return currentExposure + notional;
  }

  return Math.max(0, currentExposure - notional);
}

function buildExecutionIntent(proposal: TradeProposal): ExecutionIntent {
  return {
    proposalId: proposal.proposalId,
    symbol: proposal.symbol,
    side: proposal.side,
    qtyBase: proposal.qtyBase,
    limitPrice: proposal.entryPrice
  };
}

function violation(code: string, message: string, details?: RiskViolation["details"]): RiskViolation {
  return { code, message, details };
}

export function evaluateTradeProposal(proposal: TradeProposal, context: RiskContext): RiskDecision {
  /**
   * Milestone 3 invariant (deterministic policy engine):
   * For identical `proposal` + `context`, this function must always return the same decision payload.
   * No random/time/env/global mutable state may influence output.
   */
  const violations: RiskViolation[] = [];
  const limits = effectiveLimits(context);
  const leverage = proposal.leverage ?? 1;

  if (proposal.symbol !== context.instrument.symbol) {
    violations.push(
      violation("INSTRUMENT_SYMBOL_MISMATCH", "Proposal symbol must match instrument symbol context.", {
        proposalSymbol: proposal.symbol,
        instrumentSymbol: context.instrument.symbol
      })
    );
  }

  if (hasPolicyConfig(context.policy)) {
    if (!context.policy.allowedSymbols.includes(proposal.symbol)) {
      violations.push(
        violation("INSTRUMENT_NOT_ALLOWED", "Proposal symbol is not in allowed symbol policy.", {
          symbol: proposal.symbol
        })
      );
    }

    const notional = proposal.qtyBase * proposal.entryPrice;
    if (notional > context.policy.maxNotionalUsd) {
      violations.push(
        violation("MAX_NOTIONAL_EXCEEDED", "Order notional exceeds configured maxNotionalUsd.", {
          notionalUsd: notional,
          maxNotionalUsd: context.policy.maxNotionalUsd
        })
      );
    }
  }

  if (leverage > 1) {
    violations.push(violation("LEVERAGE_DISABLED", "Leverage is disabled in v0.", { leverage }));
  }

  if (context.account.currentDailyLossUsd >= limits.maxDailyLossUsd) {
    violations.push(
      violation("DAILY_STOP_HIT", "Daily loss limit already reached.", {
        currentDailyLossUsd: context.account.currentDailyLossUsd,
        maxDailyLossUsd: limits.maxDailyLossUsd
      })
    );
  }

  if (context.account.currentWeeklyLossUsd >= limits.maxWeeklyLossUsd) {
    violations.push(
      violation("WEEKLY_STOP_HIT", "Weekly loss limit already reached.", {
        currentWeeklyLossUsd: context.account.currentWeeklyLossUsd,
        maxWeeklyLossUsd: limits.maxWeeklyLossUsd
      })
    );
  }

  if (proposal.estimatedMaxLossUsd > limits.maxPerTradeRiskUsd) {
    violations.push(
      violation("PER_TRADE_RISK_EXCEEDED", "Per-trade risk exceeds allowed maximum.", {
        estimatedMaxLossUsd: proposal.estimatedMaxLossUsd,
        maxPerTradeRiskUsd: limits.maxPerTradeRiskUsd
      })
    );
  }

  if (!isPositiveNumber(proposal.stopPrice)) {
    violations.push(violation("INVALID_STOP", "Stop price must be a positive number."));
  } else {
    if (proposal.side === "buy" && proposal.stopPrice >= proposal.entryPrice) {
      violations.push(
        violation("INVALIDATION_MISSING", "Buy stop must be below entry price.", {
          stopPrice: proposal.stopPrice,
          entryPrice: proposal.entryPrice
        })
      );
    }
    if (proposal.side === "sell" && proposal.stopPrice <= proposal.entryPrice) {
      violations.push(
        violation("INVALIDATION_MISSING", "Sell stop must be above entry price.", {
          stopPrice: proposal.stopPrice,
          entryPrice: proposal.entryPrice
        })
      );
    }
  }

  const projectedOpenExposure = projectOpenExposure(proposal, context.account.currentOpenExposureUsd);
  if (projectedOpenExposure > limits.maxOpenExposureUsd) {
    violations.push(
      violation("OPEN_EXPOSURE_EXCEEDED", "Projected open exposure exceeds max allowed.", {
        projectedOpenExposureUsd: projectedOpenExposure,
        maxOpenExposureUsd: limits.maxOpenExposureUsd
      })
    );
  }

  if (proposal.qtyBase < context.instrument.minSz) {
    violations.push(
      violation("MIN_SIZE_VIOLATION", "Proposed quantity is below exchange minSz.", {
        qtyBase: proposal.qtyBase,
        minSz: context.instrument.minSz
      })
    );
  }

  if (!isStepAligned(proposal.qtyBase, context.instrument.lotSz)) {
    violations.push(
      violation("LOT_SIZE_VIOLATION", "Proposed quantity does not align with lotSz.", {
        qtyBase: proposal.qtyBase,
        lotSz: context.instrument.lotSz
      })
    );
  }

  if (!isStepAligned(proposal.entryPrice, context.instrument.tickSz)) {
    violations.push(
      violation("TICK_SIZE_VIOLATION", "Entry price does not align with tickSz.", {
        entryPrice: proposal.entryPrice,
        tickSz: context.instrument.tickSz
      })
    );
  }

  const hasPosition = context.position && context.position.symbol === proposal.symbol && context.position.baseQty > 0;
  if (proposal.side === "buy" && hasPosition && context.market.markPrice < (context.position?.avgEntryPrice ?? 0)) {
    violations.push(
      violation("AVERAGING_DOWN_BLOCKED", "Averaging down losers is disabled.", {
        markPrice: context.market.markPrice,
        avgEntryPrice: context.position?.avgEntryPrice ?? 0
      })
    );
  }

  if (violations.length > 0) {
    return {
      status: "REJECT",
      violations
    };
  }

  return {
    status: "APPROVE",
    violations,
    executionIntent: buildExecutionIntent(proposal)
  };
}
