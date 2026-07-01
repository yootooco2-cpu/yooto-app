import { type ComponentProps, type PropsWithChildren, type ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

type AnimatedScrollProps = ComponentProps<typeof Animated.ScrollView>;

type Props = PropsWithChildren<{
  /** Active le défilement vertical du contenu. */
  scroll?: boolean;
  /** Padding intérieur (clé de l'échelle d'espacement). */
  padding?: keyof typeof spacing;
  /** Espacement vertical entre les enfants (clé de l'échelle). */
  gap?: keyof typeof spacing;
  /** Centre le contenu verticalement (ignoré si scroll). */
  center?: boolean;
  /** Barre d'action flottante ancrée en bas (CTA premium). */
  footer?: ReactNode;
  /** Handler de scroll Reanimated (active un Animated.ScrollView pour la parallaxe). */
  onScroll?: AnimatedScrollProps['onScroll'];
  style?: ViewStyle;
}>;

export function YScreen({
  children,
  scroll = false,
  padding = 'lg',
  gap = 'lg',
  center = false,
  footer,
  onScroll,
  style,
}: Props) {
  const contentStyle: ViewStyle = {
    padding: spacing[padding],
    gap: spacing[gap],
  };

  return (
    <SafeAreaView style={styles.screen}>
      {scroll ? (
        onScroll ? (
          <Animated.ScrollView
            contentContainerStyle={[styles.scrollContent, contentStyle, style]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}>
            {children}
          </Animated.ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, contentStyle, style]}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        )
      ) : (
        <View style={[styles.container, center && styles.centered, contentStyle, style]}>
          {children}
        </View>
      )}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
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
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
});
