import { Switch } from 'react-native';

import { useTheme } from '@/design/theme/ThemeProvider';

import { SettingsRow, type IconSpec } from './SettingsRow';

interface Props {
  icon?: IconSpec;
  iconTint?: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** Ligne de réglage avec interrupteur (Switch) — thémée. */
export function SettingsSwitch({ icon, iconTint, label, subtitle, value, onValueChange }: Props) {
  const { colors } = useTheme();
  return (
    <SettingsRow
      icon={icon}
      iconTint={iconTint}
      label={label}
      subtitle={subtitle}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.border}
          accessibilityLabel={label}
        />
      }
    />
  );
}
