import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Cryptogram } from '@/components/merchants/Cryptogram';
import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { cryptogramColor } from '@/features/merchants';
import { MerchantCategoryBar } from '@/features/merchants/components/MerchantCategoryBar';
import {
  MERCHANT_CATEGORY_FILTERS,
  type CategorySubEntry,
  type MerchantCategoryFilter,
  type MerchantCategoryId,
} from '@/features/merchants/merchantCategoryFilters';

const IS_WEB = Platform.OS === 'web';

export interface CategoryMegaMenuProps {
  /** Catégories affichées (défaut : catalogue officiel partagé avec /merchants). */
  categories?: MerchantCategoryFilter[];
  /** Sous-catégorie choisie → injecte une recherche puis navigue. */
  onSelectSubcategory: (category: MerchantCategoryFilter, subcategory: CategorySubEntry) => void;
  /** « Voir les commerçants » → filtre /merchants sur la catégorie. */
  onSelectCategory: (category: MerchantCategoryFilter) => void;
  /** « Voir sur la carte » → écran Carte. */
  onViewMap: (category: MerchantCategoryFilter) => void;
}

/**
 * CategoryMegaMenu — méga-menu de découverte de l'Accueil, bâti sur le MÊME système que
 * la page Commerçants : barre de cryptogrammes partagée (MerchantCategoryBar), même config
 * (MERCHANT_CATEGORY_FILTERS), mêmes couleurs. Web : ouverture au survol (remplacement
 * instantané) ; Mobile : tap. Le panneau enrichit la catégorie active (sous-catégories +
 * accès direct). Autonome : ne fait que remonter des callbacks (recherche/navigation dehors).
 */
export function CategoryMegaMenu({
  categories = MERCHANT_CATEGORY_FILTERS,
  onSelectSubcategory,
  onSelectCategory,
  onViewMap,
}: CategoryMegaMenuProps) {
  const [openId, setOpenId] = useState<MerchantCategoryId | null>(null);
  const active = categories.find((c) => c.id === openId) ?? null;
  const accent = active ? cryptogramColor(active.icon) : colors.primary;

  // Web : fermeture auto quand la souris quitte TOUT le bloc (barre + panneau). En RN Web,
  // `onHoverOut` suit la sémantique `mouseleave` : il ne se déclenche pas en passant sur un
  // descendant (chip → panneau) → aucun flicker, fermeture seulement à la sortie complète.
  return (
    <Pressable
      style={styles.root}
      onHoverOut={IS_WEB ? () => setOpenId(null) : undefined}
      focusable={false}
      accessible={false}>
      <MerchantCategoryBar
        active={openId}
        onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
        onHover={(id) => setOpenId(id)}
      />

      {active ? (
        <Animated.View entering={FadeIn.duration(140)} style={[styles.panel, shadows.md]}>
          <View style={styles.panelHeader}>
            <Cryptogram id={active.icon} size={30} />
            <YText variant="subtitle" style={{ color: accent }}>
              {active.label}
            </YText>
          </View>

          {active.subcategories?.length ? (
            <View style={styles.grid}>
              {active.subcategories.map((subcategory) => (
                <Pressable
                  key={subcategory.id}
                  onPress={() => {
                    onSelectSubcategory(active, subcategory);
                    setOpenId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={subcategory.label}
                  style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
                  <View style={[styles.dot, { backgroundColor: accent }]} />
                  <YText variant="body" numberOfLines={1} style={styles.tileLabel}>
                    {subcategory.label}
                  </YText>
                </Pressable>
              ))}
            </View>
          ) : (
            <YText variant="body" color="muted">
              Explorez tous les commerçants de cette catégorie.
            </YText>
          )}

          <View style={styles.actions}>
            <View style={styles.actionBtn}>
              <YButton
                label="Voir les commerçants"
                variant="primary"
                fullWidth
                onPress={() => {
                  onSelectCategory(active);
                  setOpenId(null);
                }}
              />
            </View>
            <View style={styles.actionBtn}>
              <YButton
                label="Voir sur la carte"
                variant="secondary"
                fullWidth
                onPress={() => {
                  onViewMap(active);
                  setOpenId(null);
                }}
              />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  panel: {
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 130,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tilePressed: {
    opacity: 0.7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tileLabel: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
