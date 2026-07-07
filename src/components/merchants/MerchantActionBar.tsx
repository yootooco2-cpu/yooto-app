import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import type { Merchant } from '@/features/merchants';
import { buildDirectionsUrl } from '@/features/merchants/directions';
import { shareMerchant } from '@/features/merchants/share';

const openUrl = (url?: string) => {
  if (url) void Linking.openURL(url).catch(() => {});
};

type Action = {
  key: string;
  label: string;
  /** Itinéraire = glyphe plein (MaterialCommunityIcons) ; les autres = trait (Feather). */
  filledIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  onPress: () => void;
};

/**
 * Barre d'actions de la fiche commerce — reproduction fidèle de la maquette : les 4 actions
 * (Itinéraire / Appeler / Site web / Partager) groupées dans UN conteneur arrondi bordé, style
 * ghost (icône au-dessus du label, vert clair désaturé), légère profondeur (dégradé vertical
 * subtil + ombre très discrète). Hover = surface #263128 ; disabled élégant.
 */
export function MerchantActionBar({ merchant }: { merchant: Merchant }) {
  const { colors } = useTheme();
  const green = colors.primaryHover;

  const actions: Action[] = [
    { key: 'directions', label: 'Itinéraire', filledIcon: 'navigation-variant', onPress: () => openUrl(buildDirectionsUrl(merchant)) },
    { key: 'call', label: 'Appeler', icon: 'phone', disabled: !merchant.phone, onPress: () => openUrl(`tel:${merchant.phone}`) },
    { key: 'website', label: 'Site web', icon: 'globe', disabled: !merchant.website, onPress: () => openUrl(merchant.website) },
    { key: 'share', label: 'Partager', icon: 'share-2', onPress: () => void shareMerchant(merchant) },
  ];

  return (
    <LinearGradient
      colors={[colors.surfaceAlt, colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.bar, { borderColor: colors.border }]}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={a.disabled ? undefined : a.onPress}
          disabled={a.disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!a.disabled }}
          accessibilityLabel={a.label}
          style={({ hovered, pressed }) => [
            styles.col,
            hovered && !a.disabled && { backgroundColor: colors.surfaceAltHover },
            pressed && !a.disabled && styles.pressed,
            a.disabled && styles.disabled,
          ]}>
          {a.filledIcon ? (
            <MaterialCommunityIcons name={a.filledIcon} size={23} color={green} />
          ) : (
            <Feather name={a.icon} size={22} color={green} />
          )}
          <YText style={[styles.label, { color: green }]} numberOfLines={1}>
            {a.label}
          </YText>
        </Pressable>
      ))}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    // Ombre très discrète (profondeur premium, jamais marquée).
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.38 },
});
