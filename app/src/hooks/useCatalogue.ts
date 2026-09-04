import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerCatalogue, productCatalogue } from '@kettle/shared';

export type CatalogueKind = 'products' | 'customers';

const resourceFor = (kind: CatalogueKind) => (kind === 'products' ? productCatalogue : customerCatalogue);

export function useCatalogueList(kind: CatalogueKind, showArchived: boolean) {
  return useQuery({
    queryKey: [kind, { showArchived }],
    queryFn: () => resourceFor(kind).list(showArchived),
  });
}

function useInvalidateCatalogue(kind: CatalogueKind) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [kind] });
    // Anything that lists products or customers is now stale.
    queryClient.invalidateQueries({ queryKey: ['production'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['stock'] });
  };
}

export function useCreateCatalogueItem(kind: CatalogueKind) {
  const invalidate = useInvalidateCatalogue(kind);
  return useMutation({
    mutationFn: (name: string) => resourceFor(kind).create(name),
    onSuccess: invalidate,
  });
}

export function useSetCatalogueActive(kind: CatalogueKind) {
  const invalidate = useInvalidateCatalogue(kind);
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? resourceFor(kind).update(id, { active: true }) : resourceFor(kind).archive(id),
    onSuccess: invalidate,
  });
}

export function useRenameCatalogueItem(kind: CatalogueKind) {
  const invalidate = useInvalidateCatalogue(kind);
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => resourceFor(kind).update(id, { name }),
    onSuccess: invalidate,
  });
}

export function useReorderCatalogue(kind: CatalogueKind) {
  const invalidate = useInvalidateCatalogue(kind);
  return useMutation({
    mutationFn: (ids: string[]) => resourceFor(kind).reorder(ids),
    onSuccess: invalidate,
  });
}
