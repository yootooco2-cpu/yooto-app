import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { spacing } from '@/design/tokens/spacing';

import { type MerchantPredicate } from '../categoryFamilies';
import type { Merchant } from '../types';
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
  /** Corpus actuellement chargé par l'app (sous-ensemble de la base) — comptes par sous-catégorie
   *  + masquage des vides, transmis à la navigation. */
  merchants?: Merchant[];
}

/**
 * SearchMenu — MENU OFFICIEL YOOTOO (Design System). Barre de recherche premium (verre) +
 * navigation catégories hiérarchique, dans un seul composant PARTAGÉ. Utilisé à l'identique par
 * Carte, Commerçants et Accueil → identité unique, zéro duplication : toute évolution de ce menu
 * profite automatiquement aux trois écrans. Entièrement configurable (titre, sous-titre, action,
 * placeholder, recherche, comportement via `onCategoryChange`). Ne rend qu'un PRÉDICAT ; chaque
 * écran l'applique à sa liste — la mise en page/le fond restent à la charge de l'écran hôte.
 */
export function SearchMenu({ query, onQueryChange, onCategoryChange, placeholder, title, subtitle, trailing, merchants }: Props) {
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

      <CategoryNavigation onChange={onCategoryChange} merchants={merchants} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Le menu (et donc le RIDEAU de sous-catégories qui déborde en absolu) doit toujours passer
  // AU-DESSUS des frères suivants (carrousels de recommandations, grille commerces…). Sans cela,
  // ces frères, plus bas dans le DOM, se peignent par-dessus le rideau. On élève tout le sous-arbre
  // du menu ; le rideau interne suit sa pile locale. `position:'relative'` rend le zIndex effectif.
  wrap: { gap: spacing.sm, position: 'relative', zIndex: 20 },
  // La salutation coiffe le menu avec un peu d'air avant la recherche (hiérarchie du héro).
  head: { gap: 2, paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
  // Ombre de texte très douce : lisibilité garantie sur les zones claires du héro d'ambiance,
  // invisible en tant qu'effet (jamais un contour).
  title: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(23,32,26,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    textShadowColor: 'rgba(23,32,26,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchFlex: { flex: 1 },
});
