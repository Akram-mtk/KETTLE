import { and, asc, eq, inArray, or } from 'drizzle-orm';
import type {
  CustomerDay,
  Day,
  Matrix,
  MatrixCell,
  MatrixRow,
  SalesCustomerDayInput,
  SalesDay,
} from '../types';
import { getDb } from '../db/client';
import { customers, products, saleEntries } from '../db/schema';
import { badRequest, notFound } from '../errors';
import { onHandByProduct } from './stock';
import { receiptStateForDay } from './receipts';

/**
 * A day holds at most (products x customers) rows, so it is cheaper to read the
 * day once and pivot in memory than to push per-customer aggregation into SQL.
 */
async function salesForDay(day: Day) {
  const db = getDb();
  return db.select().from(saleEntries).where(eq(saleEntries.day, day));
}

/** The Ventes hub: one row per customer with what they took today. */
export async function salesDay(day: Day): Promise<SalesDay> {
  const db = getDb();
  const [activeCustomers, sales, receiptsByCustomer] = await Promise.all([
    db.select().from(customers).where(eq(customers.active, true)).orderBy(asc(customers.sortOrder), asc(customers.name)),
    salesForDay(day),
    receiptStateForDay(day),
  ]);

  const totals = new Map<string, { quantity: number; cents: number }>();
  for (const sale of sales) {
    const row = totals.get(sale.customerId) ?? { quantity: 0, cents: 0 };
    row.quantity += sale.quantity;
    row.cents += sale.quantity * sale.unitPriceCents;
    totals.set(sale.customerId, row);
  }

  // Inactive customers still appear if they traded today, so history stays visible.
  const tradedIds = [...totals.keys()].filter((id) => !activeCustomers.some((c) => c.id === id));
  const extra = tradedIds.length
    ? await db
        .select()
        .from(customers)
        .where(inArray(customers.id, tradedIds))
        .orderBy(asc(customers.sortOrder), asc(customers.name))
    : [];

  const rows = [...activeCustomers, ...extra].map((customer) => {
    const total = totals.get(customer.id) ?? { quantity: 0, cents: 0 };
    const receipt = receiptsByCustomer.get(customer.id);
    return {
      customerId: customer.id,
      customerName: customer.name,
      totalQuantity: total.quantity,
      totalCents: total.cents,
      receipt: receipt
        ? { id: receipt.id, number: receipt.id, status: receipt.status, outOfSync: receipt.outOfSync }
        : null,
    };
  });

  return {
    day,
    customers: rows,
    totalQuantity: rows.reduce((s, r) => s + r.totalQuantity, 0),
    totalCents: rows.reduce((s, r) => s + r.totalCents, 0),
  };
}

/** The per-customer entry sheet: every product, with what this customer took. */
export async function customerDay(day: Day, customerId: string): Promise<CustomerDay> {
  const db = getDb();
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) throw notFound('Client');

  const sales = await db
    .select()
    .from(saleEntries)
    .where(and(eq(saleEntries.day, day), eq(saleEntries.customerId, customerId)));
  const byProduct = new Map(sales.map((s) => [s.productId, s]));
  const soldProductIds = [...byProduct.keys()];

  const productRows = await db
    .select()
    .from(products)
    .where(
      soldProductIds.length
        ? or(eq(products.active, true), inArray(products.id, soldProductIds))
        : eq(products.active, true),
    )
    .orderBy(asc(products.sortOrder), asc(products.name));

  const [onHand, receiptsByCustomer] = await Promise.all([onHandByProduct(day), receiptStateForDay(day)]);
  const receipt = receiptsByCustomer.get(customerId);

  const lines = productRows.map((product) => {
    const sale = byProduct.get(product.id);
    const quantity = sale?.quantity ?? 0;
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPriceCents: sale?.unitPriceCents ?? 0,
      // Add back what this customer already took, so the sheet can show live
      // availability as onHandBefore minus whatever is currently typed.
      onHandBefore: (onHand.get(product.id) ?? 0) + quantity,
    };
  });

  return {
    day,
    customerId,
    customerName: customer.name,
    lines,
    totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    totalCents: lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0),
    receipt: receipt
      ? { id: receipt.id, number: receipt.id, status: receipt.status, outOfSync: receipt.outOfSync }
      : null,
  };
}

/** The main write: a customer's whole day, saved as one sequential batch. */
export async function saveCustomerDay(input: SalesCustomerDayInput): Promise<CustomerDay> {
  const db = getDb();
  const { day, customerId, lines } = input;

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) throw notFound('Client');

  const productIds = lines.map((l) => l.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw badRequest('Le même produit apparaît deux fois dans la saisie.');
  }

  if (productIds.length) {
    const known = await db.select({ id: products.id }).from(products).where(inArray(products.id, productIds));
    if (known.length !== new Set(productIds).size) throw badRequest('Produit inconnu dans la saisie.');
  }

  const keep = lines.filter((l) => l.quantity > 0);
  const drop = lines.filter((l) => l.quantity === 0).map((l) => l.productId);

  if (drop.length) {
    await db
      .delete(saleEntries)
      .where(
        and(eq(saleEntries.day, day), eq(saleEntries.customerId, customerId), inArray(saleEntries.productId, drop)),
      );
  }

  for (const line of keep) {
    await db
      .insert(saleEntries)
      .values({
        day,
        customerId,
        productId: line.productId,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
      })
      .onConflictDoUpdate({
        target: [saleEntries.day, saleEntries.productId, saleEntries.customerId],
        set: { quantity: line.quantity, unitPriceCents: line.unitPriceCents },
      });
  }

  return customerDay(day, customerId);
}

/** The read-only products x customers grid. */
export async function matrix(day: Day): Promise<Matrix> {
  const db = getDb();
  const [sales, activeProducts, activeCustomers] = await Promise.all([
    salesForDay(day),
    db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(customers).where(eq(customers.active, true)).orderBy(asc(customers.sortOrder), asc(customers.name)),
  ]);

  const soldProductIds = [...new Set(sales.map((s) => s.productId))];
  const soldCustomerIds = [...new Set(sales.map((s) => s.customerId))];

  const missingProductIds = soldProductIds.filter((id) => !activeProducts.some((p) => p.id === id));
  const missingCustomerIds = soldCustomerIds.filter((id) => !activeCustomers.some((c) => c.id === id));

  const [extraProducts, extraCustomers] = await Promise.all([
    missingProductIds.length
      ? db
          .select()
          .from(products)
          .where(inArray(products.id, missingProductIds))
          .orderBy(asc(products.sortOrder), asc(products.name))
      : Promise.resolve([]),
    missingCustomerIds.length
      ? db
          .select()
          .from(customers)
          .where(inArray(customers.id, missingCustomerIds))
          .orderBy(asc(customers.sortOrder), asc(customers.name))
      : Promise.resolve([]),
  ]);

  const productRows = [...activeProducts, ...extraProducts];
  const customerRows = [...activeCustomers, ...extraCustomers];

  const cells = new Map<string, MatrixCell>();
  for (const sale of sales) {
    cells.set(`${sale.productId}|${sale.customerId}`, {
      quantity: sale.quantity,
      totalCents: sale.quantity * sale.unitPriceCents,
    });
  }

  const columnTotals: Record<string, MatrixCell> = {};
  for (const customer of customerRows) columnTotals[customer.id] = { quantity: 0, totalCents: 0 };

  const rows: MatrixRow[] = productRows.map((product) => {
    const rowCells: Record<string, MatrixCell> = {};
    let totalQuantity = 0;
    let totalCents = 0;

    for (const customer of customerRows) {
      const cell = cells.get(`${product.id}|${customer.id}`);
      if (!cell) continue;
      rowCells[customer.id] = cell;
      totalQuantity += cell.quantity;
      totalCents += cell.totalCents;
      const column = columnTotals[customer.id];
      if (column) {
        column.quantity += cell.quantity;
        column.totalCents += cell.totalCents;
      }
    }

    return {
      productId: product.id,
      productName: product.name,
      cells: rowCells,
      totalQuantity,
      totalCents,
    };
  });

  return {
    day,
    customers: customerRows.map((c) => ({ id: c.id, name: c.name, active: c.active, sortOrder: c.sortOrder })),
    rows,
    columnTotals,
    totalQuantity: rows.reduce((s, r) => s + r.totalQuantity, 0),
    totalCents: rows.reduce((s, r) => s + r.totalCents, 0),
  };
}
