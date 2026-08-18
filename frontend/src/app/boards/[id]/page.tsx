"use client";

import { use } from "react";

import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { BoardView } from "@/components/board/board-view";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const boardId = Number(id);

  return (
    <RequireAuth>
      <AppShell>
        <BoardView boardId={boardId} />
      </AppShell>
    </RequireAuth>
  );
}
