import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
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
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.md + spacing.xs, paddingHorizontal: spacing.xl },
};

const variantStyles: Record<YButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
};

const labelColors: Record<YButtonVariant, 'inverse' | 'default' | 'primary'> = {
  primary: 'inverse',
  secondary: 'default',
  ghost: 'primary',
};

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
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#FFFFFF' : colors.primary}
          />
        ) : (
          <YText variant="label" color={labelColors[variant]} style={labelTextStyle}>
            {label}
          </YText>
        )}
      </View>
    </Pressable>
  );
}

const labelTextStyle: TextStyle = { textAlign: 'center' };

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
