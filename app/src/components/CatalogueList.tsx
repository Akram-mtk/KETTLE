import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Product } from '@kettle/shared';
import { Badge, Button, Card, EmptyState, ErrorState, Screen, Spinner } from './ui';
import { t } from '../i18n/fr';
import { useToast } from '../lib/toast';
import {
  useCatalogueList,
  useCreateCatalogueItem,
  useRenameCatalogueItem,
  useReorderCatalogue,
  useSetCatalogueActive,
} from '../hooks/useCatalogue';
import type { CatalogueKind } from '../hooks/useCatalogue';

/**
 * Products and customers are the same thing on screen — a name, an order and an
 * archive flag — so they share one screen rather than two near-identical copies,
 * mirroring the shared catalogue service on the data side.
 */
export function CatalogueList({ kind }: { kind: CatalogueKind }) {
  const router = useRouter();
  const toast = useToast();

  const title = kind === 'products' ? t.catalogue.products : t.catalogue.customers;
  const placeholder = kind === 'products' ? t.catalogue.newProduct : t.catalogue.newCustomer;

  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const list = useCatalogueList(kind, showArchived);
  const onError = (error: unknown) => toast.show(error instanceof Error ? error.message : t.app.error, 'error');

  const create = useCreateCatalogueItem(kind);
  const setActive = useSetCatalogueActive(kind);
  const rename = useRenameCatalogueItem(kind);
  const reorder = useReorderCatalogue(kind);

  const rows = list.data ?? [];
  const active = rows.filter((row) => row.active);

  const move = (row: Product, delta: number) => {
    const index = active.findIndex((item) => item.id === row.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= active.length) return;

    const ids = active.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate(ids, { onError });
  };

  const onCreate = () => {
    if (!name.trim()) return;
    create.mutate(name.trim(), { onSuccess: () => setName(''), onError });
  };

  const onArchive = (row: Product) => {
    if (row.active) {
      Alert.alert(t.catalogue.confirmArchive(row.name), undefined, [
        { text: t.actions.cancel, style: 'cancel' },
        { text: t.actions.archive, style: 'destructive', onPress: () => setActive.mutate({ id: row.id, active: false }, { onError }) },
      ]);
    } else {
      setActive.mutate({ id: row.id, active: true }, { onError });
    }
  };

  const onSaveRename = () => {
    if (!editing) return;
    const trimmed = editing.name.trim();
    const current = rows.find((r) => r.id === editing.id);
    if (trimmed && current && trimmed !== current.name) {
      rename.mutate({ id: editing.id, name: trimmed }, { onError });
    }
    setEditing(null);
  };

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Screen>
        <View className="mb-3 flex-row items-center gap-1">
          <Pressable
            onPress={() => router.push('/plus')}
            accessibilityLabel={t.actions.back}
            className="-ml-2 h-11 w-11 items-center justify-center rounded-xl active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </Pressable>
          <Text className="text-xl font-semibold text-slate-900">{title}</Text>
        </View>

        <View className="mb-3 flex-row gap-2">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={placeholder}
            maxLength={80}
            onSubmitEditing={onCreate}
            className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base"
          />
          <Button onPress={onCreate} disabled={!name.trim() || create.isPending}>
            {t.actions.add}
          </Button>
        </View>

        {list.isPending ? <Spinner /> : null}
        {list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : null}

        {list.data && rows.length === 0 ? <EmptyState>{t.catalogue.empty}</EmptyState> : null}

        {rows.length > 0 ? (
          <Card className="divide-y divide-slate-100">
            {rows.map((row) => (
              <View key={row.id} className="flex-row items-center gap-2 p-3">
                {editing?.id === row.id ? (
                  <TextInput
                    value={editing.name}
                    onChangeText={(text) => setEditing({ id: row.id, name: text })}
                    autoFocus
                    onSubmitEditing={onSaveRename}
                    onBlur={onSaveRename}
                    maxLength={80}
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-brand-300 bg-white px-2 text-base"
                  />
                ) : (
                  <Pressable onPress={() => setEditing({ id: row.id, name: row.name })} className="min-w-0 flex-1">
                    <Text
                      className={`font-medium ${row.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}
                      numberOfLines={1}
                    >
                      {row.name}
                    </Text>
                  </Pressable>
                )}

                {!row.active ? <Badge>{t.catalogue.archived}</Badge> : null}

                {row.active ? (
                  <View className="shrink-0 flex-row items-center">
                    <Pressable onPress={() => move(row, -1)} accessibilityLabel={t.actions.up} className="h-11 w-9 items-center justify-center rounded-xl active:bg-slate-100">
                      <Ionicons name="chevron-up" size={18} color="#94a3b8" />
                    </Pressable>
                    <Pressable onPress={() => move(row, 1)} accessibilityLabel={t.actions.down} className="h-11 w-9 items-center justify-center rounded-xl active:bg-slate-100">
                      <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                    </Pressable>
                  </View>
                ) : null}

                <Pressable onPress={() => onArchive(row)} className="shrink-0 rounded-xl px-2 py-2 active:bg-slate-100">
                  <Text className={`text-xs font-medium ${row.active ? 'text-red-700' : 'text-brand-700'}`}>
                    {row.active ? t.actions.archive : t.actions.restore}
                  </Text>
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-xs text-slate-400">{t.catalogue.archiveHelp}</Text>
          <Pressable onPress={() => setShowArchived((current) => !current)} className="shrink-0 rounded-xl px-2 py-2 active:bg-brand-50">
            <Text className="text-xs font-medium text-brand-700">{showArchived ? t.catalogue.hideArchived : t.catalogue.showArchived}</Text>
          </Pressable>
        </View>
      </Screen>
    </ScrollView>
  );
}
