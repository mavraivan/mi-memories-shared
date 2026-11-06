import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  isoDay,
  nextOccurrence,
  summarizeInvoices,
  type DateRecurrence,
  type ExpenseCategory,
  type ExpenseInvoice,
} from '../src/index';

/** The server's Postgres job runs these same cases through the SQL versions. */
const fixtures = JSON.parse(
  readFileSync(new URL('./fixtures/parity.json', import.meta.url), 'utf8'),
) as {
  nextOccurrence: {
    source: string;
    recurrence: DateRecurrence;
    today: string;
    expected: string;
  }[];
  expenseOverview: {
    name: string;
    invoices: {
      totalCents: number;
      items: { amountCents: number; category: ExpenseCategory }[];
    }[];
    expected: {
      totalCents: number;
      byCategory: { category: ExpenseCategory; cents: number }[];
    };
  }[];
};

for (const item of fixtures.nextOccurrence) {
  test(`next ${item.recurrence} of ${item.source} from ${item.today}`, () => {
    const [year, month, day] = item.today.split('-').map(Number);
    const now = new Date(year!, month! - 1, day!, 12);
    assert.equal(
      isoDay(nextOccurrence(item.source, item.recurrence, now)),
      item.expected,
    );
  });
}

for (const item of fixtures.expenseOverview) {
  test(`overview: ${item.name}`, () => {
    const invoices = item.invoices.map(
      (invoice, index) =>
        ({
          id: String(index),
          totalCents: invoice.totalCents,
          items: invoice.items.map((line, at) => ({
            id: `${index}-${at}`,
            name: 'line',
            ...line,
          })),
        } as unknown as ExpenseInvoice),
    );
    const overview = summarizeInvoices(invoices);
    assert.equal(overview.totalCents, item.expected.totalCents);
    assert.deepEqual(
      overview.byCategory.map(({ category, cents }) => ({ category, cents })),
      item.expected.byCategory,
    );
  });
}
