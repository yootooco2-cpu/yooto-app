import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { AuthOptions } from './AuthOptions';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Nombre de favoris à protéger (message contextuel). */
  favoritesCount?: number;
}

/**
 * Feuille d'authentification JUSTE-À-TEMPS. Surgit quand l'utilisateur a créé quelque chose à
 * garder (favori). Non bloquante : « Plus tard » referme sans rien perdre. Les options (Google ·
 * Apple · Email) sont fournies par le composant partagé `AuthOptions` (source unique, zéro
 * duplication avec l'écran Profil).
 */
export function AuthSheet({ open, onClose, favoritesCount = 0 }: Props) {
  const title =
    favoritesCount > 0
      ? `Gardez vos ${favoritesCount} favori${favoritesCount > 1 ? 's' : ''}`
      : 'Rejoignez YOOTOO';

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <View style={[styles.sheet, glass.panel]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <YText variant="title" style={{ color: glass.onDark }}>
              {title}
            </YText>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer">
              <Feather name="x" size={20} color={glass.onDark} />
            </Pressable>
          </View>
          <YText variant="body" style={{ color: glass.onDarkMuted, marginBottom: spacing.md }}>
            Retrouvez-les sur tous vos appareils. Sans mot de passe, en quelques secondes.
          </YText>

          <AuthOptions variant="sheet" onDone={onClose} />

          <Pressable onPress={onClose} hitSlop={8} style={styles.later} accessibilityRole="button">
            <YText variant="caption" style={{ color: glass.onDarkMuted }}>
              Plus tard
            </YText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(23,32,26,0.38)' },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: { width: 40, height: 4, borderRadius: radii.pill, backgroundColor: 'rgba(243,238,226,0.45)', alignSelf: 'center', marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  later: { alignSelf: 'center', marginTop: spacing.md },
});
