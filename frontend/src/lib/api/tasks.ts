import { api } from "../api-client";
import type { MoveTaskInput, Task, UpdateTaskInput } from "@/types";

export async function updateTask(
  id: number,
  input: UpdateTaskInput,
): Promise<Task> {
  const resp = await api.patch<Task>(`/tasks/${id}/`, input);
  return resp.data;
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}/`);
}

export async function moveTask(
  id: number,
  input: MoveTaskInput,
): Promise<Task> {
  const resp = await api.post<Task>(`/tasks/${id}/move/`, input);
  return resp.data;
}
