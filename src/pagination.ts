import { LIMITS } from './constants';
import type { CursorPage } from './domain';

const SEPARATOR = '\u001f';

/** A cursor is the sort value and the id, so equal timestamps do not skip a row. */
export function encodeCursor(sort: string, id: string): string {
  return `${sort}${SEPARATOR}${id}`;
}

export function decodeCursor(
  cursor: string | null | undefined,
): { sort: string; id: string } | null {
  if (!cursor) {
    return null;
  }
  const index = cursor.lastIndexOf(SEPARATOR);
  if (index <= 0 || index >= cursor.length - 1) {
    return null;
  }
  return { sort: cursor.slice(0, index), id: cursor.slice(index + 1) };
}

function comparePair(
  sort: string,
  id: string,
  otherSort: string,
  otherId: string,
): number {
  if (sort !== otherSort) {
    return sort < otherSort ? -1 : 1;
  }
  if (id !== otherId) {
    return id < otherId ? -1 : 1;
  }
  return 0;
}

/**
 * Pages a list on `(sort, id)`.
 * `desc` is newest first. The cursor is the last emitted pair, so the next
 * page starts strictly after it and a repeated sort value is not dropped.
 */
export function pageBy<T extends { id: string }>(
  items: readonly T[],
  cursor: string | null | undefined,
  sortKey: (item: T) => string,
  limit: number = LIMITS.page,
  direction: 'asc' | 'desc' = 'desc',
): CursorPage<T> {
  const sorted = [...items].sort((left, right) => {
    const order = comparePair(sortKey(left), left.id, sortKey(right), right.id);
    return direction === 'asc' ? order : -order;
  });
  const decoded = decodeCursor(cursor);
  let start = 0;
  if (decoded) {
    const index = sorted.findIndex(item => {
      const order = comparePair(
        sortKey(item),
        item.id,
        decoded.sort,
        decoded.id,
      );
      const after = direction === 'asc' ? order > 0 : order < 0;
      return after;
    });
    start = index < 0 ? sorted.length : index;
  }
  const slice = sorted.slice(start, start + limit);
  const last = slice[slice.length - 1];
  const nextCursor =
    last && start + slice.length < sorted.length
      ? encodeCursor(sortKey(last), last.id)
      : null;
  return { items: slice, nextCursor };
}

/** Id cursor over an already ordered list. Prefer `pageBy` for new lists. */
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
