import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Pressable, Platform, ScrollView, StyleSheet, type ImageSourcePropType } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { cryptogramAsset } from '../cryptogramAssets';

import {
  CATEGORY_FAMILIES,
  categoryFamilyById,
  type FamilyItem,
  type CategoryFamily,
  type FeatherName,
  type MerchantPredicate,
} from '../categoryFamilies';

/** State machine simple de la navigation catégories (Niveau 1 familles ↔ Niveau 2 sous-catégories). */
type CategoryLevel = 'family' | 'subcategory';
interface CategoryNavigationState {
  level: CategoryLevel;
  activeFamily: string | null;
  activeSubcategory: string | null;
}

const INITIAL: CategoryNavigationState = { level: 'family', activeFamily: null, activeSubcategory: null };

interface Props {
  /** Émet le prédicat de filtrage résolu (null = « Tous »). La carte l'applique sans recharger. */
  onChange: (match: MerchantPredicate | null) => void;
}

/**
 * CategoryNavigation — navigation catégories à DEUX niveaux, façon référence YOOTOO.
 *  • level 'family'      : grandes familles (Tous + 7 familles).
 *  • level 'subcategory' : la barre est remplacée par les sous-catégories de `activeFamily`,
 *    précédées d'un retour « ‹ » qui revient au Niveau 1.
 * Capsules verre premium, capsule active en vert, fondu au changement de niveau. Le composant ne
 * remonte qu'un PRÉDICAT (`onChange`) : la carte filtre réellement marqueurs + liste. Aucune donnée
 * dupliquée (prédicats issus de `categoryFamilies`). Discovery Engine non touché.
 */
export function CategoryNavigation({ onChange }: Props) {
  const [nav, setNav] = useState<CategoryNavigationState>(INITIAL);
  const family = categoryFamilyById(nav.activeFamily);

  const selectTous = useCallback(() => {
    setNav(INITIAL);
    onChange(null);
  }, [onChange]);

  const openFamily = useCallback(
    (fam: CategoryFamily) => {
      setNav({ level: 'subcategory', activeFamily: fam.id, activeSubcategory: null });
      onChange(fam.match); // ouverture famille → carte filtrée sur toute la famille
    },
    [onChange],
  );

  const back = useCallback(() => {
    setNav(INITIAL);
    onChange(null);
  }, [onChange]);

  const toggleSub = useCallback(
    (fam: CategoryFamily, it: FamilyItem) => {
      setNav((s) => ({ ...s, activeSubcategory: s.activeSubcategory === it.id ? null : it.id }));
      // Sélection → filtre sous-catégorie ; désélection → retour au filtre famille.
      onChange(nav.activeSubcategory === it.id ? fam.match : it.match);
    },
    [nav.activeSubcategory, onChange],
  );

  return (
    <Animated.View key={nav.activeFamily ?? 'root'} entering={FadeIn.duration(190)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {nav.level === 'subcategory' && family ? (
          <>
            <Capsule icon="chevron-left" onPress={back} accessibilityLabel="Retour aux familles" back />
            {family.items.map((it) => (
              <Capsule
                key={it.id}
                label={it.label}
                imageIcon={it.iconId ? cryptogramAsset(it.iconId) : undefined}
                active={nav.activeSubcategory === it.id}
                onPress={() => toggleSub(family, it)}
              />
            ))}
          </>
        ) : (
          <>
            <Capsule icon="crosshair" label="Tous" active onPress={selectTous} />
            {CATEGORY_FAMILIES.map((fam) => (
              <Capsule key={fam.id} icon={fam.icon} label={fam.label} onPress={() => openFamily(fam)} />
            ))}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function Capsule({
  label,
  icon,
  imageIcon,
  active = false,
  back = false,
  onPress,
  accessibilityLabel,
}: {
  label?: string;
  icon?: FeatherName;
  /** Pictogramme cryptogramme YOOTOO (prioritaire sur `icon`). */
  imageIcon?: ImageSourcePropType;
  active?: boolean;
  back?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const iconColor = back ? '#8EB67B' : glass.onDark;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : [glass.panel, styles.glassShadow],
        back && styles.chipBack,
        pressed && styles.chipPressed,
      ]}>
      {imageIcon ? (
        <Image source={imageIcon} style={styles.picto} contentFit="contain" />
      ) : icon ? (
        <Feather name={icon} size={16} color={iconColor} />
      ) : null}
      {label ? (
        <YText variant="caption" style={[styles.label, { color: glass.onDark }]} numberOfLines={1}>
          {label}
        </YText>
      ) : null}
    </Pressable>
  );
}

// Vert principal YOOTOO (capsule active) — aligné sur la DA sombre (token fixe car verre hors thème).
const ACTIVE_GREEN = '#6A9B63';

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingRight: spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: ACTIVE_GREEN, borderColor: ACTIVE_GREEN },
  chipBack: { paddingHorizontal: spacing.sm + 2, borderColor: 'rgba(142,182,123,0.55)' },
  chipPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  picto: { width: 22, height: 22 },
  label: { fontWeight: '600' },
  // Ombre extrêmement douce → capsule flottante sur la carte.
  glassShadow: Platform.select({
    web: { boxShadow: '0 6px 20px rgba(0,0,0,0.22)' },
    default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  }),
});
