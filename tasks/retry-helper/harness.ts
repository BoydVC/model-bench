import { fail, pass, runCases, withTimeout } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

type RetryFn = (
  fn: () => Promise<unknown>,
  options: { attempts: number; sleep?: (attempt: number) => Promise<void> },
) => Promise<unknown>;

export function run(output: string): Promise<CheckOutcome[]> {
  return runCases(output, [
    {
      id: "first-success",
      async run(mod) {
        const retry = mod.retry as RetryFn;
        let calls = 0;
        const sleeps: number[] = [];
        const value = await withTimeout(
          retry(
            async () => {
              calls += 1;
              return "ok";
            },
            {
              attempts: 3,
              sleep: async (attempt) => {
                sleeps.push(attempt);
              },
            },
          ),
        );
        if (value === "ok" && calls === 1 && sleeps.length === 0) {
          return pass("Returned the first success without sleeping.");
        }
        return fail(`value=${String(value)} calls=${calls} sleeps=${sleeps.join(",")}`);
      },
    },
    {
      id: "eventual-success",
      async run(mod) {
        const retry = mod.retry as RetryFn;
        let calls = 0;
        const value = await withTimeout(
          retry(
            async () => {
              calls += 1;
              if (calls < 3) throw new Error("not yet");
              return "ok";
            },
            { attempts: 4, sleep: async () => {} },
          ),
        );
        if (value === "ok" && calls === 3) return pass("Returned the value on the third call.");
        return fail(`value=${String(value)} calls=${calls}`);
      },
    },
    {
      id: "last-error",
      async run(mod) {
        const retry = mod.retry as RetryFn;
        let calls = 0;
        try {
          await withTimeout(
            retry(
              async () => {
                calls += 1;
                throw new Error("nope");
              },
              { attempts: 3, sleep: async () => {} },
            ),
          );
          return fail(`Resolved instead of throwing. calls=${calls}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message === "nope" && calls === 3) return pass("Threw the last error after 3 calls.");
          return fail(`message=${message} calls=${calls}`);
        }
      },
    },
    {
      id: "single-attempt",
      async run(mod) {
        const retry = mod.retry as RetryFn;
        let calls = 0;
        const sleeps: number[] = [];
        try {
          await withTimeout(
            retry(
              async () => {
                calls += 1;
                throw new Error("nope");
              },
              {
                attempts: 1,
                sleep: async (attempt) => {
                  sleeps.push(attempt);
                },
              },
            ),
          );
          return fail("Resolved on a single failing attempt.");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message === "nope" && calls === 1 && sleeps.length === 0) {
            return pass("One attempt, the original error, no sleep.");
          }
          return fail(`message=${message} calls=${calls} sleeps=${sleeps.length}`);
        }
      },
    },
    {
      id: "sleep-indexes",
      async run(mod) {
        const retry = mod.retry as RetryFn;
        const sleeps: number[] = [];
        try {
          await withTimeout(
            retry(
              async () => {
                throw new Error("nope");
              },
              {
                attempts: 3,
                sleep: async (attempt) => {
                  sleeps.push(attempt);
                },
              },
            ),
          );
        } catch {
          // The final throw is expected.
        }
        if (sleeps.join(",") === "1,2") return pass("Slept with attempt numbers 1 and 2.");
        return fail(`sleep arguments were [${sleeps.join(", ")}], expected [1, 2].`);
      },
    },
  ]);
}
