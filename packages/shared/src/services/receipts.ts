import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Day, Receipt, ReceiptStatus, ReceiptSummary } from '../types';
import { getDb } from '../db/client';
import { customers, products, receiptLines, receipts, saleEntries } from '../db/schema';
import { badRequest, conflict, notFound } from '../errors';

interface LineLike {
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

/**
 * A receipt handed to a customer is a document, not a live view: it is a frozen
 * snapshot. Rather than silently rewriting an issued receipt when the underlying
 * sales change, we detect the drift and let the UI say so.
 */
function fingerprint(lines: LineLike[]): string {
  return lines
    .map((l) => `${l.productId}:${l.quantity}:${l.unitPriceCents}`)
    .sort()
    .join('|');
}

export interface ReceiptState {
  id: number;
  status: ReceiptStatus;
  totalCents: number;
  outOfSync: boolean;
}

/** Receipt state for every customer that has one on `day`, keyed by customerId. */
export async function receiptStateForDay(day: Day): Promise<Map<string, ReceiptState>> {
  const db = getDb();
  const [dayReceipts, sales] = await Promise.all([
    db.select().from(receipts).where(eq(receipts.day, day)),
    db.select().from(saleEntries).where(eq(saleEntries.day, day)),
  ]);

  if (dayReceipts.length === 0) return new Map();

  const receiptIds = dayReceipts.map((r) => r.id);
  const lines = await db.select().from(receiptLines).where(inArray(receiptLines.receiptId, receiptIds));

  const linesByReceipt = new Map<number, LineLike[]>();
  for (const line of lines) {
    const list = linesByReceipt.get(line.receiptId) ?? [];
    list.push(line);
    linesByReceipt.set(line.receiptId, list);
  }

  const liveByCustomer = new Map<string, LineLike[]>();
  for (const sale of sales) {
    const list = liveByCustomer.get(sale.customerId) ?? [];
    list.push(sale);
    liveByCustomer.set(sale.customerId, list);
  }

  return new Map(
    dayReceipts.map((receipt) => [
      receipt.customerId,
      {
        id: receipt.id,
        status: receipt.status as ReceiptStatus,
        totalCents: receipt.totalCents,
        outOfSync:
          fingerprint(linesByReceipt.get(receipt.id) ?? []) !==
          fingerprint(liveByCustomer.get(receipt.customerId) ?? []),
      },
    ]),
  );
}

/**
 * Build (or rebuild) a customer's receipt for a day from their sales.
 * Both operands of the line total are integers, so the arithmetic is exact.
 */
export async function generateReceipt(day: Day, customerId: string): Promise<Receipt> {
  const db = getDb();
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) throw notFound('Client');

  const sold = await db
    .select({ sale: saleEntries, product: products })
    .from(saleEntries)
    .innerJoin(products, eq(saleEntries.productId, products.id))
    .where(and(eq(saleEntries.day, day), eq(saleEntries.customerId, customerId)))
    .orderBy(products.sortOrder, products.name);

  if (sold.length === 0) {
    throw badRequest('Aucune vente pour ce client à cette date — rien à facturer.');
  }

  const lines = sold.map(({ sale }) => ({
    productId: sale.productId,
    quantity: sale.quantity,
    unitPriceCents: sale.unitPriceCents,
    lineTotalCents: sale.quantity * sale.unitPriceCents,
  }));
  const totalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);

  const [existing] = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.day, day), eq(receipts.customerId, customerId)));

  let receiptId: number;
  if (existing) {
    await db.delete(receiptLines).where(eq(receiptLines.receiptId, existing.id));
    // Regenerating only refreshes the snapshot; payment status and date are untouched.
    await db.update(receipts).set({ totalCents }).where(eq(receipts.id, existing.id));
    receiptId = existing.id;
  } else {
    const [created] = await db.insert(receipts).values({ day, customerId, status: 'UNPAID', totalCents }).returning();
    receiptId = created!.id;
  }

  await db.insert(receiptLines).values(lines.map((l) => ({ ...l, receiptId })));

  return getReceipt(receiptId);
}

export async function markReceiptPaid(id: number): Promise<Receipt> {
  const db = getDb();
  const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
  if (!receipt) throw notFound('Reçu');
  if (receipt.status === 'PAID') throw conflict('Ce reçu est déjà payé.');

  await db.update(receipts).set({ status: 'PAID', paidAt: new Date() }).where(eq(receipts.id, id));

  return getReceipt(id);
}

export async function getReceipt(id: number): Promise<Receipt> {
  const db = getDb();
  const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
  if (!receipt) throw notFound('Reçu');

  const [customer] = await db.select().from(customers).where(eq(customers.id, receipt.customerId));

  const lineRows = await db
    .select({ line: receiptLines, product: products })
    .from(receiptLines)
    .innerJoin(products, eq(receiptLines.productId, products.id))
    .where(eq(receiptLines.receiptId, id));

  const sales = await db
    .select()
    .from(saleEntries)
    .where(and(eq(saleEntries.day, receipt.day), eq(saleEntries.customerId, receipt.customerId)));

  return {
    id: receipt.id,
    number: receipt.id,
    day: receipt.day,
    customerId: receipt.customerId,
    customerName: customer!.name,
    status: receipt.status as ReceiptStatus,
    totalCents: receipt.totalCents,
    paidAt: receipt.paidAt ? receipt.paidAt.toISOString() : null,
    outOfSync: fingerprint(lineRows.map((r) => r.line)) !== fingerprint(sales),
    lines: lineRows.map(({ line, product }) => ({
      productId: line.productId,
      productName: product.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      lineTotalCents: line.lineTotalCents,
    })),
  };
}

export async function listReceipts(filter: { day?: Day; customerId?: string }): Promise<ReceiptSummary[]> {
  const db = getDb();
  const conditions = [
    filter.day ? eq(receipts.day, filter.day) : undefined,
    filter.customerId ? eq(receipts.customerId, filter.customerId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const rows = await db
    .select({ receipt: receipts, customer: customers })
    .from(receipts)
    .innerJoin(customers, eq(receipts.customerId, customers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(receipts.day), desc(receipts.id))
    .limit(200);

  const days = [...new Set(rows.map((r) => r.receipt.day))];
  const sales = days.length ? await db.select().from(saleEntries).where(inArray(saleEntries.day, days)) : [];

  const liveByKey = new Map<string, LineLike[]>();
  for (const sale of sales) {
    const key = `${sale.day}|${sale.customerId}`;
    const list = liveByKey.get(key) ?? [];
    list.push(sale);
    liveByKey.set(key, list);
  }

  const receiptIds = rows.map((r) => r.receipt.id);
  const allLines = receiptIds.length
    ? await db.select().from(receiptLines).where(inArray(receiptLines.receiptId, receiptIds))
    : [];
  const linesByReceipt = new Map<number, LineLike[]>();
  for (const line of allLines) {
    const list = linesByReceipt.get(line.receiptId) ?? [];
    list.push(line);
    linesByReceipt.set(line.receiptId, list);
  }

  return rows.map(({ receipt, customer }) => ({
    id: receipt.id,
    number: receipt.id,
    day: receipt.day,
    customerId: receipt.customerId,
    customerName: customer.name,
    status: receipt.status as ReceiptStatus,
    totalCents: receipt.totalCents,
    paidAt: receipt.paidAt ? receipt.paidAt.toISOString() : null,
    outOfSync:
      fingerprint(linesByReceipt.get(receipt.id) ?? []) !==
      fingerprint(liveByKey.get(`${receipt.day}|${receipt.customerId}`) ?? []),
  }));
}
