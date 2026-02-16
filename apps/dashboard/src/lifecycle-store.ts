import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface OrderLedgerRecord {
  type: "ORDER_SUBMITTED" | "ORDER_CANCEL_REQUESTED" | "ORDER_CANCELED";
  ts: string;
  symbol: string;
  side?: "buy" | "sell";
  qtyBase?: number;
  limitPrice?: number;
  proposalId?: string;
  ordId?: string;
  clOrdId?: string;
  raw?: Record<string, unknown>;
}

export async function appendOrderLedgerRecord(path: string, record: OrderLedgerRecord): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, "utf-8");
}

export async function readOrderLedger(path: string): Promise<OrderLedgerRecord[]> {
  try {
    const raw = await readFile(path, "utf-8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as OrderLedgerRecord);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
