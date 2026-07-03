import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';

type Props = {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
};

/** Image plein écran avec double-tap pour zoomer (toggle), sans gesture-handler. */
function ZoomableImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const [zoomed, setZoomed] = useState(false);
  const lastTap = useRef(0);

  const onPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 260) setZoomed((z) => !z);
    lastTap.current = now;
  };

  return (
    <Pressable onPress={onPress} style={[styles.page, { width, height }]}>
      <Image
        source={uri}
        style={{ width, height, transform: [{ scale: zoomed ? 2.4 : 1 }] }}
        contentFit="contain"
        transition={150}
      />
    </Pressable>
  );
}

/**
 * Galerie plein écran : swipe horizontal (paging), double-tap zoom, points de
 * pagination, fermeture. Réutilise expo-image. Aucun package supplémentaire.
 */
export function FullscreenGallery({ images, initialIndex = 0, visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.close}
          onPress={onClose}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Fermer la galerie">
          <YText variant="title" color="inverse">
            ✕
          </YText>
        </Pressable>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * width, y: 0 }}
          onMomentumScrollEnd={onScrollEnd}>
          {images.map((uri, i) => (
            <ZoomableImage key={`${uri}-${i}`} uri={uri} width={width} height={height} />
          ))}
        </ScrollView>

        {images.length > 1 ? (
          <View style={styles.dots}>
            {images.map((uri, i) => (
              <View key={`${uri}-dot-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    zIndex: 10,
  },
  dots: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
});
