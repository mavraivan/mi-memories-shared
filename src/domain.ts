export type Id = string;

export type MemoryKind = 'memory' | 'trip' | 'milestone' | 'date' | 'note';
export type MediaKind = 'photo' | 'video' | 'audio' | 'text';
export type Privacy = 'shared' | 'private';
export type TripStatus = 'planned' | 'active' | 'completed';
export type PlanType =
  | 'trip'
  | 'date_night'
  | 'home'
  | 'purchase'
  | 'task'
  | 'dream'
  | 'other';
export type PlanStatus = 'open' | 'doing' | 'done';
export type DateRecurrence = 'none' | 'yearly' | 'monthly' | 'weekly';
export type LocationKind = 'visited' | 'planned' | 'wishlist' | 'memory';
export type NotificationType =
  | 'important_date'
  | 'reminder'
  | 'message'
  | 'reaction'
  | 'memory'
  | 'trip'
  | 'plan'
  | 'on_this_day'
  | 'ai'
  | 'game'
  | 'system';

export type Profile = {
  id: Id;
  displayName: string;
  nickname: string;
  email: string;
  avatarUrl: string;
  timezone: string;
};

export type Space = {
  id: Id;
  name: string;
  anniversary: string;
};

export type MemoryMedia = {
  id: Id;
  kind: Exclude<MediaKind, 'text'>;
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  durationMs?: number;
  muted?: boolean;
};

export type Reaction = {
  id: Id;
  emoji: string;
  userId: Id;
};

export type MemoryComment = {
  id: Id;
  authorId: Id;
  body: string;
  createdAt: string;
};

export type Memory = {
  id: Id;
  spaceId: Id;
  createdBy: Id;
  title: string;
  body: string;
  eventDate: string;
  timezone: string;
  locationId?: Id;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  media: MemoryMedia[];
  people: Id[];
  mood?: string;
  tags: string[];
  tripId?: Id;
  kind: MemoryKind;
  important: boolean;
  showOnTimeline: boolean;
  privacy: Privacy;
  reactions: Reaction[];
  comments: MemoryComment[];
  createdAt: string;
  updatedAt: string;
};

export type Trip = {
  id: Id;
  spaceId: Id;
  title: string;
  destination: string;
  country: string;
  countryCode: string;
  startsOn: string;
  endsOn: string;
  coverUrl: string;
  description: string;
  status: TripStatus;
  favorite: boolean;
  accommodation?: string;
  checklist: { id: Id; label: string; done: boolean }[];
  memoryIds: string[];
  route: { latitude: number; longitude: number; label: string }[];
};

export type LocationPin = {
  id: Id;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  kind: LocationKind;
  coverUrl?: string;
  memoryCount: number;
  tripId?: Id;
};

export type PlanItem = {
  id: Id;
  label: string;
  done: boolean;
};

export type Plan = {
  id: Id;
  spaceId: Id;
  title: string;
  notes: string;
  type: PlanType;
  status: PlanStatus;
  date?: string;
  locationLabel?: string;
  tripId?: Id;
  assignees: Id[];
  items: PlanItem[];
};

export type ImportantDate = {
  id: Id;
  title: string;
  date: string;
  recurrence: DateRecurrence;
  note?: string;
  reminderOffsets: number[];
  owner: 'both' | Id;
  memoryId?: Id;
  planId?: Id;
};

export type ReminderRule = {
  id: Id;
  category: string;
  title: string;
  enabled: boolean;
  offsetLabel: string;
};

export type AppNotification = {
  id: Id;
  type: NotificationType;
  title: string;
  body: string;
  actorId?: Id;
  entityType?: string;
  entityId?: Id;
  deepLink?: string;
  createdAt: string;
  readAt?: string;
};

export type ChatKind =
  | 'text'
  | 'photo'
  | 'video'
  | 'voice'
  | 'memory'
  | 'trip'
  | 'plan'
  | 'location';

export type ChatMessage = {
  id: Id;
  threadId: Id;
  authorId: Id;
  kind: ChatKind;
  body: string;
  mediaUrl?: string;
  durationMs?: number;
  replyToId?: Id;
  entityId?: Id;
  reactions: Reaction[];
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  readBy: Id[];
};

export type WishlistItem = {
  id: Id;
  title: string;
  destination: string;
  reason: string;
  imageUrl: string;
  season?: string;
  budget?: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
};

export type TimelineEntry = {
  id: Id;
  title: string;
  subtitle: string;
  date: string;
  kind:
    | 'origin'
    | 'trip'
    | 'home'
    | 'milestone'
    | 'memory'
    | 'plan'
    | 'chapter';
  imageUrl?: string;
};

export type GameAchievement = {
  id: Id;
  title: string;
  unlockedAt?: string;
};

export type GameProfile = {
  id: Id;
  bestScore: number;
  lastPlayedAt?: string;
  chapter: string;
  chapterIndex: number;
  chapterCount: number;
  achievements: GameAchievement[];
  deepLink: string;
  storeUrl: string;
};

export type AiMessage = {
  id: Id;
  role: 'user' | 'assistant';
  body: string;
  createdAt: string;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type CreateMemoryInput = {
  kind: MediaKind;
  title: string;
  body: string;
  eventDate: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  media: MemoryMedia[];
  mood?: string;
  tags: string[];
  people: Id[];
  tripId?: Id;
  privacy: Privacy;
  important: boolean;
  showOnTimeline: boolean;
  memoryKind: MemoryKind;
};
