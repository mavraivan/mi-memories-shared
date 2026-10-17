import { z } from 'zod';
import { LIMITS } from './constants';

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
});

export const memoryTextBody = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  location: z.string().optional(),
  date: z.string().optional(),
});

export const tripIdeasBody = z.object({
  season: z.string().optional(),
  notes: z.string().optional(),
});

export const itineraryBody = z.object({
  destination: z.string().trim().min(2),
  days: z.number().int().min(1).max(LIMITS.itineraryDaysMax).default(4),
  notes: z.string().optional(),
});

export const recapBody = z.object({
  period: z.enum(['month', 'year']).default('year'),
  year: z.number().int().optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
