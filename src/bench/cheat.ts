import type { Category, RunFile } from "./types";
import { CATEGORIES } from "./types";
import { type BoardRow, compareRows, leaderboard } from "./score";
import { formatCost, formatMs, formatRecord, formatScore } from "./format";

export const VALUE_MIN_QUALITY = 70;
export const VALUE_MAX_GAP = 12;
export const VALUE_COST_RATIO = 0.6;
export const TASK_PICK_MARGIN = 8;

export type ModelUse = {
  modelId: string;
  label: string;
  quality: number;
  medianLatencyMs: number;
  meanCostUsd: number;
  reason: string;
};

export type CategorySheet = {
  category: Category;
  best: ModelUse & { margin: number; runnerUp: string };
  value: ModelUse | null;
  avoid: ModelUse & { weakestTask: string };
  narrative: string;
};

export type TaskPick = {
  taskId: string;
  title: string;
  category: Category;
  modelId: string;
  label: string;
  quality: number;
  margin: number;
  why: string;
};

export type CheatSheet = {
  runId: string;
  mode: RunFile["mode"];
  headline: string;
  rules: string[];
  overall: { best: ModelUse; avoid: ModelUse };
  categories: CategorySheet[];
  tasks: TaskPick[];
};

function describeUse(row: BoardRow, reason: string): ModelUse {
  return {
    modelId: row.modelId,
    label: row.label,
    quality: row.quality,
    medianLatencyMs: row.medianLatencyMs,
    meanCostUsd: row.meanCostUsd,
    reason,
  };
}

function qualityReason(row: BoardRow, scope: string): string {
  return `${row.label} leads ${scope} at ${formatScore(row.quality)} quality, ${formatMs(row.medianLatencyMs)} median, ${formatCost(row.meanCostUsd)} mean cost.`;
}

export function valueAlternative(rows: BoardRow[]): ModelUse | null {
  const ranked = [...rows].sort(compareRows);
  const best = ranked[0];
  if (!best) return null;
  const eligible = ranked.filter(
    (row) =>
      row.modelId !== best.modelId &&
      row.quality >= VALUE_MIN_QUALITY &&
      row.quality >= best.quality - VALUE_MAX_GAP &&
      row.meanCostUsd <= best.meanCostUsd * VALUE_COST_RATIO,
  );
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => a.meanCostUsd - b.meanCostUsd || b.quality - a.quality);
  const pick = eligible[0];
  const ratio = best.meanCostUsd === 0 ? 0 : pick.meanCostUsd / best.meanCostUsd;
  return describeUse(
    pick,
    `${pick.label} stays within ${VALUE_MAX_GAP} quality points of ${best.label} at ${Math.round(ratio * 100)}% of the cost (${formatCost(pick.meanCostUsd)} vs ${formatCost(best.meanCostUsd)}).`,
  );
}

export function buildCheatSheet(run: RunFile): CheatSheet {
  const overallRows = leaderboard(run, "all");
  const best = overallRows[0];
  const worst = overallRows[overallRows.length - 1];
  if (!best || !worst) {
    return {
      runId: run.id,
      mode: run.mode,
      headline: "This run has no scored calls yet.",
      rules: ["Run the starter pack before reading a recommendation."],
      overall: {
        best: {
          modelId: "",
          label: "None",
          quality: 0,
          medianLatencyMs: 0,
          meanCostUsd: 0,
          reason: "No models were scored.",
        },
        avoid: {
          modelId: "",
          label: "None",
          quality: 0,
          medianLatencyMs: 0,
          meanCostUsd: 0,
          reason: "No models were scored.",
        },
      },
      categories: [],
      tasks: [],
    };
  }

  const categories = CATEGORIES.map((category) => categorySheet(run, category)).filter(
    (sheet): sheet is CategorySheet => sheet != null,
  );
  const tasks = taskPicks(run);
  const bias = run.pairs.filter((pair) => pair.positionBias).length;
  const judged = run.pairs.length;
  const underBar = overallRows.filter((row) =>
    CATEGORIES.every((category) => {
      const rows = leaderboard(run, category);
      const mine = rows.find((item) => item.modelId === row.modelId);
      return mine == null || mine.quality < VALUE_MIN_QUALITY;
    }),
  );

  const headline = headlineFor(best, categories);
  const rules = [
    `${best.label} is the overall pick at ${formatScore(best.quality)} quality, ${formatRecord(best.wins, best.losses, best.ties)} pairwise, ${formatMs(best.medianLatencyMs)} median, ${formatCost(best.meanCostUsd)} per task.`,
    specialistRule(categories),
    bias === 0
      ? `The judge agreed with itself on all ${judged} pairs.`
      : `${bias} of ${judged} pairs flipped when the same two answers swapped order. Those pairs are ties, so being shown first is not a win.`,
    underBar.length
      ? `${underBar.map((row) => row.label).join(", ")} stays under ${VALUE_MIN_QUALITY} quality in every category. The sheet leaves ${underBar.length === 1 ? "it" : "them"} off the recommendations.`
      : `Every model clears ${VALUE_MIN_QUALITY} quality in at least one category.`,
  ];
  if (run.mode !== "live") {
    rules.push(run.disclaimer);
  }

  return {
    runId: run.id,
    mode: run.mode,
    headline,
    rules,
    overall: {
      best: describeUse(best, qualityReason(best, "the full pack")),
      avoid: describeUse(
        worst,
        `${worst.label} is last overall at ${formatScore(worst.quality)} quality.`,
      ),
    },
    categories,
    tasks,
  };
}

function categorySheet(run: RunFile, category: Category): CategorySheet | null {
  const rows = leaderboard(run, category);
  const best = rows[0];
  const runner = rows[1];
  const worst = rows[rows.length - 1];
  if (!best || !worst) return null;
  const margin = runner ? best.quality - runner.quality : best.quality;
  const weakest = weakestTask(run, category, worst.modelId);
  const value = valueAlternative(rows);
  const bestUse = {
    ...describeUse(best, qualityReason(best, category)),
    margin,
    runnerUp: runner?.label ?? "no runner-up",
  };
  const narrative = [
    `${best.label} is the ${category} pick, ${formatScore(margin)} points ahead of ${runner?.label ?? "the field"}.`,
    value
      ? `When cost matters, ${value.label} is the alternative: ${value.reason}`
      : `No cheaper model stays within ${VALUE_MAX_GAP} points and under ${Math.round(VALUE_COST_RATIO * 100)}% of ${best.label}'s cost while clearing ${VALUE_MIN_QUALITY}.`,
    `${worst.label} is the one to skip here. Weakest starter task: ${weakest}.`,
  ].join(" ");
  return {
    category,
    best: bestUse,
    value,
    avoid: {
      ...describeUse(
        worst,
        `${worst.label} finishes ${category} at ${formatScore(worst.quality)}.`,
      ),
      weakestTask: weakest,
    },
    narrative,
  };
}

function weakestTask(run: RunFile, category: Category, modelId: string): string {
  const calls = run.calls
    .filter((call) => call.modelId === modelId)
    .filter((call) => run.tasks.some((task) => task.id === call.taskId && task.category === category))
    .sort((a, b) => a.quality - b.quality);
  const worst = calls[0];
  if (!worst) return "no scored task";
  const task = run.tasks.find((item) => item.id === worst.taskId);
  return `${task?.title ?? worst.taskId} (${formatScore(worst.quality)})`;
}

function taskPicks(run: RunFile): TaskPick[] {
  const picks: TaskPick[] = [];
  for (const task of run.tasks) {
    const calls = run.calls
      .filter((call) => call.taskId === task.id)
      .sort((a, b) => b.quality - a.quality || a.modelId.localeCompare(b.modelId));
    const first = calls[0];
    const second = calls[1];
    if (!first || !second) continue;
    const margin = first.quality - second.quality;
    if (margin < TASK_PICK_MARGIN) continue;
    const label = run.models.find((model) => model.id === first.modelId)?.label ?? first.modelId;
    const secondLabel = run.models.find((model) => model.id === second.modelId)?.label ?? second.modelId;
    const judge =
      first.judge == null ? "judge unavailable" : `${formatScore(first.judge.score)} judge`;
    picks.push({
      taskId: task.id,
      title: task.title,
      category: task.category,
      modelId: first.modelId,
      label,
      quality: first.quality,
      margin,
      why: `${label} scores ${formatScore(first.quality)} (${formatScore(first.auto.score)} automatic, ${judge}), ${formatScore(margin)} ahead of ${secondLabel}.`,
    });
  }
  return picks;
}

function headlineFor(best: BoardRow, categories: CategorySheet[]): string {
  const grouped = new Map<string, string[]>();
  for (const sheet of categories) {
    const list = grouped.get(sheet.best.label) ?? [];
    list.push(sheet.category);
    grouped.set(sheet.best.label, list);
  }
  const bits = [...grouped.entries()].map(([label, cats]) => `${label} for ${cats.join(", ")}`);
  return `${best.label} leads the pack. By category: ${bits.join("; ")}.`;
}

function specialistRule(categories: CategorySheet[]): string {
  return `${categories
    .map(
      (sheet) =>
        `${sheet.category}: ${sheet.best.label} (${formatScore(sheet.best.quality)})`,
    )
    .join(". ")}.`;
}
