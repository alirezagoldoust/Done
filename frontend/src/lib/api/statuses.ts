import { api } from "../api-client";
import type {
  BoardStatus,
  CreateStatusInput,
  UpdateStatusInput,
} from "@/types";

export async function createStatus(
  boardId: number,
  input: CreateStatusInput,
): Promise<BoardStatus> {
  const resp = await api.post<BoardStatus>(
    `/boards/${boardId}/statuses/`,
    input,
  );
  return resp.data;
}

export async function updateStatus(
  id: number,
  input: UpdateStatusInput,
): Promise<BoardStatus> {
  const resp = await api.patch<BoardStatus>(`/statuses/${id}/`, input);
  return resp.data;
}

export async function deleteStatus(id: number): Promise<void> {
  await api.delete(`/statuses/${id}/`);
}
