import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { type ComponentProps, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { ROUTE_SECTION, sectionForRoute, type SectionTheme } from '@/design/theme/sections';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

/** Props de la bottom nav dérivées du composant `Tabs` (évite le conflit entre les deux copies
 *  de @react-navigation : celle bundlée par expo-router et celle de node_modules). */
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type IconDef =
  | { set: 'feather'; name: ComponentProps<typeof Feather>['name'] }
  | { set: 'mci'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

const ICONS: Record<string, IconDef> = {
  index: { set: 'feather', name: 'home' },
  explore: { set: 'feather', name: 'map' },
  merchants: { set: 'feather', name: 'shopping-bag' },
  chat: { set: 'feather', name: 'message-circle' },
  profile: { set: 'feather', name: 'user' },
};

function TabIcon({ icon, color }: { icon: IconDef; color: string }) {
  return icon.set === 'feather' ? (
    <Feather name={icon.name} size={21} color={color} />
  ) : (
    <MaterialCommunityIcons name={icon.name} size={22} color={color} />
  );
}

function TabItem({
  active,
  section,
  mutedColor,
  icon,
  label,
  onPress,
  onLongPress,
  testID,
}: {
  active: boolean;
  section: SectionTheme;
  mutedColor: string;
  icon: IconDef;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  /** Identifiant E2E stable (Maestro) — `tab-<route>`. */
  testID?: string;
}) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(active ? 1 : 0, { duration: 240 });
  }, [active, p]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.6 + 0.4 * p.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleX: p.value }] }));

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={styles.item}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.halo, { backgroundColor: section.halo }, haloStyle]} />
        <TabIcon icon={icon} color={active ? section.onAccent : mutedColor} />
      </View>
      <YText style={[styles.label, { color: active ? section.accent : mutedColor }]} numberOfLines={1}>
        {label}
      </YText>
      <Animated.View style={[styles.activeDot, { backgroundColor: section.accent }, dotStyle]} />
    </Pressable>
  );
}

/**
 * Bottom navigation GLASSMORPHISM flottante. Verre dépoli (BlurView) teinté à la couleur de
 * l'UNIVERS actif, coins très arrondis, halo doux animé sur l'onglet actif. La barre occupe son
 * emplacement (le contenu ne passe jamais dessous) tout en paraissant flotter (marges + ombre).
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name ?? 'index';
  const section = sectionForRoute(activeRoute, scheme);

  return (
    <View
      style={[styles.dock, { backgroundColor: colors.background, paddingBottom: insets.bottom ? insets.bottom : spacing.sm }]}
      pointerEvents="box-none">
      <View style={[styles.barShadow, shadows.lg]}>
        <BlurView intensity={Platform.OS === 'web' ? 40 : 30} tint={scheme === 'dark' ? 'dark' : 'light'} style={styles.bar}>
          {/* Voile teinté de l'univers + contour lumineux (glass). */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: section.glass.tint }]} />
          <View style={[StyleSheet.absoluteFill, styles.glassBorder, { borderColor: section.glass.border }]} pointerEvents="none" />

          <View style={styles.row}>
            {state.routes.map((route, index) => {
              if (!(route.name in ROUTE_SECTION)) return null;
              const { options } = descriptors[route.key];
              const label = typeof options.title === 'string' ? options.title : route.name;
              const active = state.index === index;

              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              };
              const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

              return (
                <TabItem
                  key={route.key}
                  testID={`tab-${route.name}`}
                  active={active}
                  section={section}
                  mutedColor={colors.mutedText}
                  icon={ICONS[route.name] ?? ICONS.index}
                  label={label}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Barre AFFINÉE : un peu plus fine, espacements internes allégés, icônes recentrées — même
  // identité graphique (verre teinté, coins, halo, couleurs, proportions des icônes).
  dock: {
    paddingHorizontal: spacing.md,
    paddingTop: 6,
  },
  barShadow: {
    borderRadius: radii.xl + 6,
  },
  bar: {
    borderRadius: radii.xl + 6,
    overflow: 'hidden',
  },
  glassBorder: {
    borderRadius: radii.xl + 6,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  iconWrap: {
    width: 40,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 40,
    height: 30,
    borderRadius: radii.pill,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeDot: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
});
