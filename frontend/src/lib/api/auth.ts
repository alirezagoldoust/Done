import { api } from "../api-client";
import { setTokens } from "../auth-tokens";
import type { User } from "@/types";

export async function login(
  username: string,
  password: string,
): Promise<void> {
  const resp = await api.post("/auth/token/", { username, password });
  setTokens(resp.data.access, resp.data.refresh);
}

export async function fetchMe(): Promise<User> {
  const resp = await api.get<User>("/auth/me/");
  return resp.data;
}
