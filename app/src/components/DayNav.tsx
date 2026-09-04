import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDayLong, useDay } from '../lib/day';
import { t } from '../i18n/fr';

/** The day selector that heads every data screen. */
export function DayNav() {
  const { day, step, goToToday, isToday } = useDay();

  return (
    <View className="-mx-4 mb-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
      <View className="flex-row items-center gap-1">
        <Pressable
          onPress={() => step(-1)}
          accessibilityLabel={t.day.previous}
          className="h-11 w-11 shrink-0 items-center justify-center rounded-xl active:bg-slate-200"
        >
          <Ionicons name="chevron-back" size={22} color="#475569" />
        </Pressable>

        <Pressable
          onPress={goToToday}
          disabled={isToday}
          className="flex-1 items-center rounded-xl px-2 py-1 active:bg-slate-200"
          accessibilityLabel={t.day.goToToday}
        >
          <Text className="text-center text-sm font-semibold text-slate-800" numberOfLines={1}>
            {formatDayLong(day)}
            {isToday ? <Text className="text-xs font-normal text-brand-700"> · {t.day.today.toLowerCase()}</Text> : null}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => step(1)}
          accessibilityLabel={t.day.next}
          className="h-11 w-11 shrink-0 items-center justify-center rounded-xl active:bg-slate-200"
        >
          <Ionicons name="chevron-forward" size={22} color="#475569" />
        </Pressable>
      </View>
    </View>
  );
}
