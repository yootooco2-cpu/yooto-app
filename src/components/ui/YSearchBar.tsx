import { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

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

/** Barre de recherche YOOTOO. `ref` transmis au `TextInput` → focus programmatique possible. */
export const YSearchBar = forwardRef<TextInput, Props>(function YSearchBar(
  // Placeholder court : il doit rester ENTIER dans la barre, même sur écran étroit (390 px).
  { value, onChangeText, placeholder = 'Rechercher un commerce…', variant = 'default', ...props },
  ref,
) {
  const { colors } = useTheme();
  const isGlass = variant === 'glass';
  const iconColor = isGlass ? glass.onDarkMuted : colors.mutedText;
  const placeholderColor = isGlass ? glass.onDarkMuted : colors.mutedText;
  return (
    <View
      style={[
        styles.container,
        isGlass ? [glass.panel, styles.glassShadow] : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
      ]}>
      {/* Loupe minimaliste composée de Views (aucune librairie d'icônes) */}
      <View style={styles.glass}>
        <View style={[styles.glassRing, { borderColor: iconColor }]} />
        <View style={[styles.glassHandle, { backgroundColor: iconColor }]} />
      </View>
      <TextInput
        ref={ref}
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
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md + spacing.xs,
    height: 54,
  },
  // Ombre extrêmement douce → la barre « flotte » au-dessus de la carte, transition imperceptible.
  glassShadow: Platform.select({
    web: { boxShadow: '0 8px 28px rgba(0,0,0,0.28)' },
    default: { shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  }),
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
