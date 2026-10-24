import { cedarFlash } from "./cedar-flash";
import { cedarPro } from "./cedar-pro";
import { inkwell } from "./inkwell";
import { surveyor } from "./surveyor";

export type CriterionScores = {
  correctness: number;
  constraints: number;
  clarity: number;
};

const LATENCY: Record<string, { base: number; step: number }> = {
  "cedar-pro": { base: 4800, step: 220 },
  "cedar-flash": { base: 420, step: 35 },
  inkwell: { base: 1700, step: 90 },
  surveyor: { base: 2900, step: 140 },
};

/** Recorded latency fixtures for the demo. These are not measured calls. */
export function recordedLatency(modelId: string, taskIndex: number): number {
  const profile = LATENCY[modelId] ?? { base: 1000, step: 0 };
  return profile.base + (taskIndex % 7) * profile.step;
}

function scores(
  correctness: number,
  constraints: number,
  clarity: number,
): CriterionScores {
  return { correctness, constraints, clarity };
}

/** Recorded absolute judge scores for the demo judge. Not a live model call. */
export const JUDGE_SCORES: Record<string, Record<string, CriterionScores>> = {
  "retry-helper": {
    "cedar-pro": scores(96, 94, 90),
    surveyor: scores(86, 82, 80),
    "cedar-flash": scores(58, 52, 64),
    inkwell: scores(28, 34, 72),
  },
  "redact-secrets": {
    "cedar-pro": scores(96, 94, 88),
    surveyor: scores(84, 80, 78),
    "cedar-flash": scores(62, 58, 60),
    inkwell: scores(55, 42, 74),
  },
  "meeting-tool-schema": {
    "cedar-pro": scores(96, 95, 88),
    surveyor: scores(84, 80, 78),
    "cedar-flash": scores(70, 64, 66),
    inkwell: scores(52, 48, 70),
  },
  "csv-row-diff": {
    "cedar-pro": scores(96, 94, 86),
    surveyor: scores(92, 88, 82),
    "cedar-flash": scores(64, 60, 62),
    inkwell: scores(24, 30, 68),
  },
  "token-bucket": {
    "cedar-pro": scores(96, 94, 86),
    surveyor: scores(94, 90, 82),
    "cedar-flash": scores(58, 54, 60),
    inkwell: scores(22, 28, 66),
  },
  "review-risky-diff": {
    "cedar-pro": scores(96, 94, 88),
    surveyor: scores(86, 78, 80),
    "cedar-flash": scores(64, 58, 60),
    inkwell: scores(48, 36, 76),
  },
  "incident-note": {
    inkwell: scores(94, 96, 93),
    surveyor: scores(88, 82, 80),
    "cedar-pro": scores(84, 36, 78),
    "cedar-flash": scores(42, 40, 48),
  },
  "adr-eval-harness": {
    inkwell: scores(93, 95, 92),
    surveyor: scores(86, 80, 78),
    "cedar-flash": scores(48, 44, 50),
    "cedar-pro": scores(55, 28, 60),
  },
  "exec-status": {
    inkwell: scores(90, 94, 92),
    surveyor: scores(84, 86, 76),
    "cedar-pro": scores(70, 22, 68),
    "cedar-flash": scores(40, 36, 44),
  },
  "api-changelog": {
    inkwell: scores(92, 90, 88),
    "cedar-pro": scores(90, 86, 80),
    surveyor: scores(74, 70, 72),
    "cedar-flash": scores(45, 40, 48),
  },
  "staff-onboarding": {
    inkwell: scores(92, 94, 90),
    surveyor: scores(84, 80, 76),
    "cedar-pro": scores(72, 68, 70),
    "cedar-flash": scores(46, 42, 50),
  },
  "vendor-decision-brief": {
    surveyor: scores(95, 94, 86),
    "cedar-pro": scores(80, 42, 74),
    inkwell: scores(58, 40, 88),
    "cedar-flash": scores(40, 36, 42),
  },
  "questionnaire-risks": {
    surveyor: scores(94, 90, 84),
    "cedar-pro": scores(90, 86, 78),
    inkwell: scores(60, 55, 74),
    "cedar-flash": scores(48, 44, 46),
  },
  "postmortem-themes": {
    surveyor: scores(94, 92, 82),
    inkwell: scores(88, 90, 90),
    "cedar-pro": scores(70, 34, 72),
    "cedar-flash": scores(42, 40, 44),
  },
  "procurement-questions": {
    surveyor: scores(92, 90, 84),
    "cedar-pro": scores(82, 74, 76),
    inkwell: scores(70, 62, 84),
    "cedar-flash": scores(44, 40, 46),
  },
  "roster-cleanup": {
    "cedar-pro": scores(96, 92, 80),
    surveyor: scores(78, 76, 74),
    inkwell: scores(55, 50, 70),
    "cedar-flash": scores(40, 36, 42),
  },
  "ticket-dedupe": {
    "cedar-pro": scores(96, 94, 80),
    surveyor: scores(94, 90, 78),
    "cedar-flash": scores(52, 48, 50),
    inkwell: scores(36, 34, 60),
  },
  "invoice-reconcile": {
    "cedar-pro": scores(96, 92, 78),
    surveyor: scores(92, 88, 76),
    "cedar-flash": scores(58, 54, 52),
    inkwell: scores(42, 40, 58),
  },
  "request-taxonomy": {
    surveyor: scores(96, 92, 84),
    "cedar-pro": scores(78, 74, 72),
    inkwell: scores(64, 60, 70),
    "cedar-flash": scores(50, 46, 48),
  },
  "log-to-incidents": {
    "cedar-pro": scores(96, 94, 80),
    surveyor: scores(84, 80, 74),
    "cedar-flash": scores(50, 46, 48),
    inkwell: scores(38, 36, 55),
  },
};

/** Best model first. The mock pairwise judge follows this, except for position-bias pairs. */
export const PAIR_RANK: Record<string, string[]> = {
  "retry-helper": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
  "redact-secrets": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
  "meeting-tool-schema": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
  "csv-row-diff": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
  "token-bucket": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
  "review-risky-diff": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
  "incident-note": ["inkwell", "surveyor", "cedar-pro", "cedar-flash"],
  "adr-eval-harness": ["inkwell", "surveyor", "cedar-flash", "cedar-pro"],
  "exec-status": ["inkwell", "surveyor", "cedar-pro", "cedar-flash"],
  "api-changelog": ["inkwell", "cedar-pro", "surveyor", "cedar-flash"],
  "staff-onboarding": ["inkwell", "surveyor", "cedar-pro", "cedar-flash"],
  "vendor-decision-brief": ["surveyor", "cedar-pro", "inkwell", "cedar-flash"],
  "questionnaire-risks": ["surveyor", "cedar-pro", "inkwell", "cedar-flash"],
  "postmortem-themes": ["surveyor", "inkwell", "cedar-pro", "cedar-flash"],
  "procurement-questions": ["surveyor", "cedar-pro", "inkwell", "cedar-flash"],
  "roster-cleanup": ["cedar-pro", "surveyor", "inkwell", "cedar-flash"],
  "ticket-dedupe": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
  "invoice-reconcile": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
  "request-taxonomy": ["surveyor", "cedar-pro", "inkwell", "cedar-flash"],
  "log-to-incidents": ["cedar-pro", "surveyor", "cedar-flash", "inkwell"],
};

/** The recorded judge prefers whichever answer is shown first, so the two orders disagree. */
export const POSITION_BIAS: { taskId: string; pair: [string, string] }[] = [
  { taskId: "incident-note", pair: ["inkwell", "surveyor"] },
  { taskId: "api-changelog", pair: ["cedar-pro", "inkwell"] },
  { taskId: "vendor-decision-brief", pair: ["inkwell", "surveyor"] },
  { taskId: "roster-cleanup", pair: ["cedar-pro", "surveyor"] },
];

export const JUDGE_NOTES: Record<string, string> = {
  "incident-note|cedar-pro|constraints":
    "Names Priya as the person who should have caught the migration.",
  "exec-status|cedar-pro|constraints":
    "Includes Jordan's performance plan, which the notes said to leave out.",
  "adr-eval-harness|cedar-pro|constraints":
    "Recommends buying Harbor and treats the VPC limit as a risk to accept.",
  "vendor-decision-brief|cedar-pro|constraints":
    "Gives Harbor a SOC 2 claim the proposal never makes.",
  "vendor-decision-brief|inkwell|correctness":
    "The prose is polished and still invents a Harbor certification.",
  "postmortem-themes|cedar-pro|constraints":
    "Names Mateo, the on-call, against the brief.",
  "review-risky-diff|surveyor|constraints":
    "Finds the logged key and marks it medium instead of high.",
  "redact-secrets|inkwell|constraints":
    "Rewrites the ordinary sentence about resetting a password.",
  "roster-cleanup|surveyor|correctness":
    "Leaves Arun's start date in the source format.",
  "request-taxonomy|cedar-pro|correctness":
    "Calls the locked-out on-call an incident and the replica request other.",
};

export const RESPONSES: Record<string, Record<string, string>> = {
  "cedar-pro": cedarPro,
  "cedar-flash": cedarFlash,
  inkwell,
  surveyor,
};
