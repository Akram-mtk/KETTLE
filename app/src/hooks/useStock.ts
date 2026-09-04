import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Day } from '@kettle/shared';
import { adjustmentCreateSchema, expectedOnHand, getDb, recordCount, stockRows } from '@kettle/shared';
import { stockAdjustments } from '@kettle/shared';
import { desc, eq } from 'drizzle-orm';
import { products } from '@kettle/shared';

export function useStockRows(day: Day) {
  return useQuery({
    queryKey: ['stock', day],
    queryFn: () => stockRows(day),
  });
}

export function useExpectedOnHand(day: Day, productId: string | undefined) {
  return useQuery({
    queryKey: ['stock', 'expected', day, productId],
    queryFn: () => expectedOnHand(productId!, day),
    enabled: productId !== undefined,
  });
}

export interface AdjustmentRow {
  id: string;
  day: string;
  productId: string;
  productName: string;
  countedQuantity: number;
  expectedQuantity: number;
  deltaQuantity: number;
  reason: string | null;
  createdAt: string;
}

async function listAdjustments(): Promise<AdjustmentRow[]> {
  const db = getDb();
  const rows = await db
    .select({ adjustment: stockAdjustments, productName: products.name })
    .from(stockAdjustments)
    .innerJoin(products, eq(stockAdjustments.productId, products.id))
    .orderBy(desc(stockAdjustments.day), desc(stockAdjustments.createdAt))
    .limit(200);

  return rows.map(({ adjustment, productName }) => ({
    id: adjustment.id,
    day: adjustment.day,
    productId: adjustment.productId,
    productName,
    countedQuantity: adjustment.countedQuantity,
    expectedQuantity: adjustment.expectedQuantity,
    deltaQuantity: adjustment.deltaQuantity,
    reason: adjustment.reason,
    createdAt: adjustment.createdAt.toISOString(),
  }));
}

export function useAdjustmentHistory() {
  return useQuery({
    queryKey: ['stock', 'adjustments'],
    queryFn: listAdjustments,
  });
}

export function useRecordCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { day: Day; productId: string; countedQuantity: number; reason?: string }) =>
      recordCount(adjustmentCreateSchema.parse(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['production'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}
