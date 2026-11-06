import { z } from 'zod';
import {
  aiCardSchema,
  aiCitationSchema,
  aiProposedWriteSchema,
  expenseCategorySchema,
  receiptLineSchema,
} from './schemas';

/**
 * The stable part of an error. `code` sits beside `error` because the installed
 * app reads `error` as a string and turns anything else into "[object Object]".
 * New clients translate `code`; `error` stays for the app already on phones.
 */
export const API_ERROR_CODES = [
  'invalid_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'payload_too_large',
  'unsupported_media_type',
  'rate_limited',
  'request_refused',
  'no_space',
  'ai_unavailable',
  'server_unreachable',
  'not_configured',
  'server_error',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.string().min(1),
  code: z.enum(API_ERROR_CODES),
  id: z.string().optional(),
  issues: z.array(z.unknown()).optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const okSchema = z.object({ ok: z.literal(true) });

/** `GET /health`. The app reads `supabase` and `ai`, and nothing else. */
export const healthSchema = z.object({
  ok: z.literal(true),
  supabase: z.boolean(),
  ai: z.enum(['gemini', 'database']),
});

export const aiReplySchema = z.object({
  reply: z.string(),
  citations: z.array(aiCitationSchema),
  cards: z.array(aiCardSchema),
  proposedWrites: z.array(aiProposedWriteSchema),
  confirmationRequired: z.boolean().optional(),
  source: z.enum(['gemini', 'database']),
});

export const aiFactsSchema = z.object({ facts: z.array(z.unknown()) });

export const expenseCategorizationResponseSchema = z.object({
  categories: z.array(expenseCategorySchema),
  source: z.enum(['gemini', 'fallback']),
});

/** What `POST /v1/ai/receipt` answers. `imagePath` always echoes the upload. */
export const receiptResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    store: z.string(),
    date: z.string(),
    time: z.string().optional(),
    totalCents: z.number().int(),
    items: z.array(receiptLineSchema),
    imagePath: z.string(),
  }),
  z.object({
    status: z.literal('unreadable'),
    imagePath: z.string(),
    reason: z.string().optional(),
  }),
  z.object({
    status: z.literal('unavailable'),
    imagePath: z.string(),
    reason: z.string().optional(),
  }),
  z.object({
    status: z.literal('failed'),
    imagePath: z.string(),
    reason: z.string(),
  }),
]);

export const gameProfileSchema = z.object({
  id: z.string(),
  bestScore: z.number().int(),
  lastPlayedAt: z.string().optional(),
  chapter: z.string(),
  chapterIndex: z.number().int(),
  chapterCount: z.number().int(),
  achievements: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      unlockedAt: z.string().optional(),
    }),
  ),
});
