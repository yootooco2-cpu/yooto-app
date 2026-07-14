import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { haptics } from '@/lib/haptics';

import type { TransitMode } from '../mapModel';

/**
 * Sélecteur segmenté Tous / Tramway / Bus — jamais un menu déroulant ni des cases.
 * Pictogramme + texte (pas seulement la couleur), option active en fond sombre YOOTOO,
 * inactives sur verre clair, zones tactiles ≥ 44 px, retour haptique léger.
 */
const OPTIONS: { mode: TransitMode; label: string; icon: () => React.ReactNode }[] = [
  { mode: 'tous', label: 'Tous', icon: () => <Feather name="layers" size={15} color="currentColor" /> },
  { mode: 'tram', label: 'Tramway', icon: () => <MaterialCommunityIcons name="tram" size={16} color="currentColor" /> },
  { mode: 'bus', label: 'Bus', icon: () => <MaterialCommunityIcons name="bus" size={16} color="currentColor" /> },
];

const ACTIVE_BG = '#1F2937'; // sombre YOOTOO (contraste AA avec le blanc)

export function ModeSelector({ mode, onChange }: { mode: TransitMode; onChange: (m: TransitMode) => void }) {
  return (
    <View style={[styles.wrap, glass.panel]} accessibilityRole="tablist">
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        return (
          <Pressable
            key={opt.mode}
            accessibilityRole="tab"
            accessibilityLabel={`Filtre ${opt.label}`}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptics.selection?.();
              onChange(opt.mode);
            }}
            style={[styles.option, active && { backgroundColor: ACTIVE_BG }]}>
            <View style={{ opacity: active ? 1 : 0.75 }}>
              {/* couleur portée par le parent : blanc si actif, sombre sinon */}
              <YText style={[styles.icon, { color: active ? '#FFFFFF' : ACTIVE_BG }]}>{opt.icon()}</YText>
            </View>
            <YText style={[styles.label, { color: active ? '#FFFFFF' : ACTIVE_BG }]}>{opt.label}</YText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: radii.xl, padding: 4, gap: 4 },
  option: {
    flex: 1, minHeight: 44, borderRadius: radii.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  icon: { lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700' },
});
