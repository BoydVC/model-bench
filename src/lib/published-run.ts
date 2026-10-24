import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import type { RunFile } from "@/bench/types";

export type PublishedRun = {
  run: RunFile | null;
  source: string;
  message?: string;
};

export async function loadPublishedRun(): Promise<PublishedRun> {
  await connection();
  const latest = path.join(process.cwd(), "results", "latest.json");
  const demo = path.join(process.cwd(), "results", "demo.json");
  const file = fs.existsSync(latest) ? latest : demo;
  if (!fs.existsSync(file)) {
    return {
      run: null,
      source: "missing",
      message: "No results yet. From the repo root, run npm run demo, then refresh.",
    };
  }
  try {
    const run = JSON.parse(fs.readFileSync(file, "utf8")) as RunFile;
    return { run, source: path.basename(file) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { run: null, source: path.basename(file), message: `Could not read ${path.basename(file)}: ${detail}` };
  }
}

export function boardRun(run: RunFile): RunFile {
  return {
    ...run,
    tasks: run.tasks.map((task) => ({
      ...task,
      prompt: "",
      fixtures: task.fixtures.map((fixture) => ({ path: fixture.path, content: "" })),
    })),
    calls: run.calls.map((call) => ({ ...call, output: "" })),
  };
}
