import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { YLogo } from '@/components/brand/YLogo';
import { YButton } from '@/components/ui/YButton';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

/** Bouton d'authentification sociale (approxime les conventions Google / Apple). */
function SocialButton({
  provider,
  onPress,
}: {
  provider: 'google' | 'apple';
  onPress: () => void;
}) {
  const isApple = provider === 'apple';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isApple ? 'Continuer avec Apple' : 'Continuer avec Google'}
      style={({ pressed }) => [
        styles.social,
        isApple ? styles.apple : styles.google,
        pressed && styles.pressed,
      ]}>
      {isApple ? (
        // U+F8FF rend le logo Apple sur iOS (bouton affiché iOS uniquement).
        <YText style={[styles.socialGlyph, { color: '#FFFFFF' }]}>{''}</YText>
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

/**
 * Onboarding / inscription YOOTOO — PROTOTYPE.
 * Priorité aux solutions natives : Google / Apple, sinon email (lien magique, sans mot de passe).
 * Champs compatibles autofill natif (iOS `textContentType` + Android/web `autoComplete`).
 * L'utilisateur peut explorer sans compte (jamais bloqué avant la découverte).
 */
export default function AuthScreen() {
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);

  const skip = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // PROTOTYPE : les handlers matérialisent le parcours (câblage OAuth/lien magique = phase 2).
  const onGoogle = () => {
    // Phase 2 : supabase.auth.signInWithOAuth({ provider: 'google' }) via expo-web-browser (natif) / redirect (web).
  };
  const onApple = () => {
    // Phase 2 : expo-apple-authentication -> supabase.auth.signInWithIdToken({ provider: 'apple', token }).
  };
  const onEmailLink = () => {
    // Phase 2 : supabase.auth.signInWithOtp({ email, options: { data: { firstName, lastName, phone } } }).
    if (email.trim()) setSent(true);
  };

  return (
    <YScreen scroll gap="lg" padding="lg">
      <Pressable onPress={skip} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.close}>
        <Feather name="x" size={22} color={colors.mutedText} />
      </Pressable>

      {/* Moment de marque : le logo signe l'accueil (splash / onboarding / auth). */}
      <View style={styles.brand}>
        <YLogo size={46} orientation="stack" />
      </View>

      <View style={styles.intro}>
        <YText variant="title">Bienvenue chez YOOTOO</YText>
        <YText variant="body" color="muted">
          Créez votre compte en quelques secondes pour retrouver vos favoris et des recommandations
          locales à votre goût.
        </YText>
      </View>

      {!showEmail ? (
        <View style={styles.actions}>
          <SocialButton provider="google" onPress={onGoogle} />
          {Platform.OS === 'ios' ? <SocialButton provider="apple" onPress={onApple} /> : null}

          <View style={styles.divider}>
            <View style={styles.line} />
            <YText variant="caption" color="muted">
              ou
            </YText>
            <View style={styles.line} />
          </View>

          <YButton label="Continuer avec email" variant="secondary" fullWidth onPress={() => setShowEmail(true)} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable onPress={() => setShowEmail(false)} hitSlop={8} accessibilityRole="button" style={styles.back}>
            <Feather name="chevron-left" size={16} color={colors.primary} />
            <YText variant="caption" color="primary">
              Autres options
            </YText>
          </Pressable>

          {/* Champs compatibles AUTOFILL natif (iOS textContentType + Android/web autoComplete). */}
          <View style={styles.fieldRow}>
            <TextInput
              style={[styles.field, styles.fieldHalf]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Prénom"
              placeholderTextColor={colors.mutedText}
              autoComplete="given-name"
              textContentType="givenName"
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.field, styles.fieldHalf]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Nom"
              placeholderTextColor={colors.mutedText}
              autoComplete="family-name"
              textContentType="familyName"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <TextInput
            style={styles.field}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.mutedText}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
            inputMode="email"
            returnKeyType="next"
          />
          <TextInput
            style={styles.field}
            value={phone}
            onChangeText={setPhone}
            placeholder="Téléphone (facultatif)"
            placeholderTextColor={colors.mutedText}
            autoComplete="tel"
            textContentType="telephoneNumber"
            keyboardType="phone-pad"
            inputMode="tel"
            returnKeyType="done"
          />

          <YButton
            label={sent ? 'Lien envoyé ✓' : 'Recevoir le lien de connexion'}
            fullWidth
            onPress={onEmailLink}
          />
          {sent ? (
            <YText variant="caption" color="primary" style={styles.center}>
              Vérifiez votre boîte mail pour finaliser (sans mot de passe).
            </YText>
          ) : null}
        </View>
      )}

      {/* RGPD : pourquoi ces données, et rien de plus. */}
      <YText variant="caption" color="muted" style={styles.legal}>
        Nous demandons uniquement le nécessaire pour personnaliser vos recommandations locales. Aucune
        adresse requise, aucune donnée revendue. En continuant, vous acceptez nos conditions et notre
        politique de confidentialité.
      </YText>

      <Pressable onPress={skip} hitSlop={8} accessibilityRole="button" style={styles.center}>
        <YText variant="caption" color="muted">
          Explorer sans compte
        </YText>
      </Pressable>
    </YScreen>
  );
}

const styles = StyleSheet.create({
  close: {
    alignSelf: 'flex-end',
  },
  brand: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  intro: {
    gap: spacing.sm,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  google: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  apple: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  pressed: {
    opacity: 0.9,
  },
  socialGlyph: {
    fontSize: 18,
  },
  socialLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  gBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gLetter: {
    color: '#4285F4',
    fontWeight: '800',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fieldHalf: {
    flex: 1,
  },
  field: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  center: {
    alignSelf: 'center',
    textAlign: 'center',
  },
  legal: {
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
