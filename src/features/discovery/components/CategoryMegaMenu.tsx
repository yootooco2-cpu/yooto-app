import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import {
  CATEGORY_MEGA_MENU,
  type MegaCategory,
  type MegaCategoryId,
  type MegaSubcategory,
} from '../categoryMegaMenu';

const IS_WEB = Platform.OS === 'web';

export interface CategoryMegaMenuProps {
  /** Catégories affichées (défaut : catalogue officiel YOOTOO). */
  categories?: MegaCategory[];
  /** Catégorie ouverte (contrôlé). Si omis → semi-contrôlé (état interne). */
  activeCategoryId?: MegaCategoryId | null;
  onActiveCategoryChange?: (id: MegaCategoryId | null) => void;
  onSelectCategory?: (category: MegaCategory) => void;
  onSelectSubcategory: (category: MegaCategory, subcategory: MegaSubcategory) => void;
  onViewAllNearby: (category: MegaCategory) => void;
  onViewMap: (category: MegaCategory) => void;
}

/**
 * CategoryMegaMenu — méga-menu de découverte (inspiration Leboncoin, adapté YOOTOO).
 * Rangée horizontale de catégories + panneau de sous-catégories en grille.
 * - Web : ouverture au survol (Platform.OS === 'web') ; tap partout.
 * - Fermeture automatique après sélection d'une sous-catégorie / d'une action.
 * Autonome : ne fait que remonter des callbacks (le branchement décide recherche/navigation).
 */
export function CategoryMegaMenu({
  categories = CATEGORY_MEGA_MENU,
  activeCategoryId,
  onActiveCategoryChange,
  onSelectCategory,
  onSelectSubcategory,
  onViewAllNearby,
  onViewMap,
}: CategoryMegaMenuProps) {
  const [internalOpen, setInternalOpen] = useState<MegaCategoryId | null>(null);
  const isControlled = activeCategoryId !== undefined;
  const openId = isControlled ? activeCategoryId : internalOpen;

  const setOpen = (id: MegaCategoryId | null) => {
    if (!isControlled) setInternalOpen(id);
    onActiveCategoryChange?.(id);
  };

  const openCategory = (category: MegaCategory) => {
    if (openId === category.id) return;
    setOpen(category.id);
    onSelectCategory?.(category);
  };

  const toggleCategory = (category: MegaCategory) => {
    const next = openId === category.id ? null : category.id;
    setOpen(next);
    if (next) onSelectCategory?.(category);
  };

  const active = categories.find((c) => c.id === openId) ?? null;

  const handleSubcategory = (category: MegaCategory, subcategory: MegaSubcategory) => {
    onSelectSubcategory(category, subcategory);
    setOpen(null); // fermeture auto après sélection
  };

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {categories.map((category) => {
          const isActive = category.id === openId;
          return (
            <Pressable
              key={category.id}
              onPress={() => toggleCategory(category)}
              onHoverIn={IS_WEB ? () => openCategory(category) : undefined}
              accessibilityRole="button"
              accessibilityState={{ expanded: isActive }}
              accessibilityLabel={category.label}
              style={[
                styles.chip,
                isActive && { borderColor: category.color, backgroundColor: `${category.color}14` },
              ]}>
              <YText style={styles.chipIcon}>{category.icon}</YText>
              <YText
                variant="bodyStrong"
                style={[styles.chipLabel, isActive ? { color: category.color } : null]}>
                {category.label}
              </YText>
            </Pressable>
          );
        })}
      </ScrollView>

      {active ? (
        <View style={[styles.panel, shadows.md]}>
          <View style={styles.panelHeader}>
            <YText style={styles.panelIcon}>{active.icon}</YText>
            <YText variant="subtitle">{active.label}</YText>
          </View>

          <View style={styles.grid}>
            {active.subcategories.map((subcategory) => (
              <Pressable
                key={subcategory.id}
                onPress={() => handleSubcategory(active, subcategory)}
                accessibilityRole="button"
                accessibilityLabel={subcategory.label}
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
                <View style={[styles.dot, { backgroundColor: active.color }]} />
                <YText variant="body" numberOfLines={1} style={styles.tileLabel}>
                  {subcategory.label}
                </YText>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <View style={styles.actionBtn}>
              <YButton
                label="Voir tout autour de moi"
                variant="primary"
                fullWidth
                onPress={() => {
                  onViewAllNearby(active);
                  setOpen(null);
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
                  setOpen(null);
                }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    color: colors.text,
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
  panelIcon: {
    fontSize: 20,
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
