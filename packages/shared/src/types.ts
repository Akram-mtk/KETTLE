import type { Day } from './days';

/* ── Catalogue ───────────────────────────────────────────────────────── */

export interface Product {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Customer {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

/* ── Production ──────────────────────────────────────────────────────── */

export interface ProductionRow {
  productId: string;
  productName: string;
  quantity: number;
  onHand: number;
}

export interface ProductionDay {
  day: Day;
  rows: ProductionRow[];
}

/* ── Stock ───────────────────────────────────────────────────────────── */

export interface StockRow {
  productId: string;
  productName: string;
  produced: number;
  sold: number;
  adjusted: number;
  onHand: number;
}

export interface StockAdjustment {
  id: string;
  day: Day;
  productId: string;
  productName: string;
  countedQuantity: number;
  expectedQuantity: number;
  deltaQuantity: number;
  reason: string | null;
  createdAt: string;
}

/* ── Ventes ──────────────────────────────────────────────────────────── */

export type ReceiptStatus = 'UNPAID' | 'PAID';

/** One row of the Ventes hub: what this customer took on this day. */
export interface CustomerDaySummary {
  customerId: string;
  customerName: string;
  totalQuantity: number;
  totalCents: number;
  receipt: { id: number; number: number; status: ReceiptStatus; outOfSync: boolean } | null;
}

export interface SalesDay {
  day: Day;
  customers: CustomerDaySummary[];
  totalQuantity: number;
  totalCents: number;
}

/** One product line inside the per-customer entry sheet. */
export interface CustomerDayLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  /** Stock on hand for this product, INCLUDING what this customer already took. */
  onHandBefore: number;
}

export interface CustomerDay {
  day: Day;
  customerId: string;
  customerName: string;
  lines: CustomerDayLine[];
  totalQuantity: number;
  totalCents: number;
  receipt: { id: number; number: number; status: ReceiptStatus; outOfSync: boolean } | null;
}

/* ── Tableau (products × customers) ──────────────────────────────────── */

export interface MatrixCell {
  quantity: number;
  totalCents: number;
}

export interface MatrixRow {
  productId: string;
  productName: string;
  /** Keyed by customerId; absent means nothing sold. */
  cells: Record<string, MatrixCell>;
  totalQuantity: number;
  totalCents: number;
}

export interface Matrix {
  day: Day;
  customers: Customer[];
  rows: MatrixRow[];
  columnTotals: Record<string, MatrixCell>;
  totalQuantity: number;
  totalCents: number;
}

/* ── Reçus ───────────────────────────────────────────────────────────── */

export interface ReceiptLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ReceiptSummary {
  /** The receipt number: SQLite cannot autoincrement a non-id column, so the id IS the number. */
  id: number;
  number: number;
  day: Day;
  customerId: string;
  customerName: string;
  status: ReceiptStatus;
  totalCents: number;
  paidAt: string | null;
  outOfSync: boolean;
}

export interface Receipt extends ReceiptSummary {
  lines: ReceiptLine[];
}

/* ── Errors ──────────────────────────────────────────────────────────── */

export interface ApiError {
  error: string;
  /** Field-level messages, keyed by dotted path, for form display. */
  fields?: Record<string, string>;
}
