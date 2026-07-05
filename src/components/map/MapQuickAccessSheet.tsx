import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

/**
 * Une SECTION d'accès rapide. Architecture extensible : ajouter « Collections », « Récents »…
 * plus tard = pousser une entrée dans `sections` ; ni ce composant ni l'écran carte ne changent.
 */
export interface QuickAccessSection {
  id: string;
  title: string;
  render: () => ReactNode;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sections: QuickAccessSection[];
}

/**
 * Bottom sheet « accès rapide » de la carte — verre dépoli sombre (chrome premium cohérent).
 * V1 : une seule section (Favoris). Générique : rend toutes les `sections` fournies.
 * Overlay léger (Modal RN) → aucun impact sur le moteur de carte ni sur le bottom sheet existant.
 */
export function MapQuickAccessSheet({ open, onClose, sections }: Props) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <View style={[styles.sheet, glass.panel]}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {sections.map((section, i) => (
              <View key={section.id} style={i > 0 ? styles.sectionSpaced : undefined}>
                <View style={styles.sectionHeader}>
                  <YText variant="title" style={{ color: glass.onDark }}>
                    {section.title}
                  </YText>
                  {i === 0 ? (
                    <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer">
                      <Feather name="x" size={20} color={glass.onDark} />
                    </Pressable>
                  ) : null}
                </View>
                {section.render()}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(23,32,26,0.38)',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '72%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(243,238,226,0.45)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  content: {
    paddingBottom: spacing.sm,
  },
  sectionSpaced: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
});
