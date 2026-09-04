import { Text, TextInput, View } from 'react-native';
import { formatAmount } from '@kettle/shared';

const base =
  'w-full min-h-11 rounded-xl border bg-white px-3 text-right text-base text-slate-900';

/**
 * Quantities are whole counts, so the phone gets the digits-only keypad.
 * Prices allow a comma, so they get the decimal keypad. Same component shape,
 * different keyboards — which is the whole point on a phone.
 */
export function QtyInput({
  value,
  onChange,
  invalid,
  accessibilityLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <TextInput
      inputMode="numeric"
      keyboardType="number-pad"
      autoComplete="off"
      accessibilityLabel={accessibilityLabel}
      value={value}
      placeholder="0"
      onChangeText={(next) => onChange(next.replace(/[^\d]/g, ''))}
      className={`${base} ${invalid ? 'border-red-400' : 'border-slate-300'}`}
    />
  );
}

export function PrixInput({
  value,
  onChange,
  invalid,
  accessibilityLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <View className="relative">
      <TextInput
        inputMode="decimal"
        keyboardType="decimal-pad"
        autoComplete="off"
        accessibilityLabel={accessibilityLabel}
        value={value}
        placeholder="0,00"
        onChangeText={(next) => {
          // Keep digits and a single separator, normalised to the comma the
          // fr-DZ keypad produces.
          const cleaned = next
            .replace(/\./g, ',')
            .replace(/[^\d,]/g, '')
            .replace(/,(?=.*,)/g, '');
          onChange(cleaned);
        }}
        className={`${base} pr-9 ${invalid ? 'border-red-400' : 'border-slate-300'}`}
      />
      <View pointerEvents="none" className="absolute inset-y-0 right-3 items-center justify-center">
        <Text className="text-xs text-slate-400">DA</Text>
      </View>
    </View>
  );
}

export function Money({ cents, className = '' }: { cents: number; className?: string }) {
  return (
    <Text className={className}>
      {formatAmount(cents)} <Text className="text-xs text-slate-400">DA</Text>
    </Text>
  );
}
