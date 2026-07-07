import { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows, type ShadowLevel } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

type YCardVariant = 'surface' | 'outline';

type Props = PropsWithChildren<
  ViewProps & {
    variant?: YCardVariant;
    padding?: keyof typeof spacing;
    elevation?: ShadowLevel;
    style?: ViewStyle;
  }
>;

export function YCard({
  children,
  variant = 'surface',
  padding = 'lg',
  elevation = 'sm',
  style,
  ...props
}: Props) {
  const { colors } = useTheme();
  const variantStyle: ViewStyle =
    variant === 'surface'
      ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
      : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border };

  return (
    <View
      style={[styles.base, variantStyle, { padding: spacing[padding] }, shadows[elevation], style]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    gap: spacing.sm,
  },
});
