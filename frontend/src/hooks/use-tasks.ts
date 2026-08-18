import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createTask } from "@/lib/api/boards";
import { deleteTask, moveTask, updateTask } from "@/lib/api/tasks";
import { errorMessage } from "@/lib/api-client";
import { boardKey } from "./use-boards";
import type {
  BoardDetail,
  CreateTaskInput,
  MoveTaskInput,
  Task,
  UpdateTaskInput,
  User,
} from "@/types";

/** Mutate the cached board's task list immutably. */
function patchBoard(
  qc: ReturnType<typeof useQueryClient>,
  boardId: number,
  fn: (tasks: Task[]) => Task[],
): BoardDetail | undefined {
  const key = boardKey(boardId);
  const prev = qc.getQueryData<BoardDetail>(key);
  if (prev) {
    qc.setQueryData<BoardDetail>(key, { ...prev, tasks: fn(prev.tasks) });
  }
  return prev;
}

let tempId = -1;

// ---- create -------------------------------------------------------------

export function useCreateTask(boardId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(boardId, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: boardKey(boardId) });
      const optimisticId = tempId--;
      const board = qc.getQueryData<BoardDetail>(boardKey(boardId));
      const statusId =
        input.status ??
        board?.statuses.slice().sort((a, b) => a.position - b.position)[0]?.id ??
        0;
      const optimistic: Task = {
        id: optimisticId,
        board: boardId,
        column: input.column,
        status: statusId,
        title: input.title,
        description: input.description ?? "",
        doer: null,
        deadline: input.deadline ?? null,
        color: input.color ?? "default",
        position: Number.MAX_SAFE_INTEGER, // sort to end of its cell
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const prev = patchBoard(qc, boardId, (tasks) => [...tasks, optimistic]);
      return { prev, optimisticId };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKey(boardId), ctx.prev);
      toast.error(errorMessage(err, "Couldn't create task."));
    },
    onSuccess: (created, _input, ctx) => {
      // Replace the optimistic placeholder with the authoritative task.
      patchBoard(qc, boardId, (tasks) =>
        tasks.map((t) => (t.id === ctx?.optimisticId ? created : t)),
      );
    },
  });
}

// ---- update -------------------------------------------------------------

export function useUpdateTask(boardId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: boardKey(boardId) });
      const board = qc.getQueryData<BoardDetail>(boardKey(boardId));
      let nextDoer: User | null | undefined;
      if ("doer_id" in input) {
        nextDoer =
          input.doer_id == null
            ? null
            : board?.members.find((m) => m.user.id === input.doer_id)?.user ??
              null;
      }
      const prev = patchBoard(qc, boardId, (tasks) =>
        tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                ...("title" in input ? { title: input.title! } : {}),
                ...("description" in input
                  ? { description: input.description! }
                  : {}),
                ...("deadline" in input ? { deadline: input.deadline! } : {}),
                ...("color" in input ? { color: input.color! } : {}),
                ...("status" in input ? { status: input.status! } : {}),
                ...("column" in input ? { column: input.column! } : {}),
                ...(nextDoer !== undefined ? { doer: nextDoer } : {}),
              }
            : t,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKey(boardId), ctx.prev);
      toast.error(errorMessage(err, "Couldn't save changes."));
    },
    onSuccess: (updated) => {
      patchBoard(qc, boardId, (tasks) =>
        tasks.map((t) => (t.id === updated.id ? updated : t)),
      );
    },
  });
}

// ---- delete -------------------------------------------------------------

export function useDeleteTask(boardId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: boardKey(boardId) });
      const prev = patchBoard(qc, boardId, (tasks) =>
        tasks.filter((t) => t.id !== id),
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKey(boardId), ctx.prev);
      toast.error(errorMessage(err, "Couldn't delete task."));
    },
    onSuccess: () => {
      toast.success("Task deleted");
    },
  });
}

// ---- move (drag & drop) -------------------------------------------------

export interface MoveArgs {
  id: number;
  input: MoveTaskInput;
  /** Provisional position computed by the board for a snappy optimistic move. */
  optimisticPosition: number;
}

export function useMoveTask(boardId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: MoveArgs) => moveTask(id, input),
    onMutate: async ({ id, input, optimisticPosition }) => {
      await qc.cancelQueries({ queryKey: boardKey(boardId) });
      const prev = patchBoard(qc, boardId, (tasks) =>
        tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                column: input.column_id,
                status: input.status_id,
                position: optimisticPosition,
              }
            : t,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKey(boardId), ctx.prev);
      toast.error(errorMessage(err, "Couldn't move task."));
    },
    onSuccess: (moved) => {
      // Apply the authoritative position (server may have rebalanced).
      patchBoard(qc, boardId, (tasks) =>
        tasks.map((t) => (t.id === moved.id ? moved : t)),
      );
    },
    onSettled: () => {
      // Reconcile any server-side rebalance of neighbouring positions.
      qc.invalidateQueries({ queryKey: boardKey(boardId) });
    },
  });
}
