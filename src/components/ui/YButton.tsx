import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, type TextStyle, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

type YButtonVariant = 'primary' | 'secondary' | 'ghost';
type YButtonSize = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: YButtonVariant;
  size?: YButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const sizeStyles: Record<YButtonSize, ViewStyle> = {
  sm: { minHeight: 44, paddingHorizontal: spacing.md },
  md: { minHeight: 52, paddingHorizontal: spacing.lg },
  lg: { minHeight: 56, paddingHorizontal: spacing.xl },
};

const labelColors: Record<YButtonVariant, 'inverse' | 'default' | 'primary'> = {
  primary: 'inverse',
  secondary: 'default',
  ghost: 'primary',
};

/**
 * Bouton premium — hauteur généreuse, coins doux, retour tactile animé (pressed, scale),
 * hover web et disabled élégant. Hiérarchie primaire / secondaire / ghost cohérente app-wide.
 */
export function YButton({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const press = useSharedValue(0);
  const hover = useSharedValue(0);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.03 }] }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: press.value * 0.08 + hover.value * (variant === 'primary' ? 0.12 : 0.07),
  }));

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.primary }
      : variant === 'secondary'
        ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
        : { backgroundColor: 'transparent' };

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, scaleStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
        onPressOut={() => (press.value = withTiming(0, { duration: 160 }))}
        onHoverIn={() => (hover.value = withTiming(1, { duration: 130 }))}
        onHoverOut={() => (hover.value = withTiming(0, { duration: 180 }))}
        style={[styles.base, sizeStyles[size], variantStyle, isDisabled && styles.disabled]}
        {...props}>
        {variant !== 'ghost' ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: variant === 'primary' ? '#FFFFFF' : colors.primary }, overlayStyle]}
          />
        ) : null}
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color={variant === 'primary' ? '#FFFFFF' : colors.primary} />
          ) : (
            <YText variant="label" color={labelColors[variant]} style={labelTextStyle}>
              {label}
            </YText>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const labelTextStyle: TextStyle = { textAlign: 'center' };

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overlay: { borderRadius: radii.lg },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
});
