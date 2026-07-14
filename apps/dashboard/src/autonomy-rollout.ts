export interface Milestone5EvidenceDayLike {
  day: string;
  pass: boolean;
  source: "soak_report" | "live";
}

export interface Milestone5EvidenceSummaryLike {
  requiredDays: number;
  qualifiedDays: number;
  streakDays: number;
  today: {
    day: string;
    pass: boolean;
  };
  days: Milestone5EvidenceDayLike[];
}

export interface DemoPolicyAutoReadiness {
  ok: boolean;
  qualifiedDays: number;
  requiredDays: number;
  latestPassingEvidenceDay?: string;
  latestEvidenceAgeDays?: number;
  fresh: boolean;
  reasons: string[];
}

function dayToEpoch(day: string | undefined): number | undefined {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return undefined;
  }
  const epoch = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(epoch) ? epoch : undefined;
}

function asUtcDay(nowIso: string): string {
  return nowIso.slice(0, 10);
}

export function evaluateDemoPolicyAutoReadiness(
  evidence: Milestone5EvidenceSummaryLike,
  nowIso: string,
  options?: {
    allowTodayLivePassForFreshness?: boolean;
  }
): DemoPolicyAutoReadiness {
  const nowDay = asUtcDay(nowIso);
  const completedPassingDays = evidence.days.filter((item) => {
    if (!item.pass) {
      return false;
    }
    if (item.source === "soak_report") {
      return true;
    }
    return item.day < nowDay;
  });
  const freshTodayLivePass = options?.allowTodayLivePassForFreshness === true && evidence.today.day === nowDay && evidence.today.pass;
  const latestPassingEvidenceDay = freshTodayLivePass ? nowDay : completedPassingDays[0]?.day;
  const latestPassingEpoch = dayToEpoch(latestPassingEvidenceDay);
  const nowEpoch = dayToEpoch(nowDay);
  const latestEvidenceAgeDays =
    latestPassingEpoch !== undefined && nowEpoch !== undefined
      ? Math.max(0, Math.floor((nowEpoch - latestPassingEpoch) / 86_400_000))
      : undefined;
  const fresh = latestEvidenceAgeDays !== undefined ? latestEvidenceAgeDays <= 7 : false;
  const reasons: string[] = [];
  if (completedPassingDays.length < evidence.requiredDays) {
    reasons.push(`qualifiedDays=${completedPassingDays.length}/${evidence.requiredDays}`);
  }
  if (!fresh) {
    reasons.push(
      latestPassingEvidenceDay
        ? `latestPassingDay=${latestPassingEvidenceDay} is stale`
        : "no completed passing evidence day available"
    );
  }
  return {
    ok: reasons.length === 0,
    qualifiedDays: completedPassingDays.length,
    requiredDays: evidence.requiredDays,
    latestPassingEvidenceDay,
    latestEvidenceAgeDays,
    fresh,
    reasons
  };
}
