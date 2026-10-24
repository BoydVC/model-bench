import { extractJson } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

const GOLD = [
  {
    trace: "tr_b",
    service: "billing",
    firstSeen: "2026-06-01T12:00:02Z",
    count: 3,
    sample: "currency column missing",
  },
  {
    trace: "tr_d",
    service: "auth",
    firstSeen: "2026-06-01T12:00:05Z",
    count: 1,
    sample: "jwks timeout",
  },
];

const FIELDS = ["service", "firstSeen", "count", "sample"] as const;

export function run(output: string): CheckOutcome[] {
  let incidents: Record<string, unknown>[] = [];
  try {
    const parsed = extractJson(output) as { incidents?: unknown };
    if (!Array.isArray(parsed.incidents)) throw new Error("Expected { incidents: [] }.");
    incidents = parsed.incidents as Record<string, unknown>[];
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [{ id: "incidents", points: 0, max: 14, detail }];
  }
  const outcomes: CheckOutcome[] = [];
  for (const gold of GOLD) {
    const actual = incidents.find((row) => row.trace === gold.trace);
    if (!actual) {
      outcomes.push({ id: gold.trace, points: 0, max: 5, detail: "Trace missing." });
      continue;
    }
    const misses = FIELDS.filter((field) => actual[field] !== gold[field]);
    outcomes.push({
      id: gold.trace,
      points: 1 + (FIELDS.length - misses.length),
      max: 5,
      detail: misses.length ? `Trace found. Mismatch: ${misses.join(", ")}.` : "Trace matches.",
    });
  }
  const expected = new Set(GOLD.map((row) => row.trace));
  const extras = incidents.filter((row) => !expected.has(String(row.trace)));
  outcomes.push({
    id: "no-extras",
    points: extras.length === 0 ? 4 : 0,
    max: 4,
    detail: extras.length
      ? `Unexpected traces: ${extras.map((row) => String(row.trace)).join(", ")}.`
      : "No extra traces.",
  });
  return outcomes;
}
