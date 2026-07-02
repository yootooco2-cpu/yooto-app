import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import { carnetSerif, carnetTheme as C } from '../theme';
import { t, type Locale } from '../i18n';
import { MOIS, marmitonSearchUrl, type ProduitResolu } from '../saison';
import { Grain } from './Grain';

interface Props {
  produit: ProduitResolu | null;
  monthIndex: number;
  locale?: Locale;
  onClose: () => void;
}

/** Fiche produit « page de carnet de cuisine » (papier crème, grain, recettes Marmiton). */
export function ProduitSheet({ produit, monthIndex, locale, onClose }: Props) {
  const open = produit !== null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('close', locale)}>
        {produit ? (
          <Pressable style={[styles.page, shadows.lg]} onPress={() => {}}>
            <Grain variant="paper" opacity={0.4} />
            <View style={styles.handle} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.hero}>
                <YText style={styles.emoji}>{produit.emoji}</YText>
                <View style={styles.heroText}>
                  <YText style={styles.season}>
                    {t('inSeason', locale)} · {MOIS[monthIndex]}
                  </YText>
                  <YText style={styles.name}>{produit.nom}</YText>
                  {typeof produit.fiche.kcal === 'number' ? (
                    <View style={styles.kcalPill}>
                      <YText style={styles.kcalText}>
                        {produit.fiche.kcal} {t('kcal', locale)}
                      </YText>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.block}>
                <YText style={styles.blockLabel}>🌿 {t('nutri', locale)}</YText>
                <YText style={styles.blockValue}>{produit.fiche.nutri}</YText>
              </View>
              <View style={styles.block}>
                <YText style={styles.blockLabel}>♡ {t('bienfait', locale)}</YText>
                <YText style={styles.blockValue}>{produit.fiche.bienfait}</YText>
              </View>
              <View style={styles.block}>
                <YText style={styles.blockLabel}>🏷️ {t('prix', locale)}</YText>
                <YText style={styles.priceValue}>{produit.fiche.prix}</YText>
              </View>

              <View style={styles.divider} />

              <YText style={styles.recipesTitle}>🍳 {t('recipes', locale)}</YText>
              <YText style={styles.recipesLead}>{t('recipesLead', locale)}</YText>

              <View style={styles.recipes}>
                {produit.fiche.recettes.map((recette) => (
                  <Pressable
                    key={recette}
                    accessibilityRole="link"
                    accessibilityLabel={`${recette} — Marmiton`}
                    onPress={() => {
                      void Linking.openURL(marmitonSearchUrl(recette, produit.nom));
                    }}
                    style={({ pressed }) => [styles.recipe, pressed && styles.recipePressed]}>
                    <YText style={styles.recipeEmoji}>{produit.emoji}</YText>
                    <View style={styles.recipeBody}>
                      <YText style={styles.recipeName}>{recette}</YText>
                      <YText style={styles.recipeSub}>→ {t('onMarmiton', locale)}</YText>
                    </View>
                    <YText style={styles.recipeArrow}>↗</YText>
                  </Pressable>
                ))}
              </View>

              <YText style={styles.footer}>
                {`❧  « ${produit.nom} », cueilli à maturité.`}
              </YText>

              <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
                <YText style={styles.closeText}>{t('close', locale)}</YText>
              </Pressable>
            </ScrollView>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23,32,26,0.42)',
  },
  page: {
    backgroundColor: C.paper,
    borderTopLeftRadius: radii.xl + 4,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: C.woodLight,
    marginBottom: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 64,
  },
  heroText: {
    flex: 1,
    gap: spacing.xs,
  },
  season: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 13,
    color: C.sage,
  },
  name: {
    fontFamily: carnetSerif,
    fontSize: 30,
    lineHeight: 34,
    color: C.forest,
  },
  kcalPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: C.paperDeep,
    borderWidth: 1,
    borderColor: C.paperEdge,
  },
  kcalText: {
    fontSize: 12,
    color: C.wood,
  },
  block: {
    gap: 2,
    marginTop: spacing.sm,
  },
  blockLabel: {
    fontFamily: carnetSerif,
    fontSize: 15,
    color: C.forest,
  },
  blockValue: {
    fontSize: 15,
    lineHeight: 21,
    color: C.ink,
  },
  priceValue: {
    fontFamily: carnetSerif,
    fontSize: 17,
    color: C.terracotta,
  },
  divider: {
    marginVertical: spacing.md,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.line,
  },
  recipesTitle: {
    fontFamily: carnetSerif,
    fontSize: 18,
    color: C.terracotta,
  },
  recipesLead: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 14,
    color: C.inkSoft,
  },
  recipes: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  recipe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: radii.md + 3,
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md + 3,
    borderBottomLeftRadius: radii.md,
    borderWidth: 1,
    borderColor: C.paperEdge,
    backgroundColor: C.paperDeep,
  },
  recipePressed: {
    opacity: 0.75,
  },
  recipeEmoji: {
    fontSize: 24,
  },
  recipeBody: {
    flex: 1,
  },
  recipeName: {
    fontFamily: carnetSerif,
    fontSize: 16,
    color: C.forest,
  },
  recipeSub: {
    fontSize: 12,
    color: C.terracotta,
  },
  recipeArrow: {
    fontSize: 16,
    color: C.wood,
  },
  footer: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 14,
    color: C.inkSoft,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  closeText: {
    fontFamily: carnetSerif,
    fontSize: 15,
    color: C.wood,
  },
});
