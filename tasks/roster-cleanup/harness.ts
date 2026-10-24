import { extractJson } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

const GOLD = [
  {
    name: "Mei Chen",
    email: "mei.chen@example.com",
    title: "Director of Platform",
    location: "NYC",
    startDate: "2024-03-02",
  },
  {
    name: "Jordan Blake",
    email: "jordan.blake@example.com",
    title: "Staff Engineer",
    location: "Remote",
    startDate: "2023-11-01",
  },
  {
    name: "Arun Patel",
    email: "arun.patel@example.com",
    title: "Data Lead",
    location: "London",
    startDate: "2024-01-15",
  },
];

const FIELDS = ["name", "email", "title", "location", "startDate"] as const;

export function run(output: string): CheckOutcome[] {
  let rows: Record<string, unknown>[];
  try {
    const parsed = extractJson(output);
    if (!Array.isArray(parsed)) throw new Error("Expected a JSON array.");
    rows = parsed as Record<string, unknown>[];
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [{ id: "roster", points: 0, max: 16, detail }];
  }
  const outcomes: CheckOutcome[] = [];
  for (const gold of GOLD) {
    const actual = rows.find(
      (row) => String(row.email ?? "").trim().toLowerCase() === gold.email,
    );
    if (!actual) {
      outcomes.push({ id: gold.email, points: 0, max: FIELDS.length, detail: "No row with that email." });
      continue;
    }
    const misses = FIELDS.filter((field) => actual[field] !== gold[field]);
    outcomes.push({
      id: gold.email,
      points: FIELDS.length - misses.length,
      max: FIELDS.length,
      detail: misses.length ? `Mismatch: ${misses.join(", ")}.` : "All five fields match.",
    });
  }
  const goldEmails = new Set(GOLD.map((row) => row.email));
  const extras = rows.filter(
    (row) => !goldEmails.has(String(row.email ?? "").trim().toLowerCase()),
  );
  outcomes.push({
    id: "no-extras",
    points: extras.length === 0 && rows.length === GOLD.length ? 1 : 0,
    max: 1,
    detail: extras.length ? `Unexpected rows: ${extras.map((row) => String(row.email ?? row.name)).join(", ")}.` : "No extra rows.",
  });
  return outcomes;
}
