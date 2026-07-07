import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { DarkThemeScope, useTheme } from '@/design/theme/ThemeProvider';
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

/** Contenu du panneau — rendu SOUS le scope sombre (useTheme renvoie donc les couleurs sombres). */
function PanelInner({ onClose, header, children, footer, style }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.background, borderLeftColor: colors.border }, style]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>{header}</View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={onClose}
          hitSlop={8}
          style={[styles.close, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="x" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {footer ? <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View> : null}
    </View>
  );
}

/**
 * Panneau Focus commerce (desktop) : Header + Body scrollable + Footer. Forcé en DA SOMBRE
 * premium via `DarkThemeScope` → cohérent avec la mini-fiche mobile (mêmes tokens/thème), quel
 * que soit le mode global. Agnostique de son contenu.
 */
export function MerchantFocusPanel(props: Props) {
  return (
    <DarkThemeScope>
      <PanelInner {...props} />
    </DarkThemeScope>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, borderLeftWidth: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: { flex: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.lg },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1 },
});
