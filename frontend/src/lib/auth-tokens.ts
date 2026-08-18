/**
 * Small JWT token store.
 *
 * The access token is held in memory for the session and mirrored to
 * localStorage so a page refresh can restore the session; the refresh token
 * lives in localStorage. This trades some XSS exposure for a simple,
 * dependency-free flow — see README for the tradeoff and the cookie-based
 * alternative.
 */

const ACCESS_KEY = "tm.access";
const REFRESH_KEY = "tm.refresh";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window === "undefined") return null;
  accessToken = window.localStorage.getItem(ACCESS_KEY);
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string) {
  accessToken = access;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  }
}

export function setAccessToken(access: string) {
  accessToken = access;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_KEY, access);
  }
}

export function clearTokens() {
  accessToken = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  }
}

export function hasSession(): boolean {
  return Boolean(getAccessToken());
}
