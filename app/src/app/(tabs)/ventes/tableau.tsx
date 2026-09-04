import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { formatAmount } from '@kettle/shared';
import { DayNav } from '../../../components/DayNav';
import { EmptyState, ErrorState, Screen, ScreenTitle, Spinner } from '../../../components/ui';
import { VenteClientSheet } from '../../../components/VenteClientSheet';
import { useDay } from '../../../lib/day';
import { t } from '../../../i18n/fr';
import { useMatrix } from '../../../hooks/useSales';

const ROW_H = 'h-11 justify-center';
const COL_W = 84;
const NAME_W = 108;

/**
 * The grid the whole thing is checked against: products down, customers across.
 * Read-only by design — the product column stays frozen while the customer
 * columns scroll horizontally, and tapping a cell hands editing back to the
 * entry sheet so there is still exactly one place where sales are written.
 */
export default function TableauScreen() {
  const { day } = useDay();
  const [showAmounts, setShowAmounts] = useState(false);
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);

  const matrix = useMatrix(day);
  const data = matrix.data;
  const hasSales = (data?.totalQuantity ?? 0) > 0;

  const cellText = (value: { quantity: number; totalCents: number } | undefined) => {
    if (!value) return '·';
    return showAmounts ? formatAmount(value.totalCents) : String(value.quantity);
  };

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Screen>
        <DayNav />
        <ScreenTitle title={t.matrix.title} subtitle={t.matrix.subtitle} />

        <View className="mb-3 flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-xs text-slate-500">{t.matrix.hint}</Text>
          <Pressable
            onPress={() => setShowAmounts((current) => !current)}
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-1.5 active:bg-slate-100"
          >
            <Text className="text-xs font-medium text-slate-700">
              {showAmounts ? t.matrix.showQuantities : t.matrix.showAmounts}
            </Text>
          </Pressable>
        </View>

        {matrix.isPending ? <Spinner /> : null}
        {matrix.error ? <ErrorState error={matrix.error} onRetry={() => matrix.refetch()} /> : null}

        {data && !hasSales ? <EmptyState>{t.matrix.empty}</EmptyState> : null}

        {data && hasSales ? (
          <View className="flex-row overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* Frozen product column. */}
            <View style={{ width: NAME_W }} className="border-r border-slate-200">
              <View className={`${ROW_H} border-b border-slate-200 px-2.5`}>
                <Text className="text-xs font-medium text-slate-500">{t.matrix.product}</Text>
              </View>
              {data.rows.map((row) => (
                <View key={row.productId} className={`${ROW_H} border-b border-slate-100 px-2.5`}>
                  <Text className="text-sm font-medium text-slate-900" numberOfLines={1}>
                    {row.productName}
                  </Text>
                </View>
              ))}
              <View className={`${ROW_H} bg-slate-50 px-2.5`}>
                <Text className="text-sm font-medium text-slate-600">{t.matrix.total}</Text>
              </View>
            </View>

            {/* Scrollable customer columns + trailing row-total column. */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View className="flex-row border-b border-slate-200">
                  {data.customers.map((customer) => (
                    <Pressable key={customer.id} style={{ width: COL_W }} className={`${ROW_H} px-2`} onPress={() => setOpenCustomer(customer.id)}>
                      <Text className="text-right text-xs font-medium text-slate-600 underline" numberOfLines={1}>
                        {customer.name}
                      </Text>
                    </Pressable>
                  ))}
                  <View style={{ width: COL_W }} className={`${ROW_H} border-l border-slate-200 bg-slate-50 px-2`}>
                    <Text className="text-right text-xs font-medium text-slate-600">{t.matrix.total}</Text>
                  </View>
                </View>

                {data.rows.map((row) => (
                  <View key={row.productId} className="flex-row border-b border-slate-100">
                    {data.customers.map((customer) => {
                      const cell = row.cells[customer.id];
                      return (
                        <Pressable
                          key={customer.id}
                          style={{ width: COL_W }}
                          className={`${ROW_H} px-2`}
                          onPress={() => (cell ? setOpenCustomer(customer.id) : undefined)}
                        >
                          <Text className={`text-right text-sm ${cell ? 'text-slate-700' : 'text-slate-300'}`}>{cellText(cell)}</Text>
                        </Pressable>
                      );
                    })}
                    <View style={{ width: COL_W }} className={`${ROW_H} border-l border-slate-200 bg-slate-50 px-2`}>
                      <Text className="text-right text-sm font-semibold text-slate-900">
                        {showAmounts ? formatAmount(row.totalCents) : row.totalQuantity}
                      </Text>
                    </View>
                  </View>
                ))}

                <View className="flex-row bg-slate-50">
                  {data.customers.map((customer) => (
                    <View key={customer.id} style={{ width: COL_W }} className={`${ROW_H} px-2`}>
                      <Text className="text-right text-sm font-semibold text-slate-900">
                        {cellText(data.columnTotals[customer.id])}
                      </Text>
                    </View>
                  ))}
                  <View style={{ width: COL_W }} className={`${ROW_H} border-l border-slate-200 px-2`}>
                    <Text className="text-right text-sm font-bold text-brand-800">
                      {showAmounts ? formatAmount(data.totalCents) : data.totalQuantity}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        ) : null}

        <VenteClientSheet day={day} customerId={openCustomer} open={openCustomer !== null} onClose={() => setOpenCustomer(null)} />
      </Screen>
    </ScrollView>
  );
}
