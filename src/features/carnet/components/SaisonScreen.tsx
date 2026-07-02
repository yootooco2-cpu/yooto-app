import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import { carnetSerif, carnetTheme as C } from '../theme';
import { t, type Locale } from '../i18n';
import { getSaison, MOIS, type ProduitResolu } from '../saison';
import { Grain } from './Grain';
import { ProduitSheet } from './ProduitSheet';

interface Props {
  locale?: Locale;
}

/** Abréviation éditoriale du mois pour la réglette (« Janv. »…). */
const MOIS_COURT = MOIS.map((m) => (m.length > 5 ? `${m.slice(0, 4)}.` : m));

/**
 * SaisonScreen — « De saison » : étal de primeur / carnet botanique.
 * Ardoise héros (craie), réglette mois éditoriale, fiches-ardoise produits, fiche carnet.
 */
export function SaisonScreen({ locale }: Props) {
  const [current] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState(current);
  const [active, setActive] = useState<ProduitResolu | null>(null);

  const saison = useMemo(() => getSaison(selected), [selected]);
  const isEmpty = saison.legumes.length === 0 && saison.fruits.length === 0;

  const renderSection = (label: string, produits: ProduitResolu[], delay: number) => {
    if (produits.length === 0) return null;
    return (
      <Animated.View entering={FadeInDown.duration(320).delay(delay)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <YText style={styles.laurelLeft}>❦</YText>
          <YText style={styles.sectionTitle}>{label}</YText>
          <YText style={styles.laurelRight}>❦</YText>
        </View>
        <View style={styles.grid}>
          {produits.map((produit) => (
            <Pressable
              key={produit.nom}
              onPress={() => setActive(produit)}
              accessibilityRole="button"
              accessibilityLabel={produit.nom}
              style={({ pressed }) => [styles.fiche, pressed && styles.fichePressed]}>
              <YText style={styles.ficheName} numberOfLines={1}>
                {produit.nom}
              </YText>
              <View style={styles.ficheSlate}>
                <YText style={styles.ficheEmoji}>{produit.emoji}</YText>
              </View>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    );
  };

  return (
    <YScreen scroll gap="lg" padding="lg">
      {/* En-tête éditorial */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <YText style={styles.laurelTitle}>❧</YText>
          <YText style={styles.title}>{t('title', locale)}</YText>
          <YText style={styles.laurelTitle}>❧</YText>
        </View>
        <YText style={styles.subtitle}>{t('subtitle', locale)}</YText>
      </View>

      {/* Ardoise dans son cadre bois */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.woodFrame}>
        <View style={styles.slate}>
          <Grain variant="slate" opacity={0.35} />
          <YText style={styles.leafSlateTop}>🌿</YText>
          <YText style={styles.chalkTitle}>{'Frais, local,\nde saison'}</YText>
          <YText style={styles.chalkHeart}>♡</YText>
        </View>
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
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  laurelTitle: {
    fontSize: 18,
    color: C.sage,
  },
  title: {
    fontFamily: carnetSerif,
    fontSize: 34,
    lineHeight: 40,
    color: C.forest,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 15,
    color: C.inkSoft,
    textAlign: 'center',
  },

  // Ardoise + cadre bois
  woodFrame: {
    backgroundColor: C.wood,
    padding: spacing.sm,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.lg + 3,
    borderBottomRightRadius: radii.xl - 2,
    borderBottomLeftRadius: radii.lg + 2,
    ...shadows.md,
  },
  slate: {
    backgroundColor: C.slate,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: C.slateEdge,
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    overflow: 'hidden',
  },
  leafSlateTop: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 34,
    opacity: 0.14,
  },
  chalkTitle: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 30,
    lineHeight: 38,
    color: C.chalk,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  chalkHeart: {
    marginTop: spacing.xs,
    fontSize: 18,
    color: C.chalkMuted,
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
  laurelLeft: {
    fontSize: 15,
    color: C.sage,
  },
  laurelRight: {
    fontSize: 15,
    color: C.sage,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fiche: {
    alignItems: 'center',
    gap: spacing.xs,
    flexGrow: 1,
    flexBasis: '28%',
    minWidth: 100,
  },
  fichePressed: {
    opacity: 0.8,
  },
  ficheName: {
    fontFamily: carnetSerif,
    fontStyle: 'italic',
    fontSize: 14,
    color: C.ink,
  },
  ficheSlate: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.slate,
    borderWidth: 2,
    borderColor: C.woodLight,
    // Coins légèrement irréguliers (fiche « faite main »).
    borderTopLeftRadius: radii.md + 3,
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md + 3,
    borderBottomLeftRadius: radii.md,
    ...shadows.sm,
  },
  ficheEmoji: {
    fontSize: 40,
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
