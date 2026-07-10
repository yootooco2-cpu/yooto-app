import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';

interface Props {
  /** Meilleures adresses de la catégorie sélectionnée — déjà classées (topCategory.ts). */
  merchants: Merchant[];
  onSelect: (id: string) => void;
}

/**
 * TopCategoryStrip — bande horizontale des MEILLEURES ADRESSES de la catégorie sélectionnée.
 *
 * Visible UNIQUEMENT quand une catégorie est active (l'appelant gate). Aucune notion de
 * favoris personnels : ce sont les meilleurs commerces locaux (partenaires d'abord, puis
 * score local, note Google, avis, proximité — voir `topCategory.ts`).
 *
 * FLOTTANTE au-dessus du menu bas — SANS conteneur visible (décision UX « intégration ») :
 * aucun fond, aucune bordure, aucun effet « carte posée ». Les SEULES surfaces visibles
 * sont les cartes commerçants elles-mêmes, qui flottent directement au-dessus de la carte
 * (verre + ombre portée individuelle). Émergence FadeInUp, disparition FadeOutDown.
 */
export function TopCategoryStrip({ merchants, onSelect }: Props) {
  if (merchants.length === 0) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(240)}
      exiting={FadeOutDown.duration(180)}
      style={styles.wrap}>
      {/* AUCUN titre (décision UX) : les images des commerçants parlent d'elles-mêmes —
          pas d'effet « bloc marketing », l'interface reste au service de la carte. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {merchants.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => onSelect(m.id)}
            accessibilityRole="button"
            accessibilityLabel={m.name}
            style={({ pressed }) => [styles.card, glass.panel, shadows.sm, pressed && styles.pressed]}>
            <View>
              <MerchantPhoto uri={getMerchantCoverPhoto(m)} height={72} rounded={radii.md} />
              {m.hasRewards ? (
                <View style={styles.partnerBadge}>
                  <Feather name="award" size={10} color="#FFFFFF" />
                  <YText variant="caption" style={styles.partnerText}>
                    Partenaire
                  </YText>
                </View>
              ) : null}
            </View>
            <YText variant="bodyStrong" numberOfLines={1} style={{ color: glass.onDark }}>
              {m.name}
            </YText>
            <View style={styles.metaRow}>
              <YText variant="caption" numberOfLines={1} style={styles.meta}>
                {[CATEGORY_LABELS[m.category], m.distanceLabel !== '—' ? m.distanceLabel : m.city]
                  .filter(Boolean)
                  .join(' · ')}
              </YText>
              {typeof m.rating === 'number' ? (
                <View style={styles.rating}>
                  <Feather name="star" size={10} color={glass.onDark} />
                  <YText variant="caption" style={{ color: glass.onDark }}>
                    {m.rating.toFixed(1)}
                  </YText>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Conteneur INVISIBLE : ni fond, ni bordure, ni clip (le clip couperait l'ombre des cartes).
  wrap: {},
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, // respiration pour l'ombre portée des cartes
  },
  card: {
    width: 172,
    borderRadius: radii.lg,
    padding: spacing.xs,
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  partnerBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(31,122,77,0.92)',
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  partnerText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  meta: {
    color: glass.onDarkMuted,
    flexShrink: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
