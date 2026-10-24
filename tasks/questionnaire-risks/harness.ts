import { extractJson } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

const EXPECTED: { id: string; severity: string; evidence: RegExp }[] = [
  { id: "no-sso", severity: "high", evidence: /password/i },
  { id: "unknown-subprocessors", severity: "high", evidence: /not available/i },
  { id: "short-log-retention", severity: "medium", evidence: /\b14\b/ },
  { id: "training-default", severity: "high", evidence: /opt/i },
];

type Risk = { id?: string; severity?: string; evidence?: string };

export function run(output: string): CheckOutcome[] {
  let risks: Risk[] = [];
  try {
    const parsed = extractJson(output) as { risks?: unknown };
    if (!Array.isArray(parsed.risks)) throw new Error("Expected { risks: [] }.");
    risks = parsed.risks as Risk[];
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [{ id: "risks", points: 0, max: 15, detail }];
  }
  const outcomes: CheckOutcome[] = [];
  for (const expected of EXPECTED) {
    const found = risks.find((risk) => risk.id === expected.id);
    outcomes.push({
      id: `${expected.id}-present`,
      points: found ? 1 : 0,
      max: 1,
      detail: found ? "Present." : "Missing.",
    });
    outcomes.push({
      id: `${expected.id}-severity`,
      points: String(found?.severity ?? "").toLowerCase() === expected.severity ? 1 : 0,
      max: 1,
      detail: found ? `Severity is ${found.severity}.` : "No row to score.",
    });
    const evidence = String(found?.evidence ?? "");
    outcomes.push({
      id: `${expected.id}-evidence`,
      points: expected.evidence.test(evidence) ? 1 : 0,
      max: 1,
      detail: evidence ? "Evidence checked against the source wording." : "Evidence is empty.",
    });
  }
  const allowed = new Set(EXPECTED.map((item) => item.id));
  const extras = risks.filter((risk) => !allowed.has(String(risk.id)));
  outcomes.push({
    id: "no-extras",
    points: extras.length === 0 ? 3 : 0,
    max: 3,
    detail: extras.length ? `Unexpected ids: ${extras.map((risk) => risk.id).join(", ")}.` : "No invented risks.",
  });
  return outcomes;
}
