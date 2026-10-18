import { EXPENSE_CATEGORIES, LIMITS } from './constants';
import { isoDay } from './dates';
import type {
  ExpenseBadge,
  ExpenseBudget,
  ExpenseCategory,
  ExpenseFixed,
  ExpenseInvoice,
  ExpenseItem,
} from './domain';

/** "2026-10-16" -> "2026-10". */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year!, mon! - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}`;
}

export function daysInMonth(month: string): number {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year!, mon!, 0).getDate();
}

export function monthDays(month: string): string[] {
  return Array.from(
    { length: daysInMonth(month) },
    (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
  );
}

export function eurosToCents(value: number | string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : Number(
          String(value)
            .replace(/[^\d,.-]/g, '')
            .replace(',', '.'),
        );
  return Number.isFinite(parsed) ? Math.round(Number(`${parsed}e2`)) : 0;
}

export function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
}

export function itemsCents(items: Pick<ExpenseItem, 'amountCents'>[]): number {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

/** Positive when the printed total is higher than the lines. */
export function sumMismatch(
  totalCents: number,
  items: Pick<ExpenseItem, 'amountCents'>[],
): number {
  return totalCents - itemsCents(items);
}

export type FixedOccurrence = {
  fixedId: string;
  name: string;
  day: string;
  amountCents: number;
  category: ExpenseCategory;
};

/** Enabled fixed costs land on their day; day 31 falls on the last day of a short month. */
export function fixedOccurrences(
  fixed: ExpenseFixed[],
  month: string,
): FixedOccurrence[] {
  const last = daysInMonth(month);
  return fixed
    .filter(item => item.enabled)
    .map(item => ({
      fixedId: item.id,
      name: item.name,
      day: `${month}-${String(
        Math.min(Math.max(item.dayOfMonth, 1), last),
      ).padStart(2, '0')}`,
      amountCents: item.amountCents,
      category: item.category,
    }));
}

function invoiceCategories(
  invoice: ExpenseInvoice,
): { category: ExpenseCategory; cents: number }[] {
  if (invoice.items.length === 0) {
    return [{ category: 'other', cents: invoice.totalCents }];
  }
  const lines = invoice.items.map(item => ({
    category: item.category,
    cents: item.amountCents,
  }));
  const rest = sumMismatch(invoice.totalCents, invoice.items);
  if (rest !== 0) {
    lines.push({ category: 'other', cents: rest });
  }
  return lines;
}

export type CategoryTotal = {
  category: ExpenseCategory;
  cents: number;
  share: number;
};

export type MonthSummary = {
  month: string;
  totalCents: number;
  invoiceCents: number;
  fixedCents: number;
  budgetCents: number | null;
  remainingCents: number | null;
  byDay: Record<string, number>;
  byCategory: CategoryTotal[];
  invoiceCount: number;
};

export function summarizeMonth(input: {
  month: string;
  invoices: ExpenseInvoice[];
  fixed: ExpenseFixed[];
  budget?: ExpenseBudget | null;
}): MonthSummary {
  const byDay: Record<string, number> = {};
  const categories = new Map<ExpenseCategory, number>();
  let invoiceCents = 0;
  const invoices = input.invoices.filter(
    invoice => monthOf(invoice.purchasedOn) === input.month,
  );
  for (const invoice of invoices) {
    invoiceCents += invoice.totalCents;
    byDay[invoice.purchasedOn] =
      (byDay[invoice.purchasedOn] ?? 0) + invoice.totalCents;
    for (const line of invoiceCategories(invoice)) {
      categories.set(
        line.category,
        (categories.get(line.category) ?? 0) + line.cents,
      );
    }
  }
  let fixedCents = 0;
  for (const occurrence of fixedOccurrences(input.fixed, input.month)) {
    fixedCents += occurrence.amountCents;
    byDay[occurrence.day] =
      (byDay[occurrence.day] ?? 0) + occurrence.amountCents;
    categories.set(
      occurrence.category,
      (categories.get(occurrence.category) ?? 0) + occurrence.amountCents,
    );
  }
  const totalCents = invoiceCents + fixedCents;
  const byCategory = EXPENSE_CATEGORIES.map(category => {
    const cents = categories.get(category) ?? 0;
    return {
      category,
      cents,
      share: totalCents > 0 ? cents / totalCents : 0,
    };
  })
    .filter(entry => entry.cents > 0)
    .sort((a, b) => b.cents - a.cents);
  const budgetCents = input.budget ? input.budget.amountCents : null;
  return {
    month: input.month,
    totalCents,
    invoiceCents,
    fixedCents,
    budgetCents,
    remainingCents: budgetCents === null ? null : budgetCents - totalCents,
    byDay,
    byCategory,
    invoiceCount: invoices.length,
  };
}

export type CategoryComparison = {
  category: ExpenseCategory;
  currentCents: number;
  previousCents: number;
};

export function compareMonths(
  current: MonthSummary,
  previous: MonthSummary,
): CategoryComparison[] {
  return EXPENSE_CATEGORIES.map(category => ({
    category,
    currentCents:
      current.byCategory.find(entry => entry.category === category)?.cents ?? 0,
    previousCents:
      previous.byCategory.find(entry => entry.category === category)?.cents ??
      0,
  }))
    .filter(entry => entry.currentCents > 0 || entry.previousCents > 0)
    .sort((a, b) => b.currentCents - a.currentCents);
}

export function dailySeries(summary: MonthSummary): number[] {
  return monthDays(summary.month).map(day => summary.byDay[day] ?? 0);
}

function addDays(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return isoDay(new Date(year!, month! - 1, date! + delta));
}

function categoryCentsBetween(
  invoices: ExpenseInvoice[],
  category: ExpenseCategory,
  from: string,
  to: string,
): number {
  return invoices
    .filter(invoice => invoice.purchasedOn >= from && invoice.purchasedOn <= to)
    .reduce(
      (sum, invoice) =>
        sum +
        invoiceCategories(invoice)
          .filter(line => line.category === category)
          .reduce((acc, line) => acc + line.cents, 0),
      0,
    );
}

/** Consecutive days, ending today or yesterday, with at least one scanned receipt. */
export function scanStreak(invoices: ExpenseInvoice[], today: string): number {
  const scanned = new Set(
    invoices
      .filter(invoice => invoice.source === 'scan')
      .map(invoice => invoice.purchasedOn),
  );
  let cursor = scanned.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (scanned.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Exactly three badges, recomputed from rows:
 * - budget_master: the last finished month with a budget stayed within it.
 * - scan_streak: seven consecutive days with a scanned receipt.
 * - saver_week: less Restaurants / delivery in the last 7 days than the 7 before.
 */
export function computeBadges(input: {
  today: string;
  invoices: ExpenseInvoice[];
  fixed: ExpenseFixed[];
  budgets: ExpenseBudget[];
  previous?: Partial<Record<string, string>>;
}): ExpenseBadge[] {
  const currentMonth = monthOf(input.today);
  const lastMonth = shiftMonth(currentMonth, -1);
  const lastBudget = input.budgets.find(budget => budget.month === lastMonth);
  const lastSummary = summarizeMonth({
    month: lastMonth,
    invoices: input.invoices,
    fixed: input.fixed,
    budget: lastBudget,
  });
  const budgetMaster =
    lastBudget !== undefined &&
    lastSummary.totalCents <= lastBudget.amountCents;

  const streak = scanStreak(input.invoices, input.today);

  const thisWeek = categoryCentsBetween(
    input.invoices,
    'restaurants',
    addDays(input.today, -6),
    input.today,
  );
  const lastWeek = categoryCentsBetween(
    input.invoices,
    'restaurants',
    addDays(input.today, -13),
    addDays(input.today, -7),
  );
  const saver = lastWeek > 0 && thisWeek < lastWeek;

  const stamp = (id: string, unlocked: boolean) =>
    unlocked ? input.previous?.[id] ?? input.today : undefined;

  return [
    {
      id: 'budget_master',
      unlocked: budgetMaster,
      unlockedAt: stamp('budget_master', budgetMaster),
      current: lastSummary.totalCents,
      target: lastBudget?.amountCents ?? 0,
    },
    {
      id: 'scan_streak',
      unlocked: streak >= LIMITS.scanStreakDays,
      unlockedAt: stamp('scan_streak', streak >= LIMITS.scanStreakDays),
      current: Math.min(streak, LIMITS.scanStreakDays),
      target: LIMITS.scanStreakDays,
    },
    {
      id: 'saver_week',
      unlocked: saver,
      unlockedAt: stamp('saver_week', saver),
      current: thisWeek,
      target: lastWeek,
    },
  ];
}
