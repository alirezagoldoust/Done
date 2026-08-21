import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createStatus, deleteStatus, updateStatus } from "@/lib/api/statuses";
import { errorMessage } from "@/lib/api-client";
import { boardKey } from "./use-boards";
import type {
  BoardDetail,
  BoardStatus,
  CreateStatusInput,
  UpdateStatusInput,
} from "@/types";

/** Mutate the cached board's status list immutably. */
function patchStatuses(
  qc: ReturnType<typeof useQueryClient>,
  boardId: number,
  fn: (statuses: BoardStatus[]) => BoardStatus[],
): BoardDetail | undefined {
  const key = boardKey(boardId);
  const prev = qc.getQueryData<BoardDetail>(key);
  if (prev) {
    qc.setQueryData<BoardDetail>(key, { ...prev, statuses: fn(prev.statuses) });
  }
  return prev;
}

let tempId = -1;

// ---- create -------------------------------------------------------------

export function useCreateStatus(boardId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStatusInput) => createStatus(boardId, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: boardKey(boardId) });
      const optimisticId = tempId--;
      const board = qc.getQueryData<BoardDetail>(boardKey(boardId));
      const maxPos = (board?.statuses ?? []).reduce(
        (m, s) => Math.max(m, s.position),
        0,
      );
      const optimistic: BoardStatus = {
        id: optimisticId,
        name: input.name.trim(),
        position: maxPos + 1000,
        is_collapsible: input.is_collapsible ?? false,
        collapsed: false,
      };
      const prev = patchStatuses(qc, boardId, (statuses) => [
        ...statuses,
        optimistic,
      ]);
      return { prev, optimisticId };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKey(boardId), ctx.prev);
      toast.error(errorMessage(err, "Couldn't add row."));
    },
    onSuccess: (created, _input, ctx) => {
      patchStatuses(qc, boardId, (statuses) =>
        statuses.map((s) => (s.id === ctx?.optimisticId ? created : s)),
      );
    },
  });
}

// ---- update (rename / toggle collapsible / collapse / reorder) ----------

export function useUpdateStatus(boardId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateStatusInput }) =>
      updateStatus(id, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: boardKey(boardId) });
      const prev = patchStatuses(qc, boardId, (statuses) =>
        statuses.map((s) => (s.id === id ? { ...s, ...input } : s)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKey(boardId), ctx.prev);
      toast.error(errorMessage(err, "Couldn't update row."));
    },
    onSuccess: (updated) => {
      patchStatuses(qc, boardId, (statuses) =>
        statuses.map((s) => (s.id === updated.id ? updated : s)),
      );
    },
  });
}

// ---- delete -------------------------------------------------------------

export function useDeleteStatus(boardId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteStatus(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: boardKey(boardId) });
      const prev = patchStatuses(qc, boardId, (statuses) =>
        statuses.filter((s) => s.id !== id),
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      // Rolls back e.g. the "row still contains tasks" rejection.
      if (ctx?.prev) qc.setQueryData(boardKey(boardId), ctx.prev);
      toast.error(errorMessage(err, "Couldn't delete row."));
    },
    onSuccess: () => {
      toast.success("Row deleted");
    },
  });
}
