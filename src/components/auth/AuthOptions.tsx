import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { useAuthFlow } from '@/features/auth';
import type { AuthProvider } from '@/lib/supabase/authActions';

export type AuthOptionsVariant = 'sheet' | 'screen';

/** Bouton social (conventions Google / Apple approximées) — même rendu sur fond clair ou sombre. */
function SocialButton({ provider, onPress }: { provider: AuthProvider; onPress: () => void }) {
  const isApple = provider === 'apple';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isApple ? 'Continuer avec Apple' : 'Continuer avec Google'}
      style={({ pressed }) => [styles.social, isApple ? styles.apple : styles.google, pressed && styles.pressed]}>
      {isApple ? (
        <YText style={[styles.glyph, { color: '#FFFFFF' }]}></YText>
      ) : (
        <View style={styles.gBadge}>
          <YText style={styles.gLetter}>G</YText>
        </View>
      )}
      <YText style={[styles.socialLabel, { color: isApple ? '#FFFFFF' : colors.text }]}>
        {isApple ? 'Continuer avec Apple' : 'Continuer avec Google'}
      </YText>
    </Pressable>
  );
}

interface Props {
  /** `sheet` = posé sur verre sombre (AuthSheet) ; `screen` = fond clair (écran Profil). */
  variant?: AuthOptionsVariant;
  /** Appelé sur succès natif (sans redirection web). */
  onDone?: () => void;
}

/**
 * Options d'inscription/connexion RÉUTILISABLES — Google · Apple (iOS) · Email (lien magique).
 * Source unique de la logique (via `useAuthFlow`) : aucune duplication entre la feuille d'auth et
 * l'écran Profil. Zéro formulaire lourd — pour l'email, la saisie de l'adresse suffit.
 */
export function AuthOptions({ variant = 'screen', onDone }: Props) {
  const flow = useAuthFlow(onDone);
  const onDark = variant === 'sheet';
  const muted = onDark ? glass.onDarkMuted : colors.mutedText;
  const strong = onDark ? glass.onDark : colors.text;

  return (
    <View style={styles.actions}>
      {!flow.showEmail ? (
        <>
          <SocialButton provider="google" onPress={() => void flow.continueWith('google')} />
          {Platform.OS === 'ios' ? <SocialButton provider="apple" onPress={() => void flow.continueWith('apple')} /> : null}

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: onDark ? 'rgba(255,255,255,0.14)' : colors.border }]} />
            <YText variant="caption" style={{ color: muted }}>
              ou
            </YText>
            <View style={[styles.line, { backgroundColor: onDark ? 'rgba(255,255,255,0.14)' : colors.border }]} />
          </View>

          <YButton label="Continuer avec email" variant="secondary" fullWidth onPress={() => flow.setShowEmail(true)} />
        </>
      ) : (
        <>
          <TextInput
            style={[
              styles.field,
              onDark
                ? { borderColor: 'rgba(255,255,255,0.14)', color: glass.onDark }
                : { borderColor: colors.border, color: colors.text },
            ]}
            value={flow.email}
            onChangeText={flow.setEmail}
            placeholder="Votre email"
            placeholderTextColor={muted}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
            inputMode="email"
            returnKeyType="done"
            onSubmitEditing={() => void flow.sendEmailLink()}
          />
          <YButton
            label={flow.sent ? 'Lien envoyé ✓' : flow.busy === 'email' ? 'Envoi…' : 'Recevoir le lien'}
            fullWidth
            onPress={() => void flow.sendEmailLink()}
          />
          {flow.sent ? (
            <YText variant="caption" style={{ color: strong, textAlign: 'center' }}>
              Vérifiez votre boîte mail pour finaliser la connexion.
            </YText>
          ) : (
            <Pressable onPress={() => flow.setShowEmail(false)} hitSlop={8} accessibilityRole="button">
              <YText variant="caption" style={{ color: muted, textAlign: 'center' }}>
                ← Autres options
              </YText>
            </Pressable>
          )}
        </>
      )}

      {flow.error ? (
        <YText variant="caption" style={{ color: colors.warning, textAlign: 'center', marginTop: spacing.sm }}>
          {flow.error}
        </YText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.md },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  google: { backgroundColor: colors.surface, borderColor: colors.border },
  apple: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  pressed: { opacity: 0.9 },
  glyph: { fontSize: 18 },
  socialLabel: { fontSize: typography.body.fontSize, fontWeight: '600' },
  gBadge: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  gLetter: { color: '#4285F4', fontWeight: '800', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: 1 },
  field: {
    height: 50,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
  },
});
