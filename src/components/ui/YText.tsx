import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/design/theme/ThemeProvider';
import { typography, type TypographyVariant } from '@/design/tokens/typography';

type YTextColor = 'default' | 'muted' | 'primary' | 'accent' | 'inverse';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: YTextColor;
};

export function YText({ variant = 'body', color = 'default', style, ...props }: Props) {
  const { colors } = useTheme();
  const textColors: Record<YTextColor, string> = {
    default: colors.text,
    muted: colors.mutedText,
    primary: colors.primary,
    accent: colors.accent,
    inverse: '#FFFFFF',
  };
  return <Text style={[typography[variant], { color: textColors[color] }, style]} {...props} />;
}
