import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { spacing } from '@/design/tokens/spacing';

import { type MerchantPredicate } from '../categoryFamilies';
import { CategoryNavigation } from './CategoryNavigation';

interface Props {
  /** Valeur + contrôle de la recherche. */
  query: string;
  onQueryChange: (q: string) => void;
  /** Prédicat de filtrage résolu par la navigation catégories (null = aucune catégorie). */
  onCategoryChange: (match: MerchantPredicate | null) => void;
  placeholder?: string;
  /** En-tête optionnel (ex. salutation sur l'Accueil). */
  title?: string;
  subtitle?: string;
  /** Action optionnelle à droite de la recherche (ex. avatar). */
  trailing?: ReactNode;
}

/**
 * SearchMenu — MENU OFFICIEL YOOTOO (Design System). Barre de recherche premium (verre) +
 * navigation catégories hiérarchique, dans un seul composant PARTAGÉ. Utilisé à l'identique par
 * Carte, Commerçants et Accueil → identité unique, zéro duplication : toute évolution de ce menu
 * profite automatiquement aux trois écrans. Entièrement configurable (titre, sous-titre, action,
 * placeholder, recherche, comportement via `onCategoryChange`). Ne rend qu'un PRÉDICAT ; chaque
 * écran l'applique à sa liste — la mise en page/le fond restent à la charge de l'écran hôte.
 */
export function SearchMenu({ query, onQueryChange, onCategoryChange, placeholder, title, subtitle, trailing }: Props) {
  return (
    <View style={styles.wrap}>
      {title || subtitle ? (
        <View style={styles.head}>
          {title ? <YText style={[styles.title, { color: glass.onDark }]}>{title}</YText> : null}
          {subtitle ? <YText style={[styles.subtitle, { color: glass.onDarkMuted }]}>{subtitle}</YText> : null}
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <View style={styles.searchFlex}>
          <YSearchBar variant="glass" value={query} onChangeText={onQueryChange} placeholder={placeholder} />
        </View>
        {trailing}
      </View>

      <CategoryNavigation onChange={onCategoryChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { gap: 2, paddingHorizontal: spacing.xs },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 19 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchFlex: { flex: 1 },
});
