import { z } from 'zod';
import { DAY_RE } from './days';

export const daySchema = z.string().regex(DAY_RE, 'Date invalide (AAAA-MM-JJ)');
export const idSchema = z.string().min(1, 'Identifiant requis');
export const qtySchema = z.number().int('Quantité entière requise').min(0).max(1_000_000);
export const centsSchema = z.number().int().min(0).max(1_000_000_000);
const nameSchema = z.string().trim().min(1, 'Nom requis').max(80, 'Nom trop long');

/* ── Produits ────────────────────────────────────────────────────────── */

export const productCreateSchema = z.object({ name: nameSchema });

export const productUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Aucune modification');

/* ── Clients ─────────────────────────────────────────────────────────── */

export const customerCreateSchema = z.object({ name: nameSchema });

export const customerUpdateSchema = productUpdateSchema;

/* ── Production ──────────────────────────────────────────────────────── */

export const productionLineSchema = z.object({
  productId: idSchema,
  quantity: qtySchema,
});

export const productionDaySchema = z.object({
  day: daySchema,
  lines: z.array(productionLineSchema).max(500),
});

/* ── Ventes ──────────────────────────────────────────────────────────── */

/**
 * A sale line. quantity == 0 means "remove this line".
 * A quantity with no price is rejected: a zero-price sale would silently
 * understate the day's takings, which is the one mistake worth blocking.
 */
export const saleLineSchema = z
  .object({
    productId: idSchema,
    quantity: qtySchema,
    unitPriceCents: centsSchema,
  })
  .refine((l) => l.quantity === 0 || l.unitPriceCents > 0, {
    message: 'Prix requis',
    path: ['unitPriceCents'],
  });

export const salesCustomerDaySchema = z.object({
  day: daySchema,
  customerId: idSchema,
  lines: z.array(saleLineSchema).max(500),
});

/* ── Stock ───────────────────────────────────────────────────────────── */

export const adjustmentCreateSchema = z.object({
  day: daySchema,
  productId: idSchema,
  countedQuantity: qtySchema,
  reason: z.string().trim().max(200).optional(),
});

/* ── Reçus ───────────────────────────────────────────────────────────── */

export const receiptGenerateSchema = z.object({
  day: daySchema,
  customerId: idSchema,
});

/* ── Query params ────────────────────────────────────────────────────── */

export const dayQuerySchema = z.object({ day: daySchema });
export const asOfQuerySchema = z.object({ asOf: daySchema.optional() });
export const customerDayQuerySchema = z.object({ day: daySchema, customerId: idSchema });

/* ── Inferred input types ────────────────────────────────────────────── */

export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type CustomerCreate = z.infer<typeof customerCreateSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
export type ProductionDayInput = z.infer<typeof productionDaySchema>;
export type SaleLineInput = z.infer<typeof saleLineSchema>;
export type SalesCustomerDayInput = z.infer<typeof salesCustomerDaySchema>;
export type AdjustmentCreate = z.infer<typeof adjustmentCreateSchema>;
export type ReceiptGenerate = z.infer<typeof receiptGenerateSchema>;

/** Reorder a catalogue by sending ids in their new order. */
export const reorderSchema = z.object({ ids: z.array(idSchema).min(1).max(500) });
export type Reorder = z.infer<typeof reorderSchema>;
