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
import { saveCustomerDay } from '../src/services/sales';
import { generateReceipt, getReceipt, issueReceipt, listReceipts } from '../src/services/receipts';

const D1 = '2026-03-01';

let productId: string;
let customerId: string;

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

const sell = (quantity: number, unitPriceCents = 3000) =>
  saveCustomerDay({ day: D1, customerId, lines: [{ productId, quantity, unitPriceCents }] });

describe('receipts', () => {
  it('refuses to generate a receipt with no sales', async () => {
    await expect(generateReceipt(D1, customerId)).rejects.toThrow(/rien à facturer/);
  });

  it('generates a frozen snapshot matching the day total', async () => {
    await sell(10, 3000);

    const receipt = await generateReceipt(D1, customerId);

    expect(receipt.status).toBe('DRAFT');
    expect(receipt.totalCents).toBe(30_000);
    expect(receipt.lines).toHaveLength(1);
    expect(receipt.outOfSync).toBe(false);
  });

  it('flags a receipt out of sync once the underlying sale changes', async () => {
    await sell(10, 3000);
    const receipt = await generateReceipt(D1, customerId);
    await issueReceipt(receipt.id);

    await sell(15, 3000);

    const reloaded = await getReceipt(receipt.id);
    expect(reloaded.outOfSync).toBe(true);
    expect(reloaded.totalCents).toBe(30_000); // frozen — unchanged by the new sale

    const list = await listReceipts({ day: D1 });
    expect(list.find((r) => r.id === receipt.id)?.outOfSync).toBe(true);
  });

  it('regenerating rebuilds the snapshot and clears the drift', async () => {
    await sell(10, 3000);
    const receipt = await generateReceipt(D1, customerId);
    await issueReceipt(receipt.id);

    await sell(15, 3000);
    const regenerated = await generateReceipt(D1, customerId);

    expect(regenerated.id).toBe(receipt.id);
    expect(regenerated.totalCents).toBe(45_000);
    expect(regenerated.outOfSync).toBe(false);
    // Regenerating an already-issued receipt re-freezes it rather than reverting to DRAFT.
    expect(regenerated.status).toBe('ISSUED');
    expect(regenerated.issuedAt).not.toBeNull();
  });

  it('issuing is one-way and rejects a second issue', async () => {
    await sell(10, 3000);
    const receipt = await generateReceipt(D1, customerId);

    const issued = await issueReceipt(receipt.id);
    expect(issued.status).toBe('ISSUED');

    await expect(issueReceipt(receipt.id)).rejects.toThrow(/déjà émis/);
  });
});
