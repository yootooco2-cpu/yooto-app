import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

type Props = Omit<TextInputProps, 'style'> & {
  value: string;
  onChangeText: (value: string) => void;
};

export function YSearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher un commerce, un produit…',
  ...props
}: Props) {
  return (
    <View style={styles.container}>
      {/* Loupe minimaliste composée de Views (aucune librairie d'icônes) */}
      <View style={styles.glass}>
        <View style={styles.glassRing} />
        <View style={styles.glassHandle} />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedText}
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: colors.mutedText,
  },
  glassHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 6,
    height: 2,
    backgroundColor: colors.mutedText,
    transform: [{ rotate: '45deg' }],
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingVertical: 0,
  },
});
