import { fail, pass, runCases } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

type Row = Record<string, string | number>;
type Diff = {
  added: Row[];
  removed: Row[];
  changed: { key: string | number; fields: Record<string, { from: unknown; to: unknown }> }[];
};

export function run(output: string): Promise<CheckOutcome[]> {
  return runCases(output, [
    {
      id: "added",
      run(mod) {
        const diff = (mod.diffRows as (b: Row[], a: Row[], k: string) => Diff)(
          [{ id: 1, name: "a" }],
          [{ id: 1, name: "a" }, { id: 2, name: "b" }],
          "id",
        );
        const ok = diff.added?.length === 1 && diff.added[0]?.id === 2 && diff.removed?.length === 0 && diff.changed?.length === 0;
        return ok ? pass("Reported the added row only.") : fail(JSON.stringify(diff));
      },
    },
    {
      id: "removed",
      run(mod) {
        const diff = (mod.diffRows as (b: Row[], a: Row[], k: string) => Diff)(
          [{ id: 1, name: "a" }, { id: 2, name: "b" }],
          [{ id: 1, name: "a" }],
          "id",
        );
        const ok = diff.removed?.some((row) => row.id === 2) && diff.added?.length === 0 && diff.changed?.length === 0;
        return ok ? pass("Reported the removed row only.") : fail(JSON.stringify(diff));
      },
    },
    {
      id: "one-field",
      run(mod) {
        const diff = (mod.diffRows as (b: Row[], a: Row[], k: string) => Diff)(
          [{ id: 1, status: "open", name: "a" }],
          [{ id: 1, status: "closed", name: "a" }],
          "id",
        );
        const fields = diff.changed?.[0]?.fields ?? {};
        const keys = Object.keys(fields).sort().join(",");
        const ok = diff.changed?.length === 1 && keys === "status" && fields.status?.from === "open" && fields.status?.to === "closed";
        return ok ? pass("Reported only the status change.") : fail(JSON.stringify(diff));
      },
    },
    {
      id: "identical",
      run(mod) {
        const diff = (mod.diffRows as (b: Row[], a: Row[], k: string) => Diff)(
          [{ id: 1, name: "a" }],
          [{ id: 1, name: "a" }],
          "id",
        );
        const ok = diff.added?.length === 0 && diff.removed?.length === 0 && diff.changed?.length === 0;
        return ok ? pass("Identical snapshots produced an empty diff.") : fail(JSON.stringify(diff));
      },
    },
    {
      id: "two-fields",
      run(mod) {
        const diff = (mod.diffRows as (b: Row[], a: Row[], k: string) => Diff)(
          [{ id: 7, status: "open", owner: "sam" }],
          [{ id: 7, status: "closed", owner: "mei" }],
          "id",
        );
        const fields = diff.changed?.[0]?.fields ?? {};
        const keys = Object.keys(fields).sort().join(",");
        const ok = keys === "owner,status" && fields.status?.to === "closed" && fields.owner?.to === "mei";
        return ok ? pass("Reported both changed fields and not the key.") : fail(JSON.stringify(diff));
      },
    },
  ]);
}
