import { Feather } from '@expo/vector-icons';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsSwitch } from '@/components/settings/SettingsSwitch';
import { useTheme } from '@/design/theme/ThemeProvider';
import { useLocationSimulationStore } from '@/features/location';
import { LocationSimulationService } from '@/services/LocationSimulationService';

/**
 * Panneau DEV de simulation GPS. Rendu UNIQUEMENT en développement (l'appelant gère le `__DEV__`).
 * Interrupteur global + sélection d'un point favori. Toute action passe par le service, source de
 * vérité — le reste de l'app se comporte ensuite comme si l'utilisateur était à la position choisie.
 */
export function LocationSimulationSettings() {
  const { colors } = useTheme();
  const enabled = useLocationSimulationStore((s) => s.enabled);
  const place = useLocationSimulationStore((s) => s.place);

  return (
    <SettingsSection
      title="Simulation GPS · DEV"
      footer="Outil de test géographique réservé au développement. Quand il est actif, toute l'app (carte, distances, recommandations, itinéraires) se comporte comme si vous étiez à la position choisie.">
      <SettingsSwitch
        icon={{ set: 'feather', name: 'map-pin' }}
        iconTint={enabled ? colors.primary : colors.mutedText}
        label="Simuler ma position"
        subtitle={enabled && place ? place.label : 'Vraie géolocalisation active'}
        value={enabled}
        onValueChange={(v) =>
          v ? LocationSimulationService.enableSimulation() : LocationSimulationService.disableSimulation()
        }
      />
      {LocationSimulationService.presets.map((p) => {
        const active = enabled && place?.label === p.label;
        return (
          <SettingsRow
            key={p.label}
            icon={{ set: 'feather', name: 'navigation' }}
            iconTint={active ? colors.primary : colors.mutedText}
            label={p.label}
            subtitle={`${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`}
            right={active ? <Feather name="check" size={18} color={colors.primary} /> : undefined}
            onPress={() => LocationSimulationService.setSimulatedLocation(p.latitude, p.longitude, p.label)}
          />
        );
      })}
    </SettingsSection>
  );
}
