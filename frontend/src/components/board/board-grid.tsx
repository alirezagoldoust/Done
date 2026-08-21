"use client";

import { Archive, ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
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
 *
 * A status marked `is_collapsible` renders a collapse toggle in the rail; when
 * `collapsed` its cells fold into a single summary bar so passed-sprint work
 * stays out of the way while the current sprint keeps focus.
 */
export function BoardGrid({
  boardId,
  columns,
  statuses,
  tasksByCell,
  firstStatusId,
  onOpenTask,
  onToggleCollapse,
}: {
  boardId: number;
  columns: BoardColumn[];
  statuses: BoardStatus[];
  tasksByCell: Map<string, Task[]>;
  firstStatusId: number | null;
  onOpenTask: (task: Task) => void;
  onToggleCollapse: (status: BoardStatus) => void;
}) {
  const templateColumns = `9rem repeat(${columns.length}, minmax(272px, 1fr))`;
  // Header row + one auto row per status + a trailing 1fr filler row that
  // absorbs any leftover height so the sticky status rail spans the full
  // viewport instead of stopping at the last row.
  const templateRows = `auto repeat(${statuses.length}, auto) 1fr`;

  // Number only workflow (non-collapsible) rows; archive-like rows get an icon.
  let stepCounter = 0;

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
        {statuses.map((status) => {
          const stepNumber = status.is_collapsible ? null : ++stepCounter;
          return (
            <RowFragment
              key={status.id}
              boardId={boardId}
              status={status}
              stepNumber={stepNumber}
              columns={columns}
              tasksByCell={tasksByCell}
              isAddableRow={status.id === firstStatusId}
              onOpenTask={onOpenTask}
              onToggleCollapse={onToggleCollapse}
            />
          );
        })}

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
  onToggleCollapse,
}: {
  boardId: number;
  status: BoardStatus;
  stepNumber: number | null;
  columns: BoardColumn[];
  tasksByCell: Map<string, Task[]>;
  isAddableRow: boolean;
  onOpenTask: (task: Task) => void;
  onToggleCollapse: (status: BoardStatus) => void;
}) {
  const isCollapsed = status.is_collapsible && status.collapsed;
  const rowCount = columns.reduce(
    (n, col) => n + (tasksByCell.get(cellKey(status.id, col.id))?.length ?? 0),
    0,
  );

  return (
    <>
      {/* Sticky status rail: continuous background (no grid gap) + right divider. */}
      <div className="sticky left-0 z-10 flex items-start border-r border-line bg-bg pb-6 pl-4 pr-3 pt-3">
        {status.is_collapsible ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(status)}
            className="inline-flex items-center gap-2 rounded-md text-left outline-none transition-colors hover:text-accent"
            aria-expanded={!status.collapsed}
            title={status.collapsed ? "Expand row" : "Collapse row"}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-accent-soft text-accent">
              {status.collapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text">
              <Archive className="h-3 w-3 text-text-faint" />
              {status.name}
            </span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-accent-soft font-mono text-[10px] font-semibold text-accent">
              {stepNumber}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text">
              {status.name}
            </span>
          </span>
        )}
      </div>

      {isCollapsed ? (
        // Collapsed: a single summary bar spanning all data columns.
        <button
          type="button"
          onClick={() => onToggleCollapse(status)}
          style={{ gridColumn: "2 / -1" }}
          className={cn(
            "mx-2.5 mb-6 mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-3 text-left transition-colors",
            "bg-white/[0.018] text-text-muted hover:border-line-strong hover:text-text",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
          <span className="text-sm">
            {rowCount} {rowCount === 1 ? "task" : "tasks"} — click to expand
          </span>
        </button>
      ) : (
        columns.map((col) => (
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
        ))
      )}
    </>
  );
}
