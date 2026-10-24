import type { CheckOutcome, CheckSpec } from "./types";

function pointsOf(spec: { points?: number }): number {
  return spec.points ?? 1;
}

function matches(haystack: string, needle: string, caseSensitive?: boolean): boolean {
  if (caseSensitive) return haystack.includes(needle);
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function runDeclarativeChecks(
  checks: CheckSpec[],
  output: string,
): CheckOutcome[] {
  const outcomes: CheckOutcome[] = [];
  for (const check of checks) {
    if (check.type === "harness") continue;
    const max = pointsOf(check);
    if (check.type === "contains") {
      const ok = matches(output, check.value, check.caseSensitive);
      outcomes.push({
        id: check.id,
        points: ok ? max : 0,
        max,
        detail: ok ? `Found “${check.value}”.` : `Missing “${check.value}”.`,
      });
      continue;
    }
    if (check.type === "not_contains") {
      const ok = !matches(output, check.value, check.caseSensitive);
      outcomes.push({
        id: check.id,
        points: ok ? max : 0,
        max,
        detail: ok
          ? `Did not include “${check.value}”.`
          : `Included “${check.value}”, which the task forbids.`,
      });
      continue;
    }
    if (check.type === "regex" || check.type === "regex_min") {
      let expression: RegExp;
      try {
        const flags = check.flags ?? (check.type === "regex_min" ? "g" : "");
        expression = new RegExp(check.pattern, flags);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        outcomes.push({ id: check.id, points: 0, max, detail: `Bad pattern: ${detail}` });
        continue;
      }
      if (check.type === "regex") {
        const ok = expression.test(output);
        outcomes.push({
          id: check.id,
          points: ok ? max : 0,
          max,
          detail: ok ? "Pattern matched." : "Pattern did not match.",
        });
        continue;
      }
      const flags = expression.flags.includes("g")
        ? expression.flags
        : `${expression.flags}g`;
      const global = new RegExp(expression.source, flags);
      const found = output.match(global)?.length ?? 0;
      const ok = found >= check.min;
      outcomes.push({
        id: check.id,
        points: ok ? max : 0,
        max,
        detail: ok
          ? `Found ${found} matches (need ${check.min}).`
          : `Found ${found} matches, need at least ${check.min}.`,
      });
      continue;
    }
    const count = wordCount(output);
    const ok = count >= check.min && count <= check.max;
    outcomes.push({
      id: check.id,
      points: ok ? max : 0,
      max,
      detail: ok
        ? `${count} words, inside ${check.min}–${check.max}.`
        : `${count} words, outside ${check.min}–${check.max}.`,
    });
  }
  return outcomes;
}
