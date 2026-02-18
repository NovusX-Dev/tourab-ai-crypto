import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { BotEvent, EventSeverity, EventType } from "@tourab/shared";

export interface EventQueryInput {
  limit?: number;
  cursor?: string;
  type?: EventType;
  symbol?: string;
  severity?: EventSeverity;
}

export class SqliteEventStore {
  private constructor(private readonly db: DatabaseSync) {}

  static async open(filePath: string): Promise<SqliteEventStore> {
    await mkdir(dirname(filePath), { recursive: true });
    const db = new DatabaseSync(filePath);
    const store = new SqliteEventStore(db);
    store.init();
    return store;
  }

  private init(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA synchronous = NORMAL;
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bot_events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        tags_json TEXT,
        correlation_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_bot_events_timestamp ON bot_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_bot_events_type ON bot_events(type);
      CREATE INDEX IF NOT EXISTS idx_bot_events_symbol ON bot_events(symbol);
      CREATE INDEX IF NOT EXISTS idx_bot_events_severity ON bot_events(severity);
    `);
  }

  async append(event: BotEvent): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO bot_events (
          id, timestamp, type, symbol, message, severity, tags_json, correlation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        event.timestamp,
        event.type,
        event.symbol,
        event.message,
        event.severity,
        event.tags ? JSON.stringify(event.tags) : null,
        event.correlationId ?? null
      );
  }

  deleteOlderThan(cutoffIso: string): number {
    const result = this.db.prepare(`DELETE FROM bot_events WHERE timestamp < ?`).run(cutoffIso) as { changes?: number };
    return result.changes ?? 0;
  }

  clearAll(): number {
    const result = this.db.prepare(`DELETE FROM bot_events`).run() as { changes?: number };
    return result.changes ?? 0;
  }

  async readAll(limit = 500): Promise<BotEvent[]> {
    const rows = this.db
      .prepare(
        `SELECT id, timestamp, type, symbol, message, severity, tags_json, correlation_id
         FROM bot_events
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(limit) as Array<{
      id: string;
      timestamp: string;
      type: EventType;
      symbol: string;
      message: string;
      severity: EventSeverity;
      tags_json: string | null;
      correlation_id: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      type: row.type,
      symbol: row.symbol,
      message: row.message,
      severity: row.severity,
      tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : undefined,
      correlationId: row.correlation_id ?? undefined
    }));
  }

  async query(input: EventQueryInput): Promise<BotEvent[]> {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (input.type) {
      clauses.push("type = ?");
      params.push(input.type);
    }
    if (input.symbol) {
      clauses.push("symbol = ?");
      params.push(input.symbol);
    }
    if (input.severity) {
      clauses.push("severity = ?");
      params.push(input.severity);
    }
    if (input.cursor) {
      const cursor = this.db.prepare(`SELECT timestamp FROM bot_events WHERE id = ?`).get(input.cursor) as
        | { timestamp: string }
        | undefined;
      if (cursor) {
        clauses.push("timestamp < ?");
        params.push(cursor.timestamp);
      }
    }

    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 500) : 100;
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `SELECT id, timestamp, type, symbol, message, severity, tags_json, correlation_id
         FROM bot_events
         ${where}
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(...params, limit) as Array<{
      id: string;
      timestamp: string;
      type: EventType;
      symbol: string;
      message: string;
      severity: EventSeverity;
      tags_json: string | null;
      correlation_id: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      type: row.type,
      symbol: row.symbol,
      message: row.message,
      severity: row.severity,
      tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : undefined,
      correlationId: row.correlation_id ?? undefined
    }));
  }

  close(): void {
    this.db.close();
  }
}
