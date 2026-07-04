import { Feather } from '@expo/vector-icons';
import { type Href, usePathname, useRouter } from 'expo-router';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

type FeatherName = ComponentProps<typeof Feather>['name'];

type NavItem = { label: string; icon: FeatherName; path: Href };

// Reflète les VRAIS onglets de l'app (aucune route inventée) — cf. (tabs)/_layout.
const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', icon: 'home', path: '/' },
  { label: 'Carte', icon: 'map', path: '/explore' },
  { label: 'Commerçants', icon: 'shopping-bag', path: '/merchants' },
  { label: 'De saison', icon: 'sun', path: '/de-saison' },
  { label: 'Profil', icon: 'user', path: '/profile' },
];

/**
 * Rail de navigation vertical CONTEXTUEL — rendu uniquement en mode Focus (desktop), à gauche
 * de tout l'écran (pleine hauteur). Reflète les onglets réels et navigue via `router`.
 * Largeur pilotée par le contenu (aucun pixel de largeur codé en dur).
 */
export function DesktopNavRail() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <View style={styles.rail}>
      <YText variant="subtitle" color="primary" style={styles.brand}>
        YOOTOO
      </YText>
      <View style={styles.items}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path;
          return (
            <Pressable
              key={String(item.path)}
              onPress={() => router.navigate(item.path)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              style={[styles.item, active && styles.itemActive]}>
              <Feather name={item.icon} size={20} color={active ? colors.primary : colors.mutedText} />
              <YText variant="caption" color={active ? 'primary' : 'muted'}>
                {item.label}
              </YText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  brand: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  items: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  item: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  itemActive: {
    backgroundColor: 'rgba(31,122,77,0.10)',
  },
});
