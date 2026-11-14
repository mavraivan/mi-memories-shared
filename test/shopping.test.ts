import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activeDeal,
  chainLabel,
  dealPercent,
  foldText,
  groupShopping,
  isSuperDeal,
  matchReceipt,
  nameTokens,
  planShopping,
  priceSuggestionSchema,
  productBrand,
  productSize,
  receiptLineScore,
  shoppingListSchema,
  storeQuotes,
  summarizeShopping,
  type ShoppingItem,
  type ShoppingList,
} from '../src/index';

function item(over: Partial<ShoppingItem> & { id: string }): ShoppingItem {
  return {
    name: over.id,
    checked: false,
    uncheckedAt: '2026-11-10T08:00:00Z',
    createdAt: '2026-11-01T08:00:00Z',
    ...over,
  };
}

const list = (items: ShoppingItem[], over: Partial<ShoppingList> = {}) =>
  ({
    sections: [
      { id: 's-veg', name: 'Povrće', sortOrder: 0 },
      { id: 's-cos', name: 'Kozmetika', sortOrder: 1 },
    ],
    items,
    settings: null,
    pricedOn: '2026-11-13',
    chains: [],
    ...over,
  } satisfies ShoppingList);

test('text folds the way the database does', () => {
  assert.equal(
    foldText('ČIPI Čips Šećer Žuti Đumbir'),
    'cipi cips secer zuti dumbir',
  );
  assert.equal(chainLabel('konzum'), 'Konzum');
  assert.equal(chainLabel('dm'), 'dm');
  assert.equal(chainLabel('trgovina-krk'), 'Trgovina Krk');
});

test('a pack size shows only with a real unit', () => {
  assert.equal(productSize('0.20 kg', 'ko'), '0.20 kg');
  assert.equal(productSize('0.08', '80g'), '80g');
  assert.equal(productSize('1.5', '1,5l'), '1,5l');
  assert.equal(productSize('0.195', '190g,200g'), '190g');
  assert.equal(productSize('1,0000', 'L'), '1 l');
  assert.equal(productSize('0,200', 'kom'), '');
  assert.equal(productSize('', ''), '');
  assert.equal(productBrand('NO BRAND'), '');
  assert.equal(productBrand(' Dukat '), 'Dukat');
});

test('every view groups the same items by section', () => {
  const data = list([
    item({ id: 'b', name: 'Šampon', sectionId: 's-cos' }),
    item({ id: 'a', name: 'Mrkva', sectionId: 's-veg', checked: true }),
    item({ id: 'c', name: 'Luk', sectionId: 's-veg' }),
    item({ id: 'd', name: 'Baterije', sectionId: 's-gone' }),
  ]);
  const all = groupShopping(data);
  assert.deepEqual(
    all.map(group => [
      group.section?.name ?? null,
      group.items.map(i => i.name),
    ]),
    [
      ['Povrće', ['Luk', 'Mrkva']],
      ['Kozmetika', ['Šampon']],
      [null, ['Baterije']],
    ],
  );
  const shop = groupShopping(data, true);
  assert.deepEqual(
    shop.map(group => group.items.map(i => i.name)),
    [['Luk'], ['Šampon'], ['Baterije']],
  );
});

test('the summary counts what waits, and a past shop day is no day', () => {
  const deal = { chain: 'dm', dealCents: 349, regularCents: 499 };
  const data = list(
    [
      item({ id: 'a', deal }),
      item({ id: 'b', deal, checked: true }),
      item({ id: 'c' }),
    ],
    {
      settings: {
        shopOn: '2026-11-14',
        weeklyDow: 6,
        dealPush: true,
        stores: [],
      },
    },
  );
  assert.deepEqual(summarizeShopping(data, '2026-11-14'), {
    waiting: 2,
    total: 3,
    deals: 1,
    shopOn: '2026-11-14',
    shopToday: true,
  });
  const later = summarizeShopping(data, '2026-11-20');
  assert.equal(later.shopOn, null);
  assert.equal(later.shopToday, false);
  // A week-old price list is not today's fact.
  assert.equal(later.deals, 0);
  assert.equal(activeDeal(data.items[1]!, '2026-11-13', '2026-11-14'), null);
});

test('a receipt line needs enough of the name to count', () => {
  assert.deepEqual(nameTokens('MLIJEKO UHT 2,8% DUKAT 1L'), [
    'mlijeko',
    'uht',
    'dukat',
  ]);
  assert.ok(
    receiptLineScore('Dukat mlijeko', 'MLIJEKO UHT 2,8% DUKAT 1L') >= 0.6,
  );
  assert.ok(
    receiptLineScore('Nivea krema za ruke', 'NIVEA KREMA RUKE 75ML') >= 0.6,
  );
  // Receipts cut words short.
  assert.ok(
    receiptLineScore('Zubna pasta Sensodyne', 'SENSOD. ZUB.PASTA') >= 0.6,
  );
  assert.ok(receiptLineScore('Sensodyne pasta', 'SENSODYNE PASTA 75') > 0);
  assert.ok(receiptLineScore('Mlijeko', 'MLIJ. DUKAT 1L') > 0);
  assert.equal(receiptLineScore('Mlijeko', 'ČOKOLADA MLIJEKO 100G'), 0);
  assert.equal(receiptLineScore('Kruh', 'KRUH POLUBIJELI'), 0.7);
  assert.equal(receiptLineScore('Sol', 'SOL MORSKA'), 0);
  assert.equal(receiptLineScore('Jaja', 'ŠAMPON'), 0);
  // Only the receipt shortens a word.
  assert.equal(receiptLineScore('Papir', 'PAPIRNATI RUČNICI'), 0);
  // A repeated word counts once.
  assert.equal(receiptLineScore('Dukat Dukat mlijeko', 'DUKAT JOGURT'), 0);
});

test('the brand alone is not a match', () => {
  assert.equal(
    receiptLineScore('DUKAT MLIJEKO 1L', 'DUKAT JOGURT 180G', 'Dukat'),
    0,
  );
  assert.equal(
    receiptLineScore('NIVEA KREMA 150ML', 'NIVEA DEZODORANS', 'Nivea'),
    0,
  );
  assert.equal(
    receiptLineScore('DUKAT MLIJEKO 1L', 'DUKAT MLIJEKO 2,8% 1L', 'Dukat'),
    0.7,
  );
  assert.ok(
    receiptLineScore('NIVEA KREMA SOFT 150ML', 'NIVEA SOFT KREMA', 'Nivea') >=
      0.6,
  );
});

test('a receipt marks only items it surely bought', () => {
  const items = [
    item({ id: 'milk', name: 'Mlijeko' }),
    item({
      id: 'cream',
      name: 'Krema',
      productName: 'NIVEA KREMA ZA RUKE 75ML',
      productBrand: 'Nivea',
    }),
    item({ id: 'have', name: 'Kruh', checked: true }),
    item({ id: 'late', name: 'Jogurt', uncheckedAt: '2026-11-13T09:00:00Z' }),
    item({ id: 'twin-a', name: 'Šampon Head Shoulders' }),
    item({ id: 'twin-b', name: 'Head Shoulders šampon' }),
  ];
  const matches = matchReceipt(items, {
    purchasedOn: '2026-11-12',
    items: [
      { name: 'MLIJEKO DUKAT 2,8% 1L', amountCents: 119 },
      { name: 'NIVEA KREMA RUKE 75ML', amountCents: 349 },
      { name: 'KRUH POLUBIJELI', amountCents: 150 },
      { name: 'JOGURT TEKUĆI', amountCents: 99 },
      { name: 'SAMPON HEAD SHOULDERS 400ML', amountCents: 599 },
      { name: 'VREĆICA', amountCents: 10 },
    ],
  });
  assert.deepEqual(
    matches.map(match => [match.itemId, match.amountCents]).sort(),
    [
      ['cream', 349],
      ['milk', 119],
    ],
  );
});

test('the database shapes parse', () => {
  const parsed = shoppingListSchema.parse({
    sections: [{ id: 's', name: 'Voće', sortOrder: 0 }],
    items: [
      {
        id: 'i',
        name: 'Čips',
        checked: false,
        uncheckedAt: '2026-11-14T03:19:28+01:00',
        createdAt: '2026-11-14T03:19:28+01:00',
        productIdentity: '3856021300547',
        price: { chain: 'kaufland', priceCents: 299 },
        deal: { chain: 'eurospin', dealCents: 1490 },
      },
    ],
    settings: null,
    pricedOn: '2026-11-13',
  });
  assert.equal(parsed.items[0]?.deal?.regularCents, undefined);
  const hit = priceSuggestionSchema.parse({
    identity: 'konzum:1',
    name: 'KRUH',
    priceCents: 150,
    chain: 'konzum',
    chains: 1,
  });
  assert.equal(hit.brand, '');
});

const at = (chain: string, priceCents: number) => ({ chain, priceCents });

test('the fastest plan is the fewest shops, the cheapest the lowest bill', () => {
  const items = [
    item({ id: 'milk', offers: [at('konzum', 129), at('lidl', 119)] }),
    item({ id: 'coffee', offers: [at('konzum', 599), at('lidl', 589)] }),
    item({ id: 'oil', offers: [at('konzum', 899), at('lidl', 1299)] }),
  ];
  // Konzum alone is 16,27 and Lidl alone 20,07: one shop, the cheaper one.
  const fast = planShopping(items);
  assert.deepEqual(
    fast.stores.map(store => [store.chain, store.cents]),
    [['konzum', 1627]],
  );
  assert.equal(fast.totalCents, 1627);
  assert.equal(fast.chosen, false);
  assert.deepEqual(planShopping(items, [], 'fastest'), fast);

  // Each thing where it costs least: twenty cents less, in two shops.
  const cheap = planShopping(items, [], 'cheapest');
  assert.deepEqual(
    cheap.stores.map(store => [store.chain, store.cents]),
    [
      ['konzum', 899],
      ['lidl', 708],
    ],
  );
  assert.equal(cheap.totalCents, 1607);
  assert.deepEqual(cheap.stores[0]?.items, [{ id: 'oil', cents: 899 }]);
});

test('the fastest plan still goes where only one shop sells a thing', () => {
  const plan = planShopping([
    item({ id: 'milk', offers: [at('konzum', 129), at('dm', 149)] }),
    item({ id: 'bread', offers: [at('konzum', 199)] }),
    item({ id: 'shampoo', offers: [at('dm', 349)] }),
    item({ id: 'eggs' }),
    item({ id: 'salt', checked: true, offers: [at('konzum', 59)] }),
  ]);
  assert.deepEqual(
    plan.stores.map(store => [store.chain, store.items.map(row => row.id)]),
    [
      ['dm', ['shampoo']],
      ['konzum', ['milk', 'bread']],
    ],
  );
  assert.equal(plan.totalCents, 677);
  assert.deepEqual(plan.unpriced, ['eggs']);
});

test('named shops are the only ones planned, and what they lack has no price', () => {
  const items = [
    item({ id: 'milk', offers: [at('konzum', 129), at('lidl', 119)] }),
    item({ id: 'oil', offers: [at('konzum', 899), at('lidl', 1299)] }),
    item({ id: 'shampoo', offers: [at('dm', 349)] }),
    item({ id: 'eggs' }),
  ];
  const one = planShopping(items, ['konzum', 'spar']);
  assert.equal(one.chosen, true);
  assert.deepEqual(one.stores, [
    {
      chain: 'konzum',
      cents: 1028,
      items: [
        { id: 'milk', cents: 129 },
        { id: 'oil', cents: 899 },
      ],
    },
  ]);
  assert.deepEqual(one.unpriced, ['eggs', 'shampoo']);

  // Both named shops sell both things: the fastest plan needs only one,
  // the cheapest splits them.
  const named = ['konzum', 'lidl'];
  assert.deepEqual(
    planShopping(items, named, 'fastest').stores.map(store => store.chain),
    ['konzum'],
  );
  const split = planShopping(items, named, 'cheapest');
  assert.deepEqual(
    split.stores.map(store => [store.chain, store.cents]),
    [
      ['konzum', 899],
      ['lidl', 119],
    ],
  );
  assert.equal(split.totalCents, 1018);

  const none = planShopping([item({ id: 'eggs' })]);
  assert.deepEqual(none.stores, []);
  assert.equal(none.totalCents, 0);
});

test('a super deal is well below a known regular price', () => {
  const deal = (dealCents: number, regularCents?: number) => ({
    chain: 'spar',
    dealCents,
    ...(regularCents ? { regularCents } : null),
  });
  assert.equal(dealPercent(deal(349, 499)), 30);
  assert.equal(isSuperDeal(deal(349, 499)), true);
  assert.equal(isSuperDeal(deal(399, 499)), false);
  // No regular price, no claim.
  assert.equal(dealPercent(deal(99)), 0);
  assert.equal(isSuperDeal(deal(99)), false);
  assert.equal(isSuperDeal(deal(499, 399)), false);
  assert.equal(isSuperDeal(undefined), false);
});

test('each chain is quoted for what it has of the list', () => {
  const quotes = storeQuotes(
    [
      item({ id: 'milk', offers: [at('konzum', 129), at('lidl', 119)] }),
      item({ id: 'bread', offers: [at('konzum', 199)] }),
      item({ id: 'salt', checked: true, offers: [at('lidl', 59)] }),
    ],
    ['spar', 'lidl'],
  );
  assert.deepEqual(quotes, [
    { chain: 'konzum', items: 2, cents: 328 },
    { chain: 'lidl', items: 1, cents: 119 },
    { chain: 'spar', items: 0, cents: 0 },
  ]);
});

test('a list from an older server still parses', () => {
  const parsed = shoppingListSchema.parse({
    sections: [],
    items: [],
    settings: { shopOn: null, weeklyDow: null, dealPush: true },
    pricedOn: null,
  });
  assert.deepEqual(parsed.settings?.stores, []);
  assert.deepEqual(parsed.chains, []);
});
