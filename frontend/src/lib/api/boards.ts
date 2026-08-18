import { api } from "../api-client";
import type { BoardDetail, BoardSummary, CreateTaskInput, Task } from "@/types";

export async function fetchBoards(): Promise<BoardSummary[]> {
  const resp = await api.get<BoardSummary[]>("/boards/");
  return resp.data;
}

export async function fetchBoard(id: number): Promise<BoardDetail> {
  const resp = await api.get<BoardDetail>(`/boards/${id}/`);
  return resp.data;
}

export async function createTask(
  boardId: number,
  input: CreateTaskInput,
): Promise<Task> {
  const resp = await api.post<Task>(`/boards/${boardId}/tasks/`, input);
  return resp.data;
}
