import {
  differenceInCalendarDays,
  getDate,
  getMonth,
  parseISO,
} from 'date-fns';
import type { DateRecurrence } from './domain';

export function parseDate(value: string): Date {
  return parseISO(value);
}

function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function nextOccurrence(
  date: string,
  recurrence: DateRecurrence,
  now = new Date(),
): Date {
  const source = parseISO(date);
  const today = startOfToday(now);
  if (recurrence === 'none') {
    return source;
  }
  if (recurrence === 'weekly') {
    const next = new Date(today);
    const delta = (source.getDay() - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + delta);
    return next;
  }
  if (recurrence === 'monthly') {
    const next = new Date(now.getFullYear(), now.getMonth(), source.getDate());
    if (next < today) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }
  const next = new Date(now.getFullYear(), source.getMonth(), source.getDate());
  if (next < today) {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export function daysUntil(date: Date, now = new Date()): number {
  return differenceInCalendarDays(date, startOfToday(now));
}

export function sameMonthDay(value: string, day: Date = new Date()): boolean {
  const parsed = parseISO(value);
  return getMonth(parsed) === getMonth(day) && getDate(parsed) === getDate(day);
}
