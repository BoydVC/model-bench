import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { Category, LoadedTask, ModelConfig, TaskPack } from "./types";
import { CATEGORIES } from "./types";

const checkSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("contains"),
    id: z.string().min(1),
    value: z.string().min(1),
    points: z.number().positive().optional(),
    caseSensitive: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("not_contains"),
    id: z.string().min(1),
    value: z.string().min(1),
    points: z.number().positive().optional(),
    caseSensitive: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("regex"),
    id: z.string().min(1),
    pattern: z.string().min(1),
    flags: z.string().optional(),
    points: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("regex_min"),
    id: z.string().min(1),
    pattern: z.string().min(1),
    flags: z.string().optional(),
    min: z.number().int().positive(),
    points: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("word_count"),
    id: z.string().min(1),
    min: z.number().int().nonnegative(),
    max: z.number().int().positive(),
    points: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("harness"),
    id: z.string().min(1).optional(),
  }),
]);

const rubricSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().positive(),
  prompt: z.string().min(1),
});

const taskFileSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(CATEGORIES),
  starter: z.boolean(),
  order: z.number().int(),
  summary: z.string().min(1),
  whatWeTest: z.array(z.string().min(1)).min(1),
  outputHint: z.string(),
  fixtures: z.array(z.string().min(1)).default([]),
  rubric: z.array(rubricSchema).min(1),
  qualityWeights: z.object({
    auto: z.number().nonnegative(),
    judge: z.number().nonnegative(),
  }),
  checks: z.array(checkSchema).min(1),
});

const modelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  provider: z.enum(["openai-compatible", "anthropic"]),
  env_key: z.string().min(1),
  env_base_url: z.string().min(1).optional(),
  model: z.string().min(1),
  input_usd_per_mtok: z.number().nonnegative(),
  output_usd_per_mtok: z.number().nonnegative(),
  demo: z.boolean().optional(),
  blurb: z.string().optional(),
});

export function repoRoot(): string {
  return process.cwd();
}

export function loadModels(file = path.join(repoRoot(), "models.yaml")): ModelConfig[] {
  return loadModelsFromString(fs.readFileSync(file, "utf8"));
}

export function loadModelsFromString(source: string): ModelConfig[] {
  const parsed = parse(source) as { models?: unknown };
  const models = z.array(modelSchema).parse(parsed.models ?? parsed);
  const ids = new Set<string>();
  return models.map((model) => {
    if (ids.has(model.id)) throw new Error(`Duplicate model id ${model.id}`);
    ids.add(model.id);
    return {
      id: model.id,
      label: model.label,
      provider: model.provider,
      envKey: model.env_key,
      envBaseUrl: model.env_base_url,
      model: model.model,
      inputUsdPerMtok: model.input_usd_per_mtok,
      outputUsdPerMtok: model.output_usd_per_mtok,
      demo: model.demo,
      blurb: model.blurb,
    };
  });
}

export function loadTasks(dir = path.join(repoRoot(), "tasks")): LoadedTask[] {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name));
  const tasks = entries.map((entry) => loadTask(entry));
  const ids = new Set<string>();
  for (const task of tasks) {
    if (ids.has(task.id)) throw new Error(`Duplicate task id ${task.id}`);
    ids.add(task.id);
    const weight = task.rubric.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(weight - 1) > 0.001) {
      throw new Error(`Rubric weights for ${task.id} sum to ${weight}, not 1.`);
    }
    const quality = task.qualityWeights.auto + task.qualityWeights.judge;
    if (Math.abs(quality - 1) > 0.001) {
      throw new Error(`Quality weights for ${task.id} sum to ${quality}, not 1.`);
    }
    if (task.checks.some((check) => check.type === "harness")) {
      const harness = path.join(task.dir, "harness.ts");
      if (!fs.existsSync(harness)) throw new Error(`${task.id} is missing harness.ts`);
    }
  }
  return tasks.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function loadTask(dir: string): LoadedTask {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, "task.json"), "utf8")) as unknown;
  const parsed = taskFileSchema.parse(raw);
  const prompt = fs.readFileSync(path.join(dir, "prompt.md"), "utf8").trim();
  const fixtures = parsed.fixtures.map((relative) => ({
    path: relative,
    content: fs.readFileSync(path.join(dir, relative), "utf8"),
  }));
  const task: LoadedTask = {
    id: parsed.id,
    title: parsed.title,
    category: parsed.category,
    starter: parsed.starter,
    order: parsed.order,
    summary: parsed.summary,
    whatWeTest: parsed.whatWeTest,
    outputHint: parsed.outputHint,
    prompt,
    fixtures,
    rubric: parsed.rubric,
    qualityWeights: parsed.qualityWeights,
    checks: parsed.checks,
    dir,
  };
  if (path.basename(dir) !== task.id) {
    throw new Error(`Task directory ${path.basename(dir)} does not match id ${task.id}`);
  }
  return task;
}

export function selectTasks(
  tasks: LoadedTask[],
  selector: string,
): LoadedTask[] {
  const value = selector.trim();
  if (value === "all") return tasks;
  if (value === "starter") return tasks.filter((task) => task.starter);
  if ((CATEGORIES as readonly string[]).includes(value)) {
    return tasks.filter((task) => task.category === (value as Category));
  }
  const ids = new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const selected = tasks.filter((task) => ids.has(task.id));
  const missing = [...ids].filter((id) => !selected.some((task) => task.id === id));
  if (missing.length) throw new Error(`Unknown task id: ${missing.join(", ")}`);
  return selected;
}

export function selectModels(models: ModelConfig[], ids: string[] | undefined): ModelConfig[] {
  if (!ids || ids.length === 0) return models;
  const wanted = new Set(ids.flatMap((id) => id.split(",").map((item) => item.trim())).filter(Boolean));
  const selected = models.filter((model) => wanted.has(model.id));
  const missing = [...wanted].filter((id) => !selected.some((model) => model.id === id));
  if (missing.length) throw new Error(`Unknown model id: ${missing.join(", ")}`);
  return selected;
}

export function taskPack(task: LoadedTask): TaskPack {
  const { dir, ...pack } = task;
  void dir;
  return pack;
}
