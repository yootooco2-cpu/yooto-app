import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

export type IconSpec =
  | { set: 'feather'; name: ComponentProps<typeof Feather>['name'] }
  | { set: 'mci'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

export function SettingsIcon({ icon, tint }: { icon: IconSpec; tint: string }) {
  return (
    <View style={[styles.iconWrap, { backgroundColor: `${tint}22` }]}>
      {icon.set === 'feather' ? (
        <Feather name={icon.name} size={17} color={tint} />
      ) : (
        <MaterialCommunityIcons name={icon.name} size={17} color={tint} />
      )}
    </View>
  );
}

interface Props {
  icon?: IconSpec;
  /** Teinte de l'icône (défaut : primaire du thème). */
  iconTint?: string;
  label: string;
  subtitle?: string;
  /** Élément de droite (Switch, chevron, texte de valeur…). */
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
}

/**
 * Ligne de réglage GÉNÉRIQUE (brique de base). Icône teintée optionnelle + libellé + sous-titre +
 * zone de droite libre. Devient tactile si `onPress`. Entièrement thémée (aucune couleur en dur).
 */
export function SettingsRow({ icon, iconTint, label, subtitle, right, onPress, danger }: Props) {
  const { colors } = useTheme();
  const labelColor = danger ? colors.danger : colors.text;

  const content = (
    <View style={styles.row}>
      {icon ? <SettingsIcon icon={icon} tint={danger ? colors.danger : iconTint ?? colors.primary} /> : null}
      <View style={styles.texts}>
        <YText style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </YText>
        {subtitle ? (
          <YText style={[styles.subtitle, { color: colors.mutedText }]} numberOfLines={2}>
            {subtitle}
          </YText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  iconWrap: { width: 34, height: 34, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12.5, lineHeight: 17 },
  right: { marginLeft: spacing.sm },
  pressed: { opacity: 0.6 },
});
