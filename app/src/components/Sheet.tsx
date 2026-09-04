import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n/fr';

/**
 * A full-screen sheet rather than a dialog: on a phone there is no room for a
 * modal that leaves the page visible around it. The primary action is pinned to
 * the bottom, above the home bar, where a thumb already is.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-50">
        <View
          className="flex-row items-center gap-1 border-b border-slate-200 bg-white px-2 py-2"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable
            onPress={onClose}
            accessibilityLabel={t.actions.back}
            className="h-11 w-11 shrink-0 items-center justify-center rounded-xl active:bg-slate-100"
          >
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-xs text-slate-500" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-3" keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        {footer ? (
          <View
            className="border-t border-slate-200 bg-white px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
