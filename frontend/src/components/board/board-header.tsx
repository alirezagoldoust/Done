"use client";

import Link from "next/link";
import { ChevronLeft, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BoardDetail } from "@/types";
import { MemberAvatars } from "./member-avatars";

export function BoardHeader({
  board,
  search,
  onSearchChange,
  myTasks,
  onMyTasksChange,
}: {
  board: BoardDetail;
  search: string;
  onSearchChange: (v: string) => void;
  myTasks: boolean;
  onMyTasksChange: (v: boolean) => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bg/50 px-4 py-2.5 backdrop-blur-2xl">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/boards"
          className="rounded-md p-1 text-text-faint hover:bg-surface-hover hover:text-text"
          title="All boards"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="truncate text-sm font-semibold tracking-tight">
          {board.name}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <MemberAvatars members={board.members} />

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className={cn(
              "h-8 w-36 rounded-lg border border-line bg-bg-elevated/70 pl-7 pr-7 text-sm text-text placeholder:text-text-faint",
              "outline-none transition-all focus:w-52 focus:border-line-strong focus:ring-4 focus:ring-accent-soft",
            )}
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-text-faint hover:text-text"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <label
          className={cn(
            "flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg border px-2.5 text-sm transition-all",
            myTasks
              ? "border-line-strong bg-accent-soft text-accent shadow-[0_0_0_4px_var(--color-accent-soft)]"
              : "border-line bg-bg-elevated/70 text-text-muted hover:text-text hover:border-line-strong",
          )}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={myTasks}
            onChange={(e) => onMyTasksChange(e.target.checked)}
          />
          My tasks
        </label>
      </div>
    </div>
  );
}
