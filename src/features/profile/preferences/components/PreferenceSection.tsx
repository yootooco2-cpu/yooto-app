import Animated, { FadeInDown } from 'react-native-reanimated';

import { YCard } from '@/components/ui/YCard';
import { YText } from '@/components/ui/YText';

import { usePreferenceSummary } from '../hooks/usePreferenceSummary';
import { PreferenceActions } from './PreferenceActions';
import { PreferenceCategories } from './PreferenceCategories';
import { PreferenceStats } from './PreferenceStats';

/**
 * Section Profil → Préférences (VUE SEULE).
 * Consomme usePreferences/exportPreferences/resetPreferences via ses composants ;
 * ne modifie jamais le moteur. Respecte DESIGN.md (YCard, tokens, animation).
 */
export function PreferenceSection() {
  const summary = usePreferenceSummary();

  return (
    <Animated.View entering={FadeInDown.duration(200)}>
      <YCard>
        <YText variant="subtitle">Préférences</YText>

        {summary.hasData ? (
          <>
            <PreferenceCategories categories={summary.favoriteCategories} />
            <PreferenceStats
              prefersProducers={summary.prefersProducers}
              interactionCount={summary.interactionCount}
            />
          </>
        ) : (
          <YText variant="body" color="muted">
            Vos préférences évolueront au fur et à mesure de votre utilisation de YOOTOO.
          </YText>
        )}

        <PreferenceActions />
      </YCard>
    </Animated.View>
  );
}
