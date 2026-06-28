import { Text, type TextProps } from 'react-native';

import { colors } from '@/design/tokens/colors';
import { typography, type TypographyVariant } from '@/design/tokens/typography';

type YTextColor = 'default' | 'muted' | 'primary' | 'accent' | 'inverse';

const textColors: Record<YTextColor, string> = {
  default: colors.text,
  muted: colors.mutedText,
  primary: colors.primary,
  accent: colors.accent,
  inverse: '#FFFFFF',
};

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: YTextColor;
};

export function YText({ variant = 'body', color = 'default', style, ...props }: Props) {
  return <Text style={[typography[variant], { color: textColors[color] }, style]} {...props} />;
}
