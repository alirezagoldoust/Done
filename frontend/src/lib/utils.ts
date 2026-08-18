import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isThisYear,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Short initials for a user-like object, mirroring the backend helper. */
export function initialsFromName(
  first?: string | null,
  last?: string | null,
  username?: string | null,
): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  if (l) return l.slice(0, 2).toUpperCase();
  const u = (username ?? "").trim();
  return u ? u.slice(0, 2).toUpperCase() : "?";
}

/** Compact, human deadline label for task cards ("Today", "Tomorrow", "Mar 4"). */
export function formatDeadline(date: string | null): string | null {
  if (!date) return null;
  const d = parseISO(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return isThisYear(d) ? format(d, "MMM d") : format(d, "MMM d, yyyy");
}

export type DeadlineTone = "overdue" | "soon" | "normal";

/** Tone used to subtly colour a deadline without relying on colour alone. */
export function deadlineTone(date: string | null): DeadlineTone {
  if (!date) return "normal";
  const days = differenceInCalendarDays(parseISO(date), new Date());
  if (days < 0) return "overdue";
  if (days <= 1) return "soon";
  return "normal";
}

/** Longer date for the task modal metadata. */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy 'at' HH:mm");
}
