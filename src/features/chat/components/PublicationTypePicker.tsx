import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { EDITORIAL_TYPES, editorialCryptoAsset, type CryptoId, type EditorialType } from '../editorialTypes';

/**
 * Sélecteur de TYPE DE PUBLICATION — pièce maîtresse de la création d'une publication du Chat.
 * Grille responsive des 18 cryptogrammes éditoriaux officiels (médaillons HD, intégrés tels quels).
 * Sélection unique mémorisée : au tap, animation douce (scale + élévation) + halo doré + retour
 * haptique (mobile). DA YOOTOO (verre dépoli, noir profond). Réutilise `editorialCryptoAsset`.
 */
export function PublicationTypePicker({
  value,
  onChange,
}: {
  value: CryptoId | null;
  onChange: (id: CryptoId) => void;
}) {
  return (
    <View style={styles.grid}>
      {EDITORIAL_TYPES.map((t) => (
        <PickerCell key={t.id} type={t} selected={value === t.id} onPress={() => onChange(t.id)} />
      ))}
    </View>
  );
}

function PickerCell({ type, selected, onPress }: { type: EditorialType; selected: boolean; onPress: () => void }) {
  const p = useSharedValue(selected ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    p.value = withSpring(selected ? 1 : 0, { damping: 15, stiffness: 180, mass: 0.6 });
  }, [selected, p]);

  const medStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + p.value * 0.08 - pressed.value * 0.05 },
      { translateY: -p.value * 5 },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: p.value }));

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => (pressed.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (pressed.value = withTiming(0, { duration: 140 }))}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Type ${type.label}${selected ? ', sélectionné' : ''}`}
      style={styles.cell}>
      <Animated.View style={[styles.medWrap, medStyle]}>
        <Animated.View style={[styles.halo, haloStyle]} />
        <Image source={editorialCryptoAsset(type.id)} style={styles.med} contentFit="contain" cachePolicy="memory-disk" />
      </Animated.View>
      <YText
        numberOfLines={2}
        style={[styles.label, { color: selected ? glass.onDark : glass.onDarkMuted }, selected && styles.labelOn]}>
        {type.label}
      </YText>
    </Pressable>
  );
}

const MED = 62;

const styles = StyleSheet.create({
  // Grille responsive : ~3 colonnes sur mobile, davantage sur tablette/web (les cellules grandissent).
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginHorizontal: -spacing.xs / 2 },
  cell: {
    flexGrow: 1,
    flexBasis: 100,
    minWidth: 96,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radii.lg,
  },
  medWrap: { width: MED, height: MED, alignItems: 'center', justifyContent: 'center' },
  med: { width: MED, height: MED },
  // Halo doré subtil derrière le médaillon sélectionné.
  halo: {
    position: 'absolute',
    width: MED + 16,
    height: MED + 16,
    borderRadius: (MED + 16) / 2,
    backgroundColor: 'rgba(224,192,112,0.18)',
    shadowColor: '#E0C070',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  label: { fontSize: 11.5, lineHeight: 14, textAlign: 'center', fontWeight: '600' },
  labelOn: { fontWeight: '800' },
});
