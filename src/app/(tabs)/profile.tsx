import { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SupportContactFooter } from '@/components/ui/SupportContactFooter';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { useProfileRow, useSession } from '@/features/auth';
import { PreferenceSection } from '@/features/profile/preferences';
import { continueWithProvider, signOut, type AuthProvider } from '@/lib/supabase/authActions';

type Space = {
  title: string;
  description: string;
};

/** Espaces personnels — états vides inspirants (jamais techniques). */
const SPACES: Space[] = [
  {
    title: 'Mes favoris',
    description: 'Commencez à explorer les commerces autour de vous pour construire votre collection.',
  },
  {
    title: 'Mes récompenses',
    description: 'Soutenez le local et débloquez peu à peu des avantages chez vos commerçants.',
  },
  {
    title: 'Mon impact',
    description: 'Suivez votre empreinte locale et écologique au fil de vos découvertes.',
  },
  {
    title: 'Préférences',
    description: 'Personnalisez votre expérience YOOTOO selon vos envies.',
  },
  {
    title: 'Historique',
    description: 'Retrouvez ici les commerces que vous aurez visités.',
  },
];

/** Initiale d'affichage pour l'avatar de repli. */
function initialOf(name: string | null, email: string | null): string {
  const src = name ?? email ?? 'Y';
  return src.trim().charAt(0).toUpperCase() || 'Y';
}

export default function ProfileScreen() {
  const { status, userId, identity } = useSession();
  const isAuthenticated = status === 'authenticated';
  const profileRow = useProfileRow(isAuthenticated ? userId : null);
  const [busy, setBusy] = useState<null | AuthProvider | 'signout'>(null);
  const [error, setError] = useState<string | null>(null);

  const onProvider = async (provider: AuthProvider) => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    const res = await continueWithProvider(provider);
    // Web : redirection en cours. Natif : succès → l'état bascule via onAuthStateChange.
    if (!res.ok && res.error !== 'cancelled') {
      setError(res.error === 'not-configured' ? 'Connexion bientôt disponible.' : 'Connexion impossible, réessayez.');
    }
    setBusy(null);
  };

  const onSignOut = async () => {
    if (busy) return;
    setBusy('signout');
    await signOut();
    setBusy(null);
  };

  return (
    <YScreen scroll gap="lg" padding="lg">
      {/* Hero utilisateur */}
      <View style={styles.hero}>
        {isAuthenticated && identity?.avatarUrl ? (
          <Image source={{ uri: identity.avatarUrl }} style={styles.avatarImg} accessibilityLabel="Photo de profil" />
        ) : (
          <View style={styles.avatar}>
            <YText variant="title" color="inverse">
              {isAuthenticated ? initialOf(identity?.displayName ?? null, identity?.email ?? null) : 'Y'}
            </YText>
          </View>
        )}
        <View style={styles.heroInfo}>
          {isAuthenticated ? (
            <>
              <YText variant="subtitle">{identity?.displayName ?? 'Membre YOOTOO'}</YText>
              {identity?.email ? (
                <YText variant="caption" color="muted">
                  {identity.email}
                </YText>
              ) : null}
              <View style={styles.badges}>
                <View style={[styles.badge, styles.badgeOn]}>
                  <YText variant="caption" color="inverse">
                    Connecté
                  </YText>
                </View>
                {profileRow.exists ? (
                  <View style={styles.badge}>
                    <YText variant="caption" color="primary">
                      Profil enregistré ✓
                    </YText>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <YText variant="subtitle">Invité</YText>
              <YText variant="caption" color="muted">
                Explorateur YOOTOO
              </YText>
            </>
          )}
        </View>
      </View>

      {isAuthenticated ? (
        <YButton
          label="Se déconnecter"
          variant="secondary"
          fullWidth
          loading={busy === 'signout'}
          onPress={() => void onSignOut()}
        />
      ) : (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.authBlock}>
          <YText variant="body" color="muted" style={styles.authLead}>
            Connectez-vous pour retrouver vos favoris et vos avantages, partout. Sans mot de passe.
          </YText>
          <YButton
            label="Continuer avec Google"
            fullWidth
            loading={busy === 'google'}
            onPress={() => void onProvider('google')}
          />
          {Platform.OS === 'ios' ? (
            <YButton
              label="Continuer avec Apple"
              variant="secondary"
              fullWidth
              loading={busy === 'apple'}
              onPress={() => void onProvider('apple')}
            />
          ) : null}
          {error ? (
            <YText variant="caption" style={styles.error}>
              {error}
            </YText>
          ) : null}
        </Animated.View>
      )}

      <PreferenceSection />

      {SPACES.map((space, index) => (
        <Animated.View key={space.title} entering={FadeInDown.delay(60 + index * 50).duration(200)}>
          <YCard>
            <View style={styles.cardHeader}>
              <YText variant="subtitle" style={styles.cardTitle}>
                {space.title}
              </YText>
              <View style={styles.soonPill}>
                <YText variant="caption" color="muted">
                  Bientôt
                </YText>
              </View>
            </View>
            <YText variant="body" color="muted">
              {space.description}
            </YText>
          </YCard>
        </Animated.View>
      ))}
      <SupportContactFooter />
    </YScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  badgeOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  authBlock: {
    gap: spacing.sm,
  },
  authLead: {
    marginBottom: spacing.xs,
  },
  error: {
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    flexShrink: 1,
  },
  soonPill: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
