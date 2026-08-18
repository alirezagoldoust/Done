"use client";

import { forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Avatar } from "@/components/ui/avatar";
import { cn, formatDeadline, deadlineTone } from "@/lib/utils";
import { taskColor } from "@/lib/task-colors";
import type { Task } from "@/types";

const toneClass: Record<string, string> = {
  overdue: "text-danger",
  soon: "text-warning",
  normal: "text-text-faint",
};

/**
 * Presentational task card. Compact: title dominant, a single secondary line
 * with deadline · assignee. Missing metadata is simply omitted.
 */
export const TaskCardContent = forwardRef<
  HTMLDivElement,
  {
    task: Task;
    dragging?: boolean;
    overlay?: boolean;
    onClick?: () => void;
  } & React.HTMLAttributes<HTMLDivElement>
>(function TaskCardContent(
  { task, dragging, overlay, onClick, className, ...props },
  ref,
) {
  const deadline = formatDeadline(task.deadline);
  const tone = deadlineTone(task.deadline);
  const hasMeta = Boolean(deadline || task.doer);
  const color = taskColor(task.color);
  const filled = Boolean(color.fill);

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={
        filled
          ? { background: color.fill!, borderColor: color.border ?? undefined }
          : undefined
      }
      className={cn(
        "group cursor-pointer rounded-xl border px-3 py-2.5 transition-all duration-200",
        !filled && "border-line bg-surface hover:bg-surface-hover",
        "hover:border-line-strong hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(139,123,255,0.55)]",
        filled && "hover:brightness-110 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)]",
        dragging && "opacity-40",
        overlay &&
          "border-line-strong shadow-[0_22px_50px_-14px_rgba(0,0,0,0.7),0_0_0_1px_rgba(139,123,255,0.4)] rotate-[1.5deg] scale-[1.03]",
        overlay && !filled && "bg-surface-hover",
        className,
      )}
      {...props}
    >
      <p
        dir="auto"
        className={cn(
          "text-sm leading-snug line-clamp-3",
          filled ? "text-white" : "text-text",
        )}
      >
        {task.title}
      </p>

      {hasMeta && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={cn("text-xs", filled ? "text-white/85" : toneClass[tone])}
          >
            {deadline ?? ""}
          </span>
          {task.doer && (
            <Avatar
              initials={task.doer.initials}
              seed={task.doer.id}
              size="sm"
              title={task.doer.display_name}
            />
          )}
        </div>
      )}
    </div>
  );
});

/** Sortable + draggable wrapper used inside cells. */
export function SortableTask({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCardContent
        task={task}
        dragging={isDragging}
        onClick={() => onOpen(task)}
      />
    </div>
  );
}
