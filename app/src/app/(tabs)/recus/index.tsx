import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatAmount } from '@kettle/shared';
import { DayNav } from '../../../components/DayNav';
import { Badge, Card, EmptyState, ErrorState, Screen, ScreenTitle, Spinner } from '../../../components/ui';
import { useDay } from '../../../lib/day';
import { t } from '../../../i18n/fr';
import { useReceiptList } from '../../../hooks/useReceipts';

export default function RecusScreen() {
  const { day } = useDay();
  const router = useRouter();

  const receipts = useReceiptList({ day });
  const rows = receipts.data ?? [];

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Screen>
        <DayNav />
        <ScreenTitle title={t.receipts.title} />

        {receipts.isPending ? <Spinner /> : null}
        {receipts.error ? <ErrorState error={receipts.error} onRetry={() => receipts.refetch()} /> : null}

        {receipts.data && rows.length === 0 ? <EmptyState>{t.receipts.none}</EmptyState> : null}

        {rows.length > 0 ? (
          <Card className="divide-y divide-slate-100">
            {rows.map((receipt) => (
              <Pressable
                key={receipt.id}
                onPress={() => router.push(`/recus/${receipt.id}`)}
                className="flex-row items-center gap-3 p-3 active:bg-slate-50"
              >
                <View className="min-w-0 flex-1">
                  <Text className="font-medium text-slate-900" numberOfLines={1}>
                    {receipt.customerName}
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-500">{t.receipts.number(receipt.number)}</Text>
                </View>

                <View className="shrink-0 items-end gap-1">
                  <Text className="font-semibold text-slate-900">
                    {formatAmount(receipt.totalCents)} <Text className="text-xs font-normal text-slate-400">DA</Text>
                  </Text>
                  {receipt.outOfSync ? (
                    <Badge tone="amber">{t.receipts.outOfSync}</Badge>
                  ) : (
                    <Badge tone={receipt.status === 'ISSUED' ? 'green' : 'slate'}>{t.receipts.status[receipt.status]}</Badge>
                  )}
                </View>
              </Pressable>
            ))}
          </Card>
        ) : null}
      </Screen>
    </ScrollView>
  );
}
