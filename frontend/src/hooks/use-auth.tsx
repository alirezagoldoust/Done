"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { fetchMe, login as apiLogin } from "@/lib/api/auth";
import { clearTokens, hasSession } from "@/lib/auth-tokens";
import { setSessionExpiredHandler } from "@/lib/api-client";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  // Restore an existing session on first load. All state updates happen inside
  // the async callback so we never call setState synchronously in the effect.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!hasSession()) {
        if (active) setStatus("unauthenticated");
        return;
      }
      try {
        const me = await fetchMe();
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      } catch {
        if (!active) return;
        clearTokens();
        setUser(null);
        setStatus("unauthenticated");
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  // Let the API client push us to login when a refresh finally fails.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus("unauthenticated");
      router.replace("/login");
    });
  }, [router]);

  const login = useCallback(async (username: string, password: string) => {
    await apiLogin(username, password);
    const me = await fetchMe();
    setUser(me);
    setStatus("authenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
