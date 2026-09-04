// Must be the very first import: nanoid (used for every generated row id in
// @kettle/shared's schema) needs `crypto.getRandomValues`, which Hermes does
// not provide on its own.
import 'react-native-get-random-values';
import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import '../global.css';
import { useDatabaseReady } from '../db/database';
import { queryClient } from '../lib/queryClient';
import { DayProvider } from '../lib/day';
import { ToastProvider } from '../lib/toast';

function DatabaseGate({ children }: { children: ReactNode }) {
  const { success, error } = useDatabaseReady();

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Text className="text-center text-red-700">{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#166534" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <DatabaseGate>
          <DayProvider>
            <ToastProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </ToastProvider>
          </DayProvider>
        </DatabaseGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
