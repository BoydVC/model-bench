import { extractJson } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

const GOLD: Record<string, string> = {
  R1: "access",
  R2: "incident",
  R3: "data",
  R4: "vendor",
  R5: "other",
  R6: "data",
  R7: "access",
  R8: "vendor",
};

export function run(output: string): CheckOutcome[] {
  let labels: Record<string, unknown> = {};
  try {
    const parsed = extractJson(output) as { labels?: Record<string, unknown> };
    if (!parsed.labels || typeof parsed.labels !== "object") throw new Error("Expected { labels }.");
    labels = parsed.labels;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return Object.keys(GOLD).map((id) => ({ id, points: 0, max: 1, detail }));
  }
  return Object.entries(GOLD).map(([id, expected]) => {
    const actual = String(labels[id] ?? "");
    return {
      id,
      points: actual === expected ? 1 : 0,
      max: 1,
      detail: actual === expected ? `${id} is ${expected}.` : `${id} labeled ${actual || "missing"}, expected ${expected}.`,
    };
  });
}
