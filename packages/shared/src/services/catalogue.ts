import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { customers, products } from '../db/schema';
import { notFound } from '../errors';

interface CatalogueRow {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

/**
 * Products and customers are the same shape — a name, an active flag and a sort
 * order — so they share one CRUD implementation rather than two copies of it.
 * The two tables are structurally identical but are distinct types to Drizzle,
 * so this factory takes the table loosely typed and re-asserts the row shape
 * on the way out.
 */
function makeCatalogueService(table: typeof products | typeof customers, label: string) {
  const t = table as unknown as {
    id: typeof products.id;
    name: typeof products.name;
    active: typeof products.active;
    sortOrder: typeof products.sortOrder;
  };

  async function list(includeInactive: boolean): Promise<CatalogueRow[]> {
    const db = getDb();
    return db
      .select({ id: t.id, name: t.name, active: t.active, sortOrder: t.sortOrder })
      .from(table as typeof products)
      .where(includeInactive ? undefined : eq(t.active, true))
      .orderBy(asc(t.sortOrder), asc(t.name));
  }

  async function create(name: string): Promise<CatalogueRow> {
    const db = getDb();
    // New entries land at the end of the list used during daily entry.
    const [maxRow] = await db.select({ max: sql<number | null>`max(${t.sortOrder})` }).from(table as typeof products);
    const sortOrder = (maxRow?.max ?? 0) + 1;
    const [row] = await db
      .insert(table as typeof products)
      .values({ name, sortOrder } as typeof products.$inferInsert)
      .returning({ id: t.id, name: t.name, active: t.active, sortOrder: t.sortOrder });
    return row!;
  }

  async function update(
    id: string,
    patch: { name?: string; active?: boolean; sortOrder?: number },
  ): Promise<CatalogueRow> {
    const db = getDb();
    const [existing] = await db.select().from(table as typeof products).where(eq(t.id, id));
    if (!existing) throw notFound(label);

    const [row] = await db
      .update(table as typeof products)
      .set(patch)
      .where(eq(t.id, id))
      .returning({ id: t.id, name: t.name, active: t.active, sortOrder: t.sortOrder });
    return row!;
  }

  /** Soft delete: historical rows reference this and must not break. */
  async function archive(id: string): Promise<CatalogueRow> {
    const db = getDb();
    const [existing] = await db.select().from(table as typeof products).where(eq(t.id, id));
    if (!existing) throw notFound(label);
    return update(id, { active: false });
  }

  async function reorder(ids: string[]): Promise<CatalogueRow[]> {
    const db = getDb();
    for (const [index, id] of ids.entries()) {
      await db.update(table as typeof products).set({ sortOrder: index }).where(eq(t.id, id));
    }
    return list(false);
  }

  return { list, create, update, archive, reorder };
}

export const productCatalogue = makeCatalogueService(products, 'Produit');
export const customerCatalogue = makeCatalogueService(customers, 'Client');
