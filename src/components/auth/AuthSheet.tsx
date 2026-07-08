import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GoogleG } from '@/components/settings/BrandIcon';
import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { continueWithProvider, signInWithEmailLink } from '@/lib/supabase/authActions';

/** Bouton social avec les LOGOS OFFICIELS (Google quadrichrome, Apple monochrome). */
function SocialButton({ provider, onPress }: { provider: 'google' | 'apple'; onPress: () => void }) {
  const isApple = provider === 'apple';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isApple ? 'Continuer avec Apple' : 'Continuer avec Google'}
      style={({ pressed }) => [styles.social, isApple ? styles.apple : styles.google, pressed && styles.pressed]}>
      {isApple ? (
        <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
      ) : (
        <GoogleG size={20} />
      )}
      <YText style={[styles.socialLabel, { color: isApple ? '#FFFFFF' : colors.text }]}>
        {isApple ? 'Continuer avec Apple' : 'Continuer avec Google'}
      </YText>
    </Pressable>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Nombre de favoris à protéger (message contextuel). */
  favoritesCount?: number;
}

/**
 * Feuille d'authentification JUSTE-À-TEMPS. Surgit quand l'utilisateur a créé quelque chose à
 * garder (favori). Upgrade zéro perte : si session anonyme → liaison d'identité (favoris conservés).
 * Non bloquante : « Plus tard » referme sans rien perdre.
 */
export function AuthSheet({ open, onClose }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<null | 'google' | 'apple' | 'email'>(null);
  const [error, setError] = useState<string | null>(null);

  const onProvider = async (provider: 'google' | 'apple') => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    const res = await continueWithProvider(provider);
    setBusy(null);
    // Web : redirection en cours (rien à faire). Natif succès → on referme.
    if (res.ok && !res.pendingRedirect) onClose();
    else if (!res.ok && res.error !== 'cancelled') {
      setError(res.error === 'not-configured' ? 'Connexion bientôt disponible.' : 'Connexion impossible, réessayez.');
    }
  };

  const onEmail = async () => {
    if (busy || !email.trim()) return;
    setError(null);
    setBusy('email');
    const res = await signInWithEmailLink(email);
    setBusy(null);
    if (res.ok) setSent(true);
    else setError(res.error === 'not-configured' ? 'Connexion bientôt disponible.' : 'Envoi impossible, vérifiez l’email.');
  };

  const title = 'Rejoignez YOOTOO';

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
            Créez votre compte et synchronisez-le sur tous vos appareils. Sans mot de passe, en quelques secondes.
          </YText>

          {!showEmail ? (
            <View style={styles.actions}>
              <SocialButton provider="google" onPress={() => void onProvider('google')} />
              {Platform.OS === 'ios' ? <SocialButton provider="apple" onPress={() => void onProvider('apple')} /> : null}
              <View style={styles.divider}>
                <View style={styles.line} />
                <YText variant="caption" style={{ color: glass.onDarkMuted }}>
                  ou
                </YText>
                <View style={styles.line} />
              </View>
              <YButton label="Continuer avec email" variant="secondary" fullWidth onPress={() => setShowEmail(true)} />
            </View>
          ) : (
            <View style={styles.actions}>
              <TextInput
                style={styles.field}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={glass.onDarkMuted}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                autoCapitalize="none"
                inputMode="email"
                returnKeyType="done"
              />
              <YButton
                label={sent ? 'Lien envoyé ✓' : busy === 'email' ? 'Envoi…' : 'Recevoir le lien'}
                fullWidth
                onPress={() => void onEmail()}
              />
              {sent ? (
                <YText variant="caption" style={{ color: glass.onDark, textAlign: 'center' }}>
                  Vérifiez votre boîte mail pour finaliser.
                </YText>
              ) : null}
            </View>
          )}

          {error ? (
            <YText variant="caption" style={{ color: colors.warning, textAlign: 'center', marginTop: spacing.sm }}>
              {error}
            </YText>
          ) : null}

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
  actions: { gap: spacing.md },
  social: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 52, borderRadius: radii.lg, borderWidth: 1 },
  google: { backgroundColor: colors.surface, borderColor: colors.border },
  apple: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  pressed: { opacity: 0.9 },
  socialLabel: { fontSize: typography.body.fontSize, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  field: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    color: glass.onDark,
    fontSize: typography.body.fontSize,
  },
  later: { alignSelf: 'center', marginTop: spacing.md },
});
