import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

interface Props {
  /** Titre de section (majuscule douce, style iOS/Revolut). */
  title?: string;
  /** Note bas de section (optionnelle). */
  footer?: string;
  children: ReactNode;
}

/**
 * Groupe de réglages : titre + carte arrondie contenant des lignes, avec séparateurs insérés
 * automatiquement entre les enfants. Entièrement thémé. Base des grandes cartes premium.
 */
export function SettingsSection({ title, footer, children }: Props) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.wrap}>
      {title ? (
        <YText style={[styles.title, { color: colors.mutedText }]}>{title.toUpperCase()}</YText>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={[styles.separator, { backgroundColor: colors.separator }]} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? <YText style={[styles.footer, { color: colors.mutedText }]}>{footer}</YText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginLeft: spacing.sm },
  card: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  footer: { fontSize: 12, lineHeight: 16, marginLeft: spacing.sm, marginTop: 2 },
});
