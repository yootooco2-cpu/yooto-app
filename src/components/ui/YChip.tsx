import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Cryptogramme optionnel affiché avant le label (ex. filtres rapides). */
  icon?: ImageSourcePropType;
  /** `glass` = pastille verre translucide flottant sur la carte (fusion immersive). */
  variant?: 'default' | 'glass';
};

export function YChip({ label, active = false, onPress, icon, variant = 'default' }: Props) {
  const { colors } = useTheme();
  const isGlass = variant === 'glass';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : isGlass
            ? [glass.panel, styles.glassShadow]
            : { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      {icon ? <Image source={icon} style={styles.icon} contentFit="contain" /> : null}
      <YText
        variant="caption"
        color={active ? 'inverse' : 'default'}
        style={isGlass && !active ? { color: glass.onDark } : undefined}
        numberOfLines={1}>
        {label}
      </YText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'center',
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  // Ombre extrêmement douce → la pastille « flotte » sur la carte sans arête.
  glassShadow: Platform.select({
    web: { boxShadow: '0 6px 20px rgba(0,0,0,0.22)' },
    default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  }),
  icon: {
    width: 18,
    height: 18,
    marginRight: spacing.xs,
  },
});
