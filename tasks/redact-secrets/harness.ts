import { fail, pass, runCases } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

export function run(output: string): Promise<CheckOutcome[]> {
  return runCases(output, [
    {
      id: "api-key",
      run(mod) {
        const redact = mod.redact as (text: string) => string;
        const value = redact("ship the key sk-live-abc12345 in the ticket");
        if (value.includes("[REDACTED]") && !value.includes("sk-live-abc12345")) {
          return pass("Masked the sk- key.");
        }
        return fail(value);
      },
    },
    {
      id: "bearer",
      run(mod) {
        const redact = mod.redact as (text: string) => string;
        const value = redact("Authorization: Bearer abcdEFGH1234");
        if (value.includes("Bearer [REDACTED]") && !value.includes("abcdEFGH1234")) {
          return pass("Masked the bearer token.");
        }
        return fail(value);
      },
    },
    {
      id: "aws-key",
      run(mod) {
        const redact = mod.redact as (text: string) => string;
        const value = redact("key AKIAIOSFODNN7EXAMPLE leaked");
        if (value.includes("[REDACTED]") && !value.includes("AKIAIOSFODNN7EXAMPLE")) {
          return pass("Masked the AKIA key.");
        }
        return fail(value);
      },
    },
    {
      id: "url-password",
      run(mod) {
        const redact = mod.redact as (text: string) => string;
        const value = redact("https://hooks.example.com/cb?password=hunter2&x=1");
        if (value.includes("password=[REDACTED]") && !value.includes("hunter2")) {
          return pass("Masked the query password and kept the key.");
        }
        return fail(value);
      },
    },
    {
      id: "prose-password",
      run(mod) {
        const redact = mod.redact as (text: string) => string;
        const input = "Please reset your password tomorrow.";
        const value = redact(input);
        if (value === input) return pass("Left the ordinary sentence alone.");
        return fail(value);
      },
    },
    {
      id: "email",
      run(mod) {
        const redact = mod.redact as (text: string) => string;
        const input = "Write to mei.chen@example.com about the roster.";
        const value = redact(input);
        if (value === input) return pass("Left the email address alone.");
        return fail(value);
      },
    },
  ]);
}
