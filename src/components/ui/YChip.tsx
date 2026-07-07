import { Image } from 'expo-image';
import { Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Cryptogramme optionnel affiché avant le label (ex. filtres rapides). */
  icon?: ImageSourcePropType;
};

export function YChip({ label, active = false, onPress, icon }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      {icon ? <Image source={icon} style={styles.icon} contentFit="contain" /> : null}
      <YText variant="caption" color={active ? 'inverse' : 'default'} numberOfLines={1}>
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
  icon: {
    width: 18,
    height: 18,
    marginRight: spacing.xs,
  },
});
