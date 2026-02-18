export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function timeSinceMs(iso: string): number {
  return Date.now() - new Date(iso).getTime();
}

export function formatDuration(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) {
    return `${sec}s`;
  }
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

export function formatEquityRoundedThousands(value: string | number): string {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return "0.000";
  }
  return parsed.toFixed(3);
}
