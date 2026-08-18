"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { SortableTask } from "./task-card";
import { AddTaskInput } from "./add-task-input";

export function cellId(statusId: number, columnId: number) {
  return `cell-${statusId}-${columnId}`;
}

/**
 * A single status×column cell: a droppable region holding a sortable list of
 * task cards. The first-status cells also expose the quick "+ Add task" input.
 */
export function TaskCell({
  boardId,
  statusId,
  columnId,
  tasks,
  isAddable,
  onOpenTask,
}: {
  boardId: number;
  statusId: number;
  columnId: number;
  tasks: Task[];
  isAddable: boolean;
  onOpenTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: cellId(statusId, columnId),
    data: { type: "cell", statusId, columnId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[96px] flex-col gap-2 rounded-2xl p-2 transition-colors",
        "bg-white/[0.018]",
        isOver && "bg-accent-soft ring-1 ring-inset ring-accent/30",
      )}
    >
      <SortableContext
        items={tasks.map((t) => `task-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <SortableTask key={task.id} task={task} onOpen={onOpenTask} />
        ))}
      </SortableContext>

      {isAddable && (
        <AddTaskInput
          boardId={boardId}
          columnId={columnId}
          statusId={statusId}
        />
      )}
    </div>
  );
}
