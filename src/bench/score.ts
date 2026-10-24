import type {
  CallResult,
  Category,
  CheckOutcome,
  CriterionScore,
  ModelConfig,
  PairResult,
  PairSide,
  QualityWeights,
  RubricCriterion,
  RunFile,
} from "./types";

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function autoScore(checks: CheckOutcome[]): number {
  const max = checks.reduce((sum, check) => sum + check.max, 0);
  if (max <= 0) return 0;
  const points = checks.reduce((sum, check) => sum + check.points, 0);
  return (100 * points) / max;
}

export function judgeAggregate(
  criteria: CriterionScore[],
  rubric: RubricCriterion[],
): number {
  const weightById = new Map(rubric.map((item) => [item.id, item.weight]));
  let weight = 0;
  let sum = 0;
  for (const criterion of criteria) {
    const criterionWeight = weightById.get(criterion.id);
    if (criterionWeight == null) continue;
    weight += criterionWeight;
    sum += criterionWeight * criterion.score;
  }
  if (weight <= 0) return 0;
  return sum / weight;
}

export function qualityOf(
  auto: number,
  judge: number | null,
  weights: QualityWeights,
): number {
  if (judge == null) return auto;
  const total = weights.auto + weights.judge;
  if (total <= 0) return auto;
  return (weights.auto * auto + weights.judge * judge) / total;
}

export function costUsd(
  inputTokens: number,
  outputTokens: number,
  model: Pick<ModelConfig, "inputUsdPerMtok" | "outputUsdPerMtok">,
): number {
  return (
    (inputTokens / 1_000_000) * model.inputUsdPerMtok +
    (outputTokens / 1_000_000) * model.outputUsdPerMtok
  );
}

export function mapPresentedWinner(
  presentedFirst: "a" | "b",
  verdict: "first" | "second" | "tie",
): PairSide {
  if (verdict === "tie") return "tie";
  if (verdict === "first") return presentedFirst;
  return presentedFirst === "a" ? "b" : "a";
}

/**
 * A win counts only when both presentation orders pick the same model.
 * Opposite winners are position bias and become a tie.
 * A single abstention also becomes a tie, without the bias flag.
 */
export function resolvePair(
  forward: PairSide,
  reverse: PairSide,
): { result: PairSide; positionBias: boolean } {
  if (forward === reverse) return { result: forward, positionBias: false };
  const positionBias = forward !== "tie" && reverse !== "tie";
  return { result: "tie", positionBias };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export type BoardRow = {
  modelId: string;
  label: string;
  blurb?: string;
  demo?: boolean;
  quality: number;
  auto: number;
  judge: number | null;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  medianLatencyMs: number;
  meanCostUsd: number;
  totalCostUsd: number;
  tasks: number;
};

export function compareRows(a: BoardRow, b: BoardRow): number {
  if (b.quality !== a.quality) return b.quality - a.quality;
  if (b.winRate !== a.winRate) return b.winRate - a.winRate;
  if (a.meanCostUsd !== b.meanCostUsd) return a.meanCostUsd - b.meanCostUsd;
  return a.label.localeCompare(b.label);
}

export function leaderboard(run: RunFile, category: Category | "all"): BoardRow[] {
  const taskIds = new Set(
    run.tasks
      .filter((task) => category === "all" || task.category === category)
      .map((task) => task.id),
  );
  const calls = run.calls.filter((call) => taskIds.has(call.taskId));
  const pairs = run.pairs.filter((pair) => taskIds.has(pair.taskId));

  return run.models
    .map((model) => summarizeModel(model, calls, pairs))
    .filter((row) => row.tasks > 0)
    .sort(compareRows);
}

function summarizeModel(
  model: ModelConfig,
  calls: CallResult[],
  pairs: PairResult[],
): BoardRow {
  const mine = calls.filter((call) => call.modelId === model.id);
  const judgeScores = mine
    .map((call) => call.judge?.score)
    .filter((score): score is number => score != null);
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const pair of pairs) {
    const side =
      pair.modelA === model.id ? "a" : pair.modelB === model.id ? "b" : null;
    if (!side) continue;
    if (pair.result === "tie") ties += 1;
    else if (pair.result === side) wins += 1;
    else losses += 1;
  }
  const decided = wins + losses + ties;
  const costs = mine.map((call) => call.costUsd);
  return {
    modelId: model.id,
    label: model.label,
    blurb: model.blurb,
    demo: model.demo,
    quality: mean(mine.map((call) => call.quality)),
    auto: mean(mine.map((call) => call.auto.score)),
    judge: judgeScores.length ? mean(judgeScores) : null,
    wins,
    losses,
    ties,
    winRate: decided === 0 ? 0 : wins / decided,
    medianLatencyMs: median(mine.map((call) => call.latencyMs)),
    meanCostUsd: mean(costs),
    totalCostUsd: costs.reduce((sum, cost) => sum + cost, 0),
    tasks: mine.length,
  };
}

export function pairKey(taskId: string, modelA: string, modelB: string): string {
  const [left, right] = modelA < modelB ? [modelA, modelB] : [modelB, modelA];
  return `${taskId}|${left}|${right}`;
}

export function orderedPair(
  modelA: string,
  modelB: string,
): { modelA: string; modelB: string } {
  return modelA < modelB
    ? { modelA, modelB }
    : { modelA: modelB, modelB: modelA };
}

export type PairPlan = {
  keep: PairResult[];
  todo: { taskId: string; modelA: string; modelB: string }[];
};

export function pairsToJudge(
  calls: CallResult[],
  executed: Set<string>,
  previous: PairResult[],
): PairPlan {
  const modelsByTask = new Map<string, Set<string>>();
  for (const call of calls) {
    if (!call.output.trim()) continue;
    const models = modelsByTask.get(call.taskId) ?? new Set<string>();
    models.add(call.modelId);
    modelsByTask.set(call.taskId, models);
  }

  const needed = new Set<string>();
  const todo: PairPlan["todo"] = [];
  for (const [taskId, models] of modelsByTask) {
    const ids = [...models].sort();
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const key = pairKey(taskId, ids[i], ids[j]);
        needed.add(key);
        const touched =
          executed.has(`${taskId}:${ids[i]}`) ||
          executed.has(`${taskId}:${ids[j]}`);
        const existing = previous.find(
          (pair) => pairKey(pair.taskId, pair.modelA, pair.modelB) === key,
        );
        if (existing && !touched) continue;
        todo.push({ taskId, modelA: ids[i], modelB: ids[j] });
      }
    }
  }

  const keep = previous.filter((pair) => {
    const key = pairKey(pair.taskId, pair.modelA, pair.modelB);
    if (!needed.has(key)) return false;
    return !(
      executed.has(`${pair.taskId}:${pair.modelA}`) ||
      executed.has(`${pair.taskId}:${pair.modelB}`)
    );
  });

  return { keep, todo };
}
