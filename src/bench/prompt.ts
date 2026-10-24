import type { ChatMessage, LoadedTask, TaskPack } from "./types";

export const SYSTEM_PROMPT = [
  "You are completing a task in Model Bench, a personal benchmark built from a technology director's work.",
  "Follow the requested output format exactly.",
  "Use only the facts in the task and its fixtures. Do not invent certifications, metrics, or names.",
  "When the task asks for code or JSON, do not add a preamble outside the requested fence.",
].join("\n");

export function buildMessages(task: Pick<TaskPack, "prompt" | "fixtures" | "outputHint">): ChatMessage[] {
  const fixtures = task.fixtures
    .map((fixture) => `### Fixture: ${fixture.path}\n\n${fixture.content.trim()}`)
    .join("\n\n");
  const parts = [task.prompt.trim()];
  if (fixtures) parts.push(fixtures);
  if (task.outputHint.trim()) parts.push(task.outputHint.trim());
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: parts.join("\n\n") },
  ];
}

export const ABSOLUTE_JUDGE_SYSTEM = [
  "You are an independent judge for Model Bench.",
  "Score the candidate response against each rubric criterion from 0 to 100.",
  "100 means a director would send it unchanged. 70 means usable with a small edit. 40 means it misses a constraint or invents a fact. 0 means unusable.",
  "Do not reward length. Do not prefer a response because of its position or its prose style alone.",
  "Return JSON only, with one criterion object per rubric id.",
].join("\n");

export const PAIR_JUDGE_SYSTEM = [
  "You are an independent judge for Model Bench.",
  "Two candidate responses are labeled FIRST and SECOND. Position is not quality.",
  "Choose the response that better satisfies the rubric.",
  "Choose tie when a director would not care which draft they received.",
  'Return JSON only: {"winner":"first"|"second"|"tie","note":"one sentence"}.',
].join("\n");

export function absoluteJudgeMessages(task: TaskPack, output: string): ChatMessage[] {
  const rubric = task.rubric
    .map((item) => `- ${item.id} (${item.label}, weight ${item.weight}): ${item.prompt}`)
    .join("\n");
  return [
    { role: "system", content: ABSOLUTE_JUDGE_SYSTEM },
    {
      role: "user",
      content: [
        `Task: ${task.title}`,
        `Category: ${task.category}`,
        "",
        "Task prompt:",
        task.prompt.trim(),
        "",
        "Rubric:",
        rubric,
        "",
        "Candidate response:",
        output,
        "",
        'Return {"criteria":[{"id":"...","score":0,"note":"..."}]} with every rubric id.',
      ].join("\n"),
    },
  ];
}

export function pairJudgeMessages(
  task: TaskPack,
  first: string,
  second: string,
): ChatMessage[] {
  const rubric = task.rubric
    .map((item) => `- ${item.id}: ${item.prompt}`)
    .join("\n");
  return [
    { role: "system", content: PAIR_JUDGE_SYSTEM },
    {
      role: "user",
      content: [
        `Task: ${task.title}`,
        `Category: ${task.category}`,
        "",
        "Task prompt:",
        task.prompt.trim(),
        "",
        "Rubric:",
        rubric,
        "",
        "Response FIRST:",
        first,
        "",
        "Response SECOND:",
        second,
      ].join("\n"),
    },
  ];
}

export function messageText(messages: ChatMessage[]): string {
  return messages.map((message) => message.content).join("\n");
}

export function taskForPrompt(task: LoadedTask): TaskPack {
  const { dir, ...pack } = task;
  void dir;
  return pack;
}
