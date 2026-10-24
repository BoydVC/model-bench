# Model Bench v1

First shippable slice. The four named models are demo data.

## What v1 does

- Task packs with a prompt, fixtures, a rubric, and either declarative checks or a `harness.ts`. Categories are coding, writing, research, and data.
- Twenty starter tasks, labeled starter examples, drawn from agent tooling, small web changes, docs, research briefs, and data cleanup.
- A runner for OpenAI-compatible chat completions and Anthropic messages. Keys and base URLs come from the environment. See `.env.example`.
- With no keys, or with `npm run demo`, the runner uses recorded answers, recorded latencies, and a recorded judge. The result is labeled a mock demo. It is not a measurement of a production model.
- Automatic tests plus an independent judge. Each pair is judged in both orders. A win counts only when both orders agree. Flips are ties.
- The run stores quality, latency, and token cost. The site shows a leaderboard by category and a cheat sheet generated from that run.
- A new model is a `models.yaml` block plus the env vars named in that block.

## Known limits

- Cedar Pro, Cedar Flash, Inkwell, and Surveyor are fictional stand-ins. Their answers, timings, token counts, and judge scores are fixtures.
- There is no hosted model behind those names. Setting their keys and leaving mode on `auto` will try a live call and fail unless you point the base URL at something that actually serves that model name.
- A new model with no `JUDGE_API_KEY` is scored on automatic tests only. It has no pairwise record.
- Mock judge rankings are a recorded table. A few pairs are recorded to disagree when the order swaps, so they resolve to ties.
- Coding harnesses run model JavaScript in a local `vm`. The timeout stops a promise. A synchronous infinite loop is not stopped.
- Results are JSON files on disk. There is no account system and no database.
- This is a local tool. Do not deploy it publicly. Live mode sends prompts and fixtures to the base URL you configure.
