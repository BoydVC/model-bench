# Model Bench

A personal benchmark for the work a technology director actually hands a model: agent tools, small patches, docs, research briefs, and messy data. Each task is a pack with a prompt, fixtures, a rubric, and a test. Scores mix those automatic tests with an independent judge. The judge sees every pair twice, in both orders, so a model does not win by being shown first.

The starter pack is 20 labeled examples. Four fictional stand-ins (Cedar Pro, Cedar Flash, Inkwell, Surveyor) ship with recorded answers. They are demo data. They are not production models, and the demo is not a measurement of one.

## Install and run the mock demo

Node 22. No API key.

```bash
npm install
npm test
npm run demo
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). The banner says **Demo run** and **mock mode**. `npm test` runs the checks against the recorded answers. `npm run demo` rewrites `results/demo.json` and prints the same label. `npm run report` prints the cheat sheet. `npm start` serves a production build on the same port after `npm run build`.

## Plug in a real provider later

Keys live only in the environment. Copy the example and edit the copy. Do not put a real key in `.env.example`.

```bash
cp .env.example .env
```

`.env.example` lists every variable. Leave `MODEL_BENCH_MODE=mock` until you are ready. The bench CLI reads `.env` and does not override variables you already exported. `npm run demo` forces mock mode, so a filled-in key does not spend money on the demo script.

1. Copy the commented block at the bottom of `models.yaml`. Set `provider` to `openai-compatible` or `anthropic`, the model name, and the USD-per-million rates for the cost column.
2. In `.env`, set the key variable you named and, if you are not on the provider default, the base URL variable. OpenAI-compatible defaults to `https://api.openai.com/v1`. Anthropic defaults to `https://api.anthropic.com`. Set `MODEL_BENCH_MODE=live`, or pass `--mode live`.
3. Smoke one task:

   ```bash
   npm run bench -- --model your-model --tasks retry-helper
   ```

4. Run the starter pack. The result merges into `results/latest.json`, which the site prefers over the demo file:

   ```bash
   npm run bench -- --model your-model --tasks starter
   ```

5. Refresh the leaderboard. For rubric scores and pairwise wins, set `JUDGE_API_KEY`, `JUDGE_MODEL`, and optionally `JUDGE_BASE_URL` in `.env`. Without a judge key, a new model is ranked on automatic tests only and has no pairwise record. The stand-ins are not re-scored. Leave the `CEDAR_*`, `INKWELL_*`, and `SURVEYOR_*` keys empty. Those names are recorded fixtures.

```bash
npm run bench -- --list
npm run bench -- --mode mock          # recorded answers, no network
npm run bench -- --mode live --model your-model --tasks starter
npm run bench -- --fresh              # do not merge a previous run
```

With no keys set, `--mode auto` stays in mock for any model whose key is missing.

## Add a task

Create `tasks/<id>/` with `task.json` and `prompt.md`. The directory name matches `id`. Put fixtures next to them and list the paths in `task.json`. Categories are `coding`, `writing`, `research`, and `data`. Set `"starter": false` for a task that is yours.

Checks are declarative (`contains`, `not_contains`, `regex`, `regex_min`, `word_count`) or a `harness.ts` that exports `run(output)`. A harness can import `runCases`, `extractJson`, `pass`, and `fail` from `src/bench/sandbox.ts`. Harnesses execute the model's JavaScript in a local `vm`. Keep them to tasks you wrote. A synchronous infinite loop is not stopped by the timeout.

```bash
npm run bench -- --tasks your-task-id
```

## How a score is made

Automatic score is points earned over points possible, times 100. The judge scores each rubric criterion from 0 to 100. Quality is the weighted mix. Coding and data are 75% tests / 25% judge. Writing is 35/65. Research is even. If the judge did not run, quality is the automatic score.

Every pair is judged twice. A win counts only when both orders pick the same answer. If the winner flips, the pair is a tie and is marked as position bias. Cost is input and output tokens times the rates in `models.yaml`. Mock token counts are estimated from the recorded text. Mock latency is a recorded profile, not a measurement. Judge tokens are reported separately and are not added to a model's cost.

The cheat sheet is generated from the run. A value alternative has to clear 70 quality, stay within 12 points of the leader, and cost at most 60% as much. A task-level pick needs an 8-point margin. Models under 70 in every category are left off the recommendations.

## Layout

```
models.yaml          model blocks and token rates
tasks/<id>/          prompt, fixtures, rubric, checks or harness
src/bench/           loader, providers, sandbox, judge, scorer, CLI
src/recordings/      recorded answers and judge tables for the demo
src/app/             leaderboard, cheat sheet, tasks, method
results/demo.json    committed mock run
results/latest.json  your runs (gitignored)
```

This app is for local use. Do not deploy it publicly. Live mode sends prompts and fixtures to whatever base URL you configure, using keys from the environment.
