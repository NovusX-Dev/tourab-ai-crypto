import { useEffect, useMemo, useState } from "react";
import { formatTime } from "../format";
import type {
  AutoExitConfig,
  EntryAutonomyConfig,
  EntryAutonomyStatus,
  LearningAlertConfig,
  LearningEvaluationSummary,
  LearningEvaluationTrendSummary,
  LearningRetentionStatus,
  StrategyDegradationConfig,
  StrategyPromotionStage,
  StrategyPromotionState
} from "../types";

interface AutonomyPanelProps {
  config: AutoExitConfig;
  entryAutonomy: { config: EntryAutonomyConfig; status: EntryAutonomyStatus };
  strategyPromotion: StrategyPromotionState;
  strategyDegradation: StrategyDegradationConfig;
  learningEvaluation: LearningEvaluationSummary;
  learningEvaluationTrend: LearningEvaluationTrendSummary;
  learningAlertConfig: LearningAlertConfig;
  learningRetention: LearningRetentionStatus;
  trendFocus?: "expectancy" | "drawdown" | "slippage" | "controlViolationRate";
  canEdit: boolean;
  onSaveConfig: (next: Partial<AutoExitConfig>) => Promise<void>;
  onSaveEntryAutonomy: (next: Partial<EntryAutonomyConfig>) => Promise<void>;
  onRegisterStrategy: (input: {
    version: string;
    notes?: string;
    challenger?: boolean;
    artifacts?: { researchReportUrl?: string; shadowReportUrl?: string; canaryReportUrl?: string };
  }) => Promise<void>;
  onPromoteStrategy: (input: {
    version: string;
    targetStage: StrategyPromotionStage;
    reason?: string;
    artifacts?: { researchReportUrl?: string; shadowReportUrl?: string; canaryReportUrl?: string };
  }) => Promise<void>;
  onRollbackStrategy: (reason?: string) => Promise<void>;
  onSaveDegradationConfig: (next: Partial<StrategyDegradationConfig>) => Promise<void>;
  onSaveLearningAlertConfig: (next: Partial<LearningAlertConfig>) => Promise<void>;
  onSaveLearningRetentionConfig: (next: { closedTradeFeatureRetentionDays: number }) => Promise<void>;
  onRunLearningRetentionPrune: () => Promise<void>;
}

function fmtUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function fmtBps(value: number): string {
  return `${value.toFixed(2)} bps`;
}

function parseNumberOr<T extends number>(raw: string, fallback: T): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tt(text: string): { "data-tooltip": string } {
  return { "data-tooltip": text };
}

export function AutonomyPanel({
  config,
  entryAutonomy,
  strategyPromotion,
  strategyDegradation,
  learningEvaluation,
  learningEvaluationTrend,
  learningAlertConfig,
  learningRetention,
  trendFocus,
  canEdit,
  onSaveConfig,
  onSaveEntryAutonomy,
  onRegisterStrategy,
  onPromoteStrategy,
  onRollbackStrategy,
  onSaveDegradationConfig,
  onSaveLearningAlertConfig,
  onSaveLearningRetentionConfig,
  onRunLearningRetentionPrune
}: AutonomyPanelProps) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [maxHoldSec, setMaxHoldSec] = useState(String(config.maxHoldSec));
  const [takeProfitRMultiple, setTakeProfitRMultiple] = useState(String(config.takeProfitRMultiple));
  const [flattenTimeUtc, setFlattenTimeUtc] = useState(config.flattenTimeUtc ?? "");
  const [exitOffsetBps, setExitOffsetBps] = useState(String(config.exitOffsetBps));

  const [approvalMode, setApprovalMode] = useState(entryAutonomy.config.approvalMode);
  const [allowedSymbols, setAllowedSymbols] = useState(entryAutonomy.config.allowedSymbols.join(","));
  const [maxPerOrderNotionalUsd, setMaxPerOrderNotionalUsd] = useState(String(entryAutonomy.config.maxPerOrderNotionalUsd));
  const [maxOpenExposureUsd, setMaxOpenExposureUsd] = useState(String(entryAutonomy.config.maxOpenExposureUsd));
  const [maxDailyLossUsd, setMaxDailyLossUsd] = useState(String(entryAutonomy.config.maxDailyLossUsd));
  const [maxWeeklyLossUsd, setMaxWeeklyLossUsd] = useState(String(entryAutonomy.config.maxWeeklyLossUsd));
  const [lossStreakCooldownCount, setLossStreakCooldownCount] = useState(String(entryAutonomy.config.lossStreakCooldownCount));
  const [cooldownMinutes, setCooldownMinutes] = useState(String(entryAutonomy.config.cooldownMinutes));
  const [policyVersion, setPolicyVersion] = useState(entryAutonomy.config.policyVersion);

  const [registerVersion, setRegisterVersion] = useState("");
  const [registerNotes, setRegisterNotes] = useState("");
  const [registerChallenger, setRegisterChallenger] = useState(false);
  const [registerResearchUrl, setRegisterResearchUrl] = useState("");

  const [promoteVersion, setPromoteVersion] = useState("");
  const [promoteStage, setPromoteStage] = useState<StrategyPromotionStage>("shadow");
  const [promoteReason, setPromoteReason] = useState("");
  const [promoteShadowUrl, setPromoteShadowUrl] = useState("");
  const [promoteCanaryUrl, setPromoteCanaryUrl] = useState("");

  const [rollbackReason, setRollbackReason] = useState("");

  const [degradeEnabled, setDegradeEnabled] = useState(strategyDegradation.enabled);
  const [degradeDailyLoss, setDegradeDailyLoss] = useState(String(strategyDegradation.maxDailyLossUsd));
  const [degradeDrawdownPct, setDegradeDrawdownPct] = useState(String(strategyDegradation.maxDrawdownPct));
  const [degradeConsecLosses, setDegradeConsecLosses] = useState(String(strategyDegradation.maxConsecutiveLosingTrades));
  const [learningAlertEnabled, setLearningAlertEnabled] = useState(learningAlertConfig.enabled);
  const [learningLookbackDays, setLearningLookbackDays] = useState(String(learningAlertConfig.lookbackDays));
  const [learningLimit, setLearningLimit] = useState(String(learningAlertConfig.limit));
  const [learningMinTrades, setLearningMinTrades] = useState(String(learningAlertConfig.minTrades));
  const [learningExpectancyMinUsd, setLearningExpectancyMinUsd] = useState(String(learningAlertConfig.expectancyMinUsd));
  const [learningMaxDrawdownPct, setLearningMaxDrawdownPct] = useState(String(learningAlertConfig.maxDrawdownPct));
  const [learningMaxSlippageBps, setLearningMaxSlippageBps] = useState(String(learningAlertConfig.maxSlippageBps));
  const [learningMaxControlViolationRatePct, setLearningMaxControlViolationRatePct] = useState(String(learningAlertConfig.maxControlViolationRatePct));
  const [learningRetentionDays, setLearningRetentionDays] = useState(String(learningRetention.config.closedTradeFeatureRetentionDays));
  const [trendBreachFilter, setTrendBreachFilter] = useState<"all" | "breached_any" | "expectancy" | "drawdown" | "slippage" | "controlViolationRate">("all");
  const [trendModelFilter, setTrendModelFilter] = useState("all");
  const [trendStrategyFilter, setTrendStrategyFilter] = useState("all");

  useEffect(() => {
    setEnabled(config.enabled);
    setMaxHoldSec(String(config.maxHoldSec));
    setTakeProfitRMultiple(String(config.takeProfitRMultiple));
    setFlattenTimeUtc(config.flattenTimeUtc ?? "");
    setExitOffsetBps(String(config.exitOffsetBps));
  }, [config]);

  useEffect(() => {
    setApprovalMode(entryAutonomy.config.approvalMode);
    setAllowedSymbols(entryAutonomy.config.allowedSymbols.join(","));
    setMaxPerOrderNotionalUsd(String(entryAutonomy.config.maxPerOrderNotionalUsd));
    setMaxOpenExposureUsd(String(entryAutonomy.config.maxOpenExposureUsd));
    setMaxDailyLossUsd(String(entryAutonomy.config.maxDailyLossUsd));
    setMaxWeeklyLossUsd(String(entryAutonomy.config.maxWeeklyLossUsd));
    setLossStreakCooldownCount(String(entryAutonomy.config.lossStreakCooldownCount));
    setCooldownMinutes(String(entryAutonomy.config.cooldownMinutes));
    setPolicyVersion(entryAutonomy.config.policyVersion);
  }, [entryAutonomy]);

  useEffect(() => {
    setDegradeEnabled(strategyDegradation.enabled);
    setDegradeDailyLoss(String(strategyDegradation.maxDailyLossUsd));
    setDegradeDrawdownPct(String(strategyDegradation.maxDrawdownPct));
    setDegradeConsecLosses(String(strategyDegradation.maxConsecutiveLosingTrades));
  }, [strategyDegradation]);

  useEffect(() => {
    setLearningAlertEnabled(learningAlertConfig.enabled);
    setLearningLookbackDays(String(learningAlertConfig.lookbackDays));
    setLearningLimit(String(learningAlertConfig.limit));
    setLearningMinTrades(String(learningAlertConfig.minTrades));
    setLearningExpectancyMinUsd(String(learningAlertConfig.expectancyMinUsd));
    setLearningMaxDrawdownPct(String(learningAlertConfig.maxDrawdownPct));
    setLearningMaxSlippageBps(String(learningAlertConfig.maxSlippageBps));
    setLearningMaxControlViolationRatePct(String(learningAlertConfig.maxControlViolationRatePct));
  }, [learningAlertConfig]);

  useEffect(() => {
    setLearningRetentionDays(String(learningRetention.config.closedTradeFeatureRetentionDays));
  }, [learningRetention]);

  useEffect(() => {
    if (strategyPromotion.versions.length > 0 && !promoteVersion) {
      setPromoteVersion(strategyPromotion.versions[0].version);
    }
  }, [strategyPromotion, promoteVersion]);

  const stageOptions: StrategyPromotionStage[] = ["research", "shadow", "paper_canary", "limited_prod"];
  const latestPromotion = useMemo(() => strategyPromotion.history[0], [strategyPromotion]);
  const trendModelOptions = useMemo(
    () =>
      [...new Set(learningEvaluationTrend.points.flatMap((point) => point.modelVersions.map((entry) => entry.version)))]
        .sort((a, b) => a.localeCompare(b)),
    [learningEvaluationTrend]
  );
  const trendStrategyOptions = useMemo(
    () =>
      [...new Set(learningEvaluationTrend.points.flatMap((point) => point.strategyVersions.map((entry) => entry.version)))]
        .sort((a, b) => a.localeCompare(b)),
    [learningEvaluationTrend]
  );
  const filteredTrendPoints = useMemo(
    () =>
      learningEvaluationTrend.points.filter((row) => {
        const breachPass =
          trendBreachFilter === "all"
            ? true
            : trendBreachFilter === "breached_any"
              ? row.breaches.expectancy || row.breaches.drawdown || row.breaches.slippage || row.breaches.controlViolationRate
              : row.breaches[trendBreachFilter];
        const modelPass = trendModelFilter === "all" ? true : row.modelVersions.some((item) => item.version === trendModelFilter);
        const strategyPass =
          trendStrategyFilter === "all" ? true : row.strategyVersions.some((item) => item.version === trendStrategyFilter);
        return breachPass && modelPass && strategyPass;
      }),
    [learningEvaluationTrend, trendBreachFilter, trendModelFilter, trendStrategyFilter]
  );
  const latestTrendPoint = useMemo(
    () => filteredTrendPoints[filteredTrendPoints.length - 1],
    [filteredTrendPoints]
  );

  useEffect(() => {
    if (!trendFocus) {
      return;
    }
    setTrendBreachFilter(trendFocus);
  }, [trendFocus]);

  async function saveAutoExit(): Promise<void> {
    await onSaveConfig({
      enabled,
      maxHoldSec: parseNumberOr(maxHoldSec, config.maxHoldSec),
      takeProfitRMultiple: parseNumberOr(takeProfitRMultiple, config.takeProfitRMultiple),
      flattenTimeUtc: flattenTimeUtc.trim() || undefined,
      exitOffsetBps: parseNumberOr(exitOffsetBps, config.exitOffsetBps)
    });
  }

  async function saveEntryAutonomy(): Promise<void> {
    const symbols = allowedSymbols
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    await onSaveEntryAutonomy({
      approvalMode,
      allowedSymbols: symbols.length > 0 ? symbols : entryAutonomy.config.allowedSymbols,
      maxPerOrderNotionalUsd: parseNumberOr(maxPerOrderNotionalUsd, entryAutonomy.config.maxPerOrderNotionalUsd),
      maxOpenExposureUsd: parseNumberOr(maxOpenExposureUsd, entryAutonomy.config.maxOpenExposureUsd),
      maxDailyLossUsd: parseNumberOr(maxDailyLossUsd, entryAutonomy.config.maxDailyLossUsd),
      maxWeeklyLossUsd: parseNumberOr(maxWeeklyLossUsd, entryAutonomy.config.maxWeeklyLossUsd),
      lossStreakCooldownCount: Math.floor(parseNumberOr(lossStreakCooldownCount, entryAutonomy.config.lossStreakCooldownCount)),
      cooldownMinutes: Math.floor(parseNumberOr(cooldownMinutes, entryAutonomy.config.cooldownMinutes)),
      policyVersion: policyVersion.trim() || entryAutonomy.config.policyVersion
    });
  }

  async function registerStrategy(): Promise<void> {
    const version = registerVersion.trim();
    if (!version) {
      return;
    }
    await onRegisterStrategy({
      version,
      notes: registerNotes.trim() || undefined,
      challenger: registerChallenger,
      artifacts: registerResearchUrl.trim() ? { researchReportUrl: registerResearchUrl.trim() } : undefined
    });
    setRegisterVersion("");
    setRegisterNotes("");
    setRegisterChallenger(false);
    setRegisterResearchUrl("");
  }

  async function promoteStrategy(): Promise<void> {
    const version = promoteVersion.trim();
    if (!version) {
      return;
    }
    await onPromoteStrategy({
      version,
      targetStage: promoteStage,
      reason: promoteReason.trim() || undefined,
      artifacts: {
        shadowReportUrl: promoteShadowUrl.trim() || undefined,
        canaryReportUrl: promoteCanaryUrl.trim() || undefined
      }
    });
  }

  async function saveDegradationConfig(): Promise<void> {
    await onSaveDegradationConfig({
      enabled: degradeEnabled,
      maxDailyLossUsd: parseNumberOr(degradeDailyLoss, strategyDegradation.maxDailyLossUsd),
      maxDrawdownPct: parseNumberOr(degradeDrawdownPct, strategyDegradation.maxDrawdownPct),
      maxConsecutiveLosingTrades: Math.floor(parseNumberOr(degradeConsecLosses, strategyDegradation.maxConsecutiveLosingTrades))
    });
  }

  async function saveLearningAlertThresholds(): Promise<void> {
    await onSaveLearningAlertConfig({
      enabled: learningAlertEnabled,
      lookbackDays: Math.floor(parseNumberOr(learningLookbackDays, learningAlertConfig.lookbackDays)),
      limit: Math.floor(parseNumberOr(learningLimit, learningAlertConfig.limit)),
      minTrades: Math.floor(parseNumberOr(learningMinTrades, learningAlertConfig.minTrades)),
      expectancyMinUsd: parseNumberOr(learningExpectancyMinUsd, learningAlertConfig.expectancyMinUsd),
      maxDrawdownPct: parseNumberOr(learningMaxDrawdownPct, learningAlertConfig.maxDrawdownPct),
      maxSlippageBps: parseNumberOr(learningMaxSlippageBps, learningAlertConfig.maxSlippageBps),
      maxControlViolationRatePct: parseNumberOr(
        learningMaxControlViolationRatePct,
        learningAlertConfig.maxControlViolationRatePct
      )
    });
  }

  async function saveLearningRetentionConfig(): Promise<void> {
    await onSaveLearningRetentionConfig({
      closedTradeFeatureRetentionDays: Math.max(
        1,
        Math.floor(parseNumberOr(learningRetentionDays, learningRetention.config.closedTradeFeatureRetentionDays))
      )
    });
  }

  return (
    <section className="panel-content autonomy-panel" aria-label="Autonomy panel">
      <div className="panel-head">
        <div className="panel-title" {...tt("Control how the bot enters, exits, and learns from trades.")}>Autonomy</div>
        <span className={`tag ${entryAutonomy.status.approvalMode === "policy_auto" ? "sev-info" : "sev-warn"}`}>
          {entryAutonomy.status.approvalMode === "policy_auto" ? "ENTRY AUTO" : "ENTRY MANUAL"}
        </span>
      </div>

      <div className="risk-card autonomy-card" {...tt("Set how and when open trades should be closed automatically.")}>
        <div className="panel-title" {...tt("Rules that close trades by time, target, or flatten schedule.")}>Auto-Exit Config (M5)</div>
        <div className="hint" {...tt("These settings protect positions from staying open too long.")}>Deterministic exits for every approved entry order.</div>
        <div className="log-filters autonomy-form-grid">
          <label {...tt("Turn automatic exits on or off.")}>
            Enabled
            <select {...tt("Enable or disable auto-closing logic.")} value={enabled ? "1" : "0"} onChange={(event) => setEnabled(event.target.value === "1")} disabled={!canEdit}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </label>
          <label {...tt("Maximum time a trade can stay open before forced exit.")}>
            Max Hold (sec)
            <input {...tt("Higher value keeps trades open longer.")} value={maxHoldSec} onChange={(event) => setMaxHoldSec(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Profit target distance based on risk multiple.")}>
            TP R-Multiple
            <input {...tt("Larger number targets bigger gains before exit.")} value={takeProfitRMultiple} onChange={(event) => setTakeProfitRMultiple(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Daily scheduled flatten time in UTC.")}>
            Flatten (UTC HH:MM)
            <input {...tt("At this UTC time, open trades are flattened.")} value={flattenTimeUtc} onChange={(event) => setFlattenTimeUtc(event.target.value)} placeholder="23:45" disabled={!canEdit} />
          </label>
          <label {...tt("Extra price buffer for exit orders in basis points.")}>
            Exit Offset (bps)
            <input {...tt("Helps exits fill faster in moving markets.")} value={exitOffsetBps} onChange={(event) => setExitOffsetBps(event.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <div className="approval-actions autonomy-actions">
          <button className="btn btn-primary" {...tt("Save these auto-exit settings.")} onClick={() => void saveAutoExit()} disabled={!canEdit}>Save Auto-Exit</button>
        </div>
      </div>

      <div className="risk-card autonomy-card" {...tt("Set rules that decide when entries can be auto-approved.")}>
        <div className="panel-title" {...tt("Risk limits and policy gates for opening new trades.")}>Entry Autonomy (M6)</div>
        <div className="hint" {...tt("These values prevent overexposure and oversized losses.")}>Policy gates for automatic entry approvals.</div>
        <div className="log-filters autonomy-form-grid">
          <label {...tt("Choose manual approval or policy-driven auto approval.")}>
            Approval Mode
            <select {...tt("Manual needs operator approval; policy auto follows your limits.")} value={approvalMode} onChange={(event) => setApprovalMode(event.target.value as EntryAutonomyConfig["approvalMode"])} disabled={!canEdit}>
              <option value="manual">Manual</option>
              <option value="policy_auto">Policy Auto</option>
            </select>
          </label>
          <label {...tt("Only these symbols are allowed for entries.")}>
            Allowed Symbols (comma)
            <input {...tt("Comma-separated list like BTC-USDT,ETH-USDT.")} value={allowedSymbols} onChange={(event) => setAllowedSymbols(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Maximum trade size for a single order.")}>
            Max Per-Order Notional USD
            <input {...tt("Caps dollar amount per new position.")} value={maxPerOrderNotionalUsd} onChange={(event) => setMaxPerOrderNotionalUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Maximum total open exposure across positions.")}>
            Max Open Exposure USD
            <input {...tt("Stops the bot from holding too much risk at once.")} value={maxOpenExposureUsd} onChange={(event) => setMaxOpenExposureUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Daily loss cap before risk blocks kick in.")}>
            Max Daily Loss USD
            <input {...tt("If losses exceed this, new risk is restricted.")} value={maxDailyLossUsd} onChange={(event) => setMaxDailyLossUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Weekly loss cap for broader risk control.")}>
            Max Weekly Loss USD
            <input {...tt("Adds a multi-day safety boundary.")} value={maxWeeklyLossUsd} onChange={(event) => setMaxWeeklyLossUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("How many losses in a row trigger cooldown.")}>
            Loss Streak Cooldown Count
            <input {...tt("Limits repeated losses in unstable conditions.")} value={lossStreakCooldownCount} onChange={(event) => setLossStreakCooldownCount(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("How long trading should pause after a loss streak.")}>
            Cooldown Minutes
            <input {...tt("Pause period before entries are allowed again.")} value={cooldownMinutes} onChange={(event) => setCooldownMinutes(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Name for the currently active policy settings.")}>
            Policy Version
            <input {...tt("Use clear version names to track changes over time.")} value={policyVersion} onChange={(event) => setPolicyVersion(event.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <div className="hint" {...tt("Shows fallback state and active strategy.")}>
          {`fallback=${entryAutonomy.status.fallbackActive ? "on" : "off"} strategy=${entryAutonomy.config.strategyVersion}`}
          {entryAutonomy.status.lastFallbackReason ? ` | reason=${entryAutonomy.status.lastFallbackReason}` : ""}
        </div>
        {entryAutonomy.status.lastPolicyAutoBlockers.length > 0 ? (
          <div className="hint" {...tt("Most recent reasons that blocked auto approval.")}>{`last blockers: ${entryAutonomy.status.lastPolicyAutoBlockers.join(" | ")}`}</div>
        ) : null}
        <div className="approval-actions autonomy-actions">
          <button className="btn btn-primary" {...tt("Save entry approval and risk rules.")} onClick={() => void saveEntryAutonomy()} disabled={!canEdit}>Save Entry Policy</button>
        </div>
      </div>

      <div className="risk-card autonomy-card" {...tt("Register, promote, or roll back strategy versions safely.")}>
        <div className="panel-title" {...tt("Manage strategy version lifecycle from research to production.")}>Strategy Promotion (M6)</div>
        <div className="hint" {...tt("Shows currently active, champion, and previous stable versions.")}>
          {`active=${strategyPromotion.activeVersion} champion=${strategyPromotion.championVersion} previous=${strategyPromotion.previousStableVersion || "-"}`}
        </div>
        {latestPromotion ? (
          <div className="hint" {...tt("Most recent promotion activity for audit visibility.")}>{`last action=${latestPromotion.action} version=${latestPromotion.version} at=${formatTime(latestPromotion.at)}`}</div>
        ) : null}
        <div className="log-filters autonomy-form-grid">
          <label {...tt("New strategy version name to register.")}>
            Register Version
            <input {...tt("Example: candidate-v2.")} value={registerVersion} onChange={(event) => setRegisterVersion(event.target.value)} disabled={!canEdit} placeholder="candidate-v2" />
          </label>
          <label {...tt("Short note about what changed in this version.")}>
            Register Notes
            <input {...tt("Explain why this version exists.")} value={registerNotes} onChange={(event) => setRegisterNotes(event.target.value)} disabled={!canEdit} placeholder="research summary" />
          </label>
          <label {...tt("Link to the supporting research report.")}>
            Research Report URL
            <input {...tt("Optional report URL for traceability.")} value={registerResearchUrl} onChange={(event) => setRegisterResearchUrl(event.target.value)} disabled={!canEdit} placeholder="https://..." />
          </label>
          <label {...tt("Mark as challenger to compare against champion.")}>
            Challenger
            <select {...tt("Challenger versions are evaluated before full promotion.")} value={registerChallenger ? "1" : "0"} onChange={(event) => setRegisterChallenger(event.target.value === "1")} disabled={!canEdit}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
        </div>
        <div className="approval-actions autonomy-actions">
          <button className="btn btn-primary" {...tt("Register this strategy version.")} onClick={() => void registerStrategy()} disabled={!canEdit || !registerVersion.trim()}>Register</button>
        </div>

        <div className="log-filters autonomy-form-grid" style={{ marginTop: 10 }}>
          <label {...tt("Choose a registered version to promote.")}>
            Promote Version
            <select {...tt("Select the version you want to move forward.")} value={promoteVersion} onChange={(event) => setPromoteVersion(event.target.value)} disabled={!canEdit}>
              <option value="">Select</option>
              {strategyPromotion.versions.map((item) => (
                <option key={item.version} value={item.version}>{`${item.version} (${item.stage})`}</option>
              ))}
            </select>
          </label>
          <label {...tt("Pick the next rollout stage for this version.")}>
            Target Stage
            <select {...tt("Stages move from safer testing to broader exposure.")} value={promoteStage} onChange={(event) => setPromoteStage(event.target.value as StrategyPromotionStage)} disabled={!canEdit}>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <label {...tt("Why you are promoting this version.")}>
            Promote Reason
            <input {...tt("Keep this reason short and clear.")} value={promoteReason} onChange={(event) => setPromoteReason(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Link to shadow-stage validation report.")}>
            Shadow Report URL
            <input {...tt("Optional evidence link for shadow testing.")} value={promoteShadowUrl} onChange={(event) => setPromoteShadowUrl(event.target.value)} disabled={!canEdit} placeholder="https://..." />
          </label>
          <label {...tt("Link to canary-stage validation report.")}>
            Canary Report URL
            <input {...tt("Optional evidence link for canary testing.")} value={promoteCanaryUrl} onChange={(event) => setPromoteCanaryUrl(event.target.value)} disabled={!canEdit} placeholder="https://..." />
          </label>
        </div>
        <div className="approval-actions autonomy-actions">
          <button className="btn btn-primary" {...tt("Promote selected version to the target stage.")} onClick={() => void promoteStrategy()} disabled={!canEdit || !promoteVersion}>Promote</button>
          <input
            {...tt("Why this rollback is needed.")}
            value={rollbackReason}
            onChange={(event) => setRollbackReason(event.target.value)}
            disabled={!canEdit}
            placeholder="Rollback reason"
            style={{ minWidth: 180 }}
          />
          <button className="btn btn-ghost" {...tt("Roll back to the previous stable strategy version.")} onClick={() => void onRollbackStrategy(rollbackReason.trim() || undefined)} disabled={!canEdit}>Rollback</button>
        </div>
      </div>

      <div className="risk-card autonomy-card" {...tt("Automatic rollback triggers based on performance degradation.")}>
        <div className="panel-title" {...tt("If thresholds are breached, strategy can be rolled back.")}>Degradation Rollback Thresholds (M6)</div>
        <div className="log-filters autonomy-form-grid">
          <label {...tt("Enable or disable automatic degradation checks.")}>
            Enabled
            <select {...tt("Turn rollback guardrails on or off.")} value={degradeEnabled ? "1" : "0"} onChange={(event) => setDegradeEnabled(event.target.value === "1")} disabled={!canEdit}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </label>
          <label {...tt("Daily loss amount that triggers rollback protection.")}>
            Max Daily Loss USD
            <input {...tt("Lower value is safer but may rollback sooner.")} value={degradeDailyLoss} onChange={(event) => setDegradeDailyLoss(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Largest allowed drawdown before rollback.")}>
            Max Drawdown %
            <input {...tt("Keeps strategy from drifting too far from peak.")} value={degradeDrawdownPct} onChange={(event) => setDegradeDrawdownPct(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Consecutive losses allowed before protection triggers.")}>
            Max Consecutive Losing Trades
            <input {...tt("Controls tolerance for repeated losing trades.")} value={degradeConsecLosses} onChange={(event) => setDegradeConsecLosses(event.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <div className="approval-actions autonomy-actions">
          <button className="btn btn-primary" {...tt("Save rollback threshold settings.")} onClick={() => void saveDegradationConfig()} disabled={!canEdit}>Save Degradation Config</button>
        </div>
      </div>

      <div className="risk-card autonomy-card" {...tt("Performance summary for the current learning window.")}>
        <div className="panel-title" {...tt("Tracks model outcomes, drawdown, slippage, and violations.")}>Learning Evaluation (M7)</div>
        <div className="hint" {...tt("Current evaluation window and generation time.")}>
          {`lookback=${learningEvaluation.lookbackDays}d | closedTrades=${learningEvaluation.closedTrades} | generated=${formatTime(learningEvaluation.generatedAt)}`}
        </div>
        <div className="ops-grid" style={{ marginTop: 8 }}>
          <article className="ops-card" {...tt("Average profit per trade after fees.")}>
            <div className="ops-label">Expectancy (net fees)</div>
            <div className={`ops-value ${learningEvaluation.totals.expectancyNetFeesUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>
              {fmtUsd(learningEvaluation.totals.expectancyNetFeesUsd)}
            </div>
          </article>
          <article className="ops-card" {...tt("Total net profit across the lookback period.")}>
            <div className="ops-label">Cumulative Net PnL</div>
            <div className={`ops-value ${learningEvaluation.totals.cumulativeNetPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>
              {fmtUsd(learningEvaluation.totals.cumulativeNetPnlUsd)}
            </div>
          </article>
          <article className="ops-card" {...tt("Largest drop from peak during the period.")}>
            <div className="ops-label">Max Drawdown</div>
            <div className="ops-value">{`${fmtUsd(learningEvaluation.totals.maxDrawdownUsd)} (${learningEvaluation.totals.maxDrawdownPct.toFixed(2)}%)`}</div>
          </article>
          <article className="ops-card" {...tt("Estimated execution cost from price impact.")}>
            <div className="ops-label">Slippage (proxy)</div>
            <div className="ops-value">{fmtBps(learningEvaluation.totals.slippageProxyBps)}</div>
          </article>
          <article className="ops-card" {...tt("Number of guardrail rule violations.")}>
            <div className="ops-label">Control Violations</div>
            <div className={`ops-value ${learningEvaluation.totals.controlViolations > 0 ? "pnl-negative" : "pnl-positive"}`}>
              {learningEvaluation.totals.controlViolations}
            </div>
          </article>
        </div>
        <div className="subhead" {...tt("Breakdown of evaluation metrics for each model version.")}>By Model Version</div>
        {learningEvaluation.byModelVersion.length === 0 ? <div className="hint">No model-version evaluation data yet.</div> : null}
        <div className="orders-list">
          {learningEvaluation.byModelVersion.slice(0, 8).map((row) => (
            <article key={row.version} className="order-row" {...tt("Per-model performance summary.")}>
              <div className="order-main">
                <strong>{row.version}</strong>
                <span className="tag">{`trades ${row.trades}`}</span>
                <span className="tag">{`violations ${row.controlViolations}`}</span>
              </div>
              <div className={`order-meta ${row.expectancyNetFeesUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{`expectancy ${fmtUsd(row.expectancyNetFeesUsd)}`}</div>
              <div className="order-meta">{`drawdown ${fmtUsd(row.maxDrawdownUsd)} (${row.maxDrawdownPct.toFixed(2)}%)`}</div>
              <div className="order-meta">{`slippage proxy ${fmtBps(row.slippageProxyBps)}`}</div>
            </article>
          ))}
        </div>
      </div>

      <div className="risk-card autonomy-card" {...tt("Alert thresholds that detect learning performance drift.")}>
        <div className="panel-title" {...tt("Set limits that trigger learning alerts.")}>Learning Guard Thresholds (M7)</div>
        <div className="hint" {...tt("These limits decide when LEARNING alerts are raised.")}>Runtime thresholds for `LEARNING_*` alerts.</div>
        <div className="log-filters autonomy-form-grid">
          <label {...tt("Enable or disable learning guard alerts.")}>
            Enabled
            <select {...tt("Turn all learning threshold alerts on or off.")} value={learningAlertEnabled ? "1" : "0"} onChange={(event) => setLearningAlertEnabled(event.target.value === "1")} disabled={!canEdit}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </label>
          <label {...tt("How many days of data to evaluate.")}>
            Lookback Days
            <input {...tt("Longer window is smoother but slower to react.")} value={learningLookbackDays} onChange={(event) => setLearningLookbackDays(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Maximum number of records used in evaluation.")}>
            Sample Limit
            <input {...tt("Limits workload and keeps queries fast.")} value={learningLimit} onChange={(event) => setLearningLimit(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Minimum trade count before evaluation is considered valid.")}>
            Min Trades
            <input {...tt("Avoids alerts on tiny sample sizes.")} value={learningMinTrades} onChange={(event) => setLearningMinTrades(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Lowest acceptable average profit per trade.")}>
            Min Expectancy USD
            <input {...tt("Alerts if expectancy drops below this value.")} value={learningExpectancyMinUsd} onChange={(event) => setLearningExpectancyMinUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Maximum acceptable drawdown percentage.")}>
            Max Drawdown %
            <input {...tt("Alerts if drawdown becomes too large.")} value={learningMaxDrawdownPct} onChange={(event) => setLearningMaxDrawdownPct(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Maximum slippage allowed before warning.")}>
            Max Slippage (bps)
            <input {...tt("Alerts if execution quality worsens.")} value={learningMaxSlippageBps} onChange={(event) => setLearningMaxSlippageBps(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Maximum control violation rate allowed.")}>
            Max Control Violations %
            <input
              {...tt("Alerts if rule-violation rate goes too high.")}
              value={learningMaxControlViolationRatePct}
              onChange={(event) => setLearningMaxControlViolationRatePct(event.target.value)}
              disabled={!canEdit}
            />
          </label>
        </div>
        <div className="approval-actions autonomy-actions">
          <button className="btn btn-primary" {...tt("Save learning alert threshold settings.")} onClick={() => void saveLearningAlertThresholds()} disabled={!canEdit}>
            Save Learning Thresholds
          </button>
        </div>
      </div>

      <div className="risk-card autonomy-card" {...tt("How long learning features are kept, and when to prune.")}>
        <div className="panel-title" {...tt("Storage retention settings for learning feature history.")}>Learning Retention (M7)</div>
        <div className="hint" {...tt("Use this to limit old data and control storage size.")}>Retention policy and manual prune for closed-trade feature history.</div>
        <div className="log-filters autonomy-form-grid">
          <label {...tt("Number of days to keep feature history.")}>
            Feature Retention Days
            <input {...tt("Older records are removed after this many days.")} value={learningRetentionDays} onChange={(event) => setLearningRetentionDays(event.target.value)} disabled={!canEdit} />
          </label>
          <label {...tt("Current count of stored feature rows.")}>
            Feature Rows
            <input {...tt("Read-only total feature rows currently stored.")} value={String(learningRetention.stats.featureCount)} disabled />
          </label>
          <label {...tt("Oldest closed trade currently kept in storage.")}>
            Oldest Closed At
            <input {...tt("Read-only oldest record timestamp.")} value={learningRetention.stats.oldestClosedAt ?? "-"} disabled />
          </label>
          <label {...tt("Newest closed trade currently kept in storage.")}>
            Newest Closed At
            <input {...tt("Read-only newest record timestamp.")} value={learningRetention.stats.newestClosedAt ?? "-"} disabled />
          </label>
        </div>
        <div className="hint" {...tt("Shows last prune run and how many rows were deleted.")}>
          {`last prune=${learningRetention.lastPruneAt ? formatTime(learningRetention.lastPruneAt) : "never"} deleted=${learningRetention.lastPruneResult?.closedTradeFeaturesDeleted ?? 0}`}
        </div>
        <div className="approval-actions autonomy-actions">
          <button className="btn btn-primary" {...tt("Save retention window settings.")} onClick={() => void saveLearningRetentionConfig()} disabled={!canEdit}>
            Save Retention
          </button>
          <button className="btn btn-ghost" {...tt("Run cleanup now using current retention settings.")} onClick={() => void onRunLearningRetentionPrune()} disabled={!canEdit}>
            Run Prune Now
          </button>
        </div>
      </div>

      <div className="risk-card autonomy-card" {...tt("Trend view of learning performance across time buckets.")}>
        <div className="panel-title" {...tt("Monitor trend lines and breach flags over time.")}>Learning Trend (M7)</div>
        <div className="hint" {...tt("Window size, bucket size, and generation time.")}>
          {`lookback=${learningEvaluationTrend.lookbackDays}d bucket=${learningEvaluationTrend.bucketDays}d generated=${formatTime(learningEvaluationTrend.generatedAt)}`}
        </div>
        <div className="log-filters autonomy-form-grid">
          <label {...tt("Filter trend points by breach type.")}>
            Breach Filter
            <select {...tt("Show all points or only selected breach conditions.")} value={trendBreachFilter} onChange={(event) => setTrendBreachFilter(event.target.value as typeof trendBreachFilter)}>
              <option value="all">All</option>
              <option value="breached_any">Any Breach</option>
              <option value="expectancy">Expectancy</option>
              <option value="drawdown">Drawdown</option>
              <option value="slippage">Slippage</option>
              <option value="controlViolationRate">Control Violation Rate</option>
            </select>
          </label>
          <label {...tt("Filter trend by model version.")}>
            Model Version
            <select {...tt("Use this to isolate one model's trend.")} value={trendModelFilter} onChange={(event) => setTrendModelFilter(event.target.value)}>
              <option value="all">All</option>
              {trendModelOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label {...tt("Filter trend by strategy version.")}>
            Strategy Version
            <select {...tt("Use this to isolate one strategy's trend.")} value={trendStrategyFilter} onChange={(event) => setTrendStrategyFilter(event.target.value)}>
              <option value="all">All</option>
              {trendStrategyOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        {latestTrendPoint ? (
          <div className="hint" {...tt("Latest visible trend bucket summary.")}>
            {`latest bucket trades=${latestTrendPoint.closedTrades} expectancy=${fmtUsd(latestTrendPoint.expectancyNetFeesUsd)} dd=${latestTrendPoint.maxDrawdownPct.toFixed(2)}% slip=${fmtBps(latestTrendPoint.slippageProxyBps)} cvRate=${latestTrendPoint.controlViolationRatePct.toFixed(2)}%`}
          </div>
        ) : (
          <div className="hint" {...tt("No data available for current filters yet.")}>No trend points yet.</div>
        )}
        <div className="hint" {...tt("Configured thresholds used to mark breaches.")}>
          {`thresholds: expectancy>=${learningEvaluationTrend.thresholds.expectancyMinUsd} drawdown<=${learningEvaluationTrend.thresholds.maxDrawdownPct}% slippage<=${learningEvaluationTrend.thresholds.maxSlippageBps}bps cvRate<=${learningEvaluationTrend.thresholds.maxControlViolationRatePct}%`}
        </div>
        <div className="hint" {...tt("Number of buckets visible after filters.")}>{`visible buckets=${filteredTrendPoints.length}/${learningEvaluationTrend.points.length}`}</div>
        <div className="orders-list">
          {filteredTrendPoints.slice(-12).reverse().map((row) => (
            <article key={`${row.bucketStartAt}-${row.bucketEndAt}`} className="order-row" {...tt("Trend bucket details and breach flags.")}>
              <div className="order-main">
                <strong>{formatTime(row.bucketEndAt)}</strong>
                <span className="tag">{`trades ${row.closedTrades}`}</span>
                {row.modelVersions[0] ? <span className="tag">{`model ${row.modelVersions[0].version}`}</span> : null}
                {row.strategyVersions[0] ? <span className="tag">{`strategy ${row.strategyVersions[0].version}`}</span> : null}
                {row.breaches.expectancy ? <span className="tag sev-warn">expectancy</span> : null}
                {row.breaches.drawdown ? <span className="tag sev-warn">drawdown</span> : null}
                {row.breaches.slippage ? <span className="tag sev-warn">slippage</span> : null}
                {row.breaches.controlViolationRate ? <span className="tag sev-warn">cv-rate</span> : null}
              </div>
              <div className={`order-meta ${row.expectancyNetFeesUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{`expectancy ${fmtUsd(row.expectancyNetFeesUsd)}`}</div>
              <div className="order-meta">{`drawdown ${row.maxDrawdownPct.toFixed(2)}%`}</div>
              <div className="order-meta">{`slippage ${fmtBps(row.slippageProxyBps)}`}</div>
              <div className="order-meta">{`control violations ${row.controlViolations} (${row.controlViolationRatePct.toFixed(2)}%)`}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
