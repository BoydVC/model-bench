import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunBanner } from "@/components/run-banner";
import { loadPublishedRun } from "@/lib/published-run";

export default function MethodPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the method…</p>}>
      <MethodBody />
    </Suspense>
  );
}

async function MethodBody() {
  const published = await loadPublishedRun();
  const biased = published.run?.pairs.find((pair) => pair.positionBias);
  const task = published.run?.tasks.find((item) => item.id === biased?.taskId);
  const name = (id: string) => published.run?.models.find((model) => model.id === id)?.label ?? id;
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">How a score is made</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Tests, then a judge, then the same pair backwards</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          A task pack is a prompt, fixtures, a rubric, and a test. The runner calls a model, runs the automatic checks, asks an independent judge for rubric scores, and then judges every pair twice with the order swapped. Quality, time, and token cost are stored on the run.
        </p>
      </div>
      {published.run ? <RunBanner run={published.run} source={published.source} /> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">1. Automatic tests</CardTitle></CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Coding and data tasks execute the answer. Writing and research tasks check required sections, forbidden phrases, and counts. The automatic score is points earned over points possible.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">2. Independent judge</CardTitle></CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            A separate model scores each rubric criterion from 0 to 100. Coding and data lean on the tests (75/25). Writing leans on the judge (35/65). Research is even. With no judge key, the demo uses recorded scores.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">3. Both orders</CardTitle></CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Every pair is judged twice. A win counts only when both orders pick the same answer. If the winner flips, the pair is a tie. Being shown first is not a result.
          </CardContent>
        </Card>
      </div>
      {biased && task ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-serif text-2xl">A flip in this run</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            On <span className="text-foreground">{task.title}</span>, {name(biased.modelA)} against {name(biased.modelB)} came back {biased.forwardWinner} one way and {biased.reverseWinner} the other. The recorded result is a tie, and the pair is marked as position bias. This run has {published.run?.pairs.filter((pair) => pair.positionBias).length} pairs like that.
          </p>
        </section>
      ) : null}
      <section className="max-w-3xl space-y-3">
        <h2 className="font-serif text-3xl tracking-tight">Add a model</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          The wiring is a block in <code className="font-mono text-xs">models.yaml</code> and two environment variables. A single-task smoke run checks the path. The starter pack is 20 tasks. The new model is merged onto the current board, so you are not re-scoring the stand-ins.
        </p>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
          <li>Copy the commented block at the bottom of <code className="font-mono text-xs">models.yaml</code>. Set <code className="font-mono text-xs">provider</code> to <code className="font-mono text-xs">openai-compatible</code> or <code className="font-mono text-xs">anthropic</code>, plus the model name and the token rates you want on the cost column.</li>
          <li>Export the key variable you named, and the base URL variable if the model is not on the provider default. OpenAI-compatible defaults to <code className="font-mono text-xs">https://api.openai.com/v1</code>.</li>
          <li>Smoke it: <code className="font-mono text-xs">npm run bench -- --model your-model --tasks retry-helper</code></li>
          <li>Run the starter pack: <code className="font-mono text-xs">npm run bench -- --model your-model --tasks starter</code>. Refresh the leaderboard. The new file is <code className="font-mono text-xs">results/latest.json</code>, and it wins over the demo file.</li>
          <li>For rubric scores and pairwise wins, set <code className="font-mono text-xs">JUDGE_API_KEY</code>, <code className="font-mono text-xs">JUDGE_MODEL</code>, and optionally <code className="font-mono text-xs">JUDGE_BASE_URL</code>. Without a judge key, a new model is ranked on automatic tests only and has no pairwise record.</li>
        </ol>
      </section>
      <section className="max-w-3xl space-y-3">
        <h2 className="font-serif text-3xl tracking-tight">Add a task</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Create <code className="font-mono text-xs">tasks/&lt;id&gt;/</code> with <code className="font-mono text-xs">task.json</code>, <code className="font-mono text-xs">prompt.md</code>, and any fixtures. Categories are coding, writing, research, and data. Set <code className="font-mono text-xs">starter</code> to false for a task that is yours rather than a starter example. Checks can be declarative (<code className="font-mono text-xs">contains</code>, <code className="font-mono text-xs">not_contains</code>, <code className="font-mono text-xs">regex</code>, <code className="font-mono text-xs">regex_min</code>, <code className="font-mono text-xs">word_count</code>) or a <code className="font-mono text-xs">harness.ts</code> that exports <code className="font-mono text-xs">run(output)</code>.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Harnesses run the model’s JavaScript in a local vm. Keep them to tasks you wrote. Pass <code className="font-mono text-xs">--fresh</code> when you want a board that does not merge the previous file.
        </p>
      </section>
    </div>
  );
}
