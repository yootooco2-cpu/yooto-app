import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { YLogo } from '@/components/brand/YLogo';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { PreferenceSection } from '@/features/profile/preferences';

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

export default function ProfileScreen() {
  return (
    <YScreen scroll gap="lg" padding="lg">
      {/* En-tête de marque YOOTOO */}
      <YLogo size={34} />

      {/* Hero utilisateur */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <YText variant="title" color="inverse">
            Y
          </YText>
        </View>
        <View style={styles.heroInfo}>
          <YText variant="subtitle">Invité</YText>
          <YText variant="caption" color="muted">
            Explorateur YOOTOO
          </YText>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <YText variant="caption" color="primary">
                Nouveau
              </YText>
            </View>
            <View style={styles.badge}>
              <YText variant="caption" color="primary">
                Local
              </YText>
            </View>
          </View>
        </View>
      </View>

      <YButton label="Se connecter" fullWidth />

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
