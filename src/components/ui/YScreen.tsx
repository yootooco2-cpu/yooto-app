import { type PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';

type Props = PropsWithChildren<{
  /** Active le défilement vertical du contenu. */
  scroll?: boolean;
  /** Padding intérieur (clé de l'échelle d'espacement). */
  padding?: keyof typeof spacing;
  /** Espacement vertical entre les enfants (clé de l'échelle). */
  gap?: keyof typeof spacing;
  /** Centre le contenu verticalement (ignoré si scroll). */
  center?: boolean;
  style?: ViewStyle;
}>;

export function YScreen({
  children,
  scroll = false,
  padding = 'lg',
  gap = 'lg',
  center = false,
  style,
}: Props) {
  const contentStyle: ViewStyle = {
    padding: spacing[padding],
    gap: spacing[gap],
  };

  return (
    <SafeAreaView style={styles.screen}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle, style]}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, center && styles.centered, contentStyle, style]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
});
