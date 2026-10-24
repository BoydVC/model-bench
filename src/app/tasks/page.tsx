import { Suspense } from "react";
import { TaskBrowser } from "@/components/task-browser";
import { MissingRun, RunBanner } from "@/components/run-banner";
import { loadPublishedRun } from "@/lib/published-run";

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading tasks…</p>}>
      <TasksBody />
    </Suspense>
  );
}

async function TasksBody() {
  const published = await loadPublishedRun();
  if (!published.run) return <MissingRun message={published.message ?? "No run file."} />;
  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Task packs</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">The work in the starter pack</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Each task is a folder: a prompt, fixtures, a rubric, and either automatic checks or a small harness. Every task here is labeled a starter example, modeled on agent tooling, small web-app changes, docs, research briefs, and data cleanup.
        </p>
      </div>
      <RunBanner run={published.run} source={published.source} />
      <TaskBrowser tasks={published.run.tasks} />
    </div>
  );
}
