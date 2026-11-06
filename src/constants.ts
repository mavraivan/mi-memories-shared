import type { ExpenseCategory } from './domain';

export const LIMITS = {
  /** One page of a long list. The cursor is `(order, id)`, never a date alone. */
  page: 20,
  memoryPage: 20,
  chatPage: 20,
  aiMessageMax: 4000,
  /** A note sent for a title suggestion. Well above any note people write. */
  memoryTextMax: 20_000,
  itineraryDaysMax: 21,
  aiContextMemories: 6,
  aiContextTrips: 3,
  scanStreakDays: 7,
  /** Largest receipt image the server will read; the app checks before upload. */
  receiptBytes: 12 * 1024 * 1024,
} as const;

export const COUPLE_THREAD_KIND = 'couple';

export const MOCK_THREAD_ID = 'thread_main';

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'food',
  'restaurants',
  'household',
  'bills',
  'fuel',
  'transport',
  'cosmetics',
  'health',
  'clothing',
  'entertainment',
  'subscriptions',
  'travel',
  'gifts',
  'pets',
  'education',
  'other',
] as const;

export const RECEIPTS_BUCKET = 'receipts';

/** Badges the native game can unlock; the bridge screen shows every one, locked or not. */
export const GAME_BADGES = [
  'first_round',
  'chapter_three',
  'score_1000',
  'all_chapters',
] as const;

export type GameBadgeId = (typeof GAME_BADGES)[number];

export const GAME_CHAPTER_COUNT = 8;

export function storagePath(
  spaceId: string,
  entityType: string,
  entityId: string,
  fileName: string,
): string {
  return `${spaceId}/${entityType}/${entityId}/${fileName}`;
}
