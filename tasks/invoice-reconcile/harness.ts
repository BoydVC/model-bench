import { extractJson } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

const MATCHED = ["B1|C1", "B2|C2"];
const BILLING = ["B3", "B4"];
const CARD = ["C3", "C4"];

export function run(output: string): CheckOutcome[] {
  let parsed: {
    matched?: { billingId?: string; cardId?: string }[];
    billingOnly?: string[];
    cardOnly?: string[];
  };
  try {
    parsed = extractJson(output) as typeof parsed;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [{ id: "reconcile", points: 0, max: 9, detail }];
  }
  const matched = new Set(
    (parsed.matched ?? []).map((pair) => `${pair.billingId}|${pair.cardId}`),
  );
  const billing = new Set((parsed.billingOnly ?? []).map((id) => String(id)));
  const card = new Set((parsed.cardOnly ?? []).map((id) => String(id)));
  const outcomes: CheckOutcome[] = [];
  for (const pair of MATCHED) {
    outcomes.push({
      id: `match-${pair}`,
      points: matched.has(pair) ? 1 : 0,
      max: 1,
      detail: matched.has(pair) ? `Matched ${pair}.` : `Missing match ${pair}.`,
    });
  }
  const extraMatches = [...matched].filter((pair) => !MATCHED.includes(pair));
  outcomes.push({
    id: "no-extra-matches",
    points: extraMatches.length === 0 ? 1 : 0,
    max: 1,
    detail: extraMatches.length ? `Unexpected matches: ${extraMatches.join(", ")}.` : "No unexpected matches.",
  });
  for (const id of BILLING) {
    outcomes.push({
      id: `billing-${id}`,
      points: billing.has(id) ? 1 : 0,
      max: 1,
      detail: billing.has(id) ? `${id} is billing-only.` : `${id} missing from billing-only.`,
    });
  }
  const extraBilling = [...billing].filter((id) => !BILLING.includes(id));
  outcomes.push({
    id: "no-extra-billing",
    points: extraBilling.length === 0 ? 1 : 0,
    max: 1,
    detail: extraBilling.length ? `Unexpected billing-only: ${extraBilling.join(", ")}.` : "Billing-only set matches.",
  });
  for (const id of CARD) {
    outcomes.push({
      id: `card-${id}`,
      points: card.has(id) ? 1 : 0,
      max: 1,
      detail: card.has(id) ? `${id} is card-only.` : `${id} missing from card-only.`,
    });
  }
  const extraCard = [...card].filter((id) => !CARD.includes(id));
  outcomes.push({
    id: "no-extra-card",
    points: extraCard.length === 0 ? 1 : 0,
    max: 1,
    detail: extraCard.length ? `Unexpected card-only: ${extraCard.join(", ")}.` : "Card-only set matches.",
  });
  return outcomes;
}
