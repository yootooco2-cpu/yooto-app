import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { useSession } from '@/features/auth';

/**
 * Callback d'authentification (web) — page d'atterrissage de la redirection OAuth / lien magique.
 * La session est finalisée automatiquement (`detectSessionInUrl`, PR 1) au chargement ; on
 * attend brièvement puis on renvoie l'utilisateur dans l'expérience. Sur natif, ce n'est pas
 * atteint (le flux revient via `expo-web-browser`).
 */
export default function AuthCallback() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/'), status === 'authenticated' ? 250 : 900);
    return () => clearTimeout(t);
  }, [router, status]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.primary} />
      <YText variant="body" color="muted" style={styles.label}>
        Connexion en cours…
      </YText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.md },
  label: { marginTop: spacing.sm },
});
