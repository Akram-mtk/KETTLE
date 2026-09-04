import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { parseQty } from '@kettle/shared';
import { DayNav } from '../../components/DayNav';
import { QtyInput } from '../../components/fields';
import { Button, Card, EmptyState, ErrorState, Screen, ScreenTitle, Spinner } from '../../components/ui';
import { useDay } from '../../lib/day';
import { t } from '../../i18n/fr';
import { useToast } from '../../lib/toast';
import { useProductionDay, useSaveProductionDay } from '../../hooks/useProduction';

export default function AujourdhuiScreen() {
  const { day } = useDay();
  const toast = useToast();

  const production = useProductionDay(day);
  const save = useSaveProductionDay(day);

  const [draft, setDraft] = useState<Record<string, string>>({});
  // Only reload the draft when the *day* changes: a background refetch must not
  // wipe out what is being typed.
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    const data = production.data;
    if (!data || loadedFor.current === data.day) return;
    setDraft(Object.fromEntries(data.rows.map((row) => [row.productId, row.quantity ? String(row.quantity) : ''])));
    loadedFor.current = data.day;
  }, [production.data]);

  const rows = production.data?.rows ?? [];
  const totalMade = rows.reduce((sum, row) => sum + (parseQty(draft[row.productId] ?? '') ?? 0), 0);

  const onSave = () => {
    save.mutate(
      Object.entries(draft).map(([productId, value]) => ({ productId, quantity: parseQty(value) ?? 0 })),
      {
        onSuccess: () => toast.show(t.today.saved),
        onError: (error) => toast.show(error instanceof Error ? error.message : t.app.error, 'error'),
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Screen>
        <DayNav />
        <ScreenTitle title={t.today.title} subtitle={t.today.subtitle} />

        {production.isPending ? <Spinner /> : null}
        {production.error ? <ErrorState error={production.error} onRetry={() => production.refetch()} /> : null}

        {production.data && rows.length === 0 ? <EmptyState>{t.today.noProducts}</EmptyState> : null}

        {rows.length > 0 ? (
          <>
            <Card className="divide-y divide-slate-100">
              {rows.map((row) => (
                <View key={row.productId} className="flex-row items-center gap-3 p-3">
                  <View className="min-w-0 flex-1">
                    <Text className="font-medium text-slate-900" numberOfLines={1}>
                      {row.productName}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {t.today.inStock} : {row.onHand}
                    </Text>
                  </View>
                  <View className="w-24 shrink-0">
                    <QtyInput
                      accessibilityLabel={`${t.today.produced} — ${row.productName}`}
                      value={draft[row.productId] ?? ''}
                      onChange={(value) => setDraft((current) => ({ ...current, [row.productId]: value }))}
                    />
                  </View>
                </View>
              ))}
            </Card>

            <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
              <Text className="font-medium text-brand-800">{t.today.totalMade}</Text>
              <Text className="text-lg font-semibold text-brand-800">{totalMade}</Text>
            </View>

            <Button className="mt-3 w-full" onPress={onSave} disabled={save.isPending}>
              {save.isPending ? t.actions.saving : t.actions.save}
            </Button>
          </>
        ) : null}
      </Screen>
    </ScrollView>
  );
}
