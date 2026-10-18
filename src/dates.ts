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

/** Whole years between the source date and its next occurrence. */
export function yearsAt(date: string, occurrence: Date): number {
  return occurrence.getFullYear() - parseISO(date).getFullYear();
}

/** "04.02.2014" -> "2014-02-04". */
export function dmyToIso(value: string): string {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Not a DD.MM.YYYY date: ${value}`);
  }
  const [, day, month, year] = match;
  return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
}

/** "2014-02-04" -> "04.02.2014". */
export function isoToDmy(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

/** Local calendar day as YYYY-MM-DD. */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
