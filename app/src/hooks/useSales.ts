import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Day, SalesCustomerDayInput } from '@kettle/shared';
import { customerDay, matrix, salesCustomerDaySchema, salesDay, saveCustomerDay } from '@kettle/shared';

export function useSalesDay(day: Day) {
  return useQuery({
    queryKey: ['sales', 'day', day],
    queryFn: () => salesDay(day),
  });
}

export function useCustomerDay(day: Day, customerId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['sales', 'customerDay', day, customerId],
    queryFn: () => customerDay(day, customerId!),
    enabled: enabled && customerId !== null,
  });
}

export function useMatrix(day: Day) {
  return useQuery({
    queryKey: ['sales', 'matrix', day],
    queryFn: () => matrix(day),
  });
}

export function useSaveCustomerDay(day: Day, customerId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SalesCustomerDayInput) => saveCustomerDay(salesCustomerDaySchema.parse(input)),
    onSuccess: (data) => {
      queryClient.setQueryData(['sales', 'customerDay', day, customerId], data);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}
