import { parseArgs } from "node:util";
import path from "node:path";
import { loadDotEnvFile, resolveRequestedMode } from "./env";
import { loadTasks } from "./load";
import { executeRun, readRun, renderReport, writeRun } from "./run";

loadDotEnvFile(path.join(process.cwd(), ".env"));

const { values } = parseArgs({
  options: {
    mode: { type: "string", default: "auto" },
    judge: { type: "string", default: "auto" },
    model: { type: "string", multiple: true },
    tasks: { type: "string", default: "starter" },
    out: { type: "string" },
    "run-id": { type: "string" },
    fresh: { type: "boolean", default: false },
    merge: { type: "string" },
    list: { type: "boolean", default: false },
    report: { type: "boolean", default: false },
    run: { type: "string" },
  },
});

const mode = asChoice(
  resolveRequestedMode(process.argv, values.mode, process.env.MODEL_BENCH_MODE),
  "--mode",
);
const judge = asChoice(values.judge, "--judge");

function asChoice(value: string | undefined, flag: string): "auto" | "mock" | "live" {
  if (value === "auto" || value === "mock" || value === "live") return value;
  throw new Error(`${flag} must be auto, mock, or live.`);
}

if (values.list) {
  const tasks = loadTasks();
  for (const task of tasks) {
    const mark = task.starter ? "starter" : "custom";
    console.log(`${task.order.toString().padStart(2, " ")}  ${task.category.padEnd(8)}  ${task.id.padEnd(24)}  ${mark}  ${task.title}`);
  }
  process.exit(0);
}

if (values.report) {
  const file = values.run ?? path.join(process.cwd(), "results", "demo.json");
  console.log(renderReport(readRun(file)));
  process.exit(0);
}

async function main(): Promise<void> {
  const out = values.out ?? path.join(process.cwd(), "results", mode === "mock" && values.fresh ? "demo.json" : "latest.json");
  const run = await executeRun({
    mode,
    judge,
    tasks: values.tasks,
    modelIds: values.model,
    out,
    runId: values["run-id"],
    fresh: values.fresh,
    mergeFrom: values.merge,
  });
  writeRun(run, out);
  const failed = run.calls.filter((call) => call.error);
  console.log(`${run.label} (${run.mode}, judge ${run.judgeMode})`);
  console.log(`${run.calls.length} calls, ${run.pairs.length} pairs, ${failed.length} errors`);
  console.log(`wrote ${out}`);
  if (failed.length) {
    for (const call of failed.slice(0, 8)) {
      console.error(`${call.modelId} ${call.taskId}: ${call.error}`);
    }
    process.exit(1);
  }
}

void main();
