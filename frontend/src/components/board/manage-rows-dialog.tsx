"use client";

import { useState } from "react";
import { Plus, Rows3, Trash2 } from "lucide-react";

import {
  useCreateStatus,
  useDeleteStatus,
  useUpdateStatus,
} from "@/hooks/use-statuses";
import { cn } from "@/lib/utils";
import type { BoardDetail, BoardStatus } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ManageRowsDialog({ board }: { board: BoardDetail }) {
  const [open, setOpen] = useState(false);
  const statuses = board.statuses
    .slice()
    .sort((a, b) => a.position - b.position);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border border-line bg-bg-elevated/70 px-2.5 text-sm text-text-muted transition-all",
            "hover:border-line-strong hover:text-text",
          )}
          title="Manage rows"
        >
          <Rows3 className="h-3.5 w-3.5" />
          Rows
        </button>
      </DialogTrigger>
      <DialogContent className="gap-0 p-5">
        <DialogTitle>Manage rows</DialogTitle>
        <DialogDescription className="mt-1">
          Rows are the board&apos;s statuses. Mark a row{" "}
          <span className="text-text">collapsible</span> to use it as an
          archive — drag done tasks in, then collapse it to keep the current
          sprint in focus.
        </DialogDescription>

        <div className="mt-4 flex flex-col gap-1.5">
          {statuses.map((status) => (
            <RowEditor key={status.id} boardId={board.id} status={status} />
          ))}
        </div>

        <AddRow boardId={board.id} />
      </DialogContent>
    </Dialog>
  );
}

function RowEditor({
  boardId,
  status,
}: {
  boardId: number;
  status: BoardStatus;
}) {
  const update = useUpdateStatus(boardId);
  const remove = useDeleteStatus(boardId);
  const [name, setName] = useState(status.name);
  const isOptimistic = status.id < 0;

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(status.name);
      return;
    }
    if (trimmed !== status.name) {
      update.mutate({ id: status.id, input: { name: trimmed } });
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-bg-elevated/40 px-2.5 py-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        disabled={isOptimistic}
        className="h-8 flex-1 rounded-lg"
        aria-label="Row name"
      />

      <label
        className={cn(
          "flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-all",
          status.is_collapsible
            ? "border-line-strong bg-accent-soft text-accent"
            : "border-line bg-bg-elevated/70 text-text-muted hover:border-line-strong hover:text-text",
          isOptimistic && "pointer-events-none opacity-50",
        )}
        title="Collapsible (archive-like) row"
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={status.is_collapsible}
          disabled={isOptimistic}
          onChange={(e) =>
            update.mutate({
              id: status.id,
              input: { is_collapsible: e.target.checked },
            })
          }
        />
        Collapsible
      </label>

      <Button
        variant="ghost"
        size="icon"
        disabled={isOptimistic || remove.isPending}
        onClick={() => remove.mutate(status.id)}
        title="Delete row"
        aria-label={`Delete row ${status.name}`}
        className="shrink-0 text-text-faint hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddRow({ boardId }: { boardId: number }) {
  const create = useCreateStatus(boardId);
  const [name, setName] = useState("");
  const [collapsible, setCollapsible] = useState(false);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate({ name: trimmed, is_collapsible: collapsible });
    setName("");
    setCollapsible(false);
  }

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="New row name…"
        className="h-8 flex-1 rounded-lg"
        aria-label="New row name"
      />
      <label
        className={cn(
          "flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-all",
          collapsible
            ? "border-line-strong bg-accent-soft text-accent"
            : "border-line bg-bg-elevated/70 text-text-muted hover:border-line-strong hover:text-text",
        )}
        title="Create as a collapsible (archive-like) row"
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={collapsible}
          onChange={(e) => setCollapsible(e.target.checked)}
        />
        Collapsible
      </label>
      <Button
        variant="primary"
        size="sm"
        onClick={submit}
        disabled={!name.trim() || create.isPending}
        className="shrink-0"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}
