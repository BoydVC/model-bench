import { extractJson } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

const KEEP = ["T1", "T2", "T4", "T5", "T6", "T8"];

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function run(output: string): CheckOutcome[] {
  let parsed: { keep?: unknown; merged?: Record<string, unknown> };
  try {
    parsed = extractJson(output) as { keep?: unknown; merged?: Record<string, unknown> };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [{ id: "dedupe", points: 0, max: 12, detail }];
  }
  const keep = new Set(asStrings(parsed.keep));
  const merged = parsed.merged ?? {};
  const outcomes: CheckOutcome[] = KEEP.map((id) => ({
    id: `keep-${id}`,
    points: keep.has(id) ? 1 : 0,
    max: 1,
    detail: keep.has(id) ? `${id} is kept.` : `${id} is missing from keep.`,
  }));
  const extraKeep = [...keep].filter((id) => !KEEP.includes(id));
  outcomes.push({
    id: "keep-exact",
    points: extraKeep.length === 0 && keep.size === KEEP.length ? 1 : 0,
    max: 1,
    detail: extraKeep.length ? `Unexpected keep ids: ${extraKeep.join(", ")}.` : "Keep set matches.",
  });
  const group = (id: string) => asStrings(merged[id]).slice().sort().join(",");
  outcomes.push({
    id: "merge-t1",
    points: group("T1") === "T3" ? 2 : 0,
    max: 2,
    detail: `T1 merged ${group("T1") || "nothing"}.`,
  });
  outcomes.push({
    id: "merge-t6",
    points: group("T6") === "T7" ? 2 : 0,
    max: 2,
    detail: `T6 merged ${group("T6") || "nothing"}.`,
  });
  const keys = Object.keys(merged).sort().join(",");
  outcomes.push({
    id: "merge-keys",
    points: keys === "T1,T6" ? 1 : 0,
    max: 1,
    detail: keys ? `Merge keys: ${keys}.` : "No merge keys.",
  });
  return outcomes;
}
