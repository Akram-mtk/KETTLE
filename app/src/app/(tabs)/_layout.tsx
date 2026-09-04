import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { t } from '../../i18n/fr';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#166534',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.today, tabBarIcon: tabIcon('today-outline') }} />
      <Tabs.Screen name="ventes" options={{ title: t.tabs.sales, tabBarIcon: tabIcon('cart-outline') }} />
      <Tabs.Screen name="stock" options={{ title: t.tabs.stock, tabBarIcon: tabIcon('cube-outline') }} />
      <Tabs.Screen name="recus" options={{ title: t.tabs.receipts, tabBarIcon: tabIcon('receipt-outline') }} />
      <Tabs.Screen name="plus" options={{ title: t.tabs.more, tabBarIcon: tabIcon('ellipsis-horizontal-circle-outline') }} />
    </Tabs>
  );
}
