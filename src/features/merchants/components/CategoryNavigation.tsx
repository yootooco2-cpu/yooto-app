import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Platform, ScrollView, StyleSheet, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { CATEGORY_FAMILIES, type CategoryNode, type FeatherName, type MerchantPredicate } from '../categoryFamilies';
import { cryptogramAsset } from '../cryptogramAssets';
import { familyPicto } from '../familyPictos';
import type { Merchant } from '../types';

interface Props {
  /** Émet le prédicat de filtrage résolu (null = aucune catégorie). La carte l'applique sans recharger. */
  onChange: (match: MerchantPredicate | null) => void;
  /**
   * Corpus servant à COMPTER les résultats par sous-catégorie. C'est le CORPUS ACTUELLEMENT
   * CHARGÉ PAR L'APPLICATION (un sous-ensemble de la base Supabase, pas l'ensemble des fiches) —
   * décision produit : on compte sur tout le corpus chargé, jamais sur la seule zone visible.
   * Permet « Tout (N) », le nombre réel par ligne et le MASQUAGE des sous-catégories à 0 résultat
   * (la taxonomie reste intacte : filtrage au rendu).
   */
  merchants?: Merchant[];
}

/**
 * CategoryNavigation — barre de grandes familles + PANNEAU DÉROULANT (glassmorphism) des
 * sous-catégories. La rangée des familles reste toujours visible ; un clic sur une famille fait
 * DESCENDRE un panneau juste en dessous avec ses sous-catégories (grille verticale, pas de scroll
 * latéral). Refermable : re-clic sur la famille, choix d'une sous-catégorie, ou clic extérieur.
 * Générique N niveaux : une sous-catégorie qui a elle-même des enfants (Artisanat) approfondit le
 * panneau avec un retour « ‹ ». Le composant ne remonte qu'un PRÉDICAT ; Discovery non touché.
 */
export function CategoryNavigation({ onChange, merchants = [] }: Props) {
  // Pile du PANNEAU ouvert : [] = fermé ; [famille] = panneau famille ; [famille, sous-famille] = plus profond.
  const [panelPath, setPanelPath] = useState<CategoryNode[]>([]);
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);

  const isOpen = panelPath.length > 0;
  const panelNode = isOpen ? panelPath[panelPath.length - 1] : null;
  const panelNodes = panelNode?.children ?? [];
  const panelRootId = isOpen ? panelPath[0].id : '';

  // Compte les commerces du corpus CHARGÉ PAR L'APP matchant un nœud (mémoïsé par corpus, calcul
  // paresseux → seuls les nœuds réellement affichés sont comptés). `hasCounts` false = fallback sûr
  // (aucun corpus fourni) : on n'affiche ni compte ni masquage, comportement historique préservé.
  const hasCounts = merchants.length > 0;
  const countOf = useMemo(() => {
    const cache = new Map<string, number>();
    return (node: CategoryNode): number => {
      const cached = cache.get(node.id);
      if (cached !== undefined) return cached;
      const n = node.match ? merchants.reduce((acc, m) => (node.match!(m) ? acc + 1 : acc), 0) : 0;
      cache.set(node.id, n);
      return n;
    };
  }, [merchants]);

  const close = () => setPanelPath([]);

  const applyLeaf = (familyId: string, node: CategoryNode) => {
    const isActive = activeLeafId === node.id;
    setActiveLeafId(isActive ? null : node.id);
    setActiveFamilyId(isActive ? null : familyId);
    onChange(isActive ? null : node.match ?? null);
    setPanelPath([]); // choisir une sous-catégorie referme le panneau
  };

  // « Tout (N) » : applique le prédicat UNION du nœud de panneau courant (famille ou sous-branche).
  const applyAll = (node: CategoryNode) => {
    const allId = `${node.id}::all`;
    const isActive = activeLeafId === allId;
    setActiveLeafId(isActive ? null : allId);
    setActiveFamilyId(isActive ? null : (panelPath[0]?.id ?? node.id));
    onChange(isActive ? null : node.match ?? null);
    setPanelPath([]);
  };

  const onTapFamily = (node: CategoryNode) => {
    if (node.children && node.children.length) {
      setPanelPath((p) => (p[0]?.id === node.id ? [] : [node])); // toggle du panneau
    } else {
      applyLeaf(node.id, node); // feuille de 1er niveau (Nature) → filtre direct
    }
  };

  const onTapSub = (node: CategoryNode) => {
    if (node.children && node.children.length) {
      setPanelPath((p) => [...p, node]); // sous-branche (Artisanat) → on approfondit le panneau
    } else {
      applyLeaf(panelRootId, node);
    }
  };

  const panelBack = () => setPanelPath((p) => p.slice(0, -1));

  const picto = (node: CategoryNode, rootId: string): ImageSourcePropType | undefined =>
    node.iconId ? cryptogramAsset(node.iconId) : node.pictoKey ? familyPicto(rootId, node.pictoKey) : undefined;

  return (
    <View style={styles.container}>
      {/* Rangée des grandes familles — toujours visible (au-dessus du backdrop). */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.rowLayer}>
        {CATEGORY_FAMILIES.map((fam) => (
          <Capsule
            key={fam.id}
            label={fam.label}
            icon={fam.icon}
            imageIcon={picto(fam, fam.id)}
            active={panelPath[0]?.id === fam.id || activeFamilyId === fam.id}
            onPress={() => onTapFamily(fam)}
          />
        ))}
      </ScrollView>

      {/* Panneau déroulant + backdrop de fermeture (clic extérieur). */}
      {isOpen ? (
        <>
          <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Fermer le menu" />
          <Animated.View
            key={panelPath.map((p) => p.id).join('/')}
            entering={FadeInDown.duration(160)}
            style={[styles.panel, glass.panel, styles.panelShadow]}>
            {panelPath.length > 1 ? (
              <View style={styles.panelHead}>
                <Capsule icon="chevron-left" back onPress={panelBack} accessibilityLabel="Retour" />
                <YText variant="caption" style={[styles.panelTitle, { color: glass.onDark }]} numberOfLines={1}>
                  {panelNode?.label}
                </YText>
              </View>
            ) : null}
            {/* Hauteur DYNAMIQUE : toutes les sous-catégories NON VIDES affichées d'un coup, aucun
                scroll interne. « Tout (N) » en tête (union de la famille/sous-branche), puis chaque
                sous-catégorie avec son compte réel ; celles à 0 résultat sont masquées (référentiel intact). */}
            <View style={styles.list}>
              {panelNode ? (
                <MenuRow
                  key="__all__"
                  label="Tout"
                  count={hasCounts ? countOf(panelNode) : undefined}
                  active={activeLeafId === `${panelNode.id}::all`}
                  first
                  onPress={() => applyAll(panelNode)}
                />
              ) : null}
              {(hasCounts ? panelNodes.filter((n) => countOf(n) > 0) : panelNodes).map((node) => (
                <MenuRow
                  key={node.id}
                  label={node.label}
                  count={hasCounts ? countOf(node) : undefined}
                  imageIcon={picto(node, panelRootId)}
                  hasChildren={!!(node.children && node.children.length)}
                  active={activeLeafId === node.id}
                  first={false}
                  onPress={() => onTapSub(node)}
                />
              ))}
            </View>
          </Animated.View>
        </>
      ) : null}
    </View>
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

  // Mise en valeur DISCRÈTE de la capsule active : légère élévation + micro-agrandissement, en
  // transition douce (jamais tape-à-l'œil). L'ombre douce est portée par `chipActiveShadow`.
  const a = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    a.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, a]);
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * a.value }, { scale: 1 + 0.03 * a.value }],
  }));

  return (
    <Animated.View style={liftStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed, hovered }) => [
          styles.chip,
          active ? [styles.chipActive, styles.chipActiveShadow] : [glass.panel, styles.glassShadow],
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
    </Animated.View>
  );
}

/**
 * Ligne de menu déroulant — PLEINE LARGEUR : pictogramme + libellé, chevron si sous-branche, coche
 * si sélectionnée. Survol (web) et pression (mobile) très lisibles. Empilées verticalement.
 */
function MenuRow({
  label,
  count,
  imageIcon,
  hasChildren = false,
  active = false,
  first = false,
  onPress,
}: {
  label: string;
  /** Nombre réel de résultats (corpus global) — masqué si absent. */
  count?: number;
  imageIcon?: ImageSourcePropType;
  hasChildren?: boolean;
  active?: boolean;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed, hovered }) => [
        styles.menuRow,
        !first && styles.menuRowBorder,
        hovered && !active ? styles.menuRowHover : null,
        active && styles.menuRowActive,
        pressed && styles.menuRowPressed,
      ]}>
      {imageIcon ? (
        <Image source={imageIcon} style={styles.menuPicto} contentFit="contain" />
      ) : (
        <View style={styles.menuPicto} />
      )}
      <YText variant="body" numberOfLines={1} style={[styles.menuLabel, { color: active ? ACTIVE_GREEN : glass.onDark }]}>
        {label}
      </YText>
      {typeof count === 'number' ? (
        <YText variant="caption" style={[styles.menuCount, { color: active ? ACTIVE_GREEN : glass.onDarkMuted }]}>
          {count}
        </YText>
      ) : null}
      {active ? (
        <Feather name="check" size={18} color={ACTIVE_GREEN} />
      ) : hasChildren ? (
        <Feather name="chevron-right" size={18} color={glass.onDarkMuted} />
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
  container: { position: 'relative' },
  rowLayer: { zIndex: 3 },
  row: { gap: spacing.sm, paddingRight: spacing.sm, alignItems: 'center' },
  // Backdrop transparent : clic extérieur → fermeture. Couvre la zone sous la rangée.
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 1000, zIndex: 1 },
  // Panneau déroulant en VERRE, ABSOLU juste sous la rangée (top:100%) → il survole le contenu
  // sans décaler la mise en page ni repousser les FAB. Grille verticale (wrap), jamais de scroll latéral.
  panel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 2,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  panelShadow: Platform.select({
    web: { boxShadow: '0 14px 34px rgba(0,0,0,0.34)' },
    default: { shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
  }),
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  panelTitle: { fontWeight: '700' },
  // Liste verticale : une ligne pleine largeur par sous-catégorie. Hauteur libre (aucun scroll).
  list: { alignSelf: 'stretch' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  menuRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  menuRowHover: { backgroundColor: 'rgba(255,255,255,0.06)' },
  menuRowPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  menuRowActive: { backgroundColor: 'rgba(106,155,99,0.16)' },
  menuPicto: { width: 24, height: 24 },
  menuLabel: { flex: 1, fontWeight: '600' },
  // Compte réel aligné à droite, avant la coche/chevron — discret (variante muette).
  menuCount: { fontWeight: '700', marginLeft: spacing.sm, minWidth: 22, textAlign: 'right' },
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
  chipActive: { backgroundColor: ACTIVE_GREEN, borderColor: '#78AD70' },
  // Ombre douce VERTE portée sous la capsule active (élévation subtile, cohérente DA).
  chipActiveShadow: Platform.select({
    web: { boxShadow: '0 6px 18px rgba(106,155,99,0.45)' },
    default: { shadowColor: ACTIVE_GREEN, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  }),
  chipBack: { paddingHorizontal: spacing.sm + 2, borderColor: 'rgba(142,182,123,0.55)' },
  chipPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  picto: { width: 22, height: 22 },
  pictoInactive: { opacity: 0.92 },
  label: { fontWeight: '600' },
  glassShadow: Platform.select({
    web: { boxShadow: '0 6px 20px rgba(0,0,0,0.22)' },
    default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  }),
});
