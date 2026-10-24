"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, TaskPack } from "@/bench/types";

const TABS: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "coding", label: "Coding" },
  { id: "writing", label: "Writing" },
  { id: "research", label: "Research" },
  { id: "data", label: "Data" },
];

export function TaskBrowser({ tasks }: { tasks: TaskPack[] }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const visible = tasks.filter((task) => category === "all" || task.category === category);
  return (
    <div>
      <Tabs value={category} onValueChange={(value) => setCategory(value as Category | "all")}>
        <TabsList className="h-auto flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No tasks in this category.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {visible.map((task) => (
            <li key={task.id}>
              <Link href={`/tasks/${task.id}`} className="block h-full rounded-xl border border-border bg-card p-4 hover:border-primary/50">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{task.category}</Badge>
                  {task.starter ? <Badge variant="secondary">Starter example</Badge> : null}
                </div>
                <h2 className="mt-3 font-serif text-xl tracking-tight">{task.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
