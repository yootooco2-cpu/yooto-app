import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { useSession } from '@/features/auth';

/**
 * Callback d'authentification (web) — page d'atterrissage de la redirection OAuth / lien magique.
 * La session est finalisée automatiquement (`detectSessionInUrl`, PR 1) au chargement. Plutôt
 * qu'un simple spinner, on offre un court moment de confirmation (pastille verte + « Vous êtes
 * connecté ») avant de renvoyer l'utilisateur dans l'expérience, là où ses favoris l'attendent.
 * Sur natif, cet écran n'est pas atteint (le flux revient via `expo-web-browser`).
 */
export default function AuthCallback() {
  const router = useRouter();
  const { status } = useSession();
  const connected = status === 'authenticated';

  // Apparition douce de la pastille de succès (respecte « Réduire les animations »).
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) pop.setValue(1);
        else Animated.spring(pop, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200, mass: 0.7 }).start();
      })
      .catch(() => pop.setValue(1));
    return () => {
      cancelled = true;
    };
  }, [connected, pop]);

  useEffect(() => {
    // Un peu plus long quand on est connecté : on laisse voir la confirmation.
    const t = setTimeout(() => router.replace('/'), connected ? 850 : 900);
    return () => clearTimeout(t);
  }, [router, connected]);

  return (
    <View style={styles.root}>
      {connected ? (
        <>
          <Animated.View style={[styles.badge, { opacity: pop, transform: [{ scale: pop }] }]}>
            <Feather name="check" size={30} color="#FFFFFF" />
          </Animated.View>
          <YText variant="title" style={styles.title}>
            Vous êtes connecté
          </YText>
          <YText variant="body" color="muted" style={styles.label}>
            Vos favoris vous attendent.
          </YText>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <YText variant="body" color="muted" style={styles.label}>
            Connexion en cours…
          </YText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.md },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center' },
  label: { textAlign: 'center' },
});
