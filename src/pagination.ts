import { LIMITS } from './constants';
import type { CursorPage } from './domain';

export function paginate<T extends { id: string }>(
  items: T[],
  cursor: string | null | undefined,
  limit: number = LIMITS.memoryPage,
): CursorPage<T> {
  const start = cursor ? items.findIndex(item => item.id === cursor) + 1 : 0;
  const from = Math.max(start, 0);
  const slice = items.slice(from, from + limit);
  const last = slice[slice.length - 1];
  const nextCursor =
    last && from + slice.length < items.length ? last.id : null;
  return { items: slice, nextCursor };
}
