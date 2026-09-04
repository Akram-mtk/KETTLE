import { and, asc, eq, lte, sql } from 'drizzle-orm';
import type { Day } from '../days';
import type { StockRow } from '../types';
import { getDb } from '../db/client';
import { products, productionEntries, saleEntries, stockAdjustments } from '../db/schema';
import { badRequest, notFound } from '../errors';

export interface StockTotals {
  produced: number;
  sold: number;
  adjusted: number;
  onHand: number;
}

const EMPTY: StockTotals = { produced: 0, sold: 0, adjusted: 0, onHand: 0 };

/**
 * The running balance, per product, up to and including `asOf`:
 *
 *   onHand = Σ production − Σ sales + Σ adjustment deltas
 *
 * Adjustments store a *delta* rather than the counted figure precisely so that
 * this stays one uniform sum — and so every correction survives in history
 * instead of overwriting the number it corrected.
 */
export async function stockByProduct(asOf?: Day): Promise<Map<string, StockTotals>> {
  const db = getDb();

  const [produced, sold, adjusted] = await Promise.all([
    db
      .select({
        productId: productionEntries.productId,
        total: sql<number>`coalesce(sum(${productionEntries.quantity}), 0)`,
      })
      .from(productionEntries)
      .where(asOf ? lte(productionEntries.day, asOf) : undefined)
      .groupBy(productionEntries.productId),
    db
      .select({
        productId: saleEntries.productId,
        total: sql<number>`coalesce(sum(${saleEntries.quantity}), 0)`,
      })
      .from(saleEntries)
      .where(asOf ? lte(saleEntries.day, asOf) : undefined)
      .groupBy(saleEntries.productId),
    db
      .select({
        productId: stockAdjustments.productId,
        total: sql<number>`coalesce(sum(${stockAdjustments.deltaQuantity}), 0)`,
      })
      .from(stockAdjustments)
      .where(asOf ? lte(stockAdjustments.day, asOf) : undefined)
      .groupBy(stockAdjustments.productId),
  ]);

  const totals = new Map<string, StockTotals>();
  const get = (productId: string): StockTotals => {
    let row = totals.get(productId);
    if (!row) {
      row = { ...EMPTY };
      totals.set(productId, row);
    }
    return row;
  };

  for (const p of produced) get(p.productId).produced = Number(p.total);
  for (const s of sold) get(s.productId).sold = Number(s.total);
  for (const a of adjusted) get(a.productId).adjusted = Number(a.total);

  for (const row of totals.values()) {
    row.onHand = row.produced - row.sold + row.adjusted;
  }

  return totals;
}

export async function onHandByProduct(asOf?: Day): Promise<Map<string, number>> {
  const totals = await stockByProduct(asOf);
  return new Map([...totals].map(([id, t]) => [id, t.onHand]));
}

/** Full stock table for the Stock screen, one row per active product. */
export async function stockRows(asOf?: Day): Promise<StockRow[]> {
  const db = getDb();
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.sortOrder), asc(products.name)),
    stockByProduct(asOf),
  ]);

  return rows.map((product) => {
    const t = totals.get(product.id) ?? EMPTY;
    return {
      productId: product.id,
      productName: product.name,
      produced: t.produced,
      sold: t.sold,
      adjusted: t.adjusted,
      onHand: t.onHand,
    };
  });
}

/**
 * What the system believes is on hand at the moment a count is taken on `day` —
 * i.e. exactly `onHand(asOf = day)`.
 *
 * Every earlier correction counts, including ones made the same day: a count of
 * 60 this morning followed by a count of 55 this afternoon must measure the
 * second against 60, not against the uncorrected figure. Excluding same-day
 * adjustments here would make the second delta absorb the first one twice.
 */
export async function expectedOnHand(productId: string, day: Day): Promise<number> {
  const db = getDb();
  const [[produced], [sold], [adjusted]] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${productionEntries.quantity}), 0)` })
      .from(productionEntries)
      .where(and(eq(productionEntries.productId, productId), lte(productionEntries.day, day))),
    db
      .select({ total: sql<number>`coalesce(sum(${saleEntries.quantity}), 0)` })
      .from(saleEntries)
      .where(and(eq(saleEntries.productId, productId), lte(saleEntries.day, day))),
    db
      .select({ total: sql<number>`coalesce(sum(${stockAdjustments.deltaQuantity}), 0)` })
      .from(stockAdjustments)
      .where(and(eq(stockAdjustments.productId, productId), lte(stockAdjustments.day, day))),
  ]);

  return Number(produced?.total ?? 0) - Number(sold?.total ?? 0) + Number(adjusted?.total ?? 0);
}

/** Record a real stock count and absorb the difference. */
export async function recordCount(input: {
  day: Day;
  productId: string;
  countedQuantity: number;
  reason?: string;
}) {
  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, input.productId));
  if (!product) throw notFound('Produit');

  const expectedQuantity = await expectedOnHand(input.productId, input.day);
  const deltaQuantity = input.countedQuantity - expectedQuantity;

  if (deltaQuantity === 0) {
    throw badRequest('Le comptage correspond déjà au stock attendu — rien à corriger.');
  }

  const [adjustment] = await db
    .insert(stockAdjustments)
    .values({
      day: input.day,
      productId: input.productId,
      countedQuantity: input.countedQuantity,
      expectedQuantity,
      deltaQuantity,
      reason: input.reason?.trim() || null,
    })
    .returning();

  return adjustment!;
}
