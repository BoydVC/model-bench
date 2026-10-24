import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MissingRun, RunBanner } from "@/components/run-banner";
import { buildCheatSheet } from "@/bench/cheat";
import { formatCost, formatMs, formatScore } from "@/bench/format";
import { loadPublishedRun } from "@/lib/published-run";
import type { Category } from "@/bench/types";

const LABEL: Record<Category, string> = {
  coding: "Coding",
  writing: "Writing",
  research: "Research",
  data: "Data",
};

export default function CheatSheetPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Building the cheat sheet…</p>}>
      <CheatBody />
    </Suspense>
  );
}

async function CheatBody() {
  const published = await loadPublishedRun();
  if (!published.run) return <MissingRun message={published.message ?? "No run file."} />;
  const sheet = buildCheatSheet(published.run);
  const grouped = new Map<Category, typeof sheet.tasks>();
  for (const task of sheet.tasks) {
    const list = grouped.get(task.category) ?? [];
    list.push(task);
    grouped.set(task.category, list);
  }
  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Generated from {published.source}</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Which model for which task</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{sheet.headline}</p>
      </div>
      <RunBanner run={published.run} source={published.source} />
      <ol className="space-y-2">
        {sheet.rules.map((rule) => (
          <li key={rule} className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6">
            {rule}
          </li>
        ))}
      </ol>
      <div className="grid gap-4 lg:grid-cols-2">
        {sheet.categories.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardDescription className="uppercase tracking-wide">{LABEL[category.category]}</CardDescription>
              <CardTitle className="font-serif text-2xl">{category.best.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              <p>{category.narrative}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatScore(category.best.quality)} quality · {formatMs(category.best.medianLatencyMs)} · {formatCost(category.best.meanCostUsd)}
              </p>
              {category.value ? (
                <p>
                  <Badge variant="secondary">When cost matters</Badge>{" "}
                  <span className="ml-1">{category.value.reason}</span>
                </p>
              ) : (
                <p className="text-muted-foreground">No cheaper model stays close enough to recommend as the value pick.</p>
              )}
              <p>
                <Badge variant="outline">Skip</Badge>{" "}
                <span className="ml-1">{category.avoid.label} on {category.avoid.weakestTask}.</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <section>
        <h2 className="font-serif text-3xl tracking-tight">Clear task picks</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          A task appears here when the leader’s quality margin is at least 8 points. Closer races stay on the leaderboard and are not turned into a recommendation.
        </p>
        <div className="mt-4 space-y-6">
          {(["coding", "writing", "research", "data"] as const).map((category) => {
            const tasks = grouped.get(category) ?? [];
            if (tasks.length === 0) return null;
            return (
              <div key={category}>
                <h3 className="text-sm font-medium tracking-wide text-primary uppercase">{LABEL[category]}</h3>
                <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {tasks.map((task) => (
                    <li key={task.taskId} className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link href={`/tasks/${task.taskId}`} className="font-medium hover:underline">
                          {task.title}
                        </Link>
                        <span className="font-mono text-xs">{task.label} · {formatScore(task.quality)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{task.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
