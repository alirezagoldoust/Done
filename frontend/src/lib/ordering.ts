import type { Task } from "@/types";

const GAP = 1000;

/**
 * Provisional position for a task dropped between two neighbours, mirroring the
 * backend gap strategy. The server remains authoritative (and may rebalance);
 * this only powers the optimistic render.
 */
export function positionBetween(
  before: Task | null,
  after: Task | null,
): number {
  if (before && after) return Math.floor((before.position + after.position) / 2);
  if (before) return before.position + GAP;
  if (after) return after.position - GAP;
  return GAP;
}
