import { beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import {
  customers,
  products,
  productionEntries,
  receiptLines,
  receipts,
  saleEntries,
  stockAdjustments,
} from '../src/db/schema';
import { expectedOnHand, onHandByProduct, recordCount } from '../src/services/stock';
import { saveCustomerDay } from '../src/services/sales';

/**
 * The stock running balance is the one place where a silent bug corrupts real
 * numbers rather than just looking wrong, so it is covered here rather than by
 * tapping through the UI.
 */

const D1 = '2026-03-01';
const D2 = '2026-03-02';
const D3 = '2026-03-03';

let productId: string;
let otherProductId: string;
let customerId: string;

async function onHand(productId: string, asOf: string): Promise<number> {
  return (await onHandByProduct(asOf)).get(productId) ?? 0;
}

beforeEach(async () => {
  const db = getDb();
  await db.delete(receiptLines);
  await db.delete(receipts);
  await db.delete(saleEntries);
  await db.delete(stockAdjustments);
  await db.delete(productionEntries);
  await db.delete(products);
  await db.delete(customers);

  const [product] = await db.insert(products).values({ name: 'Pain', sortOrder: 0 }).returning();
  const [other] = await db.insert(products).values({ name: 'Brioche', sortOrder: 1 }).returning();
  const [customer] = await db.insert(customers).values({ name: 'Ahmed', sortOrder: 0 }).returning();

  productId = product!.id;
  otherProductId = other!.id;
  customerId = customer!.id;
});

const produce = async (day: string, quantity: number, id = productId) => {
  await getDb().insert(productionEntries).values({ day, productId: id, quantity });
};

const sell = (day: string, quantity: number, unitPriceCents = 3000, id = productId) =>
  saveCustomerDay({
    day,
    customerId,
    lines: [{ productId: id, quantity, unitPriceCents }],
  });

describe('running balance', () => {
  it('is production minus sales', async () => {
    await produce(D1, 100);
    await sell(D1, 30);

    expect(await onHand(productId, D1)).toBe(70);
  });

  it('absorbs a real count into the balance', async () => {
    await produce(D1, 100);
    await sell(D1, 30);

    const adjustment = await recordCount({ day: D1, productId, countedQuantity: 65 });

    expect(adjustment.expectedQuantity).toBe(70);
    expect(adjustment.deltaQuantity).toBe(-5);
    expect(await onHand(productId, D1)).toBe(65);
  });

  it('carries a correction forward instead of re-applying or losing it', async () => {
    await produce(D1, 100);
    await sell(D1, 30);
    await recordCount({ day: D1, productId, countedQuantity: 65 });

    await produce(D2, 40);

    // 65 corrected + 40 made, not 70 + 40 and not 65 - 5 + 40.
    expect(await onHand(productId, D2)).toBe(105);
  });

  it('applies an adjustment on its own day and not before it', async () => {
    await produce(D1, 100);
    await recordCount({ day: D2, productId, countedQuantity: 90 });

    expect(await onHand(productId, D1)).toBe(100);
    expect(await onHand(productId, D2)).toBe(90);
    expect(await onHand(productId, D3)).toBe(90);
  });

  /** Regression: the second count must measure against the first, not against
   *  the uncorrected figure — otherwise its delta absorbs the first one twice. */
  it('measures a second count on the same day against the first', async () => {
    await produce(D1, 100);

    await recordCount({ day: D1, productId, countedQuantity: 90 });
    expect(await expectedOnHand(productId, D1)).toBe(90);

    const second = await recordCount({ day: D1, productId, countedQuantity: 85 });
    expect(second.expectedQuantity).toBe(90);
    expect(second.deltaQuantity).toBe(-5);
    expect(await onHand(productId, D1)).toBe(85);
  });

  it('refuses a count that changes nothing', async () => {
    await produce(D1, 100);

    await expect(recordCount({ day: D1, productId, countedQuantity: 100 })).rejects.toThrow(
      /rien à corriger/,
    );
  });

  it('keeps products independent', async () => {
    await produce(D1, 100);
    await produce(D1, 50, otherProductId);
    await sell(D1, 30);

    expect(await onHand(productId, D1)).toBe(70);
    expect(await onHand(otherProductId, D1)).toBe(50);
  });
});
