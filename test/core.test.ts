import assert from 'node:assert/strict';
import test from 'node:test';
import {
  daysUntil,
  loginSchema,
  occurrenceKey,
  paginate,
  sameMonthDay,
  storagePath,
} from '../src/index';

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
    loginSchema.parse({ email: '  ivan@mi.app ', password: 'tajna1' }).email,
    'ivan@mi.app',
  );
  assert.equal(
    loginSchema.safeParse({ email: 'ivan@mi.app', password: '123' }).success,
    false,
  );
});
