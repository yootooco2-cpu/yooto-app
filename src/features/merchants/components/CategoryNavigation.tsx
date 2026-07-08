import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Platform, ScrollView, StyleSheet, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { CATEGORY_FAMILIES, type CategoryNode, type FeatherName, type MerchantPredicate } from '../categoryFamilies';
import { cryptogramAsset } from '../cryptogramAssets';
import { familyPicto } from '../familyPictos';

interface Props {
  /** Émet le prédicat de filtrage résolu (null = « Tous »). La carte l'applique sans recharger. */
  onChange: (match: MerchantPredicate | null) => void;
}

/**
 * CategoryNavigation — navigateur catégories HIÉRARCHIQUE GÉNÉRIQUE (N niveaux), piloté par un
 * arbre `CategoryNode`. Fonctionne pour 2 niveaux (Alimentation → sous-catégories) comme pour 3+
 * (Artisanat → familles → métiers), et se réutilise pour toute future famille multi-niveaux.
 *
 * Une pile de navigation (`path`) mémorise la descente : on affiche les enfants du dernier nœud
 * (ou les grandes familles à la racine). Un nœud BRANCHE (`children`) → on descend d'un niveau ;
 * un nœud FEUILLE → filtre la carte. Retour « ‹ » = on remonte. Capsules verre premium, capsule
 * active en vert, halo d'accent, fondu au changement de niveau — mêmes composants/animations
 * partout. Le composant ne remonte qu'un PRÉDICAT ; aucune donnée dupliquée ; Discovery non touché.
 */
export function CategoryNavigation({ onChange }: Props) {
  // Pile de descente : [] = racine (grandes familles). Dernier nœud = niveau courant.
  const [path, setPath] = useState<CategoryNode[]>([]);
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);

  const current = path.length ? path[path.length - 1] : null;
  const nodes = current ? current.children ?? [] : CATEGORY_FAMILIES;
  const rootFamilyId = path.length ? path[0].id : '';

  const selectTous = () => {
    setPath([]);
    setActiveLeafId(null);
    onChange(null);
  };

  const drill = (node: CategoryNode) => {
    setPath([...path, node]);
    setActiveLeafId(null);
    onChange(node.match ?? null); // ouverture branche → filtre = union de la branche
  };

  const back = () => {
    const next = path.slice(0, -1);
    setPath(next);
    setActiveLeafId(null);
    onChange(next.length ? next[next.length - 1].match ?? null : null); // remonte au filtre parent
  };

  const selectLeaf = (node: CategoryNode) => {
    const isActive = activeLeafId === node.id;
    setActiveLeafId(isActive ? null : node.id);
    onChange(isActive ? current?.match ?? null : node.match ?? null); // désélection → filtre parent
  };

  const onTap = (node: CategoryNode) => (node.children && node.children.length ? drill(node) : selectLeaf(node));

  const picto = (node: CategoryNode): ImageSourcePropType | undefined =>
    node.iconId ? cryptogramAsset(node.iconId) : node.pictoKey ? familyPicto(rootFamilyId, node.pictoKey) : undefined;

  return (
    <Animated.View key={path.map((p) => p.id).join('/') || 'root'} entering={FadeIn.duration(190)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {path.length ? (
          <Capsule icon="chevron-left" onPress={back} accessibilityLabel="Retour" back />
        ) : (
          <Capsule icon="crosshair" label="Tous" active onPress={selectTous} />
        )}
        {nodes.map((node) => (
          <Capsule
            key={node.id}
            label={node.label}
            icon={node.icon}
            imageIcon={picto(node)}
            accent={node.accent}
            active={activeLeafId === node.id}
            onPress={() => onTap(node)}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function Capsule({
  label,
  icon,
  imageIcon,
  accent,
  active = false,
  back = false,
  onPress,
  accessibilityLabel,
}: {
  label?: string;
  icon?: FeatherName;
  /** Pictogramme cryptogramme YOOTOO (prioritaire sur `icon`). */
  imageIcon?: ImageSourcePropType;
  /** Touche de couleur d'accent (halo discret aux états actif/hover). */
  accent?: string;
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
      style={({ pressed, hovered }) => [
        styles.chip,
        active ? styles.chipActive : [glass.panel, styles.glassShadow],
        back && styles.chipBack,
        accent && (active || (hovered && !active)) ? accentGlow(accent) : null,
        pressed && styles.chipPressed,
      ]}>
      {imageIcon ? (
        <Image source={imageIcon} style={[styles.picto, !active && styles.pictoInactive]} contentFit="contain" />
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

/** Halo de couleur TRÈS DISCRET dérivé de l'accent de la sous-catégorie (states actif / hover). */
const accentGlow = (color: string): ViewStyle =>
  Platform.OS === 'web'
    ? ({ boxShadow: `0 4px 18px ${color}55` } as unknown as ViewStyle)
    : { shadowColor: color, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 };

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
  // État inactif : pictogramme très légèrement désaturé/atténué (cohérent avec la référence).
  pictoInactive: { opacity: 0.92 },
  label: { fontWeight: '600' },
  // Ombre extrêmement douce → capsule flottante sur la carte.
  glassShadow: Platform.select({
    web: { boxShadow: '0 6px 20px rgba(0,0,0,0.22)' },
    default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  }),
});
