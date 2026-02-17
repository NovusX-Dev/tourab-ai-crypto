import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AuditItem, BotStateSnapshot, IncidentItem, IncidentStatus, ReconciliationStatus } from "@tourab/shared";

interface IncidentCreateInput {
  id: string;
  severity: IncidentItem["severity"];
  taxonomy: IncidentItem["taxonomy"];
  title: string;
  detail: string;
  runbookRef: string;
  symbol?: string;
  sourceAlertCode?: string;
  owner?: string;
}

export class SqliteOpsStore {
  private constructor(private readonly db: DatabaseSync) {}

  static async open(filePath: string): Promise<SqliteOpsStore> {
    await mkdir(dirname(filePath), { recursive: true });
    const db = new DatabaseSync(filePath);
    const store = new SqliteOpsStore(db);
    store.init();
    return store;
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_entries (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        symbol TEXT,
        related_event_type TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_entries_at ON audit_entries(at DESC);

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        severity TEXT NOT NULL,
        taxonomy TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        runbook_ref TEXT NOT NULL,
        symbol TEXT,
        source_alert_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        owner TEXT,
        acknowledged_by TEXT,
        acknowledged_at TEXT,
        resolved_by TEXT,
        resolved_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_alert ON incidents(source_alert_code, status);

      CREATE TABLE IF NOT EXISTS runtime_state (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  loadBotState(): BotStateSnapshot | undefined {
    const row = this.db.prepare(`SELECT value_json FROM runtime_state WHERE key = 'bot_state'`).get() as
      | { value_json: string }
      | undefined;
    if (!row) {
      return undefined;
    }
    return JSON.parse(row.value_json) as BotStateSnapshot;
  }

  saveBotState(state: BotStateSnapshot): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO runtime_state (key, value_json, updated_at)
         VALUES ('bot_state', ?, ?)`
      )
      .run(JSON.stringify(state), new Date().toISOString());
  }

  loadReconciliation(): ReconciliationStatus | undefined {
    const row = this.db.prepare(`SELECT value_json FROM runtime_state WHERE key = 'reconciliation'`).get() as
      | { value_json: string }
      | undefined;
    if (!row) {
      return undefined;
    }
    return JSON.parse(row.value_json) as ReconciliationStatus;
  }

  saveReconciliation(state: ReconciliationStatus): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO runtime_state (key, value_json, updated_at)
         VALUES ('reconciliation', ?, ?)`
      )
      .run(JSON.stringify(state), new Date().toISOString());
  }

  listAudit(limit = 300): AuditItem[] {
    const rows = this.db
      .prepare(
        `SELECT id, at, title, detail, symbol, related_event_type
         FROM audit_entries
         ORDER BY at DESC
         LIMIT ?`
      )
      .all(limit) as Array<{
      id: string;
      at: string;
      title: string;
      detail: string;
      symbol: string | null;
      related_event_type: AuditItem["relatedEventType"] | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      at: row.at,
      title: row.title,
      detail: row.detail,
      symbol: row.symbol ?? undefined,
      relatedEventType: row.related_event_type ?? undefined
    }));
  }

  appendAudit(item: AuditItem): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO audit_entries (id, at, title, detail, symbol, related_event_type)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(item.id, item.at, item.title, item.detail, item.symbol ?? null, item.relatedEventType ?? null);

    this.db
      .prepare(
        `DELETE FROM audit_entries
         WHERE id IN (
           SELECT id FROM audit_entries
           ORDER BY at DESC
           LIMIT -1 OFFSET 300
         )`
      )
      .run();
  }

  listIncidents(status?: IncidentStatus, limit = 300): IncidentItem[] {
    const rows = (status
      ? this.db
          .prepare(
            `SELECT * FROM incidents
             WHERE status = ?
             ORDER BY updated_at DESC
             LIMIT ?`
          )
          .all(status, limit)
      : this.db
          .prepare(
            `SELECT * FROM incidents
             ORDER BY updated_at DESC
             LIMIT ?`
          )
          .all(limit)) as Array<{
      id: string;
      status: IncidentItem["status"];
      severity: IncidentItem["severity"];
      taxonomy: IncidentItem["taxonomy"];
      title: string;
      detail: string;
      runbook_ref: string;
      symbol: string | null;
      source_alert_code: string | null;
      created_at: string;
      updated_at: string;
      owner: string | null;
      acknowledged_by: string | null;
      acknowledged_at: string | null;
      resolved_by: string | null;
      resolved_at: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      severity: row.severity,
      taxonomy: row.taxonomy,
      title: row.title,
      detail: row.detail,
      runbookRef: row.runbook_ref,
      symbol: row.symbol ?? undefined,
      sourceAlertCode: row.source_alert_code ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      owner: row.owner ?? undefined,
      acknowledgedBy: row.acknowledged_by ?? undefined,
      acknowledgedAt: row.acknowledged_at ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
      resolvedAt: row.resolved_at ?? undefined
    }));
  }

  findOpenIncidentByAlert(code: string, symbol?: string): IncidentItem | undefined {
    const row = this.db
      .prepare(
        `SELECT * FROM incidents
         WHERE source_alert_code = ?
           AND COALESCE(symbol, '') = COALESCE(?, '')
           AND status != 'resolved'
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get(code, symbol ?? null) as
      | {
          id: string;
          status: IncidentItem["status"];
          severity: IncidentItem["severity"];
          taxonomy: IncidentItem["taxonomy"];
          title: string;
          detail: string;
          runbook_ref: string;
          symbol: string | null;
          source_alert_code: string | null;
          created_at: string;
          updated_at: string;
          owner: string | null;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      status: row.status,
      severity: row.severity,
      taxonomy: row.taxonomy,
      title: row.title,
      detail: row.detail,
      runbookRef: row.runbook_ref,
      symbol: row.symbol ?? undefined,
      sourceAlertCode: row.source_alert_code ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      owner: row.owner ?? undefined,
      acknowledgedBy: row.acknowledged_by ?? undefined,
      acknowledgedAt: row.acknowledged_at ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
      resolvedAt: row.resolved_at ?? undefined
    };
  }

  createIncident(input: IncidentCreateInput): IncidentItem {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO incidents (
          id, status, severity, taxonomy, title, detail, runbook_ref,
          symbol, source_alert_code, created_at, updated_at, owner,
          acknowledged_by, acknowledged_at, resolved_by, resolved_at
        ) VALUES (?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`
      )
      .run(
        input.id,
        input.severity,
        input.taxonomy,
        input.title,
        input.detail,
        input.runbookRef,
        input.symbol ?? null,
        input.sourceAlertCode ?? null,
        now,
        now,
        input.owner ?? null
      );

    return {
      id: input.id,
      status: "open",
      severity: input.severity,
      taxonomy: input.taxonomy,
      title: input.title,
      detail: input.detail,
      runbookRef: input.runbookRef,
      symbol: input.symbol,
      sourceAlertCode: input.sourceAlertCode,
      createdAt: now,
      updatedAt: now,
      owner: input.owner
    };
  }

  updateIncidentStatus(id: string, status: IncidentStatus, actor: string): IncidentItem | undefined {
    const current = this.db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(id) as
      | {
          id: string;
          status: IncidentItem["status"];
          severity: IncidentItem["severity"];
          taxonomy: IncidentItem["taxonomy"];
          title: string;
          detail: string;
          runbook_ref: string;
          symbol: string | null;
          source_alert_code: string | null;
          created_at: string;
          updated_at: string;
          owner: string | null;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
        }
      | undefined;

    if (!current) {
      return undefined;
    }

    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE incidents
         SET status = ?,
             updated_at = ?,
             acknowledged_by = CASE WHEN ? = 'acknowledged' THEN ? ELSE acknowledged_by END,
             acknowledged_at = CASE WHEN ? = 'acknowledged' THEN ? ELSE acknowledged_at END,
             resolved_by = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_by END,
             resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_at END
         WHERE id = ?`
      )
      .run(status, now, status, actor, status, now, status, actor, status, now, id);

    const updated = this.db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(id) as {
      id: string;
      status: IncidentItem["status"];
      severity: IncidentItem["severity"];
      taxonomy: IncidentItem["taxonomy"];
      title: string;
      detail: string;
      runbook_ref: string;
      symbol: string | null;
      source_alert_code: string | null;
      created_at: string;
      updated_at: string;
      owner: string | null;
      acknowledged_by: string | null;
      acknowledged_at: string | null;
      resolved_by: string | null;
      resolved_at: string | null;
    };

    return {
      id: updated.id,
      status: updated.status,
      severity: updated.severity,
      taxonomy: updated.taxonomy,
      title: updated.title,
      detail: updated.detail,
      runbookRef: updated.runbook_ref,
      symbol: updated.symbol ?? undefined,
      sourceAlertCode: updated.source_alert_code ?? undefined,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      owner: updated.owner ?? undefined,
      acknowledgedBy: updated.acknowledged_by ?? undefined,
      acknowledgedAt: updated.acknowledged_at ?? undefined,
      resolvedBy: updated.resolved_by ?? undefined,
      resolvedAt: updated.resolved_at ?? undefined
    };
  }

  close(): void {
    this.db.close();
  }
}
