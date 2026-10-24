import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runDeclarativeChecks } from "./checks";
import { buildCheatSheet } from "./cheat";
import { createJudge, estimateTokens, hasRecordedJudge, hasRecordedPair } from "./judge";
import { loadModels, loadTasks, selectModels, selectTasks, taskPack } from "./load";
import { buildMessages, messageText } from "./prompt";
import { completeLive, resolveJudgeMode, resolveMode, type FetchLike } from "./providers";
import {
  autoScore,
  costUsd,
  judgeAggregate,
  mapPresentedWinner,
  pairsToJudge,
  qualityOf,
  resolvePair,
} from "./score";
import type {
  CallResult,
  CheckOutcome,
  LoadedTask,
  ModelConfig,
  RunFile,
  RunMode,
  BenchEnv,
} from "./types";
import { RESPONSES, recordedLatency } from "../recordings/fixtures";

const MOCK_DISCLAIMER =
  "Mock run. Cedar Pro, Cedar Flash, Inkwell, and Surveyor are fictional stand-ins, labeled as starter examples. Answers, latencies, and judge scores are recorded fixtures. Automatic tests ran for real against those answers. This is not a measurement of any production model.";

export type RunOptions = {
  mode?: "auto" | "mock" | "live";
  judge?: "auto" | "mock" | "live";
  tasks?: string;
  modelIds?: string[];
  out?: string;
  runId?: string;
  fresh?: boolean;
  mergeFrom?: string;
  createdAt?: string;
  env?: BenchEnv;
  fetchImpl?: FetchLike;
  root?: string;
};

export async function executeRun(options: RunOptions = {}): Promise<RunFile> {
  const env = options.env ?? process.env;
  const root = options.root ?? process.cwd();
  const requestedMode = options.mode ?? "auto";
  const judgeMode = resolveJudgeMode(options.judge ?? "auto", env);
  const allTasks = loadTasks(path.join(root, "tasks"));
  const allModels = loadModels(path.join(root, "models.yaml"));
  const tasks = selectTasks(allTasks, options.tasks ?? "starter");
  const models = selectModels(allModels, options.modelIds);
  const out = options.out ?? path.join(root, "results", "latest.json");
  const previous = options.fresh ? null : readPrevious(options.mergeFrom, out, root);

  const taskIndex = new Map(tasks.map((task, index) => [task.id, index]));
  const judge = createJudge({ mode: judgeMode, env, fetchImpl: options.fetchImpl, taskIndex });
  const executed = new Set<string>();
  const freshCalls: CallResult[] = [];
  let judgeCalls = 0;
  let judgeInput = 0;
  let judgeOutput = 0;

  const noteJudge = (completion: { inputTokens: number; outputTokens: number }) => {
    judgeCalls += 1;
    judgeInput += completion.inputTokens;
    judgeOutput += completion.outputTokens;
  };

  for (const task of tasks) {
    for (const model of models) {
      const call = await runOne({
        task,
        model,
        requestedMode,
        env,
        fetchImpl: options.fetchImpl,
        taskIndex: taskIndex.get(task.id) ?? 0,
        judge,
        noteJudge,
      });
      freshCalls.push(call);
      executed.add(`${task.id}:${model.id}`);
    }
  }

  const pool = mergeCalls(previous?.calls ?? [], freshCalls);
  const plan = pairsToJudge(pool, executed, previous?.pairs ?? []);
  const judged = [];
  for (const item of plan.todo) {
    const task = tasks.find((candidate) => candidate.id === item.taskId) ??
      allTasks.find((candidate) => candidate.id === item.taskId);
    if (!task) continue;
    if (judge.mode === "mock" && !hasRecordedPair(item.taskId, item.modelA, item.modelB)) continue;
    const outputA = pool.find((call) => call.taskId === item.taskId && call.modelId === item.modelA)?.output ?? "";
    const outputB = pool.find((call) => call.taskId === item.taskId && call.modelId === item.modelB)?.output ?? "";
    const forward = await judge.pair(task, item.modelA, item.modelB, outputA, outputB);
    noteJudge(forward.completion);
    const reverse = await judge.pair(task, item.modelB, item.modelA, outputB, outputA);
    noteJudge(reverse.completion);
    const forwardWinner = mapPresentedWinner("a", forward.winner);
    const reverseWinner = mapPresentedWinner("b", reverse.winner);
    const resolved = resolvePair(forwardWinner, reverseWinner);
    judged.push({
      taskId: item.taskId,
      modelA: item.modelA,
      modelB: item.modelB,
      forwardWinner,
      reverseWinner,
      result: resolved.result,
      positionBias: resolved.positionBias,
    });
  }

  const modelIds = new Set(pool.map((call) => call.modelId));
  const taskIds = new Set(pool.map((call) => call.taskId));
  const usedModels = allModels.filter((model) => modelIds.has(model.id));
  const previousModels = previous?.models.filter((model) => modelIds.has(model.id) && !usedModels.some((item) => item.id === model.id)) ?? [];
  const usedTasks = allTasks.filter((task) => taskIds.has(task.id)).map(taskPack);
  const callModes = new Set(pool.map((call) => call.mode));
  const mode: RunMode =
    callModes.size > 1 ? "mixed" : callModes.has("live") ? "live" : "mock";
  const run: RunFile = {
    id: options.runId ?? (mode === "mock" ? "demo" : `run-${stamp(options.createdAt)}`),
    createdAt: options.createdAt ?? new Date().toISOString(),
    mode,
    judgeMode,
    label: mode === "mock" ? "Demo run" : mode === "live" ? "Live run" : "Mixed run",
    disclaimer: disclaimerFor(mode, judgeMode, previous),
    models: [...usedModels, ...previousModels],
    tasks: usedTasks.sort((a, b) => a.order - b.order),
    calls: pool.sort(compareCalls),
    pairs: [...plan.keep, ...judged].sort(comparePairs),
    judgeUsage: {
      calls: judgeCalls,
      inputTokens: judgeInput,
      outputTokens: judgeOutput,
    },
  };
  if (previous && judgeMode !== previous.judgeMode) {
    run.disclaimer = `${run.disclaimer} Pairwise rows from the merged run keep their earlier judge results.`;
  }
  return run;
}

async function runOne(args: {
  task: LoadedTask;
  model: ModelConfig;
  requestedMode: "auto" | "mock" | "live";
  env: BenchEnv;
  fetchImpl?: FetchLike;
  taskIndex: number;
  judge: ReturnType<typeof createJudge>;
  noteJudge: (completion: { inputTokens: number; outputTokens: number }) => void;
}): Promise<CallResult> {
  const messages = buildMessages(args.task);
  const mode = resolveMode(args.requestedMode, args.model, args.env);
  try {
    const completion =
      mode === "mock"
        ? mockCompletion(args.model.id, args.task, args.taskIndex, messageText(messages))
        : await completeLive(args.model, messages, args.env, args.fetchImpl);
    const checks = await scoreOutput(args.task, completion.text);
    const automatic = autoScore(checks);
    const recorded = args.judge.mode === "live" || hasRecordedJudge(args.task.id, args.model.id);
    const judged = recorded
      ? await args.judge.absolute(args.task, args.model.id, completion.text)
      : null;
    if (judged) args.noteJudge(judged.completion);
    const judgeScore = judged ? judgeAggregate(judged.criteria, args.task.rubric) : null;
    return {
      taskId: args.task.id,
      modelId: args.model.id,
      mode,
      output: completion.text,
      latencyMs: mode === "mock" ? recordedLatency(args.model.id, args.taskIndex) : completion.latencyMs,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      costUsd: costUsd(completion.inputTokens, completion.outputTokens, args.model),
      auto: { score: automatic, checks },
      judge: judged ? { score: judgeScore ?? 0, criteria: judged.criteria } : null,
      quality: qualityOf(automatic, judgeScore, args.task.qualityWeights),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      taskId: args.task.id,
      modelId: args.model.id,
      mode,
      output: "",
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      auto: { score: 0, checks: [] },
      judge: null,
      quality: 0,
      error: message,
    };
  }
}

function mockCompletion(modelId: string, task: LoadedTask, taskIndex: number, prompt: string) {
  const output = RESPONSES[modelId]?.[task.id];
  if (!output) {
    throw new Error(
      `No recorded answer for ${modelId} on ${task.id}. Set the model's API key and run with --mode live, or add a recording.`,
    );
  }
  return {
    text: output,
    inputTokens: estimateTokens(prompt),
    outputTokens: estimateTokens(output),
    latencyMs: recordedLatency(modelId, taskIndex),
  };
}

async function scoreOutput(task: LoadedTask, output: string): Promise<CheckOutcome[]> {
  const declarative = runDeclarativeChecks(task.checks, output);
  if (!task.checks.some((check) => check.type === "harness")) return declarative;
  const harnessPath = path.join(task.dir, "harness.ts");
  const harness = (await import(pathToFileURL(harnessPath).href)) as {
    run?: (output: string) => Promise<CheckOutcome[]> | CheckOutcome[];
  };
  if (!harness.run) throw new Error(`${task.id} harness does not export run().`);
  const extra = await harness.run(output);
  return [...declarative, ...extra];
}

function mergeCalls(previous: CallResult[], fresh: CallResult[]): CallResult[] {
  const map = new Map<string, CallResult>();
  for (const call of previous) map.set(`${call.taskId}:${call.modelId}`, call);
  for (const call of fresh) map.set(`${call.taskId}:${call.modelId}`, call);
  return [...map.values()];
}

function readPrevious(mergeFrom: string | undefined, out: string, root: string): RunFile | null {
  const demo = path.join(root, "results", "demo.json");
  const candidate = mergeFrom ?? (fs.existsSync(out) ? out : out !== demo && fs.existsSync(demo) ? demo : "");
  if (!candidate || !fs.existsSync(candidate)) return null;
  return JSON.parse(fs.readFileSync(candidate, "utf8")) as RunFile;
}

function disclaimerFor(mode: RunMode, judgeMode: "mock" | "live", previous: RunFile | null): string {
  if (mode === "mock" && judgeMode === "mock") return MOCK_DISCLAIMER;
  if (mode === "live" && judgeMode === "live") {
    return "Live run. Candidate calls and the judge used the providers in the environment. Token counts come from the provider. Cost uses the rates in models.yaml. Judge tokens are overhead and are not added to a model's cost.";
  }
  const base =
    "Mixed run. Each row is labeled mock or live. Mock rows use recorded fixtures. Live rows called the configured provider. Compare them with that difference in mind.";
  return previous ? `${base} Merged with ${previous.label} (${previous.id}).` : base;
}

function compareCalls(a: CallResult, b: CallResult): number {
  return a.taskId.localeCompare(b.taskId) || a.modelId.localeCompare(b.modelId);
}

function comparePairs(a: { taskId: string; modelA: string; modelB: string }, b: { taskId: string; modelA: string; modelB: string }): number {
  return (
    a.taskId.localeCompare(b.taskId) ||
    a.modelA.localeCompare(b.modelA) ||
    a.modelB.localeCompare(b.modelB)
  );
}

function stamp(createdAt?: string): string {
  const date = new Date(createdAt ?? Date.now());
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

export function writeRun(run: RunFile, file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(run, null, 2)}\n`);
}

export function readRun(file: string): RunFile {
  return JSON.parse(fs.readFileSync(file, "utf8")) as RunFile;
}

export function renderReport(run: RunFile): string {
  const sheet = buildCheatSheet(run);
  const lines = [
    `${run.label} · ${run.mode} · judge ${run.judgeMode}`,
    run.disclaimer,
    "",
    sheet.headline,
    "",
    ...sheet.rules.map((rule) => `- ${rule}`),
    "",
  ];
  for (const category of sheet.categories) {
    lines.push(category.narrative);
    lines.push("");
  }
  if (sheet.tasks.length) {
    lines.push("Task picks");
    for (const task of sheet.tasks) {
      lines.push(`- ${task.category} / ${task.title}: ${task.why}`);
    }
  }
  return lines.join("\n");
}
