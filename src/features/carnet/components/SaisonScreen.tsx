import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { SupportContactFooter } from '@/components/ui/SupportContactFooter';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import { botaniqueSketchUri, carnetSerif, carnetTheme as C } from '../theme';
import { t, type Locale } from '../i18n';
import { getSaison, MOIS, type ProduitResolu } from '../saison';
import { Grain } from './Grain';
import { ProduitSheet } from './ProduitSheet';

// Visuel de référence officiel (« Image pour Claude.md ») — source de vérité de la DA.
// On affiche le bandeau haut (ardoise + étal) via contentFit/contentPosition (aucun crop offline).
const HERO = require('@/assets/images/carnet/de-saison-ref.png');

interface Props {
  locale?: Locale;
}

const MOIS_COURT = MOIS.map((m) => (m.length > 5 ? `${m.slice(0, 4)}.` : m));
const SKETCH = botaniqueSketchUri();

/**
 * SaisonScreen — « De saison ». Hero = visuel de référence peint (ardoise centrale +
 * légumes/fruits autour, craie), puis réglette mois, grilles produits, fiche carnet.
 */
export function SaisonScreen({ locale }: Props) {
  const [current] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState(current);
  const [active, setActive] = useState<ProduitResolu | null>(null);

  const saison = useMemo(() => getSaison(selected), [selected]);
  // TOUS les produits de saison sont affichés (aucun mois vide). Ceux sans illustration
  // dédiée utilisent le croquis botanique en attendant leur planche.
  const isEmpty = saison.legumes.length === 0 && saison.fruits.length === 0;

  const renderSection = (label: string, produits: ProduitResolu[], delay: number) => {
    if (produits.length === 0) return null;
    return (
      <Animated.View entering={FadeInDown.duration(320).delay(delay)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <YText style={styles.laurel}>❦</YText>
          <YText style={styles.sectionTitle}>{label}</YText>
          <YText style={styles.laurel}>❦</YText>
        </View>
        <View style={styles.grid}>
          {produits.map((produit) => (
            <Pressable
              key={produit.nom}
              onPress={() => setActive(produit)}
              accessibilityRole="button"
              accessibilityLabel={produit.nom}
              style={({ pressed }) => [styles.fiche, pressed && styles.fichePressed]}>
              {/* Petite ardoise : cadre bois discret, fond ardoise CONTINU (aucune barre),
                  illustration dominante, nom en craie posé sur l'ardoise (secondaire). */}
              <View style={styles.card}>
                <View style={styles.cardFace}>
                  <Image
                    source={produit.illustration ?? { uri: SKETCH }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  <YText style={styles.cardName} numberOfLines={1}>
                    {produit.nom}
                  </YText>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    );
  };

  return (
    <YScreen scroll gap="lg" padding="lg">
      {/* Hero — visuel de référence peint (ardoise + étal). Bandeau haut de l'image. */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.heroWrap}>
        <Image
          source={HERO}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="top center"
          accessibilityLabel={t('title', locale)}
        />
      </Animated.View>

      {/* Réglette des mois */}
      <View style={styles.reglette}>
        <YText style={styles.regletteHint}>{t('pickMonth', locale)} →</YText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.months}>
          {MOIS.map((mois, index) => {
            const isSelected = index === selected;
            return (
              <Pressable
                key={mois}
                onPress={() => setSelected(index)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={mois}
                style={[styles.monthItem, isSelected && styles.monthItemActive]}>
                <YText style={[styles.monthText, isSelected ? styles.monthTextActive : null]}>
                  {MOIS_COURT[index]}
                </YText>
                {index === current ? (
                  <View style={[styles.currentDot, isSelected && styles.currentDotOnActive]} />
                ) : (
                  <View style={styles.dotSpacer} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isEmpty ? (
        <YText style={styles.empty}>{t('empty', locale)}</YText>
      ) : (
        <>
          {renderSection(t('legumes', locale), saison.legumes, 40)}
          {renderSection(t('fruits', locale), saison.fruits, 120)}
        </>
      )}

      {/* Bandeau parchemin */}
      <View style={styles.note}>
        <Grain variant="paper" opacity={0.35} />
        <YText style={styles.noteText}>{t('note', locale)} ♡</YText>
      </View>

      <SupportContactFooter />

      <ProduitSheet
        produit={active}
        monthIndex={selected}
        locale={locale}
        onClose={() => setActive(null)}
      />
    </YScreen>
  );
}

const styles = StyleSheet.create({
  // Hero image (bandeau ardoise + étal). Ratio = fraction haute de l'image de référence.
  heroWrap: {
    width: '100%',
    aspectRatio: 1024 / 470,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: C.paperDeep,
    ...shadows.md,
  },

  // Réglette mois
  reglette: {
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: spacing.xs,
  },
  regletteHint: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 14,
    color: C.inkSoft,
  },
  months: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthItem: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  monthItemActive: {
    backgroundColor: C.forest,
  },
  monthText: {
    fontFamily: carnetSerif,
    fontSize: 15,
    color: C.inkSoft,
  },
  monthTextActive: {
    color: C.chalk,
  },
  currentDot: {
    marginTop: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.terracotta,
  },
  currentDotOnActive: {
    backgroundColor: C.chalk,
  },
  dotSpacer: {
    marginTop: 3,
    width: 4,
    height: 4,
  },

  // Sections
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: carnetSerif,
    fontSize: 24,
    color: C.forest,
  },
  laurel: {
    fontSize: 15,
    color: C.sage,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  fiche: {
    // Taille réduite (~20 %) & plafonnée → net (jamais agrandi au-delà de la déf. source),
    // grille homogène qui respire.
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 80,
    maxWidth: 90,
  },
  fichePressed: {
    opacity: 0.82,
  },
  // Gabarit unique : cadre bois → ardoise → bandeau nom + sujet carré.
  card: {
    backgroundColor: C.wood, // cadre bois discret
    padding: 2,
    borderTopLeftRadius: radii.md + 2,
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md + 2,
    borderBottomLeftRadius: radii.md,
    ...shadows.sm,
  },
  cardFace: {
    aspectRatio: 1, // ardoise carrée, fond continu
    backgroundColor: C.slate,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  cardName: {
    position: 'absolute',
    top: 5,
    left: 4,
    right: 4,
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 11,
    color: C.chalk,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Note parchemin
  note: {
    overflow: 'hidden',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.paperEdge,
    backgroundColor: C.paperDeep,
  },
  noteText: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: C.ink,
    textAlign: 'center',
  },
  empty: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    color: C.inkSoft,
    textAlign: 'center',
  },
});
