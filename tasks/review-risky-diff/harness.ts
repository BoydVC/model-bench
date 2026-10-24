import { extractJson } from "../../src/bench/sandbox";

type Finding = { severity?: string; file?: string; issue?: string; suggestion?: string };

function outcome(id: string, ok: boolean, detail: string): { id: string; points: number; max: number; detail: string } {
  return { id, points: ok ? 1 : 0, max: 1, detail };
}

export function run(output: string) {
  const raw = output.toLowerCase();
  const results = [
    outcome(
      "mentions-logged-key",
      raw.includes("api.ts") && /key|secret/.test(raw),
      raw.includes("api.ts") ? "Mentions src/api.ts." : "Does not mention src/api.ts.",
    ),
    outcome(
      "mentions-sql",
      raw.includes("search.ts") && raw.includes("sql"),
      raw.includes("search.ts") ? "Mentions src/search.ts." : "Does not mention src/search.ts.",
    ),
  ];
  let findings: Finding[] = [];
  try {
    const parsed = extractJson(output) as { findings?: unknown };
    if (!Array.isArray(parsed.findings)) throw new Error("findings is not an array.");
    findings = parsed.findings as Finding[];
    results.push(outcome("json", true, "Parsed a findings array."));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    for (const id of ["json", "key-finding", "key-severity", "sql-finding", "no-copyright"]) {
      results.push(outcome(id, false, detail));
    }
    return results;
  }
  const blob = (finding: Finding) => `${finding.issue ?? ""} ${finding.suggestion ?? ""}`;
  const key = findings.find((finding) => String(finding.file ?? "").includes("api.ts") && /key|secret|token/i.test(blob(finding)));
  const sql = findings.find((finding) => String(finding.file ?? "").includes("search.ts") && /sql|concatenat/i.test(blob(finding)));
  const copyright = findings.some((finding) => /copyright/i.test(`${finding.file ?? ""} ${blob(finding)}`));
  results.push(outcome("key-finding", Boolean(key), key ? "Finding covers the logged key." : "No finding for the logged key."));
  results.push(
    outcome(
      "key-severity",
      String(key?.severity ?? "").toLowerCase() === "high",
      key ? `Key severity is ${key.severity}.` : "No key finding to score.",
    ),
  );
  results.push(outcome("sql-finding", Boolean(sql), sql ? "Finding covers the SQL concatenation." : "No SQL finding."));
  results.push(
    outcome("no-copyright", !copyright, copyright ? "A finding mentions the copyright header." : "No copyright finding."),
  );
  return results;
}
