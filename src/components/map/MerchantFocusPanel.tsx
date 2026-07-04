import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

type Props = {
  /** Fermeture du panneau (sortie du mode Focus). */
  onClose: () => void;
  /** Corps scrollable — AGNOSTIQUE : MerchantDetail, comparaison de commerces, etc. */
  children?: ReactNode;
  /** Footer optionnel (actions persistantes). */
  footer?: ReactNode;
  /** Style racine — la répartition (flex 60/40) est décidée par le parent. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Conteneur du panneau Focus (desktop) : corps scrollable + bouton fermer flottant (sticky,
 * façon maquette) + footer optionnel. Totalement agnostique de son contenu (Body = `children`).
 * Largeur pilotée en flex par le parent (jamais en pixels).
 */
export function MerchantFocusPanel({ onClose, children, footer, style }: Props) {
  return (
    <View style={[styles.panel, style]}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {/* Fermeture flottante, toujours visible (sticky) en haut à droite. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        onPress={onClose}
        hitSlop={8}
        style={styles.close}>
        <Feather name="x" size={18} color={colors.text} />
      </Pressable>

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
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  close: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...shadows.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
