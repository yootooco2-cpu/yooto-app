import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';

type Props = {
  uri: string | null;
  height: number;
  rounded?: number;
  /** Clé de recyclage (id commerce) pour un défilement de liste fluide. */
  recyclingKey?: string;
};

/**
 * Photo de commerce (expo-image) avec fallback YOOTOO élégant si `uri` est null.
 * - `cachePolicy="memory-disk"` + `recyclingKey` → chargement progressif & cache.
 * - `transition` → fondu doux à l'apparition. `contentFit="cover"`. Web + natif.
 */
export function MerchantPhoto({ uri, height, rounded = radii.lg, recyclingKey }: Props) {
  if (uri) {
    return (
      <Image
        source={uri}
        style={{ width: '100%', height, borderRadius: rounded, backgroundColor: colors.border }}
        contentFit="cover"
        transition={220}
        cachePolicy="memory-disk"
        recyclingKey={recyclingKey}
      />
    );
  }

  return (
    <View style={[styles.fallback, { height, borderRadius: rounded }]}>
      <YText variant="label" color="inverse">
        YOOTOO
      </YText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    width: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
