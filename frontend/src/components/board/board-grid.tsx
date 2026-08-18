"use client";

import type { BoardColumn, BoardStatus, Task } from "@/types";
import { TaskCell } from "./task-cell";

/** Stable key for a status×column cell. */
export function cellKey(statusId: number, columnId: number) {
  return `${statusId}:${columnId}`;
}

/**
 * The board grid: statuses as rows, columns (categories) as columns. Cells are
 * separated by whitespace (via per-cell padding, not grid gaps) so the sticky
 * left status rail stays a continuous gutter rather than a broken strip.
 * Column headers stick to the top and the status rail sticks to the left.
 */
export function BoardGrid({
  boardId,
  columns,
  statuses,
  tasksByCell,
  firstStatusId,
  onOpenTask,
}: {
  boardId: number;
  columns: BoardColumn[];
  statuses: BoardStatus[];
  tasksByCell: Map<string, Task[]>;
  firstStatusId: number | null;
  onOpenTask: (task: Task) => void;
}) {
  const templateColumns = `9rem repeat(${columns.length}, minmax(272px, 1fr))`;
  // Header row + one auto row per status + a trailing 1fr filler row that
  // absorbs any leftover height so the sticky status rail spans the full
  // viewport instead of stopping at the last row.
  const templateRows = `auto repeat(${statuses.length}, auto) 1fr`;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div
        className="grid min-h-full min-w-max pr-4"
        style={{
          gridTemplateColumns: templateColumns,
          gridTemplateRows: templateRows,
        }}
      >
        {/* Header row */}
        <div className="sticky left-0 top-0 z-30 border-b border-r border-line bg-bg" />
        {columns.map((col) => (
          <div
            key={col.id}
            className="sticky top-0 z-20 border-b border-line bg-bg px-3 pb-3 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted"
          >
            {col.name}
          </div>
        ))}

        {/* Status rows */}
        {statuses.map((status, index) => (
          <RowFragment
            key={status.id}
            boardId={boardId}
            status={status}
            stepNumber={index + 1}
            columns={columns}
            tasksByCell={tasksByCell}
            isAddableRow={status.id === firstStatusId}
            onOpenTask={onOpenTask}
          />
        ))}

        {/* Filler cell in the 1fr row: continues the rail's background and
            right divider down to the bottom of the scroll viewport. */}
        <div className="sticky left-0 z-10 border-r border-line bg-bg" />
      </div>
    </div>
  );
}

function RowFragment({
  boardId,
  status,
  stepNumber,
  columns,
  tasksByCell,
  isAddableRow,
  onOpenTask,
}: {
  boardId: number;
  status: BoardStatus;
  stepNumber: number;
  columns: BoardColumn[];
  tasksByCell: Map<string, Task[]>;
  isAddableRow: boolean;
  onOpenTask: (task: Task) => void;
}) {
  return (
    <>
      {/* Sticky status rail: continuous background (no grid gap) + right divider. */}
      <div className="sticky left-0 z-10 flex items-start border-r border-line bg-bg pb-6 pl-4 pr-3 pt-3">
        <span className="inline-flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-accent-soft font-mono text-[10px] font-semibold text-accent">
            {stepNumber}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text">
            {status.name}
          </span>
        </span>
      </div>
      {columns.map((col) => (
        <div key={col.id} className="px-2.5 pb-6 pt-3">
          <TaskCell
            boardId={boardId}
            statusId={status.id}
            columnId={col.id}
            tasks={tasksByCell.get(cellKey(status.id, col.id)) ?? []}
            isAddable={isAddableRow}
            onOpenTask={onOpenTask}
          />
        </div>
      ))}
    </>
  );
}
