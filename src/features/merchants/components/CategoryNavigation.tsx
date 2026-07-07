import { Feather } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, Platform, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import {
  CATEGORY_FAMILIES,
  categoryFamilyById,
  type FamilyItem,
  type CategoryFamily,
  type FeatherName,
  type MerchantPredicate,
} from '../categoryFamilies';

interface Props {
  /** Émet le prédicat de filtrage résolu (null = « Tous »). La carte l'applique sans recharger. */
  onChange: (match: MerchantPredicate | null) => void;
}

/**
 * CategoryNavigation — navigation catégories à DEUX niveaux, façon référence YOOTOO.
 *  • FamilyLevel : grandes familles (Tous + 7 familles) toujours au premier plan.
 *  • SubcategoryLevel : la barre est remplacée par les sous-catégories de la famille + retour « ‹ ».
 * Capsules verre premium, capsule active en vert, transition fade + slide (fondu au changement de
 * niveau). Aucune donnée dupliquée : les prédicats viennent de `categoryFamilies` (catégories
 * existantes regroupées). Le composant est autonome ; il ne remonte que le `match` à appliquer.
 */
export function CategoryNavigation({ onChange }: Props) {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const family = categoryFamilyById(familyId);

  const selectTous = useCallback(() => {
    setFamilyId(null);
    setSubId(null);
    onChange(null);
  }, [onChange]);

  const openFamily = useCallback(
    (fam: CategoryFamily) => {
      setFamilyId(fam.id);
      setSubId(null);
      onChange(fam.match); // ouverture famille → carte filtrée sur toute la famille
    },
    [onChange],
  );

  const back = useCallback(() => {
    setFamilyId(null);
    setSubId(null);
    onChange(null);
  }, [onChange]);

  const toggleSub = useCallback(
    (fam: CategoryFamily, it: FamilyItem) => {
      if (subId === it.id) {
        setSubId(null);
        onChange(fam.match); // désélection → retour au filtre famille
      } else {
        setSubId(it.id);
        onChange(it.match);
      }
    },
    [subId, onChange],
  );

  return (
    <Animated.View key={familyId ?? 'root'} entering={FadeInDown.duration(200)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {family ? (
          <>
            <Capsule icon="chevron-left" onPress={back} accessibilityLabel="Retour aux familles" back />
            {family.items.map((it) => (
              <Capsule key={it.id} label={it.label} active={subId === it.id} onPress={() => toggleSub(family, it)} />
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
  active = false,
  back = false,
  onPress,
  accessibilityLabel,
}: {
  label?: string;
  icon?: FeatherName;
  active?: boolean;
  back?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const iconColor = active ? glass.onDark : back ? '#8EB67B' : glass.onDark;
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
      {icon ? <Feather name={icon} size={16} color={iconColor} /> : null}
      {label ? (
        <YText variant="caption" style={[styles.label, { color: active ? glass.onDark : glass.onDark }]} numberOfLines={1}>
          {label}
        </YText>
      ) : null}
    </Pressable>
  );
}

// Vert principal YOOTOO (capsule active) — aligné sur la DA sombre (tokens hors thème car verre fixe).
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
  label: { fontWeight: '600' },
  // Ombre extrêmement douce → capsule flottante sur la carte.
  glassShadow: Platform.select({
    web: { boxShadow: '0 6px 20px rgba(0,0,0,0.22)' },
    default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  }),
});
