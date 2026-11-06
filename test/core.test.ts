import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aiWritePayloadSchemas,
  apiErrorSchema,
  chatBody,
  daysUntil,
  deviceBody,
  encodeCursor,
  gameEventBody,
  isoDaySchema,
  memoryTextBody,
  nextOccurrence,
  pageBy,
  paginate,
  replyWithoutRecordIds,
  sameMonthDay,
  storagePath,
  receiptBody,
  yearsAt,
  zagrebDay,
} from '../src/index';

test('a reply never shows record ids', () => {
  assert.equal(
    replyWithoutRecordIds(
      'brvnaru s jacuzzijem [09624961-afa7-479b-8198-8c01d38e1d76, 3f850de1-162a-4e35-a5d4-e5416752c6e6]. Tamo možete uživati.',
    ),
    'brvnaru s jacuzzijem. Tamo možete uživati.',
  );
  assert.equal(replyWithoutRecordIds('Samo tekst.'), 'Samo tekst.');
});

test('pagination cursor stops on the last page', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const page = paginate(items, null, 2);
  assert.deepEqual(
    page.items.map(item => item.id),
    ['a', 'b'],
  );
  assert.equal(page.nextCursor, 'b');
  assert.equal(paginate(items, 'b', 2).nextCursor, null);
});

test('a repeated timestamp does not drop the next row', () => {
  const items = [
    { id: 'a', at: '2024-06-01T00:00:00.000Z' },
    { id: 'b', at: '2024-06-01T00:00:00.000Z' },
    { id: 'c', at: '2024-06-02T00:00:00.000Z' },
  ];
  const first = pageBy(items, null, item => item.at, 1, 'desc');
  assert.deepEqual(
    first.items.map(item => item.id),
    ['c'],
  );
  const second = pageBy(items, first.nextCursor, item => item.at, 1, 'desc');
  const third = pageBy(items, second.nextCursor, item => item.at, 1, 'desc');
  assert.deepEqual([second.items[0]?.id, third.items[0]?.id].sort(), [
    'a',
    'b',
  ]);
  assert.equal(third.nextCursor, null);
  assert.ok(encodeCursor('2024-06-01', 'a').includes('a'));
});

test('same calendar day matches across years', () => {
  assert.equal(
    sameMonthDay('2023-10-16', new Date('2026-10-16T12:00:00')),
    true,
  );
  assert.equal(
    sameMonthDay('2023-10-15', new Date('2026-10-16T12:00:00')),
    false,
  );
});

test('days until counts whole local days', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  tomorrow.setHours(12, 0, 0, 0);
  assert.equal(daysUntil(tomorrow), 2);
});

test('storage path is space scoped', () => {
  assert.equal(
    storagePath('space', 'memories', 'mem-1', 'a.jpg'),
    'space/memories/mem-1/a.jpg',
  );
});

test('a receipt path is one object inside a space', () => {
  const space = '11111111-2222-4333-8444-555555555555';
  const entity = '66666666-7777-4888-9999-000000000000';
  const ok = `${space}/receipts/${entity}/0-1730000000000.jpg`;
  assert.equal(receiptBody.safeParse({ storagePath: ok }).success, true);
  for (const storagePath of [
    `${space}/receipts/${entity}/%2e%2e/%2e%2e/a.jpg`,
    `${space}/receipts/%2e%2e/${entity}/a.jpg`,
    `${space}/receipts/${entity}/.%2E/a.jpg`,
    `${space}/receipts/${entity}/a%2fb.jpg`,
    `${space}/receipts/${entity}/../a.jpg`,
    `${space}/receipts/${entity}/..jpg`,
    `${space}/receipts/${entity}/a.jpg?x=1`,
    `${space}/receipts/${entity}/a.jpg#x`,
    `${space}/receipts/${entity}/a\\b.jpg`,
    `${space}/memories/${entity}/a.jpg`,
    `${space}/receipts/a.jpg`,
    'space/receipts/a.jpg',
  ]) {
    assert.equal(
      receiptBody.safeParse({ storagePath }).success,
      false,
      storagePath,
    );
  }
});

test('a day must exist on the calendar', () => {
  assert.equal(isoDaySchema.safeParse('2026-02-28').success, true);
  assert.equal(isoDaySchema.safeParse('2028-02-29').success, true);
  for (const day of ['2026-02-31', '2026-02-29', '2026-13-01', '2026-00-10']) {
    assert.equal(isoDaySchema.safeParse(day).success, false, day);
  }
});

test('a recurring date set in the future waits for its first day', () => {
  const now = new Date(2026, 10, 6, 12);
  for (const recurrence of ['yearly', 'monthly', 'weekly'] as const) {
    const next = nextOccurrence('2030-06-15', recurrence, now);
    assert.deepEqual(
      [next.getFullYear(), next.getMonth(), next.getDate()],
      [2030, 5, 15],
      recurrence,
    );
    assert.equal(yearsAt('2030-06-15', next), 0);
  }
});

test('the couple day is Zagreb, whatever the host zone', () => {
  assert.equal(zagrebDay(new Date('2026-11-06T23:30:00Z')), '2026-11-07');
  assert.equal(zagrebDay(new Date('2026-07-01T21:59:00Z')), '2026-07-01');
  assert.equal(zagrebDay(new Date('2026-07-01T22:00:00Z')), '2026-07-02');
});

test('a proposal for a date needs a real day; optional days may be empty', () => {
  const date = aiWritePayloadSchemas.important_date;
  assert.equal(date.safeParse({ date: '2027-06-03' }).success, true);
  assert.equal(date.safeParse({ date: '' }).success, false);
  assert.equal(date.safeParse({}).success, false);
  assert.equal(date.safeParse({ date: '2027-02-31' }).success, false);
  const trip = aiWritePayloadSchemas.trip;
  assert.equal(trip.safeParse({ startsOn: '' }).success, true);
  assert.equal(trip.safeParse({ startsOn: 'soon' }).success, false);
  assert.equal(aiWritePayloadSchemas.plan.safeParse({}).success, true);
});

test('request bodies are bounded', () => {
  const token = 'x'.repeat(4097);
  assert.equal(deviceBody.safeParse({ token, platform: 'ios' }).success, false);
  assert.equal(
    gameEventBody.safeParse({ kind: 'score', score: 2 ** 31 }).success,
    false,
  );
  assert.equal(
    memoryTextBody.safeParse({ body: 'x'.repeat(20_001) }).success,
    false,
  );
});

test('the app keeps working from a request with only message and locale', () => {
  assert.deepEqual(chatBody.parse({ message: ' hej ', locale: 'hr' }), {
    message: 'hej',
    locale: 'hr',
  });
});

test('an error keeps `error` a string, because the installed app needs that', () => {
  assert.equal(
    apiErrorSchema.safeParse({ error: 'http_429', code: 'rate_limited' })
      .success,
    true,
  );
  assert.equal(
    apiErrorSchema.safeParse({ error: { code: 'rate_limited' } }).success,
    false,
  );
});
