import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';

type Props = {
  uri: string | null;
  height: number;
  rounded?: number;
};

/**
 * Photo de commerce (expo-image) avec fallback YOOTOO élégant si `uri` est null.
 * Web + natif. `contentFit="cover"`.
 */
export function MerchantPhoto({ uri, height, rounded = radii.lg }: Props) {
  if (uri) {
    return (
      <Image
        source={uri}
        style={{ width: '100%', height, borderRadius: rounded }}
        contentFit="cover"
        transition={150}
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
