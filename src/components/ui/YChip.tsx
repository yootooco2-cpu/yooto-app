import { Pressable, StyleSheet } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function YChip({ label, active = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.active : styles.inactive,
        pressed && styles.pressed,
      ]}>
      <YText variant="caption" color={active ? 'inverse' : 'default'}>
        {label}
      </YText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  inactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
