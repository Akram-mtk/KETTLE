import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatAmount, parseDA, parseQty } from '@kettle/shared';
import { Sheet } from './Sheet';
import { PrixInput, QtyInput } from './fields';
import { Button, ErrorState, Spinner } from './ui';
import { formatDayLong } from '../lib/day';
import { t } from '../i18n/fr';
import { useToast } from '../lib/toast';
import { useCustomerDay, useSaveCustomerDay } from '../hooks/useSales';
import { useGenerateReceipt } from '../hooks/useReceipts';

interface Draft {
  quantity: string;
  price: string;
}

/**
 * The entry surface, and the screen used most: one block per product with a
 * quantity and a price, saved as a single write.
 */
export function VenteClientSheet({
  day,
  customerId,
  open,
  onClose,
}: {
  day: string;
  customerId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();

  const customerDayQuery = useCustomerDay(day, customerId, open);

  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, 'price' | 'quantity'>>({});
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    const data = customerDayQuery.data;
    const key = data ? `${data.day}|${data.customerId}` : null;
    if (!data || loadedFor.current === key) return;

    setDraft(
      Object.fromEntries(
        data.lines.map((line) => [
          line.productId,
          {
            quantity: line.quantity ? String(line.quantity) : '',
            price: line.unitPriceCents ? formatAmount(line.unitPriceCents) : '',
          },
        ]),
      ),
    );
    setErrors({});
    loadedFor.current = key;
  }, [customerDayQuery.data]);

  // Reopening for a different customer must not show the previous one's draft.
  useEffect(() => {
    if (!open) loadedFor.current = null;
  }, [open]);

  const lines = customerDayQuery.data?.lines ?? [];

  const totals = useMemo(() => {
    let quantity = 0;
    let cents = 0;
    for (const line of lines) {
      const entry = draft[line.productId];
      const q = parseQty(entry?.quantity ?? '') ?? 0;
      const p = parseDA(entry?.price ?? '') ?? 0;
      quantity += q;
      cents += q * p;
    }
    return { quantity, cents };
  }, [lines, draft]);

  const save = useSaveCustomerDay(day, customerId);
  const receipt = useGenerateReceipt();

  const onSave = () => {
    const found: Record<string, 'price' | 'quantity'> = {};

    for (const line of lines) {
      const entry = draft[line.productId];
      const quantity = parseQty(entry?.quantity ?? '') ?? 0;
      const price = parseDA(entry?.price ?? '') ?? 0;

      // A quantity with no price would silently understate the day's takings,
      // and a price with no quantity is a half-entered line.
      if (quantity > 0 && price <= 0) found[line.productId] = 'price';
      else if (quantity === 0 && price > 0) found[line.productId] = 'quantity';
    }

    if (Object.keys(found).length > 0) {
      setErrors(found);
      const [productId, kind] = Object.entries(found)[0]!;
      const name = lines.find((l) => l.productId === productId)?.productName ?? '';
      toast.show(`${kind === 'price' ? t.sales.priceRequired : t.sales.quantityRequired} « ${name} »`, 'error');
      return;
    }

    setErrors({});
    save.mutate(
      {
        day,
        customerId: customerId!,
        lines: lines.map((line) => {
          const entry = draft[line.productId];
          return {
            productId: line.productId,
            quantity: parseQty(entry?.quantity ?? '') ?? 0,
            unitPriceCents: parseDA(entry?.price ?? '') ?? 0,
          };
        }),
      },
      {
        onSuccess: () => {
          toast.show(t.sales.saved);
          onClose();
        },
        onError: (error) => toast.show(error instanceof Error ? error.message : t.app.error, 'error'),
      },
    );
  };

  const existing = customerDayQuery.data?.receipt;

  const onReceipt = () => {
    if (existing) {
      router.push(`/recus/${existing.id}`);
      return;
    }
    receipt.mutate(
      { day, customerId: customerId! },
      {
        onSuccess: (data) => router.push(`/recus/${data.id}`),
        onError: (error) => toast.show(error instanceof Error ? error.message : t.app.error, 'error'),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={customerDayQuery.data?.customerName ?? t.sales.sheetTitle}
      subtitle={formatDayLong(day)}
      footer={
        <View className="gap-2">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-sm text-slate-500">{t.sales.items(totals.quantity)}</Text>
            <Text className="text-lg font-semibold text-slate-900">
              {formatAmount(totals.cents)} <Text className="text-xs text-slate-400">DA</Text>
            </Text>
          </View>

          <Button className="w-full" onPress={onSave} disabled={save.isPending}>
            {save.isPending ? t.actions.saving : t.actions.save}
          </Button>

          <Button className="w-full" variant="secondary" onPress={onReceipt} disabled={receipt.isPending || save.isPending}>
            {existing ? t.sales.viewReceipt : t.sales.generateReceipt}
          </Button>
        </View>
      }
    >
      {customerDayQuery.isPending ? <Spinner /> : null}
      {customerDayQuery.error ? (
        <ErrorState error={customerDayQuery.error} onRetry={() => customerDayQuery.refetch()} />
      ) : null}

      <View className="gap-2">
        {lines.map((line) => {
          const entry = draft[line.productId] ?? { quantity: '', price: '' };
          const quantity = parseQty(entry.quantity) ?? 0;
          const price = parseDA(entry.price) ?? 0;
          const remaining = line.onHandBefore - quantity;
          const error = errors[line.productId];

          return (
            <View key={line.productId} className="rounded-2xl border border-slate-200 bg-white p-3">
              <View className="mb-2 flex-row items-baseline justify-between gap-2">
                <Text className="min-w-0 flex-1 font-medium text-slate-900" numberOfLines={1}>
                  {line.productName}
                </Text>
                <Text className="shrink-0 text-sm text-slate-500">
                  {formatAmount(quantity * price)} <Text className="text-xs text-slate-400">DA</Text>
                </Text>
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-slate-500">{t.sales.quantity}</Text>
                  <QtyInput
                    accessibilityLabel={`${t.sales.quantity} — ${line.productName}`}
                    value={entry.quantity}
                    invalid={error === 'quantity'}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, [line.productId]: { ...entry, quantity: value } }))
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-slate-500">{t.sales.price}</Text>
                  <PrixInput
                    accessibilityLabel={`${t.sales.price} — ${line.productName}`}
                    value={entry.price}
                    invalid={error === 'price'}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, [line.productId]: { ...entry, price: value } }))
                    }
                  />
                </View>
              </View>

              {/* Live availability. Going negative is shown, not blocked: the
                  stock count is what reconciles reality, not a validation rule. */}
              <Text className={`mt-1.5 text-xs ${remaining < 0 ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                {t.sales.available} : {remaining}
              </Text>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}
