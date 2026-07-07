import { BlurView } from 'expo-blur';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { resolveMapNavTheme } from '@/theme/MapNavigationTheme';

import { FloatingMapNavigationItem, type MapNavIcon } from './FloatingMapNavigationItem';
import { mapNavAnimations } from './MapNavigationAnimations';

interface NavEntry {
  key: string;
  label: string;
  icon: MapNavIcon;
  /** Destination (null = onglet actif = Carte). */
  href: Href | null;
}

const ENTRIES: NavEntry[] = [
  { key: 'accueil', label: 'Accueil', icon: { set: 'feather', name: 'home' }, href: '/' },
  { key: 'carte', label: 'Carte', icon: { set: 'feather', name: 'map' }, href: null },
  { key: 'commerce', label: 'Commerçants', icon: { set: 'feather', name: 'shopping-bag' }, href: '/merchants' },
  { key: 'saison', label: 'De saison', icon: { set: 'mci', name: 'leaf' }, href: '/de-saison' },
  { key: 'profil', label: 'Profil', icon: { set: 'feather', name: 'user' }, href: '/profile' },
];

/**
 * Navigation VERTICALE flottante posée sur la carte (remplace la Bottom Tab Bar sur l'écran Carte).
 * Verre dépoli premium, largeur réduite, côté droit et centrée verticalement. Icônes seules ;
 * l'onglet Carte reste actif (halo sable). Totalement indépendant de la Bottom Tab Bar.
 * Ancré dans un conteneur `box-none` : ne capte pas les gestes de la carte hors de la barre, et
 * laisse libres les contrôles Mapbox (recentrage) placés dans les coins.
 */
export function FloatingMapNavigation() {
  const router = useRouter();
  const { scheme } = useTheme();
  const theme = resolveMapNavTheme(scheme);

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(mapNavAnimations.appear)} style={[styles.barShadow, shadows.md]}>
        <BlurView intensity={scheme === 'dark' ? 34 : 26} tint={scheme === 'dark' ? 'dark' : 'light'} style={styles.bar}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.glass.tint }]} />
          <View style={[StyleSheet.absoluteFill, styles.border, { borderColor: theme.glass.border }]} pointerEvents="none" />
          <View style={styles.items}>
            {ENTRIES.map((entry) => (
              <FloatingMapNavigationItem
                key={entry.key}
                icon={entry.icon}
                active={entry.href === null}
                theme={theme}
                label={entry.label}
                onPress={() => {
                  if (entry.href) router.push(entry.href);
                }}
              />
            ))}
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Occupe le bord droit sur toute la hauteur, contenu centré verticalement.
  // zIndex au-dessus des marqueurs Mapbox (z 1-6) → la nav flotte toujours, jamais recouverte
  // par un commerce (carte plein écran = le dock est désormais au niveau du cluster central).
  dock: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: spacing.md,
    justifyContent: 'center',
    zIndex: 20,
  },
  barShadow: { borderRadius: radii.xl + 8 },
  bar: { borderRadius: radii.xl + 8, overflow: 'hidden' },
  border: { borderRadius: radii.xl + 8, borderWidth: 1 },
  items: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
    alignItems: 'center',
  },
});
