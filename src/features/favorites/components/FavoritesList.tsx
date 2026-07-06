import { StyleSheet, View } from 'react-native';

import { MerchantListRow } from '@/components/merchants/MerchantListRow';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { spacing } from '@/design/tokens/spacing';
import type { Merchant } from '@/features/merchants';

import { useFavoriteIds } from '../favoritesStore';

interface Props {
  /** Corpus dans lequel résoudre les ids favoris (déjà chargé côté carte). */
  merchants: Merchant[];
  onSelect: (id: string) => void;
}

/**
 * Contenu de la section « Favoris » : liste des commerces enregistrés (résolus depuis le
 * corpus déjà en mémoire → aucun fetch, aucun coût perf) ou état vide élégant.
 * Rendu sur fond sombre (verre dépoli) → textes clairs (`onDark`).
 */
export function FavoritesList({ merchants, onSelect }: Props) {
  const ids = useFavoriteIds();
  const favorites = ids
    .map((id) => merchants.find((m) => m.id === id))
    .filter((m): m is Merchant => Boolean(m));

  if (favorites.length === 0) {
    return (
      <View style={styles.empty}>
        <YText variant="subtitle" style={{ color: glass.onDark }}>
          Vous n'avez pas encore de favoris.
        </YText>
        <YText variant="body" style={{ color: glass.onDarkMuted }}>
          Appuyez sur ❤️ depuis une fiche commerce pour retrouver facilement vos adresses
          préférées.
        </YText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {favorites.map((m) => (
        <MerchantListRow key={m.id} merchant={m} onDark onPress={() => onSelect(m.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },
  empty: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
