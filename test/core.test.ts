import assert from 'node:assert/strict';
import test from 'node:test';
import {
  daysUntil,
  encodeCursor,
  loginSchema,
  occurrenceKey,
  pageBy,
  paginate,
  replyWithoutRecordIds,
  sameMonthDay,
  storagePath,
  receiptBody,
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

test('occurrence key stays stable across retries', () => {
  assert.equal(
    occurrenceKey('sched-1', '2026-06-12T06:00:00.000Z'),
    'sched-1:2026-06-12T06:00:00.000Z',
  );
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

test('login schema trims email and rejects a short password', () => {
  assert.equal(
    loginSchema.parse({ email: '  ana@mi.app ', password: 'tajna1' }).email,
    'ana@mi.app',
  );
  assert.equal(
    loginSchema.safeParse({ email: 'ana@mi.app', password: '123' }).success,
    false,
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
