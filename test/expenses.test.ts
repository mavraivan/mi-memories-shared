import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COUPLE_DATES,
  compareMonths,
  computeBadges,
  dailySeries,
  dmyToIso,
  eurosToCents,
  expenseInvoiceInputSchema,
  fixedOccurrences,
  isoToDmy,
  monthDays,
  nextOccurrence,
  receiptModelSchema,
  scanStreak,
  shiftMonth,
  sumMismatch,
  summarizeMonth,
  type ExpenseFixed,
  type ExpenseInvoice,
} from '../src/index';

function invoice(
  id: string,
  day: string,
  totalCents: number,
  items: [string, number, ExpenseInvoice['items'][number]['category']][],
  source: ExpenseInvoice['source'] = 'scan',
): ExpenseInvoice {
  return {
    id,
    spaceId: 's',
    createdBy: 'u',
    store: 'Konzum',
    purchasedOn: day,
    totalCents,
    currency: 'EUR',
    source,
    items: items.map(([name, amountCents, category], index) => ({
      id: `${id}-${index}`,
      invoiceId: id,
      name,
      amountCents,
      category,
    })),
    createdAt: `${day}T10:00:00.000Z`,
  };
}

const rent: ExpenseFixed = {
  id: 'f1',
  spaceId: 's',
  name: 'Režije',
  amountCents: 29000,
  dayOfMonth: 31,
  category: 'household',
  enabled: true,
};

test('couple dates convert from DD.MM.YYYY and the anniversary is first', () => {
  assert.equal(COUPLE_DATES.length, 5);
  assert.equal(COUPLE_DATES[0]?.key, 'beginning');
  assert.equal(dmyToIso('04.02.2014'), '2014-02-04');
  assert.equal(dmyToIso('7.10.2023.'), '2023-10-07');
  assert.equal(isoToDmy('1995-11-15'), '15.11.1995');
  assert.throws(() => dmyToIso('2014-02-04'));
  const next = nextOccurrence(
    dmyToIso('18.11.1993'),
    'yearly',
    new Date(2026, 9, 18),
  );
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 10);
});

test('months shift across years and list every day', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(monthDays('2026-02').length, 28);
  assert.equal(eurosToCents('42,80 €'), 4280);
  assert.equal(eurosToCents(1.005), 101);
  assert.equal(eurosToCents('abc'), 0);
});

test('fixed costs land on a clamped day and only when enabled', () => {
  const list = fixedOccurrences(
    [rent, { ...rent, id: 'f2', enabled: false }],
    '2026-02',
  );
  assert.equal(list.length, 1);
  assert.equal(list[0]?.day, '2026-02-28');
});

test('month summary includes fixed costs, days, categories and budget', () => {
  const summary = summarizeMonth({
    month: '2026-10',
    invoices: [
      invoice('a', '2026-10-16', 4280, [
        ['Mlijeko', 3820, 'food'],
        ['Spužve', 460, 'household'],
      ]),
      invoice('b', '2026-10-16', 4360, [['Gorivo', 4000, 'fuel']]),
      invoice('c', '2026-09-30', 1000, []),
      invoice('d', '2026-10-02', 500, []),
    ],
    fixed: [rent],
    budget: { id: 'b', spaceId: 's', month: '2026-10', amountCents: 200000 },
  });
  assert.equal(summary.invoiceCents, 4280 + 4360 + 500);
  assert.equal(summary.fixedCents, 29000);
  assert.equal(summary.totalCents, 9140 + 29000);
  assert.equal(summary.byDay['2026-10-16'], 8640);
  assert.equal(summary.byDay['2026-10-31'], 29000);
  assert.equal(summary.remainingCents, 200000 - summary.totalCents);
  assert.equal(summary.byCategory[0]?.category, 'household');
  const other = summary.byCategory.find(entry => entry.category === 'other');
  assert.equal(other?.cents, 360 + 500);
  assert.equal(dailySeries(summary).length, 31);
  const empty = summarizeMonth({ month: '2026-11', invoices: [], fixed: [] });
  assert.equal(empty.budgetCents, null);
  assert.equal(empty.remainingCents, null);
  const compared = compareMonths(summary, empty);
  assert.equal(compared[0]?.previousCents, 0);
});

test('sum mismatch is the printed total minus the lines', () => {
  assert.equal(
    sumMismatch(1000, [{ amountCents: 400 }, { amountCents: 500 }]),
    100,
  );
});

test('badges: budget master, a seven day scan streak and saver week', () => {
  const days = [
    '2026-10-12',
    '2026-10-13',
    '2026-10-14',
    '2026-10-15',
    '2026-10-16',
    '2026-10-17',
    '2026-10-18',
  ];
  const invoices = [
    ...days.map((day, index) => invoice(`s${index}`, day, 100, [])),
    invoice('r1', '2026-10-06', 3000, [['Pizza', 3000, 'restaurants']]),
    invoice('r2', '2026-10-15', 1000, [['Burek', 1000, 'restaurants']]),
    invoice('sep', '2026-09-10', 5000, []),
  ];
  const badges = computeBadges({
    today: '2026-10-18',
    invoices,
    fixed: [],
    budgets: [{ id: 'b', spaceId: 's', month: '2026-09', amountCents: 10000 }],
    previous: { scan_streak: '2026-10-17' },
  });
  assert.deepEqual(
    badges.map(badge => [badge.id, badge.unlocked]),
    [
      ['budget_master', true],
      ['scan_streak', true],
      ['saver_week', true],
    ],
  );
  assert.equal(badges[1]?.unlockedAt, '2026-10-17');
  assert.equal(scanStreak(invoices, '2026-10-19'), 7);
  assert.equal(scanStreak(invoices, '2026-10-21'), 0);
  const locked = computeBadges({
    today: '2026-10-18',
    invoices: [],
    fixed: [],
    budgets: [],
  });
  assert.equal(
    locked.every(badge => !badge.unlocked),
    true,
  );
});

test('receipt and invoice schemas reject invented shapes', () => {
  assert.equal(receiptModelSchema.safeParse({ readable: false }).success, true);
  assert.equal(
    receiptModelSchema.safeParse({
      readable: true,
      store: 'INA',
      date: '2026-10-16',
      totalCents: 4360,
      items: [{ name: 'Gorivo', amountCents: 4360, category: 'fuel' }],
    }).success,
    true,
  );
  assert.equal(
    receiptModelSchema.safeParse({
      readable: true,
      store: 'INA',
      date: '16.10.2026',
      totalCents: 4360,
      items: [],
    }).success,
    false,
  );
  assert.equal(
    expenseInvoiceInputSchema.safeParse({
      store: 'Lidl',
      purchasedOn: '2026-10-16',
      totalCents: 100,
      source: 'manual',
      items: [{ name: 'x', amountCents: 100, category: 'pets' }],
    }).success,
    false,
  );
});
