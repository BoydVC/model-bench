export function formatCost(usd: number): string {
  if (!Number.isFinite(usd)) return "—";
  const sign = usd < 0 ? "-" : "";
  const abs = Math.abs(usd);
  const cents = abs * 100;
  if (abs === 0) return "0¢";
  if (cents < 1) return `${sign}${cents.toFixed(2)}¢`;
  if (abs < 1) return `${sign}${cents.toFixed(1)}¢`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

export function formatPct(rate: number): string {
  if (!Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function formatRecord(wins: number, losses: number, ties: number): string {
  return `${wins}–${losses}–${ties}`;
}
