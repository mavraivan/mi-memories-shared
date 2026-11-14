import { z } from 'zod';
import { zagrebDay } from './dates';
import { isoDaySchema } from './schemas';

/**
 * The household list is a standing catalog. An item is never deleted by a
 * purchase: unchecked is "we are out, buy it", checked is "we have it".
 */

const priceSchema = z.object({
  chain: z.string(),
  priceCents: z.number().int().positive(),
});

/** A deal as a chain published it. The regular price is not always known. */
const dealSchema = z.object({
  chain: z.string(),
  dealCents: z.number().int().positive(),
  regularCents: z.number().int().positive().optional(),
  saleType: z.string().optional(),
});

export const shoppingSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
});

export const shoppingItemSchema = z.object({
  id: z.string(),
  sectionId: z.string().optional(),
  /** What the couple calls it. */
  name: z.string(),
  /** A barcode, or `chain:product_id`. Missing on a reminder with no price. */
  productIdentity: z.string().optional(),
  productName: z.string().optional(),
  productBrand: z.string().optional(),
  productQuantity: z.string().optional(),
  productUnit: z.string().optional(),
  checked: z.boolean(),
  checkedAt: z.string().optional(),
  uncheckedAt: z.string(),
  checkedBy: z.string().optional(),
  /** From the couple's own receipt, once they confirmed the match. */
  paidCents: z.number().int().optional(),
  paidOn: z.string().optional(),
  createdAt: z.string(),
  /** The lowest shelf price over all chains. */
  price: priceSchema.optional(),
  deal: dealSchema.optional(),
  /** What each chain asks for it today, cheapest first. */
  offers: z.array(priceSchema).optional(),
});

export const shoppingSettingsSchema = z.object({
  /** The scheduled shopping day. A past day counts as none. */
  shopOn: isoDaySchema.nullable(),
  /** The weekly reminder's weekday, 0 for Sunday. Null is off. */
  weeklyDow: z.number().int().min(0).max(6).nullable(),
  dealPush: z.boolean(),
  /** The chains the couple means to shop in. Empty lets the plan choose. */
  stores: z.array(z.string()).default([]),
});

/** What `shopping_list()` answers. */
export const shoppingListSchema = z.object({
  sections: z.array(shoppingSectionSchema),
  items: z.array(shoppingItemSchema),
  settings: shoppingSettingsSchema.nullable(),
  /** The day of the price list the prices and deals come from. */
  pricedOn: z.string().nullable(),
  /** The chains with a current price list. */
  chains: z.array(z.string()).default([]),
});

/** One row of `price_search()`: a product that has a price. */
export const priceSuggestionSchema = z.object({
  identity: z.string(),
  barcode: z.string().optional(),
  name: z.string(),
  brand: z.string().default(''),
  quantity: z.string().default(''),
  unit: z.string().default(''),
  priceCents: z.number().int().positive(),
  chain: z.string(),
  chains: z.number().int(),
  deal: dealSchema.optional(),
});

export type ShoppingPrice = z.infer<typeof priceSchema>;
export type ShoppingDeal = z.infer<typeof dealSchema>;
export type ShoppingSection = z.infer<typeof shoppingSectionSchema>;
export type ShoppingItem = z.infer<typeof shoppingItemSchema>;
export type ShoppingSettings = z.infer<typeof shoppingSettingsSchema>;
export type ShoppingList = z.infer<typeof shoppingListSchema>;
export type PriceSuggestion = z.infer<typeof priceSuggestionSchema>;

export type ShoppingItemInput = {
  /** Empty takes the product's official name. */
  name: string;
  sectionId?: string | null;
  productIdentity?: string | null;
};

export const DEFAULT_SHOPPING_SETTINGS: ShoppingSettings = {
  shopOn: null,
  weeklyDow: null,
  dealPush: true,
  stores: [],
};

export const SHOPPING_LIMITS = {
  itemName: 120,
  sectionName: 40,
  searchMin: 3,
  searchResults: 12,
  /** Deals older than this many days are not shown as today's fact. */
  dealFreshDays: 2,
  /** A deal this far below the regular price is called a super deal. */
  superDealPercent: 30,
  /** Chains the plan weighs against each other; the rest are left out. */
  planChains: 12,
} as const;

/** Lowercase without Croatian diacritics, as `price_fold` does in SQL. */
export function foldText(value: string): string {
  return value
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const CHAIN_LABELS: Record<string, string> = {
  dm: 'dm',
  ktc: 'KTC',
  ntl: 'NTL',
};

/** "konzum" -> "Konzum", "trgovina-krk" -> "Trgovina Krk". */
export function chainLabel(chain: string): string {
  return (
    CHAIN_LABELS[chain] ??
    chain
      .split(/[-_]/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

const MEASURE = /\d\s*(g|gr|dag|kg|ml|cl|dl|l|lit|m|cm)\b/i;
const NO_BRAND = new Set(['', '-', 'no brand', 'nema', 'n/a', 'ostalo']);

/** A brand worth showing. Chains fill the column with placeholders. */
export function productBrand(brand: string | undefined): string {
  const value = (brand ?? '').trim();
  return NO_BRAND.has(value.toLowerCase()) ? '' : value;
}

/**
 * The pack size, when a chain wrote one with a real unit. Chains disagree on
 * which column holds it, and "0,200 kom" says nothing, so that shows nothing.
 */
export function productSize(
  quantity: string | undefined,
  unit: string | undefined,
): string {
  const q = (quantity ?? '').trim();
  const u = (unit ?? '').trim();
  if (MEASURE.test(q)) {
    return q.toLowerCase();
  }
  if (MEASURE.test(u)) {
    // "190g,200g" lists two packs; "1,5l" is one number.
    const first = (u.split(',')[0] ?? u).trim();
    return (MEASURE.test(first) ? first : u).toLowerCase();
  }
  const amount = Number(q.replace(',', '.'));
  if (Number.isFinite(amount) && amount > 0 && MEASURE.test(`1${u}`)) {
    return `${String(amount).replace('.', ',')} ${u.toLowerCase()}`;
  }
  return '';
}

function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** True while the price list is recent enough to call its deals current. */
export function pricesFresh(pricedOn: string | null, today: string): boolean {
  return (
    pricedOn !== null &&
    pricedOn >= shiftDay(today, -SHOPPING_LIMITS.dealFreshDays)
  );
}

/** The deal to show on an item: unchecked, and from a recent price list. */
export function activeDeal(
  item: ShoppingItem,
  pricedOn: string | null,
  today: string,
): ShoppingDeal | null {
  if (item.checked || !item.deal || !pricesFresh(pricedOn, today)) {
    return null;
  }
  return item.deal;
}

/** How far below the known regular price a deal is, in whole percent. */
export function dealPercent(deal: ShoppingDeal | null | undefined): number {
  if (!deal?.regularCents || deal.regularCents <= deal.dealCents) {
    return 0;
  }
  return Math.round(
    ((deal.regularCents - deal.dealCents) * 100) / deal.regularCents,
  );
}

/** A deal worth pointing out wherever it is: the regular price is known and it is well below it. */
export function isSuperDeal(deal: ShoppingDeal | null | undefined): boolean {
  return dealPercent(deal) >= SHOPPING_LIMITS.superDealPercent;
}

export type ShoppingGroup = {
  /** Null gathers items whose section was removed or never set. */
  section: ShoppingSection | null;
  items: ShoppingItem[];
};

/**
 * Items by section, sections in the couple's order, names A to Z inside.
 * Every view reads this same grouping; `waitingOnly` is the shopping mode.
 */
export function groupShopping(
  list: Pick<ShoppingList, 'sections' | 'items'>,
  waitingOnly = false,
): ShoppingGroup[] {
  const known = new Set(list.sections.map(section => section.id));
  const bySection = new Map<string, ShoppingItem[]>();
  for (const item of list.items) {
    if (waitingOnly && item.checked) {
      continue;
    }
    const key =
      item.sectionId && known.has(item.sectionId) ? item.sectionId : '';
    const group = bySection.get(key);
    if (group) {
      group.push(item);
    } else {
      bySection.set(key, [item]);
    }
  }
  const sorted = (items: ShoppingItem[]) =>
    [...items].sort(
      (a, b) =>
        foldText(a.name).localeCompare(foldText(b.name)) ||
        a.id.localeCompare(b.id),
    );
  const groups: ShoppingGroup[] = [];
  for (const section of list.sections) {
    const items = bySection.get(section.id);
    if (items?.length) {
      groups.push({ section, items: sorted(items) });
    }
  }
  const loose = bySection.get('');
  if (loose?.length) {
    groups.push({ section: null, items: sorted(loose) });
  }
  return groups;
}

export type ShoppingSummary = {
  waiting: number;
  total: number;
  deals: number;
  /** The scheduled day, only while it is today or still ahead. */
  shopOn: string | null;
  shopToday: boolean;
};

/** What the home card and the list header say. */
export function summarizeShopping(
  list: ShoppingList,
  today: string,
): ShoppingSummary {
  const shopOn =
    list.settings?.shopOn && list.settings.shopOn >= today
      ? list.settings.shopOn
      : null;
  let waiting = 0;
  let deals = 0;
  for (const item of list.items) {
    if (!item.checked) {
      waiting += 1;
      if (activeDeal(item, list.pricedOn, today)) {
        deals += 1;
      }
    }
  }
  return {
    waiting,
    total: list.items.length,
    deals,
    shopOn,
    shopToday: shopOn === today,
  };
}

export type PlannedStore = {
  chain: string;
  cents: number;
  /** What to buy there, with the price that chain asks. */
  items: { id: string; cents: number }[];
};

/** Each item where it is cheapest, or everything in the fewest shops. */
export type PlanMode = 'cheapest' | 'fastest';

export type ShoppingPlan = {
  /** The shops to visit, the one with the largest bill first. */
  stores: PlannedStore[];
  /** One of each waiting item that has a price in those shops. */
  totalCents: number;
  /** Waiting items those shops have no price for. */
  unpriced: string[];
  /** True when the couple named the shops themselves. */
  chosen: boolean;
};

type Priced = { id: string; offers: readonly ShoppingPrice[] };

/** Each item bought where it is cheapest among the given chains. */
function assign(
  priced: readonly Priced[],
  chains: readonly string[],
): { stores: PlannedStore[]; totalCents: number; missing: string[] } {
  const allowed = new Set(chains);
  const byChain = new Map<string, PlannedStore>();
  const missing: string[] = [];
  let totalCents = 0;
  for (const item of priced) {
    let best: ShoppingPrice | null = null;
    for (const offer of item.offers) {
      if (
        allowed.has(offer.chain) &&
        (!best ||
          offer.priceCents < best.priceCents ||
          (offer.priceCents === best.priceCents && offer.chain < best.chain))
      ) {
        best = offer;
      }
    }
    if (!best) {
      missing.push(item.id);
      continue;
    }
    const store = byChain.get(best.chain) ?? {
      chain: best.chain,
      cents: 0,
      items: [],
    };
    store.cents += best.priceCents;
    store.items.push({ id: item.id, cents: best.priceCents });
    byChain.set(best.chain, store);
    totalCents += best.priceCents;
  }
  const stores = [...byChain.values()].sort(
    (a, b) => b.cents - a.cents || a.chain.localeCompare(b.chain),
  );
  return { stores, totalCents, missing };
}

/**
 * The fewest of the given chains that still have every item any of them
 * has, and among those the set with the lowest bill.
 */
function fewestStores(
  priced: readonly Priced[],
  allowed: readonly string[],
): string[] {
  const wanted = new Set(allowed);
  const count = new Map<string, number>();
  for (const item of priced) {
    for (const offer of item.offers) {
      if (wanted.has(offer.chain)) {
        count.set(offer.chain, (count.get(offer.chain) ?? 0) + 1);
      }
    }
  }
  const chains = [...count.keys()]
    .sort((a, b) => count.get(b)! - count.get(a)! || a.localeCompare(b))
    .slice(0, SHOPPING_LIMITS.planChains);
  const index = new Map(chains.map((chain, at) => [chain, at]));
  const prices = priced.map(item => {
    const row = new Array<number>(chains.length).fill(Infinity);
    for (const offer of item.offers) {
      const at = index.get(offer.chain);
      if (at !== undefined && offer.priceCents < row[at]!) {
        row[at] = offer.priceCents;
      }
    }
    return row;
  });
  const reachable = prices.filter(row =>
    row.some(cents => cents !== Infinity),
  ).length;
  type Option = { mask: number; size: number; cents: number };
  let pick: Option | null = null;
  for (let mask = 1; mask < 1 << chains.length; mask += 1) {
    let size = 0;
    for (let bits = mask; bits; bits &= bits - 1) {
      size += 1;
    }
    if (pick && size > pick.size) {
      continue;
    }
    let covered = 0;
    let cents = 0;
    for (const row of prices) {
      let low = Infinity;
      for (let at = 0; at < row.length; at += 1) {
        if (mask & (1 << at) && row[at]! < low) {
          low = row[at]!;
        }
      }
      if (low !== Infinity) {
        covered += 1;
        cents += low;
      }
    }
    if (
      covered === reachable &&
      (!pick || size < pick.size || (size === pick.size && cents < pick.cents))
    ) {
      pick = { mask, size, cents };
    }
  }
  const chosen = pick;
  return chosen ? chains.filter((_, at) => chosen.mask & (1 << at)) : [];
}

/**
 * Where to buy what still waits, and what it should come to. `chosen` are
 * the shops the couple goes to; with none every chain counts. `cheapest`
 * buys each item where it costs least, however many shops that takes;
 * `fastest` takes the fewest shops that have everything and the lowest bill
 * among those. The amount is one of each item at today's shelf price, so it
 * is an estimate.
 */
export function planShopping(
  items: readonly ShoppingItem[],
  chosen: readonly string[] = [],
  mode: PlanMode = 'fastest',
): ShoppingPlan {
  const waiting = items.filter(item => !item.checked);
  const priced: Priced[] = [];
  const unpriced: string[] = [];
  for (const item of waiting) {
    if (item.offers?.length) {
      priced.push({ id: item.id, offers: item.offers });
    } else {
      unpriced.push(item.id);
    }
  }
  const named = chosen.length > 0;
  const allowed = named
    ? chosen
    : [...new Set(priced.flatMap(item => item.offers.map(o => o.chain)))];
  const { stores, totalCents, missing } = assign(
    priced,
    mode === 'fastest' ? fewestStores(priced, allowed) : allowed,
  );
  return {
    stores,
    totalCents,
    unpriced: [...unpriced, ...missing],
    chosen: named,
  };
}

export type StoreQuote = {
  chain: string;
  /** Waiting items this chain has a price for, and what they come to. */
  items: number;
  cents: number;
};

/** What the waiting items would cost in each chain alone, cheapest first among those with the most of the list. */
export function storeQuotes(
  items: readonly ShoppingItem[],
  chains: readonly string[] = [],
): StoreQuote[] {
  const quotes = new Map<string, StoreQuote>(
    chains.map(chain => [chain, { chain, items: 0, cents: 0 }]),
  );
  for (const item of items) {
    if (item.checked) {
      continue;
    }
    const lowest = new Map<string, number>();
    for (const offer of item.offers ?? []) {
      const held = lowest.get(offer.chain);
      if (held === undefined || offer.priceCents < held) {
        lowest.set(offer.chain, offer.priceCents);
      }
    }
    for (const [chain, cents] of lowest) {
      const quote = quotes.get(chain) ?? { chain, items: 0, cents: 0 };
      quote.items += 1;
      quote.cents += cents;
      quotes.set(chain, quote);
    }
  }
  return [...quotes.values()].sort(
    (a, b) =>
      b.items - a.items || a.cents - b.cents || a.chain.localeCompare(b.chain),
  );
}

const STOP = new Set(['kom', 'pak', 'kut', 'boca', 'pvc', 'pet', 'akcija']);
const SIZE = /^\d+([.,]\d+)?(g|gr|dag|kg|ml|cl|dl|l|lit|kom|x\d+)?$/;

/** The words of a name that say what it is, without sizes and packaging. */
export function nameTokens(name: string): string[] {
  return [
    ...new Set(
      foldText(name)
        .split(/[^a-z0-9]+/)
        .filter(
          word => word.length >= 3 && !SIZE.test(word) && !STOP.has(word),
        ),
    ),
  ];
}

/**
 * Receipts cut words short: "mlij" stands for "mlijeko". Only the receipt
 * shortens, so "papir" is not "papirnati".
 */
function sameWord(wanted: string, printed: string): boolean {
  return (
    wanted === printed || (printed.length >= 4 && wanted.startsWith(printed))
  );
}

/** How many of `wanted` appear in `line`, and whether the line starts with one. */
function overlap(wanted: string[], line: string[]) {
  let hits = 0;
  for (const word of wanted) {
    if (line.some(other => sameWord(word, other))) {
      hits += 1;
    }
  }
  return {
    hits,
    leads: line[0] !== undefined && wanted.some(w => sameWord(w, line[0]!)),
  };
}

/**
 * How sure a receipt line is the item, from 0 to 1. Two shared words that
 * cover most of the item's name are enough. A one-word name needs that word
 * to open the line: "mlijeko" is "MLIJEKO 2,8% 1L", not "ČOKOLADA MLIJEKO".
 */
export function receiptLineScore(
  itemName: string,
  lineName: string,
  brand = '',
): number {
  // The brand says who made it, not what it is: "Dukat mlijeko" is not
  // "DUKAT JOGURT". It is left out of both sides before words are compared.
  const maker = new Set(nameTokens(brand));
  const wanted = nameTokens(itemName).filter(word => !maker.has(word));
  const line = nameTokens(lineName).filter(word => !maker.has(word));
  if (wanted.length === 0 || line.length === 0) {
    return 0;
  }
  const { hits, leads } = overlap(wanted, line);
  if (wanted.length === 1) {
    return hits === 1 && leads && wanted[0]!.length >= 4 ? 0.7 : 0;
  }
  const coverage = hits / wanted.length;
  return hits >= 2 && coverage >= 0.6 ? coverage : 0;
}

export type ReceiptMatch = {
  itemId: string;
  lineName: string;
  amountCents: number;
  score: number;
};

/**
 * Unchecked items this receipt most likely bought, for her to confirm. A
 * match is refused when the item is already checked, when the receipt is
 * older than the day the item ran out, when the names do not agree enough,
 * and when one line fits two items equally well.
 */
export function matchReceipt(
  items: readonly ShoppingItem[],
  receipt: {
    purchasedOn: string;
    items: readonly { name: string; amountCents: number }[];
  },
): ReceiptMatch[] {
  const open = items.filter(
    item =>
      !item.checked &&
      receipt.purchasedOn >= zagrebDay(new Date(item.uncheckedAt)),
  );
  const best = new Map<string, ReceiptMatch>();
  for (const line of receipt.items) {
    let top: ReceiptMatch | null = null;
    let tied = false;
    for (const item of open) {
      const score = Math.max(
        receiptLineScore(item.name, line.name),
        item.productName
          ? receiptLineScore(
              item.productName,
              line.name,
              productBrand(item.productBrand),
            )
          : 0,
      );
      if (score === 0) {
        continue;
      }
      if (!top || score > top.score) {
        top = {
          itemId: item.id,
          lineName: line.name,
          amountCents: line.amountCents,
          score,
        };
        tied = false;
      } else if (score === top.score) {
        tied = true;
      }
    }
    if (!top || tied) {
      continue;
    }
    const held = best.get(top.itemId);
    if (!held || top.score > held.score) {
      best.set(top.itemId, top);
    }
  }
  return [...best.values()];
}
