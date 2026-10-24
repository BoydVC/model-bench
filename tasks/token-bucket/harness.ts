import { fail, pass, runCases } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

type Limiter = { allow: (nowMs: number) => boolean };

export function run(output: string): Promise<CheckOutcome[]> {
  return runCases(output, [
    {
      id: "capacity",
      run(mod) {
        const create = mod.createLimiter as (opts: { capacity: number; refillPerSec: number }) => Limiter;
        const limiter = create({ capacity: 2, refillPerSec: 1 });
        const got = [limiter.allow(0), limiter.allow(0), limiter.allow(0)];
        const ok = got.join(",") === "true,true,false";
        return ok ? pass("Two tokens, then a refusal.") : fail(got.join(","));
      },
    },
    {
      id: "refill",
      run(mod) {
        const create = mod.createLimiter as (opts: { capacity: number; refillPerSec: number }) => Limiter;
        const limiter = create({ capacity: 2, refillPerSec: 1 });
        limiter.allow(0);
        limiter.allow(0);
        limiter.allow(0);
        const got = [limiter.allow(1000), limiter.allow(1000)];
        const ok = got.join(",") === "true,false";
        return ok ? pass("One token came back after a second.") : fail(got.join(","));
      },
    },
    {
      id: "cap",
      run(mod) {
        const create = mod.createLimiter as (opts: { capacity: number; refillPerSec: number }) => Limiter;
        const limiter = create({ capacity: 3, refillPerSec: 1 });
        limiter.allow(0);
        const later = [limiter.allow(100000), limiter.allow(100000), limiter.allow(100000), limiter.allow(100000)];
        const ok = later.join(",") === "true,true,true,false";
        return ok ? pass("A long wait refilled to capacity and no further.") : fail(later.join(","));
      },
    },
    {
      id: "backwards",
      run(mod) {
        const create = mod.createLimiter as (opts: { capacity: number; refillPerSec: number }) => Limiter;
        const limiter = create({ capacity: 1, refillPerSec: 5 });
        const first = limiter.allow(1000);
        const back = limiter.allow(500);
        const same = limiter.allow(1000);
        const ok = first === true && back === false && same === false;
        return ok ? pass("A clock moving backwards did not mint tokens.") : fail(`${first},${back},${same}`);
      },
    },
  ]);
}
