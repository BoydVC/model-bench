import { extractJson } from "./sandbox";
import type { BenchEnv, Completion, CriterionScore, LoadedTask } from "./types";
import { absoluteJudgeMessages, messageText, pairJudgeMessages } from "./prompt";
import { clampScore } from "./score";
import { completeLive, judgeConfig, type FetchLike } from "./providers";
import {
  JUDGE_NOTES,
  JUDGE_SCORES,
  PAIR_RANK,
  POSITION_BIAS,
} from "../recordings/fixtures";

export type PairVerdict = "first" | "second" | "tie";

export type AbsoluteJudgment = {
  criteria: CriterionScore[];
  completion: Completion;
};

export type PairJudgment = {
  winner: PairVerdict;
  note: string;
  completion: Completion;
};

export function parseAbsoluteJudgment(
  text: string,
  task: LoadedTask,
): CriterionScore[] {
  const json = extractJson(text) as { criteria?: { id?: string; score?: number; note?: string }[] };
  const byId = new Map<string, { score: number; note: string }>();
  for (const item of json.criteria ?? []) {
    if (!item.id) continue;
    byId.set(item.id, {
      score: clampScore(Number(item.score)),
      note: String(item.note ?? ""),
    });
  }
  return task.rubric.map((criterion) => {
    const found = byId.get(criterion.id);
    if (!found) throw new Error(`Judge response missing criterion ${criterion.id}.`);
    return { id: criterion.id, score: found.score, note: found.note };
  });
}

export function parsePairVerdict(text: string): { winner: PairVerdict; note: string } {
  const json = extractJson(text) as { winner?: string; note?: string };
  if (json.winner !== "first" && json.winner !== "second" && json.winner !== "tie") {
    throw new Error(`Judge winner must be first, second, or tie. Received ${String(json.winner)}.`);
  }
  return { winner: json.winner, note: String(json.note ?? "") };
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

export function mockPairWinner(taskId: string, firstId: string, secondId: string): PairVerdict {
  const biased = POSITION_BIAS.some(
    (item) =>
      item.taskId === taskId &&
      ((item.pair[0] === firstId && item.pair[1] === secondId) ||
        (item.pair[0] === secondId && item.pair[1] === firstId)),
  );
  if (biased) return "first";
  const rank = PAIR_RANK[taskId];
  if (!rank) throw new Error(`No recorded pairwise ranking for ${taskId}.`);
  const first = rank.indexOf(firstId);
  const second = rank.indexOf(secondId);
  if (first < 0 || second < 0) {
    throw new Error(`Recorded ranking for ${taskId} is missing ${firstId} or ${secondId}.`);
  }
  if (first === second) return "tie";
  return first < second ? "first" : "second";
}

function criterionNote(taskId: string, modelId: string, criterionId: string, score: number): string {
  const specific = JUDGE_NOTES[`${taskId}|${modelId}|${criterionId}`];
  if (specific) return specific;
  if (score >= 85) return "Recorded judge: holds up under this criterion.";
  if (score >= 70) return "Recorded judge: usable, with a gap a reviewer would mark.";
  if (score >= 50) return "Recorded judge: partial. A director would send it back.";
  return "Recorded judge: misses the bar for this criterion.";
}

export function hasRecordedJudge(taskId: string, modelId: string): boolean {
  return JUDGE_SCORES[taskId]?.[modelId] != null;
}

export function hasRecordedPair(taskId: string, firstId: string, secondId: string): boolean {
  const rank = PAIR_RANK[taskId];
  return Boolean(rank?.includes(firstId) && rank.includes(secondId));
}

export function mockAbsolute(task: LoadedTask, modelId: string): CriterionScore[] {
  const row = JUDGE_SCORES[task.id]?.[modelId];
  if (!row) throw new Error(`No recorded judge scores for ${modelId} on ${task.id}.`);
  return task.rubric.map((criterion) => {
    const score = row[criterion.id as keyof typeof row];
    if (score == null) {
      throw new Error(`Recorded judge scores for ${task.id}/${modelId} missing ${criterion.id}.`);
    }
    return {
      id: criterion.id,
      score,
      note: criterionNote(task.id, modelId, criterion.id, score),
    };
  });
}

export function createJudge(options: {
  mode: "mock" | "live";
  env: BenchEnv;
  fetchImpl?: FetchLike;
  taskIndex?: Map<string, number>;
}): {
  mode: "mock" | "live";
  absolute(task: LoadedTask, modelId: string, output: string): Promise<AbsoluteJudgment>;
  pair(
    task: LoadedTask,
    firstId: string,
    secondId: string,
    first: string,
    second: string,
  ): Promise<PairJudgment>;
} {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    mode: options.mode,
    async absolute(task, modelId, output) {
      const messages = absoluteJudgeMessages(task, output);
      if (options.mode === "mock") {
        const criteria = mockAbsolute(task, modelId);
        const text = JSON.stringify({ criteria });
        return {
          criteria,
          completion: {
            text,
            inputTokens: estimateTokens(messageText(messages)),
            outputTokens: estimateTokens(text),
            latencyMs: 0,
          },
        };
      }
      const config = judgeConfig(options.env);
      if (!config.model) throw new Error("Set JUDGE_MODEL for a live judge.");
      const completion = await completeLive(config, messages, options.env, fetchImpl);
      return { criteria: parseAbsoluteJudgment(completion.text, task), completion };
    },
    async pair(task, firstId, secondId, first, second) {
      const messages = pairJudgeMessages(task, first, second);
      if (options.mode === "mock") {
        const winner = mockPairWinner(task.id, firstId, secondId);
        const note =
          winner === "first"
            ? "Recorded judge preferred the response shown first."
            : winner === "second"
              ? "Recorded judge preferred the response shown second."
              : "Recorded judge called this pair a tie.";
        const text = JSON.stringify({ winner, note });
        return {
          winner,
          note,
          completion: {
            text,
            inputTokens: estimateTokens(messageText(messages)),
            outputTokens: estimateTokens(text),
            latencyMs: 0,
          },
        };
      }
      const config = judgeConfig(options.env);
      if (!config.model) throw new Error("Set JUDGE_MODEL for a live judge.");
      const completion = await completeLive(config, messages, options.env, fetchImpl);
      const parsed = parsePairVerdict(completion.text);
      return { winner: parsed.winner, note: parsed.note, completion };
    },
  };
}
