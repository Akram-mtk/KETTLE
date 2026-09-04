import { and, asc, eq, inArray, or } from 'drizzle-orm';
import type { Day } from '../days';
import type { ProductionDay } from '../types';
import { getDb } from '../db/client';
import { products, productionEntries } from '../db/schema';
import { badRequest } from '../errors';
import { onHandByProduct } from './stock';

export async function readProductionDay(day: Day): Promise<ProductionDay> {
  const db = getDb();
  const entries = await db.select().from(productionEntries).where(eq(productionEntries.day, day));
  const byProduct = new Map(entries.map((e) => [e.productId, e]));
  const productIds = [...byProduct.keys()];

  const rows = await db
    .select()
    .from(products)
    .where(
      productIds.length
        ? or(eq(products.active, true), inArray(products.id, productIds))
        : eq(products.active, true),
    )
    .orderBy(asc(products.sortOrder), asc(products.name));

  const onHand = await onHandByProduct(day);

  return {
    day,
    rows: rows.map((product) => ({
      productId: product.id,
      productName: product.name,
      quantity: byProduct.get(product.id)?.quantity ?? 0,
      onHand: onHand.get(product.id) ?? 0,
    })),
  };
}

/**
 * The whole day in one write, matching the single save button on the screen:
 * no per-keystroke traffic and no half-saved day.
 */
export async function saveProductionDay(input: {
  day: Day;
  lines: { productId: string; quantity: number }[];
}): Promise<ProductionDay> {
  const db = getDb();
  const { day, lines } = input;

  const productIds = lines.map((l) => l.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw badRequest('Le même produit apparaît deux fois dans la saisie.');
  }

  if (productIds.length) {
    const known = await db.select({ id: products.id }).from(products).where(inArray(products.id, productIds));
    if (known.length !== productIds.length) throw badRequest('Produit inconnu dans la saisie.');
  }

  const keep = lines.filter((l) => l.quantity > 0);
  const drop = lines.filter((l) => l.quantity === 0).map((l) => l.productId);

  if (drop.length) {
    await db
      .delete(productionEntries)
      .where(and(eq(productionEntries.day, day), inArray(productionEntries.productId, drop)));
  }

  for (const line of keep) {
    await db
      .insert(productionEntries)
      .values({ day, productId: line.productId, quantity: line.quantity })
      .onConflictDoUpdate({
        target: [productionEntries.day, productionEntries.productId],
        set: { quantity: line.quantity },
      });
  }

  return readProductionDay(day);
}
