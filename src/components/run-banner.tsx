import { Badge } from "@/components/ui/badge";
import type { RunFile } from "@/bench/types";

export function RunBanner({ run, source }: { run: RunFile; source: string }) {
  const live = run.mode === "live" && run.judgeMode === "live";
  return (
    <section
      className={
        live
          ? "rounded-xl border border-border bg-card px-4 py-3"
          : "rounded-xl border border-primary/40 bg-primary/10 px-4 py-3"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={live ? "secondary" : "default"}>{run.label}</Badge>
        <Badge variant="outline">{run.mode} mode</Badge>
        <Badge variant="outline">judge {run.judgeMode}</Badge>
        <span className="text-xs text-muted-foreground">{source}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-foreground/90">{run.disclaimer}</p>
    </section>
  );
}

export function MissingRun({ message }: { message: string }) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-card px-4 py-8">
      <h1 className="font-serif text-3xl tracking-tight">No run on disk yet</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{message}</p>
    </section>
  );
}
