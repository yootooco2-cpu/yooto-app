import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { spacing } from '@/design/tokens/spacing';

function nowLabel(): string {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Barre d'état façon smartphone (heure · signal · wifi · batterie), au-dessus de la barre de
 * recherche. Rendue UNIQUEMENT sur web (sur iOS/Android l'OS affiche déjà sa propre barre → pas
 * de doublon). Heure réelle (rafraîchie) et batterie réelle si l'API le permet ; signal & wifi
 * décoratifs (non exposés au web). Style aligné sur le chrome sombre (verre).
 */
export function StatusBarStrip() {
  const [time, setTime] = useState(nowLabel);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTime(nowLabel()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as unknown as { getBattery?: () => Promise<BatteryLike> };
    if (!nav.getBattery) return;
    let mounted = true;
    let bat: BatteryLike | null = null;
    const update = () => {
      if (mounted && bat) setBattery({ level: bat.level, charging: bat.charging });
    };
    nav
      .getBattery()
      .then((b) => {
        bat = b;
        update();
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      bat?.removeEventListener('levelchange', update);
      bat?.removeEventListener('chargingchange', update);
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  const color = glass.onDark;
  const level = battery ? Math.max(0.06, Math.min(1, battery.level)) : 1;

  return (
    <View style={styles.bar} pointerEvents="none">
      <YText style={[styles.time, { color }]}>{time}</YText>
      <View style={styles.right}>
        {/* Signal cellulaire (décoratif — non exposé au web). */}
        <View style={styles.signal}>
          {[5, 8, 11, 14].map((h) => (
            <View key={h} style={[styles.sigBar, { height: h, backgroundColor: color }]} />
          ))}
        </View>
        <Feather name="wifi" size={15} color={color} />
        {/* Batterie (niveau réel si disponible ; vert + éclair si en charge). */}
        <View style={styles.battery}>
          <View style={[styles.batteryBody, { borderColor: color }]}>
            <View
              style={[
                styles.batteryFill,
                { width: `${Math.round(level * 100)}%`, backgroundColor: battery?.charging ? '#69B96C' : color },
              ]}
            />
            {battery?.charging ? <Feather name="zap" size={9} color="#000000" style={styles.bolt} /> : null}
          </View>
          <View style={[styles.batteryCap, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

interface BatteryLike {
  level: number;
  charging: boolean;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  time: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 },
  sigBar: { width: 3, borderRadius: 1 },
  battery: { flexDirection: 'row', alignItems: 'center' },
  batteryBody: { width: 22, height: 11, borderRadius: 3, borderWidth: 1, padding: 1, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' },
  batteryFill: { height: '100%', borderRadius: 1.5 },
  // Éclair de charge centré sur la batterie (comme iOS).
  bolt: { position: 'absolute', left: 6, top: 1 },
  batteryCap: { width: 2, height: 5, borderRadius: 1, marginLeft: 1 },
});
