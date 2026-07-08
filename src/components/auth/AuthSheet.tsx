import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { glass } from '@/design/tokens/glass';
import { motion } from '@/design/tokens/motion';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { useReducedMotion } from '@/features/system/useReducedMotion';
import { continueWithProvider, signInWithEmailLink } from '@/lib/supabase/authActions';

/**
 * Micro-interaction d'appui : le contenu s'enfonce légèrement puis rebondit doucement.
 * Se dégrade en no-op si l'utilisateur a réduit les animations.
 */
function usePressScale(reduced: boolean) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, ...motion.spring.press }).start();
  const onPressIn = () => {
    if (!reduced) to(motion.pressScale);
  };
  const onPressOut = () => {
    if (!reduced) to(1);
  };
  return { scale, onPressIn, onPressOut };
}

/** Bouton social (conventions Google / Apple approximées), avec retour tactile animé. */
function SocialButton({
  provider,
  onPress,
  reduced,
}: {
  provider: 'google' | 'apple';
  onPress: () => void;
  reduced: boolean;
}) {
  const isApple = provider === 'apple';
  const { scale, onPressIn, onPressOut } = usePressScale(reduced);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={isApple ? 'Continuer avec Apple' : 'Continuer avec Google'}
        style={[styles.social, isApple ? styles.apple : styles.google]}>
        {isApple ? (
          <YText style={[styles.glyph, { color: '#FFFFFF' }]}>{''}</YText>
        ) : (
          <View style={styles.gBadge}>
            <YText style={styles.gLetter}>G</YText>
          </View>
        )}
        <YText style={[styles.socialLabel, { color: isApple ? '#FFFFFF' : colors.text }]}>
          {isApple ? 'Continuer avec Apple' : 'Continuer avec Google'}
        </YText>
      </Pressable>
    </Animated.View>
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
 *
 * Présentation (R6) : le voile se fond et la feuille glisse depuis le bas avec un ressort ferme.
 * On reste monté le temps de l'animation de sortie, puis on se démonte. Respecte « Réduire les
 * animations » (transition instantanée).
 */
export function AuthSheet({ open, onClose, favoritesCount = 0 }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<null | 'google' | 'apple' | 'email'>(null);
  const [error, setError] = useState<string | null>(null);

  const reduced = useReducedMotion();
  // Rendu monté tant que l'animation d'entrée/sortie est en cours.
  const [mounted, setMounted] = useState(open);
  // 0 = fermé (bas / transparent), 1 = ouvert (en place / opaque).
  const progress = useRef(new Animated.Value(0)).current;
  // Hauteur mesurée de la feuille → distance de glissement.
  const [sheetHeight, setSheetHeight] = useState(0);
  const laterPress = usePressScale(reduced);

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (reduced) {
        progress.setValue(1);
        return;
      }
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, ...motion.spring.sheet }).start();
    } else if (mounted) {
      if (reduced) {
        progress.setValue(0);
        setMounted(false);
        return;
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration.base,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reduced]);

  // Réinitialise le sous-état email quand la feuille se referme complètement.
  useEffect(() => {
    if (!mounted) {
      setShowEmail(false);
      setEmail('');
      setSent(false);
      setError(null);
      setBusy(null);
    }
  }, [mounted]);

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

  const title =
    favoritesCount > 0
      ? `Gardez vos ${favoritesCount} favori${favoritesCount > 1 ? 's' : ''}`
      : 'Rejoignez YOOTOO';

  const subtitle =
    favoritesCount > 0
      ? 'Vos adresses vous suivent sur tous vos appareils. Sans mot de passe, en quelques secondes.'
      : 'Retrouvez vos lieux partout, sans mot de passe. En quelques secondes.';

  // Distance de glissement : hauteur de la feuille (repli 320 avant première mesure).
  const travel = sheetHeight || 320;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] });

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        </Animated.View>
        <Animated.View
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
          style={[styles.sheet, glass.panel, { transform: [{ translateY }] }]}>
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
            {subtitle}
          </YText>

          {!showEmail ? (
            <View style={styles.actions}>
              <SocialButton provider="google" reduced={reduced} onPress={() => void onProvider('google')} />
              {Platform.OS === 'ios' ? (
                <SocialButton provider="apple" reduced={reduced} onPress={() => void onProvider('apple')} />
              ) : null}
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
                onSubmitEditing={() => void onEmail()}
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

          <Animated.View style={{ transform: [{ scale: laterPress.scale }], alignSelf: 'center' }}>
            <Pressable
              onPress={onClose}
              onPressIn={laterPress.onPressIn}
              onPressOut={laterPress.onPressOut}
              hitSlop={8}
              style={styles.later}
              accessibilityRole="button">
              <YText variant="caption" style={{ color: glass.onDarkMuted }}>
                Plus tard
              </YText>
            </Pressable>
          </Animated.View>
        </Animated.View>
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
  glyph: { fontSize: 18 },
  socialLabel: { fontSize: typography.body.fontSize, fontWeight: '600' },
  gBadge: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  gLetter: { color: '#4285F4', fontWeight: '800', fontSize: 14 },
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
  later: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md },
});
