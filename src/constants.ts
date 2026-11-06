import type { ExpenseCategory, ReminderCategory } from './domain';

export const LIMITS = {
  pairMembers: 2,
  /** One page of a long list. The cursor is `(order, id)`, never a date alone. */
  page: 20,
  memoryPage: 20,
  chatPage: 20,
  aiMessageMax: 4000,
  passwordMin: 6,
  itineraryDaysMax: 21,
  aiContextMemories: 6,
  aiContextTrips: 3,
  scanStreakDays: 7,
  /** Largest receipt image the server will read; the app checks before upload. */
  receiptBytes: 12 * 1024 * 1024,
} as const;

export const COUPLE_THREAD_KIND = 'couple';

export const MOCK_THREAD_ID = 'thread_main';

export const CURRENCY = 'EUR' as const;

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

export const REMINDER_CATEGORIES: readonly ReminderCategory[] = [
  'anniversary',
  'birthdays',
  'trips',
  'on_this_day',
  'unfinished_memories',
  'ai_suggestions',
  'game',
] as const;

export const RECEIPTS_BUCKET = 'receipts';

export const DEFAULT_REMINDER_OFFSETS = [30, 7, 0] as const;

/** Badges the native game can unlock; the bridge screen shows every one, locked or not. */
export const GAME_BADGES = [
  'first_round',
  'chapter_three',
  'score_1000',
  'all_chapters',
] as const;

export type GameBadgeId = (typeof GAME_BADGES)[number];

export const GAME_CHAPTER_COUNT = 8;

export function occurrenceKey(
  scheduledNotificationId: string,
  occurrence: string,
): string {
  return `${scheduledNotificationId}:${occurrence}`;
}

export function storagePath(
  spaceId: string,
  entityType: string,
  entityId: string,
  fileName: string,
): string {
  return `${spaceId}/${entityType}/${entityId}/${fileName}`;
}
