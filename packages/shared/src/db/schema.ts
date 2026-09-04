import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

/**
 * Two conventions apply throughout:
 *   * Money is an Int number of centimes. SQLite has no decimal type.
 *   * A "day" is a String YYYY-MM-DD, never a timestamp. This app is keyed by
 *     calendar day, and a timestamp is a UTC epoch value that shifts entries
 *     into the wrong day depending on the timezone.
 * Quantities are Int: products carry no unit, so a quantity is a plain count.
 */

const id = () => text('id').primaryKey().$defaultFn(() => nanoid());

export const products = sqliteTable('products', {
  id: id(),
  name: text('name').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const customers = sqliteTable('customers', {
  id: id(),
  name: text('name').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** How much of a product was made on a given day. */
export const productionEntries = sqliteTable(
  'production_entries',
  {
    id: id(),
    day: text('day').notNull(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    note: text('note'),
  },
  (t) => [
    uniqueIndex('production_entries_day_product_id').on(t.day, t.productId),
    index('production_entries_day').on(t.day),
  ],
);

/** One cell of the products x customers grid. */
export const saleEntries = sqliteTable(
  'sale_entries',
  {
    id: id(),
    day: text('day').notNull(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    quantity: integer('quantity').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
  },
  (t) => [
    uniqueIndex('sale_entries_day_product_id_customer_id').on(t.day, t.productId, t.customerId),
    index('sale_entries_day').on(t.day),
    index('sale_entries_day_customer_id').on(t.day, t.customerId),
  ],
);

/**
 * A real stock count that overrides what the system believed.
 * deltaQuantity is what actually moves the running balance; counted/expected
 * are kept so a discrepancy can be explained later, not just observed.
 */
export const stockAdjustments = sqliteTable(
  'stock_adjustments',
  {
    id: id(),
    day: text('day').notNull(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    countedQuantity: integer('counted_quantity').notNull(),
    expectedQuantity: integer('expected_quantity').notNull(),
    deltaQuantity: integer('delta_quantity').notNull(),
    reason: text('reason'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('stock_adjustments_day').on(t.day), index('stock_adjustments_product_id').on(t.productId)],
);

/**
 * `id` doubles as the human-readable receipt number ("Reçu N°7"): SQLite
 * cannot autoincrement a non-id column, and the number IS the identity.
 */
export const receipts = sqliteTable(
  'receipts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    day: text('day').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    status: text('status').notNull().default('UNPAID'),
    totalCents: integer('total_cents').notNull(),
    // Column is still `issued_at` at the DB level; it now records the payment date.
    paidAt: integer('issued_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('receipts_day_customer_id').on(t.day, t.customerId), index('receipts_day').on(t.day)],
);

/** Snapshot of a customer's day, frozen when the receipt is issued. */
export const receiptLines = sqliteTable(
  'receipt_lines',
  {
    id: id(),
    receiptId: integer('receipt_id')
      .notNull()
      .references(() => receipts.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (t) => [index('receipt_lines_receipt_id').on(t.receiptId)],
);
