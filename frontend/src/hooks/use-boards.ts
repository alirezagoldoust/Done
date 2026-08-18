import { useQuery } from "@tanstack/react-query";

import { fetchBoard, fetchBoards } from "@/lib/api/boards";

export const boardsKey = ["boards"] as const;
export const boardKey = (id: number) => ["board", id] as const;

export function useBoards() {
  return useQuery({
    queryKey: boardsKey,
    queryFn: fetchBoards,
  });
}

export function useBoard(id: number) {
  return useQuery({
    queryKey: boardKey(id),
    queryFn: () => fetchBoard(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
