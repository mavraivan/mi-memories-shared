export const LIMITS = {
  pairMembers: 2,
  memoryPage: 12,
  chatPage: 80,
  aiMessageMax: 4000,
  passwordMin: 6,
  itineraryDaysMax: 21,
} as const;

export const COUPLE_THREAD_KIND = 'couple';

export const MOCK_THREAD_ID = 'thread_main';

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
