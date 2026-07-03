import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import { exportPreferences, resetPreferences } from '@/features/discovery';

/** Deux actions : exporter (presse-papiers/partage) et réinitialiser (confirmation). */
export function PreferenceActions() {
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const onExport = async () => {
    const data = exportPreferences();
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(data);
        }
        setFeedback('Préférences copiées');
      } else {
        await Share.share({ message: data });
        setFeedback('Préférences partagées');
      }
    } catch {
      setFeedback(null);
    }
  };

  if (confirming) {
    return (
      <View style={styles.block}>
        <YText variant="body" color="muted">
          Réinitialiser vos préférences ? Cette action supprimera uniquement vos habitudes
          enregistrées. Vos favoris et votre compte ne seront pas affectés.
        </YText>
        <View style={styles.row}>
          <View style={styles.item}>
            <YButton
              label="Annuler"
              variant="secondary"
              fullWidth
              onPress={() => setConfirming(false)}
            />
          </View>
          <View style={styles.item}>
            <YButton
              label="Réinitialiser"
              fullWidth
              onPress={() => {
                resetPreferences();
                setConfirming(false);
                setFeedback(null);
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      {feedback ? (
        <YText variant="caption" color="primary">
          {feedback}
        </YText>
      ) : null}
      <YButton
        label="Exporter mes préférences"
        variant="secondary"
        fullWidth
        onPress={() => void onExport()}
      />
      <YButton
        label="Réinitialiser mes préférences"
        variant="ghost"
        fullWidth
        onPress={() => setConfirming(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  item: {
    flex: 1,
  },
});
