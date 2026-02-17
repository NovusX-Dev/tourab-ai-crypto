import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AlertItem, AlertStatus } from "@tourab/shared";

export class JsonlAlertStore {
  constructor(private readonly filePath: string) {}

  private async persist(items: AlertItem[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const body = items.map((item) => JSON.stringify(item)).join("\n");
    await writeFile(this.filePath, body.length > 0 ? `${body}\n` : "", "utf-8");
  }

  async readAll(): Promise<AlertItem[]> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as AlertItem)
        .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async list(status?: AlertStatus): Promise<AlertItem[]> {
    const items = await this.readAll();
    if (!status) {
      return items;
    }
    return items.filter((item) => item.status === status);
  }

  async upsert(alert: AlertItem): Promise<AlertItem> {
    const items = await this.readAll();
    const index = items.findIndex((item) => item.id === alert.id);
    if (index >= 0) {
      items[index] = alert;
    } else {
      items.unshift(alert);
    }
    const trimmed = items.slice(0, 500);
    await this.persist(trimmed);
    return alert;
  }

  async findByFingerprint(code: string, symbol?: string): Promise<AlertItem | undefined> {
    const items = await this.readAll();
    return items.find((item) => item.code === code && item.symbol === symbol && item.status !== "resolved");
  }

  async updateStatus(id: string, status: AlertStatus, actor: string): Promise<AlertItem | undefined> {
    const items = await this.readAll();
    const existing = items.find((item) => item.id === id);
    if (!existing) {
      return undefined;
    }

    const now = new Date().toISOString();
    const updated: AlertItem = {
      ...existing,
      status,
      ...(status === "acknowledged"
        ? {
            acknowledgedBy: actor,
            acknowledgedAt: now
          }
        : {}),
      ...(status === "resolved"
        ? {
            resolvedBy: actor,
            resolvedAt: now
          }
        : {})
    };

    const next = items.map((item) => (item.id === id ? updated : item));
    await this.persist(next);
    return updated;
  }
}
