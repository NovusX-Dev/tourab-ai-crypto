import { useEffect, useMemo, useState } from "react";
import { formatDuration, formatTime, timeSinceMs } from "../format";
import type {
  AutoExitConfig,
  EntryAutonomyConfig,
  EntryAutonomyStatus,
  ManagedTradeItem,
  StrategyDegradationConfig,
  StrategyPromotionStage,
  StrategyPromotionState
} from "../types";

interface AutonomyPanelProps {
  config: AutoExitConfig;
  managedTrades: ManagedTradeItem[];
  entryAutonomy: { config: EntryAutonomyConfig; status: EntryAutonomyStatus };
  strategyPromotion: StrategyPromotionState;
  strategyDegradation: StrategyDegradationConfig;
  canEdit: boolean;
  onSaveConfig: (next: Partial<AutoExitConfig>) => Promise<void>;
  onRefreshTrades: () => Promise<void>;
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
}

function fmtUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function parseNumberOr<T extends number>(raw: string, fallback: T): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function AutonomyPanel({
  config,
  managedTrades,
  entryAutonomy,
  strategyPromotion,
  strategyDegradation,
  canEdit,
  onSaveConfig,
  onRefreshTrades,
  onSaveEntryAutonomy,
  onRegisterStrategy,
  onPromoteStrategy,
  onRollbackStrategy,
  onSaveDegradationConfig
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
    if (strategyPromotion.versions.length > 0 && !promoteVersion) {
      setPromoteVersion(strategyPromotion.versions[0].version);
    }
  }, [strategyPromotion, promoteVersion]);

  const stageOptions: StrategyPromotionStage[] = ["research", "shadow", "paper_canary", "limited_prod"];
  const openTrades = managedTrades.filter((item) => item.status !== "closed");
  const closedTrades = managedTrades.filter((item) => item.status === "closed");
  const latestPromotion = useMemo(() => strategyPromotion.history[0], [strategyPromotion]);

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

  return (
    <section className="panel-content" aria-label="Autonomy panel">
      <div className="panel-head">
        <div className="panel-title">Autonomy</div>
        <span className={`tag ${entryAutonomy.status.approvalMode === "policy_auto" ? "sev-info" : "sev-warn"}`}>
          {entryAutonomy.status.approvalMode === "policy_auto" ? "ENTRY AUTO" : "ENTRY MANUAL"}
        </span>
      </div>

      <div className="risk-card">
        <div className="panel-title">Auto-Exit Config (M5)</div>
        <div className="hint">Deterministic exits for every approved entry order.</div>
        <div className="log-filters">
          <label>
            Enabled
            <select value={enabled ? "1" : "0"} onChange={(event) => setEnabled(event.target.value === "1")} disabled={!canEdit}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </label>
          <label>
            Max Hold (sec)
            <input value={maxHoldSec} onChange={(event) => setMaxHoldSec(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            TP R-Multiple
            <input value={takeProfitRMultiple} onChange={(event) => setTakeProfitRMultiple(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Flatten (UTC HH:MM)
            <input value={flattenTimeUtc} onChange={(event) => setFlattenTimeUtc(event.target.value)} placeholder="23:45" disabled={!canEdit} />
          </label>
          <label>
            Exit Offset (bps)
            <input value={exitOffsetBps} onChange={(event) => setExitOffsetBps(event.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <div className="approval-actions">
          <button className="btn btn-primary" onClick={() => void saveAutoExit()} disabled={!canEdit}>Save Auto-Exit</button>
          <button className="btn btn-ghost" onClick={() => void onRefreshTrades()}>Refresh Trades</button>
        </div>
      </div>

      <div className="risk-card">
        <div className="panel-title">Entry Autonomy (M6)</div>
        <div className="hint">Policy gates for automatic entry approvals.</div>
        <div className="log-filters">
          <label>
            Approval Mode
            <select value={approvalMode} onChange={(event) => setApprovalMode(event.target.value as EntryAutonomyConfig["approvalMode"])} disabled={!canEdit}>
              <option value="manual">Manual</option>
              <option value="policy_auto">Policy Auto</option>
            </select>
          </label>
          <label>
            Allowed Symbols (comma)
            <input value={allowedSymbols} onChange={(event) => setAllowedSymbols(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Max Per-Order Notional USD
            <input value={maxPerOrderNotionalUsd} onChange={(event) => setMaxPerOrderNotionalUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Max Open Exposure USD
            <input value={maxOpenExposureUsd} onChange={(event) => setMaxOpenExposureUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Max Daily Loss USD
            <input value={maxDailyLossUsd} onChange={(event) => setMaxDailyLossUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Max Weekly Loss USD
            <input value={maxWeeklyLossUsd} onChange={(event) => setMaxWeeklyLossUsd(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Loss Streak Cooldown Count
            <input value={lossStreakCooldownCount} onChange={(event) => setLossStreakCooldownCount(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Cooldown Minutes
            <input value={cooldownMinutes} onChange={(event) => setCooldownMinutes(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Policy Version
            <input value={policyVersion} onChange={(event) => setPolicyVersion(event.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <div className="hint">
          {`fallback=${entryAutonomy.status.fallbackActive ? "on" : "off"} strategy=${entryAutonomy.config.strategyVersion}`}
          {entryAutonomy.status.lastFallbackReason ? ` | reason=${entryAutonomy.status.lastFallbackReason}` : ""}
        </div>
        {entryAutonomy.status.lastPolicyAutoBlockers.length > 0 ? (
          <div className="hint">{`last blockers: ${entryAutonomy.status.lastPolicyAutoBlockers.join(" | ")}`}</div>
        ) : null}
        <div className="approval-actions">
          <button className="btn btn-primary" onClick={() => void saveEntryAutonomy()} disabled={!canEdit}>Save Entry Policy</button>
        </div>
      </div>

      <div className="risk-card">
        <div className="panel-title">Strategy Promotion (M6)</div>
        <div className="hint">
          {`active=${strategyPromotion.activeVersion} champion=${strategyPromotion.championVersion} previous=${strategyPromotion.previousStableVersion || "-"}`}
        </div>
        {latestPromotion ? (
          <div className="hint">{`last action=${latestPromotion.action} version=${latestPromotion.version} at=${formatTime(latestPromotion.at)}`}</div>
        ) : null}
        <div className="log-filters">
          <label>
            Register Version
            <input value={registerVersion} onChange={(event) => setRegisterVersion(event.target.value)} disabled={!canEdit} placeholder="candidate-v2" />
          </label>
          <label>
            Register Notes
            <input value={registerNotes} onChange={(event) => setRegisterNotes(event.target.value)} disabled={!canEdit} placeholder="research summary" />
          </label>
          <label>
            Research Report URL
            <input value={registerResearchUrl} onChange={(event) => setRegisterResearchUrl(event.target.value)} disabled={!canEdit} placeholder="https://..." />
          </label>
          <label>
            Challenger
            <select value={registerChallenger ? "1" : "0"} onChange={(event) => setRegisterChallenger(event.target.value === "1")} disabled={!canEdit}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
        </div>
        <div className="approval-actions">
          <button className="btn btn-primary" onClick={() => void registerStrategy()} disabled={!canEdit || !registerVersion.trim()}>Register</button>
        </div>

        <div className="log-filters" style={{ marginTop: 10 }}>
          <label>
            Promote Version
            <select value={promoteVersion} onChange={(event) => setPromoteVersion(event.target.value)} disabled={!canEdit}>
              <option value="">Select</option>
              {strategyPromotion.versions.map((item) => (
                <option key={item.version} value={item.version}>{`${item.version} (${item.stage})`}</option>
              ))}
            </select>
          </label>
          <label>
            Target Stage
            <select value={promoteStage} onChange={(event) => setPromoteStage(event.target.value as StrategyPromotionStage)} disabled={!canEdit}>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <label>
            Promote Reason
            <input value={promoteReason} onChange={(event) => setPromoteReason(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Shadow Report URL
            <input value={promoteShadowUrl} onChange={(event) => setPromoteShadowUrl(event.target.value)} disabled={!canEdit} placeholder="https://..." />
          </label>
          <label>
            Canary Report URL
            <input value={promoteCanaryUrl} onChange={(event) => setPromoteCanaryUrl(event.target.value)} disabled={!canEdit} placeholder="https://..." />
          </label>
        </div>
        <div className="approval-actions">
          <button className="btn btn-primary" onClick={() => void promoteStrategy()} disabled={!canEdit || !promoteVersion}>Promote</button>
          <input
            value={rollbackReason}
            onChange={(event) => setRollbackReason(event.target.value)}
            disabled={!canEdit}
            placeholder="Rollback reason"
            style={{ minWidth: 180 }}
          />
          <button className="btn btn-ghost" onClick={() => void onRollbackStrategy(rollbackReason.trim() || undefined)} disabled={!canEdit}>Rollback</button>
        </div>
      </div>

      <div className="risk-card">
        <div className="panel-title">Degradation Rollback Thresholds (M6)</div>
        <div className="log-filters">
          <label>
            Enabled
            <select value={degradeEnabled ? "1" : "0"} onChange={(event) => setDegradeEnabled(event.target.value === "1")} disabled={!canEdit}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </label>
          <label>
            Max Daily Loss USD
            <input value={degradeDailyLoss} onChange={(event) => setDegradeDailyLoss(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Max Drawdown %
            <input value={degradeDrawdownPct} onChange={(event) => setDegradeDrawdownPct(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Max Consecutive Losing Trades
            <input value={degradeConsecLosses} onChange={(event) => setDegradeConsecLosses(event.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <div className="approval-actions">
          <button className="btn btn-primary" onClick={() => void saveDegradationConfig()} disabled={!canEdit}>Save Degradation Config</button>
        </div>
      </div>

      <div className="subhead">{`Managed Trades (${managedTrades.length})`}</div>
      {managedTrades.length === 0 ? <div className="hint">No managed trades yet.</div> : null}
      <div className="orders-list">
        {openTrades.map((trade) => (
          <article key={trade.tradeId} className="order-row">
            <div className="order-main">
              <strong>{trade.symbol}</strong>
              <span className="tag">{trade.entrySide}</span>
              <span className="tag">{trade.status}</span>
              <span className="tag">{trade.exitReason ?? "pending"}</span>
            </div>
            <div className="order-meta">{`Entry ${trade.entryFilledQty}/${trade.requestedQty} @ ${trade.entryAvgPrice || 0}`}</div>
            <div className="order-meta">{`Exit ${trade.exitFilledQty}/${trade.entryFilledQty || trade.requestedQty} @ ${trade.exitAvgPrice || 0}`}</div>
            <div className="order-meta">{`SL ${trade.stopPrice} | TP ${trade.takeProfitPrice}`}</div>
            <div className="order-meta">{`Age ${formatDuration(timeSinceMs(trade.createdAt))} | MaxHold ${formatDuration(trade.maxHoldSec * 1000)}`}</div>
            <div className={`order-meta ${trade.realizedPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{`Realized ${fmtUsd(trade.realizedPnlUsd)} (fee ${fmtUsd(trade.feeUsd)})`}</div>
            <div className="hint">{`Updated ${formatTime(trade.updatedAt)}`}</div>
          </article>
        ))}
      </div>

      {closedTrades.length > 0 ? <div className="subhead">{`Closed (${closedTrades.length})`}</div> : null}
      <div className="orders-list">
        {closedTrades.slice(0, 25).map((trade) => (
          <article key={trade.tradeId} className="order-row">
            <div className="order-main">
              <strong>{trade.symbol}</strong>
              <span className="tag">closed</span>
              <span className="tag">{trade.exitReason ?? "unknown"}</span>
            </div>
            <div className={`order-meta ${trade.realizedPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{`Realized ${fmtUsd(trade.realizedPnlUsd)}`}</div>
            <div className="hint">{`Closed ${trade.closedAt ? formatTime(trade.closedAt) : "-"}`}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
