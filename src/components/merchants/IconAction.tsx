import { Feather } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

type FeatherName = ComponentProps<typeof Feather>['name'];

/**
 * Bouton d'action avec icône (Itinéraire / Appeler / Site web / footer). Thémé (suit le thème
 * courant, y compris le scope sombre du panneau Focus). Partagé fiche + footer de route.
 */
export function IconAction({
  icon,
  label,
  primary,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const variantStyle: ViewStyle = primary
    ? { backgroundColor: colors.primary }
    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, variantStyle, pressed && styles.pressed]}>
      <Feather name={icon} size={16} color={primary ? colors.onPrimary : colors.primary} />
      <YText variant="label" color={primary ? 'inverse' : 'primary'}>
        {label}
      </YText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
  },
  pressed: { opacity: 0.85 },
});
