import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';

type Props = {
  /** Fermeture du panneau (sortie du mode Focus). */
  onClose: () => void;
  /** Contenu optionnel du header (le bouton fermer est toujours présent). */
  header?: ReactNode;
  /** Corps scrollable — AGNOSTIQUE : MerchantDetail, comparaison de commerces, etc. */
  children?: ReactNode;
  /** Footer optionnel (actions persistantes). */
  footer?: ReactNode;
  /** Style racine — la répartition (flex 60/40) est décidée par le parent. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Conteneur DÉFINITIF du panneau Focus (desktop) : Header + Body scrollable + Footer optionnel.
 * Totalement agnostique de son contenu (le Body rend `children`) → PR4 y injectera MerchantDetail
 * sans modifier cette structure. Largeur pilotée en flex par le parent (jamais en pixels).
 */
export function MerchantFocusPanel({ onClose, header, children, footer, style }: Props) {
  return (
    <View style={[styles.panel, style]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>{header}</View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={onClose}
          hitSlop={8}
          style={styles.close}>
          <Feather name="x" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.background,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flex: 1,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
