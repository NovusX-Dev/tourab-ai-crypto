import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { SqliteEventStore } from "../apps/dashboard/src/mission-control/sqlite-event-store.js";

describe("sqlite event store", () => {
  it("keeps duplicate event ids idempotent via insert-or-replace", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-event-store-"));
    const dbPath = join(tempDir, "events.sqlite");
    const store = await SqliteEventStore.open(dbPath);
    try {
      await store.append({
        id: "evt-dup-1",
        timestamp: "2026-02-25T09:00:00.000Z",
        type: "System",
        symbol: "SYS",
        message: "first",
        severity: "info"
      });
      await store.append({
        id: "evt-dup-1",
        timestamp: "2026-02-25T09:00:01.000Z",
        type: "System",
        symbol: "SYS",
        message: "replaced",
        severity: "info"
      });

      const events = await store.readAll(10);
      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe("evt-dup-1");
      expect(events[0]?.message).toBe("replaced");
      expect(events[0]?.timestamp).toBe("2026-02-25T09:00:01.000Z");
    } finally {
      store.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
