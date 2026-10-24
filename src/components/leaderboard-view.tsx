"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildCheatSheet } from "@/bench/cheat";
import { formatCost, formatMs, formatPct, formatRecord, formatScore } from "@/bench/format";
import { type BoardRow, leaderboard } from "@/bench/score";
import type { Category, RunFile } from "@/bench/types";

const TABS: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "coding", label: "Coding" },
  { id: "writing", label: "Writing" },
  { id: "research", label: "Research" },
  { id: "data", label: "Data" },
];

type SortKey = "quality" | "auto" | "judge" | "winRate" | "medianLatencyMs" | "meanCostUsd";

export function LeaderboardView({ run }: { run: RunFile }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("quality");
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => {
    const ranked = leaderboard(run, category);
    if (sortKey === "quality") return ranked;
    return [...ranked].sort((a, b) => {
      const delta = sortValue(a, sortKey) - sortValue(b, sortKey);
      if (delta !== 0) return sortKey === "medianLatencyMs" || sortKey === "meanCostUsd" ? delta : -delta;
      return b.quality - a.quality;
    });
  }, [run, category, sortKey]);
  const sheet = useMemo(() => buildCheatSheet(run), [run]);
  const focus = category === "all" ? sheet.overall.best : sheet.categories.find((item) => item.category === category)?.best;
  const narrative = category === "all" ? sheet.headline : sheet.categories.find((item) => item.category === category)?.narrative;
  const pairs = run.pairs.filter((pair) => category === "all" || run.tasks.find((task) => task.id === pair.taskId)?.category === category);
  const bias = pairs.filter((pair) => pair.positionBias).length;

  return (
    <Tabs value={category} onValueChange={(value) => setCategory(value as Category | "all")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <TabsList className="h-auto flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <p className="text-xs text-muted-foreground">{pairs.length} pairs · {bias} flipped on order</p>
      </div>
      <TabsContent value={category} className="mt-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">From this run</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">{focus?.label ?? "No scores"}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{narrative}</p>
            {focus ? (
              <p className="mt-3 font-mono text-xs text-foreground/80">
                {formatScore(focus.quality)} quality · {formatMs(focus.medianLatencyMs)} median · {formatCost(focus.meanCostUsd)} mean
              </p>
            ) : null}
          </section>
          <Scatter rows={rows} />
        </div>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">This category has no scored calls.</p>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Model leaderboard for {category}</caption>
                <thead className="bg-muted/70 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <SortHeader label="Quality" active={sortKey === "quality"} onClick={() => setSortKey("quality")} />
                    <SortHeader label="Auto" active={sortKey === "auto"} onClick={() => setSortKey("auto")} />
                    <SortHeader label="Judge" active={sortKey === "judge"} onClick={() => setSortKey("judge")} />
                    <SortHeader label="Pairwise" active={sortKey === "winRate"} onClick={() => setSortKey("winRate")} />
                    <SortHeader label="Time" active={sortKey === "medianLatencyMs"} onClick={() => setSortKey("medianLatencyMs")} />
                    <SortHeader label="Cost" active={sortKey === "meanCostUsd"} onClick={() => setSortKey("meanCostUsd")} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <ModelRows
                      key={row.modelId}
                      row={row}
                      rank={index + 1}
                      open={open === row.modelId}
                      onToggle={() => setOpen(open === row.modelId ? null : row.modelId)}
                      run={run}
                      category={category}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {rows.map((row, index) => (
                <article key={row.modelId} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-xl">{index + 1}. {row.label}</p>
                      <ModelMarks row={row} />
                    </div>
                    <p className="font-mono text-lg">{formatScore(row.quality)}</p>
                  </div>
                  <ScoreBar value={row.quality} />
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Stat label="Automatic" value={formatScore(row.auto)} />
                    <Stat label="Judge" value={formatScore(row.judge)} />
                    <Stat label="Pairwise" value={pairLabel(row)} />
                    <Stat label="Median" value={formatMs(row.medianLatencyMs)} />
                    <Stat label="Mean cost" value={formatCost(row.meanCostUsd)} />
                  </dl>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-primary">Tasks in this category</summary>
                    <div className="mt-2">
                      <TaskBreakdown run={run} modelId={row.modelId} category={category} />
                    </div>
                  </details>
                </article>
              ))}
            </div>
            <PairMatrix rows={rows} pairs={pairs} />
            <p className="text-sm text-muted-foreground">
              Task-level picks live on the <Link className="underline decoration-primary/50 underline-offset-2" href="/cheat-sheet">cheat sheet</Link>.
            </p>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function sortValue(row: BoardRow, key: SortKey): number {
  if (key === "judge") return row.judge ?? -1;
  return row[key];
}

function SortHeader({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th className="px-3 py-2 font-medium">
      <button type="button" onClick={onClick} className={active ? "text-foreground" : "hover:text-foreground"} aria-pressed={active}>
        {label}
      </button>
    </th>
  );
}

function pairLabel(row: BoardRow): string {
  if (row.wins + row.losses + row.ties === 0) return "—";
  return `${formatPct(row.winRate)} · ${formatRecord(row.wins, row.losses, row.ties)}`;
}

function ModelMarks({ row }: { row: BoardRow }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {row.demo ? <Badge variant="outline">Starter stand-in</Badge> : <Badge>Live</Badge>}
    </span>
  );
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}

function ModelRows({
  row,
  rank,
  open,
  onToggle,
  run,
  category,
}: {
  row: BoardRow;
  rank: number;
  open: boolean;
  onToggle: () => void;
  run: RunFile;
  category: Category | "all";
}) {
  return (
    <>
      <tr className="border-t border-border">
        <td className="px-3 py-3 font-serif text-lg">{rank}</td>
        <td className="px-3 py-3">
          <button type="button" onClick={onToggle} className="text-left" aria-expanded={open}>
            <span className="font-medium">{row.label}</span>
            <ModelMarks row={row} />
          </button>
          <ScoreBar value={row.quality} />
        </td>
        <td className="px-3 py-3 font-mono">{formatScore(row.quality)}</td>
        <td className="px-3 py-3 font-mono">{formatScore(row.auto)}</td>
        <td className="px-3 py-3 font-mono">{formatScore(row.judge)}</td>
        <td className="px-3 py-3 font-mono text-xs">{pairLabel(row)}</td>
        <td className="px-3 py-3 font-mono">{formatMs(row.medianLatencyMs)}</td>
        <td className="px-3 py-3 font-mono">{formatCost(row.meanCostUsd)}</td>
      </tr>
      {open ? (
        <tr className="border-t border-border bg-muted/40">
          <td colSpan={8} className="px-4 py-3">
            <TaskBreakdown run={run} modelId={row.modelId} category={category} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function TaskBreakdown({
  run,
  modelId,
  category,
}: {
  run: RunFile;
  modelId: string;
  category: Category | "all";
}) {
  const calls = run.calls
    .filter((call) => call.modelId === modelId)
    .filter((call) => category === "all" || run.tasks.find((task) => task.id === call.taskId)?.category === category)
    .sort((a, b) => b.quality - a.quality);
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {calls.map((call) => {
        const task = run.tasks.find((item) => item.id === call.taskId);
        const missed = call.auto.checks.filter((check) => check.points < check.max).slice(0, 2);
        return (
          <li key={call.taskId} className="rounded-lg bg-card px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <Link href={`/tasks/${call.taskId}`} className="text-sm font-medium underline-offset-2 hover:underline">
                {task?.title ?? call.taskId}
              </Link>
              <span className="font-mono text-xs">{formatScore(call.quality)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              auto {formatScore(call.auto.score)} · judge {formatScore(call.judge?.score)} · {formatMs(call.latencyMs)} · {formatCost(call.costUsd)}
            </p>
            {missed.length ? (
              <p className="mt-1 text-xs text-destructive">{missed.map((check) => check.detail).join(" ")}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Scatter({ rows }: { rows: BoardRow[] }) {
  const width = 360;
  const height = 220;
  const pad = 36;
  const maxCost = Math.max(...rows.map((row) => row.meanCostUsd), 0.0001);
  const xOf = (cost: number) => pad + (cost / maxCost) * (width - pad - 16);
  const yOf = (quality: number) => height - pad - (quality / 100) * (height - pad - 16);
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Quality against mean cost</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" role="img" aria-label="Scatter plot of quality versus cost">
        <line x1={pad} y1={16} x2={pad} y2={height - pad} stroke="currentColor" strokeOpacity="0.25" />
        <line x1={pad} y1={height - pad} x2={width - 8} y2={height - pad} stroke="currentColor" strokeOpacity="0.25" />
        <text x={8} y={24} className="fill-current text-[10px]" opacity="0.6">100</text>
        <text x={pad} y={height - 16} className="fill-current text-[10px]" opacity="0.6">cheaper</text>
        <text x={width - 70} y={height - 16} className="fill-current text-[10px]" opacity="0.6">costlier</text>
        {rows.map((row, index) => {
          const x = xOf(row.meanCostUsd);
          const y = yOf(row.quality);
          const placeLeft = x > width - 120;
          return (
            <g key={row.modelId}>
              <circle cx={x} cy={y} r={7} className="fill-primary" />
              <text
                x={placeLeft ? x - 8 : x + 10}
                y={y + (index % 2 === 0 ? -8 : 16)}
                textAnchor={placeLeft ? "end" : "start"}
                className="fill-current text-[11px]"
              >
                {row.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function PairMatrix({ rows, pairs }: { rows: BoardRow[]; pairs: RunFile["pairs"] }) {
  if (rows.length < 2) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-serif text-xl tracking-tight">Pairwise, both orders</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Each cell is the row model’s record against the column model. A win counts only when the judge picks the same answer in both presentation orders.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-muted-foreground">Row vs column</th>
              {rows.map((row) => (
                <th key={row.modelId} className="p-2 text-left text-xs font-medium">{row.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.modelId} className="border-t border-border">
                <th className="p-2 text-left font-medium">{row.label}</th>
                {rows.map((column) => {
                  if (row.modelId === column.modelId) return <td key={column.modelId} className="p-2 text-muted-foreground">—</td>;
                  const record = recordAgainst(pairs, row.modelId, column.modelId);
                  return (
                    <td key={column.modelId} className="p-2 font-mono text-xs">
                      {record.total === 0 ? "—" : `${record.wins}–${record.losses}–${record.ties}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function recordAgainst(pairs: RunFile["pairs"], modelId: string, otherId: string) {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const pair of pairs) {
    const side = pair.modelA === modelId && pair.modelB === otherId ? "a" : pair.modelB === modelId && pair.modelA === otherId ? "b" : null;
    if (!side) continue;
    if (pair.result === "tie") ties += 1;
    else if (pair.result === side) wins += 1;
    else losses += 1;
  }
  return { wins, losses, ties, total: wins + losses + ties };
}
