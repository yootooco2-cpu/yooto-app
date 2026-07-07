import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { type ThemeMode } from '@/design/theme/themeStorage';
import { haptics } from '@/lib/haptics';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

const OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { mode: 'light', label: 'Clair', icon: 'sun' },
  { mode: 'dark', label: 'Sombre', icon: 'moon' },
  { mode: 'auto', label: 'Auto', icon: 'smartphone' },
];

/**
 * Sélecteur de thème segmenté (Clair / Sombre / Auto). Le choix s'applique IMMÉDIATEMENT à toute
 * l'app (via `ThemeProvider`) et est persisté. Entièrement thémé.
 */
export function SettingsThemeSelector() {
  const { mode, colors, setMode } = useTheme();
  const toast = useToast();

  return (
    <View style={[styles.segment, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        return (
          <Pressable
            key={opt.mode}
            onPress={() => {
              haptics.selection();
              setMode(opt.mode);
              toast.show(`Thème : ${opt.label}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Thème ${opt.label}`}
            accessibilityState={{ selected: active }}
            style={[styles.option, active && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name={opt.icon} size={16} color={active ? colors.primary : colors.mutedText} />
            <YText style={[styles.label, { color: active ? colors.text : colors.mutedText }]}>{opt.label}</YText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: { fontSize: 13.5, fontWeight: '600' },
});
