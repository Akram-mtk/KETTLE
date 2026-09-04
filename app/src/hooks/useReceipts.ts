import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Day } from '@kettle/shared';
import { generateReceipt, getReceipt, listReceipts, markReceiptPaid } from '@kettle/shared';

export function useReceiptList(filter: { day?: Day; customerId?: string }) {
  return useQuery({
    queryKey: ['receipts', 'list', filter.day ?? null, filter.customerId ?? null],
    queryFn: () => listReceipts(filter),
  });
}

export function useReceipt(id: number | undefined) {
  return useQuery({
    queryKey: ['receipts', id],
    queryFn: () => getReceipt(id!),
    enabled: id !== undefined && Number.isFinite(id),
  });
}

function useInvalidateReceipts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
  };
}

export function useGenerateReceipt() {
  const invalidate = useInvalidateReceipts();
  return useMutation({
    mutationFn: ({ day, customerId }: { day: Day; customerId: string }) => generateReceipt(day, customerId),
    onSuccess: invalidate,
  });
}

export function useMarkReceiptPaid() {
  const invalidate = useInvalidateReceipts();
  return useMutation({
    mutationFn: (id: number) => markReceiptPaid(id),
    onSuccess: invalidate,
  });
}
