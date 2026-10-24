import assert from "node:assert/strict";
import test from "node:test";
import { runDeclarativeChecks, wordCount } from "../src/bench/checks";
import { applyDotEnv, resolveRequestedMode } from "../src/bench/env";
import { buildCheatSheet } from "../src/bench/cheat";
import { mockPairWinner, parseAbsoluteJudgment, parsePairVerdict } from "../src/bench/judge";
import { loadModelsFromString, loadTasks, selectModels, selectTasks } from "../src/bench/load";
import { buildMessages } from "../src/bench/prompt";
import { completeLive, resolveBaseUrl, resolveJudgeMode, resolveMode } from "../src/bench/providers";
import { executeRun } from "../src/bench/run";
import {
  autoScore,
  costUsd,
  leaderboard,
  mapPresentedWinner,
  pairsToJudge,
  qualityOf,
  resolvePair,
} from "../src/bench/score";
import { extractCode, extractJson, loadModule } from "../src/bench/sandbox";
import type { CallResult, LoadedTask, PairResult } from "../src/bench/types";

test("starter pack has 20 labeled tasks across four categories", () => {
  const tasks = loadTasks();
  assert.equal(tasks.length, 20);
  assert.ok(tasks.every((task) => task.starter));
  for (const category of ["coding", "writing", "research", "data"] as const) {
    assert.ok(tasks.filter((task) => task.category === category).length >= 4, category);
  }
  const retry = tasks.find((task) => task.id === "retry-helper");
  assert.ok(retry);
  assert.match(buildMessages(retry)[1].content, /module\.exports\.retry/);
  const redact = tasks.find((task) => task.id === "redact-secrets");
  assert.ok(redact);
  assert.match(buildMessages(redact)[1].content, /sk-live-abc12345/);
});

test("declarative checks score contains, absence, counts, and length", () => {
  const checks = runDeclarativeChecks(
    [
      { type: "contains", id: "hit", value: "Decision: build" },
      { type: "not_contains", id: "miss", value: "Decision: buy", points: 3 },
      { type: "regex_min", id: "numbers", pattern: "^\\s*\\d+[.)]", flags: "gm", min: 2 },
      { type: "word_count", id: "words", min: 2, max: 8 },
    ],
    "1. Decision: build\n2. Ship it",
  );
  assert.equal(autoScore(checks), 100);
  assert.equal(wordCount("one two  three"), 3);
});

test("position swap counts a win only when both orders agree", () => {
  assert.deepEqual(resolvePair("a", "a"), { result: "a", positionBias: false });
  assert.deepEqual(resolvePair("b", "a"), { result: "tie", positionBias: true });
  assert.deepEqual(resolvePair("a", "tie"), { result: "tie", positionBias: false });
  assert.equal(mapPresentedWinner("a", "second"), "b");
  assert.equal(mapPresentedWinner("b", "first"), "b");
  assert.equal(mockPairWinner("retry-helper", "cedar-flash", "cedar-pro"), "second");
  assert.equal(mockPairWinner("incident-note", "inkwell", "surveyor"), "first");
  assert.equal(mockPairWinner("incident-note", "surveyor", "inkwell"), "first");
});

test("judge JSON parses scores and pair verdicts", () => {
  const task = loadTasks().find((item) => item.id === "retry-helper") as LoadedTask;
  const criteria = parseAbsoluteJudgment(
    '```json\n{"criteria":[{"id":"correctness","score":91,"note":"solid"},{"id":"constraints","score":80,"note":"ok"},{"id":"clarity","score":70,"note":"fine"}]}\n```',
    task,
  );
  assert.equal(criteria[0].score, 91);
  assert.equal(parsePairVerdict('{"winner":"tie","note":"close"}').winner, "tie");
  assert.throws(() => parsePairVerdict('{"winner":"left"}'));
});

test("cost uses the published per-million rates", () => {
  const cost = costUsd(1_000_000, 500_000, { inputUsdPerMtok: 2, outputUsdPerMtok: 8 });
  assert.equal(cost, 6);
  assert.equal(qualityOf(80, null, { auto: 0.5, judge: 0.5 }), 80);
  assert.equal(qualityOf(80, 40, { auto: 0.5, judge: 0.5 }), 60);
});

test("sandbox extracts code and refuses a missing export", () => {
  const code = extractCode("Here:\n```js\nmodule.exports.value = 2;\n```");
  assert.equal((loadModule(code).value as number), 2);
  const parsed = extractJson("note\n```json\n{\"ok\":true}\n```\nthanks");
  assert.deepEqual(parsed, { ok: true });
});

test("provider mode follows keys, and live requests hit the right URL", async () => {
  const model = {
    id: "your-model",
    label: "Your Model",
    provider: "openai-compatible" as const,
    envKey: "YOUR_MODEL_API_KEY",
    envBaseUrl: "YOUR_MODEL_BASE_URL",
    model: "your-model-name",
    inputUsdPerMtok: 1,
    outputUsdPerMtok: 3,
  };
  assert.equal(resolveMode("auto", model, {}), "mock");
  assert.equal(resolveMode("auto", model, { YOUR_MODEL_API_KEY: "sk-test" }), "live");
  assert.equal(resolveJudgeMode("auto", {}), "mock");
  assert.equal(resolveBaseUrl(model, {}), "https://api.openai.com/v1");
  assert.equal(
    resolveBaseUrl(model, { YOUR_MODEL_BASE_URL: "http://127.0.0.1:9/v1" }),
    "http://127.0.0.1:9/v1",
  );

  let seen: { url: string; auth: string; body: { model: string; temperature: number } } | undefined;
  const completion = await completeLive(model, [{ role: "user", content: "hi" }], { YOUR_MODEL_API_KEY: "sk-test" }, async (url, init) => {
    seen = {
      url: String(url),
      auth: (init?.headers as Record<string, string>).Authorization,
      body: JSON.parse(String(init?.body)),
    };
    return new Response(JSON.stringify({
      choices: [{ message: { content: "pong" } }],
      usage: { prompt_tokens: 3, completion_tokens: 1 },
    }));
  });
  assert.equal(seen?.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(seen?.auth, "Bearer sk-test");
  assert.equal(seen?.body.model, "your-model-name");
  assert.equal(seen?.body.temperature, 0);
  assert.equal(completion.text, "pong");
  assert.equal(completion.inputTokens, 3);

  const anthropic = { ...model, provider: "anthropic" as const };
  let anthropicUrl = "";
  await completeLive(anthropic, [
    { role: "system", content: "be brief" },
    { role: "user", content: "hi" },
  ], { YOUR_MODEL_API_KEY: "sk-ant" }, async (url, init) => {
    anthropicUrl = String(url);
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers["x-api-key"], "sk-ant");
    assert.equal(headers["anthropic-version"], "2023-06-01");
    return new Response(JSON.stringify({
      content: [{ type: "text", text: "hello" }],
      usage: { input_tokens: 4, output_tokens: 2 },
    }));
  });
  assert.equal(anthropicUrl, "https://api.anthropic.com/v1/messages");
  await assert.rejects(() => completeLive(model, [{ role: "user", content: "hi" }], {}));
});

test("a new model block parses and an unknown id is rejected", () => {
  const models = loadModelsFromString(`
models:
  - id: your-model
    label: Your Model
    provider: openai-compatible
    env_key: YOUR_MODEL_API_KEY
    env_base_url: YOUR_MODEL_BASE_URL
    model: your-model-name
    input_usd_per_mtok: 1
    output_usd_per_mtok: 3
`);
  assert.equal(models[0].envKey, "YOUR_MODEL_API_KEY");
  assert.equal(selectModels(models, ["your-model"]).length, 1);
  assert.throws(() => selectModels(models, ["missing"]));
  assert.equal(selectTasks(loadTasks(), "coding").every((task) => task.category === "coding"), true);
});

test("pair planner keeps untouched pairs and rejudges a new model", () => {
  const call = (taskId: string, modelId: string): CallResult => ({
    taskId,
    modelId,
    mode: "mock",
    output: "x",
    latencyMs: 1,
    inputTokens: 1,
    outputTokens: 1,
    costUsd: 0,
    auto: { score: 1, checks: [] },
    judge: { score: 1, criteria: [] },
    quality: 1,
  });
  const previous: PairResult = {
    taskId: "retry-helper",
    modelA: "cedar-flash",
    modelB: "cedar-pro",
    forwardWinner: "b",
    reverseWinner: "b",
    result: "b",
    positionBias: false,
  };
  const plan = pairsToJudge(
    [call("retry-helper", "cedar-flash"), call("retry-helper", "cedar-pro"), call("retry-helper", "your-model")],
    new Set(["retry-helper:your-model"]),
    [previous],
  );
  assert.equal(plan.keep.length, 1);
  assert.equal(plan.todo.length, 2);
});

test("demo mock run scores the starter pack and names category leaders", async () => {
  const run = await executeRun({
    mode: "mock",
    judge: "mock",
    fresh: true,
    tasks: "starter",
    runId: "demo",
    createdAt: "2026-10-23T22:00:00.000Z",
    env: {},
  });
  assert.equal(run.mode, "mock");
  assert.equal(run.judgeMode, "mock");
  assert.match(run.disclaimer, /fictional stand-ins/i);
  assert.equal(run.calls.length, 80);
  assert.equal(run.calls.filter((call) => call.error).length, 0);
  assert.equal(run.pairs.length, 120);
  const biased = run.pairs.filter((pair) => pair.positionBias);
  assert.equal(biased.length, 4);
  assert.ok(biased.every((pair) => pair.result === "tie"));
  const agreed = run.pairs.filter((pair) => !pair.positionBias && pair.result !== "tie");
  assert.ok(agreed.length > 0);
  assert.ok(agreed.every((pair) => pair.forwardWinner === pair.reverseWinner));

  const summary = (category: "all" | "coding" | "writing" | "research" | "data") =>
    leaderboard(run, category).map((row) => `${row.modelId}:${row.quality.toFixed(1)}`).join(" ");
  assert.equal(leaderboard(run, "coding")[0].modelId, "cedar-pro", summary("coding"));
  assert.equal(leaderboard(run, "writing")[0].modelId, "inkwell", summary("writing"));
  assert.equal(leaderboard(run, "research")[0].modelId, "surveyor", summary("research"));
  assert.equal(leaderboard(run, "data")[0].modelId, "cedar-pro", summary("data"));

  const sheet = buildCheatSheet(run);
  assert.match(sheet.headline, /Cedar Pro|Surveyor|Inkwell/);
  assert.equal(sheet.categories.find((item) => item.category === "writing")?.best.modelId, "inkwell");
  assert.equal(sheet.categories.find((item) => item.category === "research")?.best.modelId, "surveyor");
  assert.ok(sheet.tasks.length >= 8);
  assert.match(sheet.rules.join(" "), /Mock run/);
  const flash = leaderboard(run, "all").find((row) => row.modelId === "cedar-flash");
  assert.ok(flash);
  assert.ok(flash.meanCostUsd < leaderboard(run, "all")[0].meanCostUsd);
});

test("dotenv fill does not override the environment, and --mode wins", () => {
  const env: Record<string, string | undefined> = { KEEP: "already" };
  applyDotEnv("# comment\nKEEP=from-file\nNEW=sk-replace-me\n\n=bad\n", env);
  assert.equal(env.KEEP, "already");
  assert.equal(env.NEW, "sk-replace-me");
  assert.equal(resolveRequestedMode(["node", "cli"], "auto", "mock"), "mock");
  assert.equal(resolveRequestedMode(["node", "cli", "--mode", "live"], "live", "mock"), "live");
  assert.equal(resolveRequestedMode(["node", "cli", "--mode=mock"], "mock", "live"), "mock");
});
