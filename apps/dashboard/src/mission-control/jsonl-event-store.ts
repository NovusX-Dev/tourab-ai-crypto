import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BotEvent, EventSeverity, EventType } from "@tourab/shared";

export interface EventQueryInput {
  limit?: number;
  cursor?: string;
  type?: EventType;
  symbol?: string;
  severity?: EventSeverity;
}

export class JsonlEventStore {
  constructor(private readonly filePath: string) {}

  async append(event: BotEvent): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, "utf-8");
  }

  async readAll(): Promise<BotEvent[]> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as BotEvent)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async query(input: EventQueryInput): Promise<BotEvent[]> {
    const all = await this.readAll();
    const filtered = all.filter((event) => {
      if (input.type && event.type !== input.type) {
        return false;
      }
      if (input.symbol && event.symbol !== input.symbol) {
        return false;
      }
      if (input.severity && event.severity !== input.severity) {
        return false;
      }
      return true;
    });

    const paged = (() => {
      if (!input.cursor) {
        return filtered;
      }
      const cursorIndex = filtered.findIndex((event) => event.id === input.cursor);
      if (cursorIndex < 0) {
        return filtered;
      }
      return filtered.slice(cursorIndex + 1);
    })();

    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 500) : 100;
    return paged.slice(0, limit);
  }
}
