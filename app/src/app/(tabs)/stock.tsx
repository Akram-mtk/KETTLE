import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { parseQty } from '@kettle/shared';
import type { StockRow } from '@kettle/shared';
import { DayNav } from '../../components/DayNav';
import { Sheet } from '../../components/Sheet';
import { QtyInput } from '../../components/fields';
import { Badge, Button, Card, EmptyState, ErrorState, Screen, ScreenTitle, Spinner } from '../../components/ui';
import { formatDayLong, formatDayShort, useDay } from '../../lib/day';
import { t } from '../../i18n/fr';
import { useToast } from '../../lib/toast';
import { useAdjustmentHistory, useExpectedOnHand, useRecordCount, useStockRows } from '../../hooks/useStock';

export default function StockScreen() {
  const { day } = useDay();
  const [counting, setCounting] = useState<StockRow | null>(null);

  const stock = useStockRows(day);
  const history = useAdjustmentHistory();

  const rows = stock.data ?? [];

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Screen>
        <DayNav />
        <ScreenTitle title={t.stock.title} />

        {stock.isPending ? <Spinner /> : null}
        {stock.error ? <ErrorState error={stock.error} onRetry={() => stock.refetch()} /> : null}

        {stock.data && rows.length === 0 ? <EmptyState>{t.today.noProducts}</EmptyState> : null}

        {rows.length > 0 ? (
          <Card className="divide-y divide-slate-100">
            {rows.map((row) => (
              <View key={row.productId} className="p-3">
                <View className="flex-row items-center gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="font-medium text-slate-900" numberOfLines={1}>
                      {row.productName}
                    </Text>
                    <Text className="mt-0.5 text-xs text-slate-500">
                      {t.stock.produced} {row.produced} · {t.stock.sold} {row.sold}
                      {row.adjusted !== 0 ? ` · ${t.stock.adjusted} ${row.adjusted > 0 ? `+${row.adjusted}` : row.adjusted}` : ''}
                    </Text>
                  </View>

                  <View className="shrink-0 items-end">
                    <Text className="text-[11px] text-slate-400">{t.stock.onHand}</Text>
                    <Text className={`text-xl font-semibold ${row.onHand < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {row.onHand}
                    </Text>
                  </View>
                </View>

                <Button variant="secondary" className="mt-2 w-full" onPress={() => setCounting(row)}>
                  {t.stock.count}
                </Button>
              </View>
            ))}
          </Card>
        ) : null}

        <View className="mt-5">
          <Text className="mb-2 text-sm font-semibold text-slate-700">{t.stock.history}</Text>

          {history.isPending ? <Spinner /> : null}
          {history.data && history.data.length === 0 ? <EmptyState>{t.stock.noHistory}</EmptyState> : null}

          {history.data && history.data.length > 0 ? (
            <Card className="divide-y divide-slate-100">
              {history.data.map((entry) => (
                <View key={entry.id} className="flex-row items-start gap-3 p-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-medium text-slate-900" numberOfLines={1}>
                      {entry.productName}
                    </Text>
                    <Text className="mt-0.5 text-xs text-slate-500">
                      {formatDayShort(entry.day)} · {t.stock.expected} {entry.expectedQuantity} → {t.stock.counted} {entry.countedQuantity}
                    </Text>
                    {entry.reason ? (
                      <Text className="mt-0.5 text-xs text-slate-400" numberOfLines={1}>
                        {entry.reason}
                      </Text>
                    ) : null}
                  </View>
                  <Badge tone={entry.deltaQuantity < 0 ? 'red' : 'green'}>
                    {entry.deltaQuantity > 0 ? `+${entry.deltaQuantity}` : entry.deltaQuantity}
                  </Badge>
                </View>
              ))}
            </Card>
          ) : null}
        </View>

        <ComptageSheet day={day} row={counting} onClose={() => setCounting(null)} />
      </Screen>
    </ScrollView>
  );
}

/** Shows attendu / compté / écart before anything is committed. */
function ComptageSheet({ day, row, onClose }: { day: string; row: StockRow | null; onClose: () => void }) {
  const toast = useToast();
  const [counted, setCounted] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (row) {
      setCounted('');
      setReason('');
    }
  }, [row]);

  // Ask the on-device balance rather than reusing the row's onHand: the count
  // must be measured against the balance as it's computed now, same-day
  // corrections included.
  const expected = useExpectedOnHand(day, row?.productId);
  const save = useRecordCount();

  const expectedQuantity = expected.data ?? row?.onHand ?? 0;
  const countedQuantity = parseQty(counted);
  const delta = countedQuantity === null ? null : countedQuantity - expectedQuantity;

  const onConfirm = () => {
    if (!row || countedQuantity === null) return;
    save.mutate(
      {
        day,
        productId: row.productId,
        countedQuantity,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.show(t.stock.saved);
          onClose();
        },
        onError: (error) => toast.show(error instanceof Error ? error.message : t.app.error, 'error'),
      },
    );
  };

  return (
    <Sheet
      open={row !== null}
      onClose={onClose}
      title={t.stock.countTitle}
      subtitle={row ? `${row.productName} · ${formatDayLong(day)}` : undefined}
      footer={
        <Button className="w-full" onPress={onConfirm} disabled={!row || countedQuantity === null || delta === 0 || save.isPending}>
          {save.isPending ? t.actions.saving : t.actions.confirm}
        </Button>
      }
    >
      <Text className="mb-3 text-sm text-slate-600">{t.stock.countHelp}</Text>

      <Card className="divide-y divide-slate-100">
        <View className="flex-row items-center justify-between p-3">
          <Text className="text-sm text-slate-500">{t.stock.expected}</Text>
          <Text className="text-lg font-semibold text-slate-900">{expected.isPending ? '…' : expectedQuantity}</Text>
        </View>

        <View className="flex-row items-center gap-3 p-3">
          <Text className="flex-1 text-sm text-slate-500">{t.stock.counted}</Text>
          <View className="w-28">
            <QtyInput accessibilityLabel={t.stock.counted} value={counted} onChange={setCounted} />
          </View>
        </View>

        <View className="flex-row items-center justify-between p-3">
          <Text className="text-sm text-slate-500">{t.stock.delta}</Text>
          <Text
            className={`text-lg font-semibold ${
              delta === null || delta === 0 ? 'text-slate-400' : delta < 0 ? 'text-red-600' : 'text-brand-700'
            }`}
          >
            {delta === null ? '—' : delta > 0 ? `+${delta}` : delta}
          </Text>
        </View>
      </Card>

      {delta === 0 ? <Text className="mt-2 text-xs text-amber-700">{t.stock.noChange}</Text> : null}

      <View className="mt-3">
        <Text className="mb-1 text-xs text-slate-500">{t.stock.reason}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t.stock.reasonPlaceholder}
          maxLength={200}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"
        />
      </View>
    </Sheet>
  );
}
