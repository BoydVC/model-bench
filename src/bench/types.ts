export const CATEGORIES = ["coding", "writing", "research", "data"] as const;

export type Category = (typeof CATEGORIES)[number];

export type ProviderKind = "openai-compatible" | "anthropic";

/** Process env or a test double. Values are optional, so `{}` is a valid empty environment. */
export type BenchEnv = Record<string, string | undefined>;

export type ModelConfig = {
  id: string;
  label: string;
  provider: ProviderKind;
  /** Environment variable that holds the API key. */
  envKey: string;
  /** Environment variable that holds an optional base URL. */
  envBaseUrl?: string;
  model: string;
  inputUsdPerMtok: number;
  outputUsdPerMtok: number;
  /** Fictional stand-in shipped with recorded responses. */
  demo?: boolean;
  blurb?: string;
};

export type RubricCriterion = {
  id: string;
  label: string;
  weight: number;
  prompt: string;
};

export type QualityWeights = {
  auto: number;
  judge: number;
};

export type CheckSpec =
  | {
      type: "contains";
      id: string;
      value: string;
      points?: number;
      caseSensitive?: boolean;
    }
  | {
      type: "not_contains";
      id: string;
      value: string;
      points?: number;
      caseSensitive?: boolean;
    }
  | {
      type: "regex";
      id: string;
      pattern: string;
      flags?: string;
      points?: number;
    }
  | {
      type: "regex_min";
      id: string;
      pattern: string;
      flags?: string;
      min: number;
      points?: number;
    }
  | {
      type: "word_count";
      id: string;
      min: number;
      max: number;
      points?: number;
    }
  | {
      type: "harness";
      id?: string;
    };

export type Fixture = {
  path: string;
  content: string;
};

export type TaskPack = {
  id: string;
  title: string;
  category: Category;
  starter: boolean;
  order: number;
  summary: string;
  whatWeTest: string[];
  outputHint: string;
  prompt: string;
  fixtures: Fixture[];
  rubric: RubricCriterion[];
  qualityWeights: QualityWeights;
  checks: CheckSpec[];
};

export type LoadedTask = TaskPack & {
  dir: string;
};

export type CheckOutcome = {
  id: string;
  points: number;
  max: number;
  detail: string;
};

export type CriterionScore = {
  id: string;
  score: number;
  note: string;
};

export type CallResult = {
  taskId: string;
  modelId: string;
  mode: "mock" | "live";
  output: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  auto: { score: number; checks: CheckOutcome[] };
  judge: { score: number; criteria: CriterionScore[] } | null;
  quality: number;
  error?: string;
};

export type PairSide = "a" | "b" | "tie";

export type PairResult = {
  taskId: string;
  modelA: string;
  modelB: string;
  forwardWinner: PairSide;
  reverseWinner: PairSide;
  result: PairSide;
  positionBias: boolean;
};

export type RunMode = "mock" | "live" | "mixed";

export type RunFile = {
  id: string;
  createdAt: string;
  mode: RunMode;
  judgeMode: "mock" | "live";
  label: string;
  disclaimer: string;
  models: ModelConfig[];
  tasks: TaskPack[];
  calls: CallResult[];
  pairs: PairResult[];
  judgeUsage: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
  };
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Completion = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};
