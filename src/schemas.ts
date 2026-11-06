import { z } from 'zod';
import { EXPENSE_CATEGORIES, GAME_CHAPTER_COUNT, LIMITS } from './constants';
import type { ExpenseCategory } from './domain';

export const localeSchema = z.enum(['hr', 'en']);

export const chatBody = z.object({
  message: z.string().trim().min(1).max(LIMITS.aiMessageMax),
  locale: localeSchema.optional(),
  /** Chosen by the client once per question, so a retry cannot save it twice. */
  requestId: z.uuid().optional(),
});

export const memoryTextBody = z.object({
  title: z.string().max(LIMITS.memoryTextMax).optional(),
  body: z.string().max(LIMITS.memoryTextMax).optional(),
  location: z.string().max(LIMITS.memoryTextMax).optional(),
  date: z.string().max(40).optional(),
  locale: localeSchema.optional(),
});

/** Device registration. `userId` must match the caller when it is sent. */
export const deviceBody = z.object({
  userId: z.string().uuid().optional(),
  token: z.string().min(8).max(4096),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().max(200).optional(),
  appVersion: z.string().max(40).optional(),
  locale: z.string().max(16).optional(),
  timezone: z.string().max(64).optional(),
  enabled: z.boolean().optional(),
});

export const gameEventBody = z.object({
  kind: z.enum(['score', 'achievement', 'chapter']),
  /** The column is a 32-bit integer. */
  score: z.number().int().min(0).max(2_147_483_647).optional(),
  chapter: z.string().max(120).optional(),
  chapterIndex: z.number().int().min(1).max(GAME_CHAPTER_COUNT).optional(),
  title: z.string().max(120).optional(),
});

export const expenseCategorySchema = z.enum(
  EXPENSE_CATEGORIES as unknown as [ExpenseCategory, ...ExpenseCategory[]],
);

/** A day the calendar really has. Postgres would refuse 2026-02-31 later. */
export const isoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  });
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

/**
 * `{spaceId}/receipts/{uuid}/{file}`. The character set leaves no way to spell
 * a dot segment with `%`, `?`, `#` or a backslash once this becomes a URL.
 */
export const RECEIPT_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/receipts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(?!.*\.\.)[A-Za-z0-9._-]+$/i;

/** The object key must stay inside the caller's space. */
export const receiptBody = z.object({
  storagePath: z.string().max(512).regex(RECEIPT_PATH),
  locale: localeSchema.optional(),
  mimeType: z.string().max(80).optional(),
});

export const expenseCategorizeBody = z.object({
  store: z.string().trim().max(120).optional(),
  locale: localeSchema.optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        amountCents: z.number().int().optional(),
      }),
    )
    .min(1)
    .max(200),
});

export const expenseCategorizationSchema = z.object({
  categories: z.array(expenseCategorySchema),
});

export const receiptLineSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amountCents: z.number().int(),
  category: expenseCategorySchema,
});

/** What the model must return for a receipt photo. */
export const receiptModelSchema = z.union([
  z.object({
    readable: z.literal(true),
    store: z.string().trim().min(1).max(120),
    date: isoDaySchema,
    time: timeSchema.optional().nullable(),
    totalCents: z.number().int().positive(),
    items: z.array(receiptLineSchema).max(120),
  }),
  z.object({ readable: z.literal(false) }),
]);

export const expenseInvoiceInputSchema = z.object({
  store: z.string().trim().min(1).max(120),
  purchasedOn: isoDaySchema,
  purchasedAt: timeSchema.optional(),
  totalCents: z.number().int().min(0),
  source: z.enum(['scan', 'manual']),
  imagePath: z.string().optional(),
  items: z.array(receiptLineSchema).max(200),
});

export const expenseFixedInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amountCents: z.number().int().positive(),
  dayOfMonth: z.number().int().min(1).max(31),
  category: expenseCategorySchema,
  enabled: z.boolean(),
});

export const expenseBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amountCents: z.number().int().positive(),
});

export const aiCitationSchema = z.object({
  type: z.enum(['memory', 'trip']),
  id: z.string(),
  title: z.string(),
  date: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const aiCardSchema = z.union([
  z.object({
    type: z.literal('itinerary'),
    destination: z.string(),
    days: z
      .array(
        z.object({
          day: z.number().int().min(1),
          title: z.string(),
          items: z.array(z.string()),
        }),
      )
      .max(LIMITS.itineraryDaysMax),
  }),
  z.object({
    type: z.literal('expense'),
    month: z.string(),
    totalCents: z.number().int(),
    byCategory: z.array(
      z.object({ category: expenseCategorySchema, cents: z.number().int() }),
    ),
  }),
]);

export const aiProposedWriteSchema = z.object({
  kind: z.enum(['plan', 'trip', 'important_date', 'wishlist']),
  summary: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

/** What the model must return for chat-like tasks. Ids it cites are checked against the slice. */
export const aiModelReplySchema = z.object({
  reply: z.string().min(1),
  citations: z.array(z.string()).default([]),
  proposedWrites: z.array(aiProposedWriteSchema).default([]),
});

/** Absent, or the app's own "not set". A real value must be a real day. */
const optionalDay = isoDaySchema.or(z.literal('')).optional();
const optionalText = z.string().max(500).optional();
/** The app falls back to the summary when the model left the title out. */
const proposedTitle = z.string().trim().max(160).optional();

export const planPayloadSchema = z.looseObject({
  title: proposedTitle,
  notes: z.string().max(2000).optional(),
  date: optionalDay,
  location: optionalText,
  items: z.array(z.string().max(200)).max(50).optional(),
});

/**
 * What the app can write for each proposal. The model's payload was unchecked
 * until now, so a bad date reached the database only after the person confirmed.
 */
export const aiWritePayloadSchemas = {
  plan: planPayloadSchema,
  trip: z.looseObject({
    title: proposedTitle,
    destination: optionalText,
    startsOn: optionalDay,
    endsOn: optionalDay,
  }),
  important_date: z.looseObject({
    title: proposedTitle,
    date: isoDaySchema,
  }),
  wishlist: z.looseObject({
    title: proposedTitle,
    destination: optionalText,
    reason: optionalText,
  }),
} as const;

export type ReceiptModelOutput = z.infer<typeof receiptModelSchema>;
export type AiModelReply = z.infer<typeof aiModelReplySchema>;
