import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Day } from '@kettle/shared';
import { readProductionDay, saveProductionDay } from '@kettle/shared';

export function useProductionDay(day: Day) {
  return useQuery({
    queryKey: ['production', day],
    queryFn: () => readProductionDay(day),
  });
}

export function useSaveProductionDay(day: Day) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lines: { productId: string; quantity: number }[]) => saveProductionDay({ day, lines }),
    onSuccess: (data) => {
      queryClient.setQueryData(['production', day], data);
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}
