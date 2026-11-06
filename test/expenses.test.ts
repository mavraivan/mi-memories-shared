import assert from 'node:assert/strict';
import test from 'node:test';
import {
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

test('dates convert from DD.MM.YYYY', () => {
  assert.equal(dmyToIso('03.06.2011'), '2011-06-03');
  assert.equal(dmyToIso('9.4.2020.'), '2020-04-09');
  assert.equal(isoToDmy('1990-08-21'), '21.08.1990');
  assert.throws(() => dmyToIso('2011-06-03'));
  const next = nextOccurrence(
    dmyToIso('18.11.1991'),
    'yearly',
    new Date(2026, 9, 18),
  );
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 10);
  const leap = nextOccurrence('2020-02-29', 'yearly', new Date(2021, 0, 15));
  assert.equal(leap.getFullYear(), 2021);
  assert.equal(leap.getMonth(), 1);
  assert.equal(leap.getDate(), 28);
  const leapDay = nextOccurrence('2020-02-29', 'yearly', new Date(2024, 1, 29));
  assert.equal(leapDay.getMonth(), 1);
  assert.equal(leapDay.getDate(), 29);
  const afterLeap = nextOccurrence(
    '2020-02-29',
    'yearly',
    new Date(2024, 2, 1),
  );
  assert.equal(afterLeap.getFullYear(), 2025);
  assert.equal(afterLeap.getDate(), 28);
  const clampedMonth = nextOccurrence(
    '2020-01-31',
    'monthly',
    new Date(2026, 1, 10),
  );
  assert.equal(clampedMonth.getMonth(), 1);
  assert.equal(clampedMonth.getDate(), 28);
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
      items: [{ name: 'x', amountCents: 100, category: 'unknown' }],
    }).success,
    false,
  );
});
