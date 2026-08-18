"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AlertCircle } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useBoard } from "@/hooks/use-boards";
import { useMoveTask } from "@/hooks/use-tasks";
import { positionBetween } from "@/lib/ordering";
import { Button } from "@/components/ui/button";
import type { BoardDetail, Task } from "@/types";
import { BoardHeader } from "./board-header";
import { BoardGrid, cellKey } from "./board-grid";
import { TaskCardContent } from "./task-card";
import { TaskModal } from "./task-modal";
import { LoadingBoard } from "./loading-board";

type Cells = Map<string, Task[]>;

function parseCellKey(key: string): [number, number] {
  const [s, c] = key.split(":");
  return [Number(s), Number(c)];
}

function cloneCells(cells: Cells): Cells {
  const next: Cells = new Map();
  for (const [k, v] of cells) next.set(k, [...v]);
  return next;
}

export function BoardView({ boardId }: { boardId: number }) {
  const { data: board, isLoading, isError, refetch } = useBoard(boardId);

  if (isLoading) return <LoadingBoard />;
  if (isError || !board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <AlertCircle className="h-6 w-6 text-danger" />
        <p className="text-sm text-text">Unable to load this board.</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return <LoadedBoard board={board} />;
}

function LoadedBoard({ board }: { board: BoardDetail }) {
  const { user } = useAuth();
  const move = useMoveTask(board.id);

  const [search, setSearch] = useState("");
  const [myTasks, setMyTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragCells, setDragCells] = useState<Cells | null>(null);

  const columns = useMemo(
    () => board.columns.slice().sort((a, b) => a.position - b.position),
    [board.columns],
  );
  const statuses = useMemo(
    () => board.statuses.slice().sort((a, b) => a.position - b.position),
    [board.statuses],
  );
  const firstStatusId = statuses[0]?.id ?? null;

  // Filtered task set — affects only which cards render, never the structure.
  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return board.tasks.filter((t) => {
      if (myTasks && t.doer?.id !== user?.id) return false;
      if (q) {
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = (t.description ?? "").toLowerCase().includes(q);
        if (!inTitle && !inDesc) return false;
      }
      return true;
    });
  }, [board.tasks, search, myTasks, user?.id]);

  const baseCells = useMemo<Cells>(() => {
    const map: Cells = new Map();
    for (const s of statuses)
      for (const c of columns) map.set(cellKey(s.id, c.id), []);
    for (const t of visibleTasks) {
      const key = cellKey(t.status, t.column);
      const bucket = map.get(key);
      if (bucket) bucket.push(t);
    }
    for (const bucket of map.values())
      bucket.sort((a, b) => a.position - b.position);
    return map;
  }, [visibleTasks, statuses, columns]);

  const cells = dragCells ?? baseCells;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function findContainer(id: string, source: Cells): string | null {
    if (id.startsWith("cell-")) {
      const [, s, c] = id.split("-");
      return cellKey(Number(s), Number(c));
    }
    // task-<id>
    for (const [key, list] of source) {
      if (list.some((t) => `task-${t.id}` === id)) return key;
    }
    return null;
  }

  function onDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
      setDragCells(cloneCells(baseCells));
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setDragCells((prev) => {
      const source = prev ?? cloneCells(baseCells);
      const activeC = findContainer(activeId, source);
      const overC = findContainer(overId, source);
      if (!activeC || !overC || activeC === overC) return source;

      const next = cloneCells(source);
      const activeItems = next.get(activeC)!;
      const overItems = next.get(overC)!;
      const activeIndex = activeItems.findIndex(
        (t) => `task-${t.id}` === activeId,
      );
      if (activeIndex < 0) return source;
      const [moved] = activeItems.splice(activeIndex, 1);

      const overIndex = overId.startsWith("cell-")
        ? overItems.length
        : overItems.findIndex((t) => `task-${t.id}` === overId);
      overItems.splice(overIndex < 0 ? overItems.length : overIndex, 0, moved);
      return next;
    });
  }

  function resetDrag() {
    setActiveTask(null);
    setDragCells(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const dragged = activeTask;
    if (!over || !dragged) return resetDrag();

    const source = dragCells ?? baseCells;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeC = findContainer(activeId, source);
    const overC = findContainer(overId, source);
    if (!activeC || !overC) return resetDrag();

    const final = cloneCells(source);

    if (activeC === overC) {
      const items = final.get(activeC)!;
      const oldIndex = items.findIndex((t) => `task-${t.id}` === activeId);
      const newIndex = overId.startsWith("cell-")
        ? items.length - 1
        : items.findIndex((t) => `task-${t.id}` === overId);
      if (oldIndex !== newIndex && newIndex >= 0) {
        final.set(activeC, arrayMove(items, oldIndex, newIndex));
      }
    }

    const [destStatusId, destColumnId] = parseCellKey(overC);
    const destItems = final.get(overC)!;
    const idx = destItems.findIndex((t) => `task-${t.id}` === activeId);
    const before = idx > 0 ? destItems[idx - 1] : null;
    const after = idx < destItems.length - 1 ? destItems[idx + 1] : null;

    // Skip if nothing actually changed.
    const originalCell = cellKey(dragged.status, dragged.column);
    const originalItems = baseCells.get(originalCell) ?? [];
    const originalIndex = originalItems.findIndex((t) => t.id === dragged.id);
    if (originalCell === overC && originalIndex === idx) {
      return resetDrag();
    }

    move.mutate({
      id: dragged.id,
      input: {
        column_id: destColumnId,
        status_id: destStatusId,
        before_task_id: before?.id ?? null,
        after_task_id: after?.id ?? null,
      },
      optimisticPosition: positionBetween(before, after),
    });

    resetDrag();
  }

  const hasStructure = columns.length > 0 && statuses.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BoardHeader
        board={board}
        search={search}
        onSearchChange={setSearch}
        myTasks={myTasks}
        onMyTasksChange={setMyTasks}
      />

      {!hasStructure ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <p className="max-w-sm text-sm text-text-muted">
            This board has no columns or statuses yet. Add some in Django Admin
            to start creating tasks.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={resetDrag}
        >
          <BoardGrid
            boardId={board.id}
            columns={columns}
            statuses={statuses}
            tasksByCell={cells}
            firstStatusId={firstStatusId}
            onOpenTask={setSelectedTask}
          />
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <TaskCardContent task={activeTask} overlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskModal
        key={selectedTask?.id ?? "none"}
        task={selectedTask}
        board={board}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
