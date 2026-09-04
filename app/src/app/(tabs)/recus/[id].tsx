import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { formatAmount } from '@kettle/shared';
import { Badge, Button, Card, ErrorState, Screen, Spinner } from '../../../components/ui';
import { formatDayLong } from '../../../lib/day';
import { t } from '../../../i18n/fr';
import { useToast } from '../../../lib/toast';
import { useGenerateReceipt, useIssueReceipt, useReceipt } from '../../../hooks/useReceipts';

export default function RecuDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = Number(id);
  const router = useRouter();
  const toast = useToast();

  const receipt = useReceipt(Number.isFinite(receiptId) ? receiptId : undefined);
  const issue = useIssueReceipt();
  const regenerate = useGenerateReceipt();

  const data = receipt.data;

  const onIssue = () => {
    issue.mutate(receiptId, {
      onSuccess: () => toast.show(t.receipts.status.ISSUED),
      onError: (error) => toast.show(error instanceof Error ? error.message : t.app.error, 'error'),
    });
  };

  const onRegenerate = () => {
    if (!data) return;
    regenerate.mutate(
      { day: data.day, customerId: data.customerId },
      {
        onSuccess: () => toast.show(t.actions.saved),
        onError: (error) => toast.show(error instanceof Error ? error.message : t.app.error, 'error'),
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Screen>
        <View className="mb-3 flex-row items-center gap-1">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel={t.actions.back}
            className="-ml-2 h-11 w-11 items-center justify-center rounded-xl active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </Pressable>
          <Text className="text-lg font-semibold text-slate-900">{data ? t.receipts.number(data.number) : t.receipts.title}</Text>
        </View>

        {receipt.isPending ? <Spinner /> : null}
        {receipt.error ? <ErrorState error={receipt.error} onRetry={() => receipt.refetch()} /> : null}

        {data ? (
          <>
            {data.outOfSync ? (
              <View className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 p-3">
                <Text className="font-medium text-amber-900">{t.receipts.outOfSync}</Text>
                <Text className="mt-1 text-xs text-amber-900">{t.receipts.outOfSyncHelp}</Text>
              </View>
            ) : null}

            <Card className="overflow-hidden">
              <View className="border-b border-slate-200 p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0">
                    <Text className="text-xs text-slate-500">{t.receipts.customer}</Text>
                    <Text className="text-lg font-semibold text-slate-900" numberOfLines={1}>
                      {data.customerName}
                    </Text>
                  </View>
                  <Badge tone={data.status === 'ISSUED' ? 'green' : 'slate'}>{t.receipts.status[data.status]}</Badge>
                </View>

                <Text className="mt-2 text-sm text-slate-600">
                  {t.receipts.date} : {formatDayLong(data.day)}
                </Text>
                <Text className="text-sm text-slate-600">{t.receipts.number(data.number)}</Text>
              </View>

              <View className="flex-row border-b border-slate-200 bg-slate-50 px-3 py-2">
                <Text className="flex-1 text-xs font-medium text-slate-500">{t.receipts.lineProduct}</Text>
                <Text className="w-14 text-right text-xs font-medium text-slate-500">{t.receipts.lineQuantity}</Text>
                <Text className="w-20 text-right text-xs font-medium text-slate-500">{t.receipts.linePrice}</Text>
                <Text className="w-24 text-right text-xs font-medium text-slate-500">{t.receipts.lineTotal}</Text>
              </View>

              {data.lines.map((line) => (
                <View key={line.productId} className="flex-row border-b border-slate-100 px-3 py-2">
                  <Text className="flex-1 text-slate-900" numberOfLines={1}>
                    {line.productName}
                  </Text>
                  <Text className="w-14 text-right text-slate-700">{line.quantity}</Text>
                  <Text className="w-20 text-right text-slate-700">{formatAmount(line.unitPriceCents)}</Text>
                  <Text className="w-24 text-right font-medium text-slate-900">{formatAmount(line.lineTotalCents)}</Text>
                </View>
              ))}

              <View className="flex-row items-center justify-between border-t-2 border-slate-300 bg-slate-50 px-3 py-3">
                <Text className="font-semibold text-slate-700">{t.receipts.grandTotal}</Text>
                <Text className="text-lg font-bold text-brand-800">
                  {formatAmount(data.totalCents)} <Text className="text-xs font-normal">DA</Text>
                </Text>
              </View>
            </Card>

            <View className="mt-3 gap-2">
              {data.status === 'DRAFT' ? (
                <Button className="w-full" onPress={onIssue} disabled={issue.isPending}>
                  {t.receipts.issue}
                </Button>
              ) : null}

              {data.outOfSync ? (
                <Button className="w-full" variant="secondary" onPress={onRegenerate} disabled={regenerate.isPending}>
                  {t.receipts.regenerate}
                </Button>
              ) : null}
            </View>
          </>
        ) : null}
      </Screen>
    </ScrollView>
  );
}
