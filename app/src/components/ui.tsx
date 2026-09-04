import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n/fr';

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  // Top padding clears the status bar (clock/battery); bottom clears the tab
  // bar plus the home-bar / gesture area.
  return (
    <View className="flex-1 px-4 pb-24" style={{ paddingTop: insets.top + 12 }}>
      {children}
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-3">
      <Text className="text-xl font-semibold text-slate-900">{title}</Text>
      {subtitle ? <Text className="mt-0.5 text-sm text-slate-500">{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</View>;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: disabled ? 'bg-slate-300' : 'bg-brand-700 active:bg-brand-800',
    secondary: 'bg-white border border-slate-300 active:bg-slate-100',
    ghost: 'active:bg-brand-50',
    danger: 'bg-white border border-red-200 active:bg-red-50',
  }[variant];

  const textStyles = {
    primary: 'text-white',
    secondary: disabled ? 'text-slate-400' : 'text-slate-800',
    ghost: disabled ? 'text-slate-400' : 'text-brand-700',
    danger: 'text-red-700',
  }[variant];

  return (
    // 44px minimum: this is a thumb target, not a mouse target.
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-h-11 items-center justify-center rounded-xl px-4 ${styles} ${className}`}
    >
      <Text className={`font-medium ${textStyles}`}>{children}</Text>
    </Pressable>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'amber' | 'red';
}) {
  const styles = {
    slate: 'bg-slate-100',
    green: 'bg-brand-100',
    amber: 'bg-amber-100',
    red: 'bg-red-100',
  }[tone];
  const textStyles = {
    slate: 'text-slate-600',
    green: 'text-brand-800',
    amber: 'text-amber-800',
    red: 'text-red-700',
  }[tone];

  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${styles}`}>
      <Text className={`text-xs font-medium ${textStyles}`}>{children}</Text>
    </View>
  );
}

export function Spinner({ label = t.app.loading }: { label?: string }) {
  return (
    <View className="flex-row items-center justify-center gap-2 py-10">
      <ActivityIndicator color="#166534" />
      <Text className="text-sm text-slate-500">{label}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : t.app.error;
  return (
    <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <Text className="text-sm text-red-800">{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="mt-2">
          <Text className="font-medium text-red-800 underline">{t.app.retry}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
      <Text className="text-center text-sm text-slate-500">{children}</Text>
    </View>
  );
}
