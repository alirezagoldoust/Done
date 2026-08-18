"use client";

import Link from "next/link";
import { Layers, Users, CheckSquare, AlertCircle } from "lucide-react";

import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useBoards } from "@/hooks/use-boards";
import { Button } from "@/components/ui/button";
import type { BoardSummary } from "@/types";

export default function BoardsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <BoardsDashboard />
      </AppShell>
    </RequireAuth>
  );
}

function BoardsDashboard() {
  const { data: boards, isLoading, isError, refetch } = useBoards();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Your boards</h1>
        <p className="mt-1 text-sm text-text-muted">
          Boards you belong to. Membership is managed in Django Admin.
        </p>
      </div>

      {isLoading && <BoardsSkeleton />}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface/50 py-16 text-center">
          <AlertCircle className="mb-3 h-6 w-6 text-danger" />
          <p className="text-sm text-text">Unable to load your boards.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </div>
      )}

      {boards && boards.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/30 py-16 text-center">
          <Layers className="mb-3 h-6 w-6 text-text-faint" />
          <p className="text-sm text-text">You&apos;re not on any boards yet.</p>
          <p className="mt-1 text-sm text-text-muted">
            Ask an admin to add you to a board.
          </p>
        </div>
      )}

      {boards && boards.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </div>
  );
}

function BoardCard({ board }: { board: BoardSummary }) {
  return (
    <Link
      href={`/boards/${board.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-line-strong hover:bg-surface-hover hover:shadow-[0_18px_40px_-18px_rgba(139,123,255,0.5)]"
    >
      {/* Accent wash that appears on hover */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent/20 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="mb-1 flex items-start justify-between gap-2">
        <h2 className="font-semibold tracking-tight text-text group-hover:text-white">
          {board.name}
        </h2>
      </div>
      <p className="mb-5 line-clamp-2 min-h-[2.5rem] text-sm text-text-muted">
        {board.description || "No description"}
      </p>
      <div className="mt-auto flex items-center gap-4 text-xs text-text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span className="font-mono">{board.member_count}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckSquare className="h-3.5 w-3.5" />
          <span className="font-mono">{board.task_count}</span>
        </span>
      </div>
    </Link>
  );
}

function BoardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[124px] animate-pulse rounded-xl border border-line bg-surface/40"
        />
      ))}
    </div>
  );
}
