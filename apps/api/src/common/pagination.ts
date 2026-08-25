export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationQuery {
  cursor?: string;
  limit?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

export function parseLimit(limit?: string): number {
  const parsed = limit ? Number(limit) : DEFAULT_PAGE_SIZE;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
}

// Cuts an "N+1"-fetched page (ask for take+1, see if the extra row exists)
// down to `take` items and derives nextCursor from the last kept row's id —
// avoids a second COUNT-style query just to know whether more pages exist.
export function sliceCursorPage<T extends { id: string }>(
  rows: T[],
  take: number,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;
  return { items, nextCursor };
}
