import {
  differenceInCalendarDays,
  getDate,
  getDaysInMonth,
  getMonth,
  parseISO,
} from 'date-fns';
import type { DateRecurrence } from './domain';

/** Month lengths are real. Feb 29 in a non-leap year lands on Feb 28. */
function clampedDate(year: number, month: number, day: number): Date {
  const last = getDaysInMonth(new Date(year, month, 1));
  return new Date(year, month, Math.min(day, last));
}

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
  const day = source.getDate();
  if (recurrence === 'none') {
    return clampedDate(source.getFullYear(), source.getMonth(), day);
  }
  if (recurrence === 'weekly') {
    const next = new Date(today);
    const delta = (source.getDay() - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + delta);
    return next;
  }
  if (recurrence === 'monthly') {
    let next = clampedDate(today.getFullYear(), today.getMonth(), day);
    if (next < today) {
      const month = today.getMonth() + 1;
      next = clampedDate(
        today.getFullYear() + Math.floor(month / 12),
        month % 12,
        day,
      );
    }
    return next;
  }
  let next = clampedDate(today.getFullYear(), source.getMonth(), day);
  if (next < today) {
    next = clampedDate(today.getFullYear() + 1, source.getMonth(), day);
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

/** "03.06.2011" -> "2011-06-03". */
export function dmyToIso(value: string): string {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Not a DD.MM.YYYY date: ${value}`);
  }
  const [, day, month, year] = match;
  return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
}

/** "2011-06-03" -> "03.06.2011". */
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
