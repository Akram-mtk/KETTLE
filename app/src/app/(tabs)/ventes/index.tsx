import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatAmount } from '@kettle/shared';
import { DayNav } from '../../../components/DayNav';
import { Badge, Card, EmptyState, ErrorState, Screen, ScreenTitle, Spinner } from '../../../components/ui';
import { VenteClientSheet } from '../../../components/VenteClientSheet';
import { useDay } from '../../../lib/day';
import { t } from '../../../i18n/fr';
import { useSalesDay } from '../../../hooks/useSales';

/** The daily hub: tap a customer to open their entry sheet. */
export default function VentesScreen() {
  const { day } = useDay();
  const router = useRouter();
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);

  const sales = useSalesDay(day);
  const rows = sales.data?.customers ?? [];

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Screen>
        <DayNav />

        <View className="mb-3 flex-row items-start justify-between gap-2">
          <ScreenTitle title={t.sales.title} />
          <Pressable onPress={() => router.push('/ventes/tableau')} className="mt-1 shrink-0 rounded-xl px-3 py-2 active:bg-brand-50">
            <Text className="text-sm font-medium text-brand-700">{t.sales.openGrid}</Text>
          </Pressable>
        </View>

        {sales.isPending ? <Spinner /> : null}
        {sales.error ? <ErrorState error={sales.error} onRetry={() => sales.refetch()} /> : null}

        {sales.data && rows.length === 0 ? <EmptyState>{t.sales.noCustomers}</EmptyState> : null}

        {rows.length > 0 ? (
          <>
            <Card className="divide-y divide-slate-100">
              {rows.map((row) => (
                <Pressable
                  key={row.customerId}
                  onPress={() => setOpenCustomer(row.customerId)}
                  className="flex-row items-center gap-3 p-3 active:bg-slate-50"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="font-medium text-slate-900" numberOfLines={1}>
                      {row.customerName}
                    </Text>
                    <Text className="mt-0.5 text-xs text-slate-500">
                      {row.totalQuantity > 0 ? t.sales.items(row.totalQuantity) : t.sales.nothing}
                    </Text>
                  </View>

                  <View className="shrink-0 items-end gap-1">
                    {row.totalQuantity > 0 ? (
                      <Text className="font-semibold text-slate-900">
                        {formatAmount(row.totalCents)} <Text className="text-xs font-normal text-slate-400">DA</Text>
                      </Text>
                    ) : (
                      <Text className="text-slate-300">{t.sales.nothing}</Text>
                    )}

                    {row.receipt ? (
                      row.receipt.outOfSync ? (
                        <Badge tone="amber">{t.receipts.outOfSync}</Badge>
                      ) : (
                        <Badge tone={row.receipt.status === 'ISSUED' ? 'green' : 'slate'}>
                          {t.receipts.status[row.receipt.status]}
                        </Badge>
                      )
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </Card>

            <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
              <Text className="text-sm font-medium text-brand-800">{t.sales.dayTotal}</Text>
              <Text className="text-lg font-semibold text-brand-800">
                {formatAmount(sales.data?.totalCents ?? 0)} <Text className="text-xs font-normal">DA</Text>
              </Text>
            </View>
          </>
        ) : null}

        <VenteClientSheet day={day} customerId={openCustomer} open={openCustomer !== null} onClose={() => setOpenCustomer(null)} />
      </Screen>
    </ScrollView>
  );
}
