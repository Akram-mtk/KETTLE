import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Screen, ScreenTitle } from '../../../components/ui';
import { t } from '../../../i18n/fr';

export default function PlusScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Screen>
        <ScreenTitle title={t.more.title} />

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.more.catalogue}</Text>

        <Card className="divide-y divide-slate-100">
          <NavRow label={t.catalogue.products} onPress={() => router.push('/plus/produits')} />
          <NavRow label={t.catalogue.customers} onPress={() => router.push('/plus/clients')} />
        </Card>

        <Text className="mt-6 text-center text-xs text-slate-400">{t.more.aboutText}</Text>
      </Screen>
    </ScrollView>
  );
}

function NavRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="min-h-14 flex-row items-center gap-3 px-4 active:bg-slate-50">
      <Text className="flex-1 font-medium text-slate-900">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </Pressable>
  );
}
