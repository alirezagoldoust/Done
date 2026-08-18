"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { useCreateTask } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

/**
 * Quick task creation living inside a cell. Click "+ Add task" to reveal an
 * inline input; typing a title and pressing Enter creates the task with no
 * modal and no required extra fields. Enter keeps the input open for rapid
 * successive creation; Escape/blur (empty) closes it.
 */
export function AddTaskInput({
  boardId,
  columnId,
  statusId,
}: {
  boardId: number;
  columnId: number;
  statusId: number;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useCreateTask(boardId);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit() {
    const title = value.trim();
    if (!title) return;
    create.mutate({ title, column: columnId, status: statusId });
    setValue("");
    // Keep the field open and focused for the next task.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-xs text-text-faint",
          "transition-all hover:bg-surface-hover hover:text-accent hover:border-line-strong border border-transparent",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="New task…"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Escape") {
          setOpen(false);
          setValue("");
        }
      }}
      onBlur={() => {
        if (!value.trim()) setOpen(false);
      }}
      className={cn(
        "w-full rounded-xl border border-line-strong bg-bg-elevated/80 px-3 py-2 text-sm text-text placeholder:text-text-faint",
        "outline-none ring-4 ring-accent-soft",
      )}
    />
  );
}
