"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const LINKS = [
  { href: "/", label: "Leaderboard" },
  { href: "/cheat-sheet", label: "Cheat sheet" },
  { href: "/tasks", label: "Tasks" },
  { href: "/method", label: "Method" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-xs font-semibold tracking-wide text-primary-foreground">
            MB
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg tracking-tight">Model Bench</span>
            <span className="block text-xs text-muted-foreground">Personal evals from real work</span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="Primary">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
