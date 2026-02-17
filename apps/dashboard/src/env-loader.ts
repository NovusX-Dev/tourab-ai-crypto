import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { join } from "node:path";

export interface EnvLoaderOptions {
  override?: boolean;
}

export function loadEnvFileIfPresent(filePath: string, options: EnvLoaderOptions = {}): void {
  const { override = false } = options;
  if (!existsSync(filePath)) {
    return;
  }
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || (!override && process.env[key] !== undefined)) {
      continue;
    }
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function loadEnvFromProjectRoot(cwd = process.cwd(), options: EnvLoaderOptions = {}): void {
  loadEnvFileIfPresent(join(cwd, ".env"), options);
}
