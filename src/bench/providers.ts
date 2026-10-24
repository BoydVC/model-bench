import type { BenchEnv, ChatMessage, Completion, ModelConfig, ProviderKind } from "./types";

export type FetchLike = typeof fetch;

const DEFAULT_BASE: Record<ProviderKind, string> = {
  "openai-compatible": "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
};

export function resolveBaseUrl(model: ModelConfig, env: BenchEnv): string {
  if (model.envBaseUrl && env[model.envBaseUrl]) return env[model.envBaseUrl] as string;
  return DEFAULT_BASE[model.provider];
}

export function resolveMode(
  requested: "auto" | "mock" | "live",
  model: ModelConfig,
  env: BenchEnv,
): "mock" | "live" {
  if (requested === "mock" || requested === "live") return requested;
  return env[model.envKey] ? "live" : "mock";
}

export function resolveJudgeMode(
  requested: "auto" | "mock" | "live",
  env: BenchEnv,
): "mock" | "live" {
  if (requested === "mock" || requested === "live") return requested;
  return env.JUDGE_API_KEY ? "live" : "mock";
}

export function judgeConfig(env: BenchEnv): ModelConfig {
  const provider: ProviderKind =
    env.JUDGE_PROVIDER === "anthropic" ? "anthropic" : "openai-compatible";
  return {
    id: "judge",
    label: "Judge",
    provider,
    envKey: "JUDGE_API_KEY",
    envBaseUrl: "JUDGE_BASE_URL",
    model: env.JUDGE_MODEL ?? "",
    inputUsdPerMtok: Number(env.JUDGE_INPUT_USD_PER_MTOK ?? 0),
    outputUsdPerMtok: Number(env.JUDGE_OUTPUT_USD_PER_MTOK ?? 0),
  };
}

export async function completeLive(
  model: ModelConfig,
  messages: ChatMessage[],
  env: BenchEnv,
  fetchImpl: FetchLike = fetch,
): Promise<Completion> {
  const apiKey = env[model.envKey];
  if (!apiKey) {
    throw new Error(
      `No API key for ${model.label}. Set ${model.envKey}, or run with --mode mock.`,
    );
  }
  if (!model.model) {
    throw new Error(`Model ${model.id} has an empty model name.`);
  }
  const baseUrl = resolveBaseUrl(model, env).replace(/\/$/, "");
  if (model.provider === "anthropic") return anthropicComplete(baseUrl, apiKey, model.model, messages, fetchImpl);
  return openAIComplete(baseUrl, apiKey, model.model, messages, fetchImpl);
}

async function openAIComplete(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  fetchImpl: FetchLike,
): Promise<Completion> {
  const started = performance.now();
  const url = `${baseUrl}/chat/completions`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0 }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI-compatible provider returned ${response.status} from ${url}: ${body.slice(0, 400)}`);
  }
  const json = JSON.parse(body) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: json.choices?.[0]?.message?.content ?? "",
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    latencyMs: Math.round(performance.now() - started),
  };
}

async function anthropicComplete(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  fetchImpl: FetchLike,
): Promise<Completion> {
  const started = performance.now();
  const url = `${baseUrl}/v1/messages`;
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const chat = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0,
      system,
      messages: chat,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Anthropic provider returned ${response.status} from ${url}: ${body.slice(0, 400)}`);
  }
  const json = JSON.parse(body) as {
    content?: { type?: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (json.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");
  return {
    text,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    latencyMs: Math.round(performance.now() - started),
  };
}
