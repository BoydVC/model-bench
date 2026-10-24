import fs from "node:fs";
import type { BenchEnv } from "./types";

/** Fill missing keys from a dotenv file. Existing environment values win. */
export function loadDotEnvFile(file: string, env: BenchEnv = process.env): void {
  if (!fs.existsSync(file)) return;
  applyDotEnv(fs.readFileSync(file, "utf8"), env);
}

export function applyDotEnv(text: string, env: BenchEnv): void {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (env[key] === undefined) env[key] = value;
  }
}

/** `--mode` on the command line wins. Otherwise `MODEL_BENCH_MODE`, then the flag default. */
export function resolveRequestedMode(
  argv: string[],
  flagValue: string | undefined,
  envValue: string | undefined,
): string | undefined {
  const flagged = argv.some((arg) => arg === "--mode" || arg.startsWith("--mode="));
  if (flagged) return flagValue;
  return envValue || flagValue;
}
