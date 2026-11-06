import { z } from 'zod';
import { EXPENSE_CATEGORIES, LIMITS } from './constants';
import type { ExpenseCategory } from './domain';

export const emailSchema = z.string().trim().min(3, 'Upiši e-mail');
export const passwordSchema = z
  .string()
  .min(LIMITS.passwordMin, 'Najmanje 6 znakova');
export const displayNameSchema = z.string().trim().min(2, 'Kako te zovu?');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = loginSchema.extend({
  name: displayNameSchema,
});

export const chatBody = z.object({
  message: z.string().trim().min(1).max(LIMITS.aiMessageMax),
  threadId: z.string().uuid().optional(),
  mode: z.string().optional(),
  locale: z.enum(['hr', 'en']).optional(),
});

export const memoryTextBody = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  location: z.string().optional(),
  date: z.string().optional(),
  locale: z.enum(['hr', 'en']).optional(),
});

export const expenseCategorySchema = z.enum(
  EXPENSE_CATEGORIES as unknown as [ExpenseCategory, ...ExpenseCategory[]],
);

const isoDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
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
  locale: z.enum(['hr', 'en']).optional(),
  mimeType: z.string().max(80).optional(),
});

export const expenseCategorizeBody = z.object({
  store: z.string().trim().max(120).optional(),
  locale: z.enum(['hr', 'en']).optional(),
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
  itinerary: z
    .object({
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
    })
    .optional()
    .nullable(),
  proposedWrites: z.array(aiProposedWriteSchema).default([]),
});

export const planPayloadSchema = z.object({
  title: z.string().trim().min(1).max(160),
  notes: z.string().optional(),
  type: z
    .enum(['trip', 'date_night', 'home', 'purchase', 'task', 'dream', 'other'])
    .default('other'),
  date: isoDaySchema.optional(),
  items: z.array(z.string()).optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ReceiptModelOutput = z.infer<typeof receiptModelSchema>;
export type AiModelReply = z.infer<typeof aiModelReplySchema>;
