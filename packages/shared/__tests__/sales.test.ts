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
import { onHandByProduct } from '../src/services/stock';
import { customerDay, saveCustomerDay } from '../src/services/sales';
import { salesCustomerDaySchema } from '../src/schemas';

const D1 = '2026-03-01';
const D2 = '2026-03-02';

let productId: string;
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
  const [customer] = await db.insert(customers).values({ name: 'Ahmed', sortOrder: 0 }).returning();

  productId = product!.id;
  customerId = customer!.id;
});

const produce = async (day: string, quantity: number, id = productId) => {
  await getDb().insert(productionEntries).values({ day, productId: id, quantity });
};

const sell = (day: string, quantity: number, unitPriceCents = 3000, id = productId) =>
  saveCustomerDay({ day, customerId, lines: [{ productId: id, quantity, unitPriceCents }] });

describe('customer day', () => {
  it('returns stock when a line is zeroed', async () => {
    await produce(D1, 100);
    await sell(D1, 30);
    expect(await onHand(productId, D1)).toBe(70);

    await sell(D1, 0);

    expect(await onHand(productId, D1)).toBe(100);
    const remaining = await getDb().select().from(saleEntries);
    expect(remaining.filter((s) => s.day === D1 && s.customerId === customerId)).toHaveLength(0);
  });

  it('shows availability that adds back what this customer already took', async () => {
    await produce(D1, 100);
    await sell(D1, 30);

    const day = await customerDay(D1, customerId);
    const line = day.lines.find((l) => l.productId === productId);

    // 70 left on the shelf, but this sheet may re-allocate its own 30.
    expect(line?.quantity).toBe(30);
    expect(line?.onHandBefore).toBe(100);
  });

  it('keeps a different price on each day rather than rewriting history', async () => {
    await produce(D1, 100);
    await produce(D2, 100);
    await sell(D1, 10, 3000);
    await sell(D2, 10, 3500);

    const [first, second] = await Promise.all([customerDay(D1, customerId), customerDay(D2, customerId)]);

    expect(first.lines.find((l) => l.productId === productId)?.unitPriceCents).toBe(3000);
    expect(second.lines.find((l) => l.productId === productId)?.unitPriceCents).toBe(3500);
    expect(first.totalCents).toBe(30_000);
    expect(second.totalCents).toBe(35_000);
  });

  it('rejects a quantity with no price', () => {
    const result = salesCustomerDaySchema.safeParse({
      day: D1,
      customerId,
      lines: [{ productId, quantity: 5, unitPriceCents: 0 }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Prix requis');
  });

  it('rejects the same product appearing twice in one save', async () => {
    await expect(
      saveCustomerDay({
        day: D1,
        customerId,
        lines: [
          { productId, quantity: 5, unitPriceCents: 3000 },
          { productId, quantity: 2, unitPriceCents: 3000 },
        ],
      }),
    ).rejects.toThrow(/apparaît deux fois/);
  });

  it('rejects an unknown product id', async () => {
    await expect(
      saveCustomerDay({
        day: D1,
        customerId,
        lines: [{ productId: 'does-not-exist', quantity: 5, unitPriceCents: 3000 }],
      }),
    ).rejects.toThrow(/inconnu/);
  });

  it('rejects an unknown customer id', async () => {
    await expect(
      saveCustomerDay({
        day: D1,
        customerId: 'does-not-exist',
        lines: [{ productId, quantity: 5, unitPriceCents: 3000 }],
      }),
    ).rejects.toThrow(/introuvable/);
  });
});
