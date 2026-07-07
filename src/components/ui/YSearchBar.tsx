import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

type Props = Omit<TextInputProps, 'style'> & {
  value: string;
  onChangeText: (value: string) => void;
  /** `glass` = verre dépoli sombre (posé sur la carte). Défaut = clair (listes). */
  variant?: 'default' | 'glass';
};

export function YSearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher un commerce, un produit…',
  variant = 'default',
  ...props
}: Props) {
  const { colors } = useTheme();
  const isGlass = variant === 'glass';
  const iconColor = isGlass ? glass.onDarkMuted : colors.mutedText;
  const placeholderColor = isGlass ? glass.onDarkMuted : colors.mutedText;
  return (
    <View
      style={[
        styles.container,
        isGlass ? glass.panel : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
      ]}>
      {/* Loupe minimaliste composée de Views (aucune librairie d'icônes) */}
      <View style={styles.glass}>
        <View style={[styles.glassRing, { borderColor: iconColor }]} />
        <View style={[styles.glassHandle, { backgroundColor: iconColor }]} />
      </View>
      <TextInput
        style={[styles.input, { color: isGlass ? glass.onDark : colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        returnKeyType="search"
        clearButtonMode="while-editing"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  glass: {
    width: 16,
    height: 16,
    justifyContent: 'flex-start',
  },
  glassRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  glassHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 6,
    height: 2,
    transform: [{ rotate: '45deg' }],
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    paddingVertical: 0,
  },
});
