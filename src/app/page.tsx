import { Suspense } from "react";
import { LeaderboardView } from "@/components/leaderboard-view";
import { MissingRun, RunBanner } from "@/components/run-banner";
import { boardRun, loadPublishedRun } from "@/lib/published-run";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the latest run…</p>}>
      <HomeBody />
    </Suspense>
  );
}

async function HomeBody() {
  const published = await loadPublishedRun();
  if (!published.run) return <MissingRun message={published.message ?? "No run file."} />;
  const tasks = published.run.tasks.length;
  const models = published.run.models.length;
  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Starter examples</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Which model should do this work?</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Model Bench scores models on tasks from a technology director’s week: agent tools, small patches, docs, research briefs, and messy data. The {tasks} tasks in this pack are starter examples. {models} fictional stand-ins ship with recorded answers so the board works before any API key does.
        </p>
      </div>
      <RunBanner run={published.run} source={published.source} />
      <LeaderboardView run={boardRun(published.run)} />
    </div>
  );
}
