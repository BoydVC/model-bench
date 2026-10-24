import vm from "node:vm";
import type { CheckOutcome } from "./types";

export function extractCode(text: string): string {
  const blocks = [
    ...text.matchAll(/```([a-zA-Z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)```/g),
  ];
  if (blocks.length === 0) return text.trim();
  const codeLang = new Set([
    "js",
    "javascript",
    "mjs",
    "cjs",
    "ts",
    "typescript",
  ]);
  const preferred = blocks.find((block) => codeLang.has(block[1].toLowerCase()));
  return (preferred ?? blocks[0])[2].trim();
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json|js|javascript)?\s*([\s\S]*?)```/i);
  const source = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(source);
  } catch {
    // Fall through to a bracket scan so a short preface does not fail the parse.
  }
  const start = source.search(/[\[{]/);
  if (start < 0) throw new Error("No JSON value in the response.");
  const closers: Record<string, string> = { "{": "}", "[": "]" };
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") {
      stack.push(closers[char]);
      continue;
    }
    if (char === "}" || char === "]") {
      if (stack.pop() !== char) throw new Error("JSON brackets did not match.");
      if (stack.length === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error("JSON value did not close.");
}

export function normalizeToCjs(code: string): string {
  if (/module\.exports/.test(code)) return code;
  const names = [
    ...code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g),
    ...code.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g),
  ].map((match) => match[1]);
  let next = code
    .replace(/export\s+async\s+function/g, "async function")
    .replace(/export\s+function/g, "function")
    .replace(/export\s+(const|let|var)/g, "$1");
  for (const name of names) next += `\nmodule.exports.${name} = ${name};`;
  return next;
}

export function loadModule(source: string): Record<string, unknown> {
  const code = normalizeToCjs(extractCode(source));
  const commonjs = { exports: {} as Record<string, unknown> };
  const sandbox: Record<string, unknown> = {
    module: commonjs,
    exports: commonjs.exports,
    console: { log() {}, error() {}, warn() {}, info() {} },
    Math,
    JSON,
    Date,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Error,
    TypeError,
    RangeError,
    Map,
    Set,
    WeakMap,
    WeakSet,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Promise,
    Symbol,
    encodeURIComponent,
    decodeURIComponent,
  };
  vm.runInNewContext(code, sandbox, { timeout: 1000 });
  const exported = commonjs.exports;
  if (!exported || typeof exported !== "object") {
    throw new Error("The module did not set module.exports.");
  }
  return exported;
}

export type CaseResult = { points: number; detail: string };

export type HarnessCase = {
  id: string;
  max?: number;
  run: (mod: Record<string, unknown>) => Promise<CaseResult> | CaseResult;
};

export function withTimeout<T>(promise: Promise<T>, ms = 800): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms} ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function runCases(
  output: string,
  cases: HarnessCase[],
): Promise<CheckOutcome[]> {
  const maxOf = (item: HarnessCase) => item.max ?? 1;
  let loaded: Record<string, unknown>;
  try {
    loaded = loadModule(output);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return cases.map((item) => ({
      id: item.id,
      points: 0,
      max: maxOf(item),
      detail: `Could not load a module: ${detail}`,
    }));
  }
  const outcomes: CheckOutcome[] = [];
  for (const item of cases) {
    const max = maxOf(item);
    try {
      const result = await withTimeout(Promise.resolve(item.run(loaded)));
      outcomes.push({
        id: item.id,
        points: Math.max(0, Math.min(max, result.points)),
        max,
        detail: result.detail,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      outcomes.push({ id: item.id, points: 0, max, detail });
    }
  }
  return outcomes;
}

export function pass(detail: string, points = 1): CaseResult {
  return { points, detail };
}

export function fail(detail: string): CaseResult {
  return { points: 0, detail };
}
