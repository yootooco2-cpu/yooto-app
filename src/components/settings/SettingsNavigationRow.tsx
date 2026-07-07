import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { spacing } from '@/design/tokens/spacing';

import { SettingsRow, type IconSpec } from './SettingsRow';

interface Props {
  icon?: IconSpec;
  iconTint?: string;
  label: string;
  subtitle?: string;
  /** Valeur affichée à droite (ex. « Élevée », « Connecté »). */
  value?: string;
  /** État coché (pastille) — pour « Connecté / Non connecté ». */
  status?: 'on' | 'off';
  onPress?: () => void;
}

/** Ligne de navigation (chevron) — thémée. Peut afficher une valeur ou un statut à droite. */
export function SettingsNavigationRow({ icon, iconTint, label, subtitle, value, status, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <SettingsRow
      icon={icon}
      iconTint={iconTint}
      label={label}
      subtitle={subtitle}
      onPress={onPress}
      right={
        <View style={styles.right}>
          {status ? (
            <View style={styles.status}>
              <Feather
                name={status === 'on' ? 'check-circle' : 'circle'}
                size={15}
                color={status === 'on' ? colors.success : colors.mutedText}
              />
              <YText style={[styles.statusText, { color: status === 'on' ? colors.success : colors.mutedText }]}>
                {status === 'on' ? 'Connecté' : 'Non connecté'}
              </YText>
            </View>
          ) : null}
          {value ? <YText style={[styles.value, { color: colors.mutedText }]}>{value}</YText> : null}
          {onPress ? <Feather name="chevron-right" size={18} color={colors.mutedText} /> : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 14 },
});
