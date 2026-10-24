import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { MissingRun, RunBanner } from "@/components/run-banner";
import { formatCost, formatMs, formatScore } from "@/bench/format";
import { loadPublishedRun } from "@/lib/published-run";

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the task…</p>}>
      <TaskBody params={params} />
    </Suspense>
  );
}

async function TaskBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const published = await loadPublishedRun();
  if (!published.run) return <MissingRun message={published.message ?? "No run file."} />;
  const task = published.run.tasks.find((item) => item.id === id);
  if (!task) {
    return (
      <section>
        <h1 className="font-serif text-3xl">Task not in this run</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/tasks" className="underline">Back to the starter pack</Link>
        </p>
      </section>
    );
  }
  const calls = published.run.calls
    .filter((call) => call.taskId === task.id)
    .sort((a, b) => b.quality - a.quality);
  const label = new Map(published.run.models.map((model) => [model.id, model.label]));
  return (
    <article className="space-y-6">
      <p className="text-sm">
        <Link href="/tasks" className="text-muted-foreground underline-offset-2 hover:underline">Tasks</Link>
      </p>
      <header>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{task.category}</Badge>
          {task.starter ? <Badge variant="secondary">Starter example</Badge> : null}
        </div>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">{task.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{task.summary}</p>
      </header>
      <RunBanner run={published.run} source={published.source} />
      <section>
        <h2 className="font-serif text-2xl">What the automatic checks cover</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
          {task.whatWeTest.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-serif text-xl">Prompt</h2>
          <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-sm leading-6">{task.prompt}</pre>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-serif text-xl">Rubric</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {task.rubric.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.label}</span>
                  <span className="font-mono text-xs text-muted-foreground"> · weight {item.weight}</span>
                  <p className="text-muted-foreground">{item.prompt}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Quality mixes automatic tests ({task.qualityWeights.auto}) and the judge ({task.qualityWeights.judge}).
            </p>
          </div>
          {task.fixtures.map((fixture) => (
            <div key={fixture.path} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-mono text-xs">{fixture.path}</h3>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5">{fixture.content}</pre>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-serif text-2xl">This run</h2>
        <div className="mt-3 space-y-4">
          {calls.map((call) => (
            <details key={call.modelId} className="rounded-xl border border-border bg-card p-4" open={calls[0]?.modelId === call.modelId}>
              <summary className="cursor-pointer font-medium">
                {label.get(call.modelId) ?? call.modelId}
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  quality {formatScore(call.quality)} · auto {formatScore(call.auto.score)} · judge {formatScore(call.judge?.score)} · {formatMs(call.latencyMs)} · {formatCost(call.costUsd)} · {call.mode}
                </span>
              </summary>
              {call.error ? <p className="mt-3 text-sm text-destructive">{call.error}</p> : null}
              <ul className="mt-3 space-y-1 text-xs">
                {call.auto.checks.map((check) => (
                  <li key={check.id} className={check.points < check.max ? "text-destructive" : "text-muted-foreground"}>
                    {check.id}: {check.points}/{check.max} · {check.detail}
                  </li>
                ))}
              </ul>
              {call.judge ? (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {call.judge.criteria.map((criterion) => (
                    <li key={criterion.id}>
                      {criterion.id} {formatScore(criterion.score)} · {criterion.note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No judge score. Quality is the automatic score.</p>
              )}
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/70 p-3 text-xs leading-5">{call.output || "No output."}</pre>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
