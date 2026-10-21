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
  | 'date'
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
  storagePath?: string;
  mimeType?: string;
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

export type ImportantDateKind =
  | 'anniversary'
  | 'birthday'
  | 'engagement'
  | 'wedding'
  | 'evening'
  | 'other';

export type ImportantDate = {
  id: Id;
  title: string;
  date: string;
  recurrence: DateRecurrence;
  kind?: ImportantDateKind;
  note?: string;
  reminderOffsets: number[];
  owner: 'both' | Id;
  memoryId?: Id;
  planId?: Id;
};

export type ImportantDateInput = Omit<ImportantDate, 'id'>;

export type ReminderCategory =
  | 'anniversary'
  | 'birthdays'
  | 'trips'
  | 'on_this_day'
  | 'unfinished_memories'
  | 'ai_suggestions'
  | 'game';

export type ReminderRule = {
  id: Id;
  category: ReminderCategory | string;
  title: string;
  enabled: boolean;
  offsetLabel: string;
};

export type ScheduledNotification = {
  id: Id;
  userId: Id;
  type: NotificationType;
  title: string;
  body: string;
  deepLink?: string;
  entityType?: string;
  entityId?: Id;
  scheduledAt: string;
  occurrenceKey: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
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
  entityType?: 'memory' | 'trip' | 'date';
  entityId?: Id;
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
};

export type AiCitation = {
  type: 'memory' | 'trip';
  id: Id;
  title: string;
  date?: string;
  imageUrl?: string;
};

export type AiItineraryDay = {
  day: number;
  title: string;
  items: string[];
};

export type AiCard =
  | { type: 'itinerary'; destination: string; days: AiItineraryDay[] }
  | {
      type: 'expense';
      month: string;
      totalCents: number;
      byCategory: { category: ExpenseCategory; cents: number }[];
    };

export type AiWriteKind = 'plan' | 'trip' | 'important_date' | 'wishlist';

export type AiProposedWrite = {
  kind: AiWriteKind;
  summary: string;
  payload: Record<string, unknown>;
};

export type AiSource = 'gemini' | 'database';

export type AiReply = {
  reply: string;
  citations: AiCitation[];
  cards: AiCard[];
  proposedWrites: AiProposedWrite[];
  confirmationRequired?: boolean;
  source: AiSource;
};

export type AiMessage = {
  id: Id;
  role: 'user' | 'assistant';
  body: string;
  createdAt: string;
  citations?: AiCitation[];
  cards?: AiCard[];
  proposedWrites?: AiProposedWrite[];
  source?: AiSource;
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

/** The full form state; media lists the final set, anything missing is removed. */
export type UpdateMemoryInput = CreateMemoryInput;

export type PlanInput = {
  title: string;
  notes: string;
  type: PlanType;
  status: PlanStatus;
  date?: string;
  locationLabel?: string;
  tripId?: Id;
  assignees: Id[];
  items: string[];
};

export type TripPatch = Partial<Pick<Trip, 'status' | 'favorite'>>;

export type ExpenseCategory =
  | 'food'
  | 'restaurants'
  | 'household'
  | 'bills'
  | 'fuel'
  | 'transport'
  | 'cosmetics'
  | 'health'
  | 'clothing'
  | 'entertainment'
  | 'subscriptions'
  | 'travel'
  | 'gifts'
  | 'pets'
  | 'education'
  | 'other';

export type ExpenseCategorization = {
  categories: ExpenseCategory[];
  source: 'gemini' | 'fallback';
};

export type ExpenseOverview = {
  totalCents: number;
  byCategory: {
    category: ExpenseCategory;
    cents: number;
    share: number;
  }[];
};

export type ExpenseSource = 'scan' | 'manual';

export type ExpenseItem = {
  id: Id;
  invoiceId: Id;
  name: string;
  amountCents: number;
  category: ExpenseCategory;
};

export type ExpenseInvoice = {
  id: Id;
  spaceId: Id;
  createdBy: Id;
  store: string;
  purchasedOn: string;
  purchasedAt?: string;
  totalCents: number;
  currency: 'EUR';
  source: ExpenseSource;
  imagePath?: string;
  items: ExpenseItem[];
  createdAt: string;
};

export type ExpenseInvoiceInput = {
  store: string;
  purchasedOn: string;
  purchasedAt?: string;
  totalCents: number;
  source: ExpenseSource;
  imagePath?: string;
  items: { name: string; amountCents: number; category: ExpenseCategory }[];
};

export type ExpenseFixed = {
  id: Id;
  spaceId: Id;
  name: string;
  amountCents: number;
  dayOfMonth: number;
  category: ExpenseCategory;
  enabled: boolean;
};

export type ExpenseFixedInput = Omit<ExpenseFixed, 'id' | 'spaceId'>;

export type ExpenseBudget = {
  id: Id;
  spaceId: Id;
  month: string;
  amountCents: number;
};

export type ExpenseBadgeId = 'budget_master' | 'scan_streak' | 'saver_week';

export type ExpenseBadge = {
  id: ExpenseBadgeId;
  unlocked: boolean;
  unlockedAt?: string;
  current: number;
  target: number;
};

export type ReceiptLine = {
  name: string;
  amountCents: number;
  category: ExpenseCategory;
};

export type ReceiptResult =
  | {
      status: 'ok';
      store: string;
      date: string;
      time?: string;
      totalCents: number;
      items: ReceiptLine[];
      imagePath: string;
    }
  | { status: 'unreadable'; imagePath: string; reason?: string }
  | { status: 'unavailable'; imagePath: string; reason?: string }
  | { status: 'failed'; imagePath: string; reason: string };
