import {
  MERCHANT_LIGHT_OPACITY,
  merchantLightLayerSpec,
  merchantLightOpacity,
} from './layers';
import { publishLightPhase, getLightPhase, subscribeLightPhase } from '../lightPhaseStore';

describe('lumière d’ambiance des commerces — intensités', () => {
  it('reste discrète en journée (perceptible seulement en comparaison off) et douce à l’aube', () => {
    expect(MERCHANT_LIGHT_OPACITY.day).toBeLessThanOrEqual(0.035);
    expect(MERCHANT_LIGHT_OPACITY.dawn).toBeLessThanOrEqual(0.06);
  });

  it('la nuit reste un point chaud maîtrisé, jamais un néon', () => {
    expect(MERCHANT_LIGHT_OPACITY.night).toBeLessThanOrEqual(0.18);
  });

  it('croît naturellement vers le soir (matin < journée inversé, dusk < night)', () => {
    expect(MERCHANT_LIGHT_OPACITY.day).toBeLessThan(MERCHANT_LIGHT_OPACITY.dawn);
    expect(MERCHANT_LIGHT_OPACITY.dawn).toBeLessThan(MERCHANT_LIGHT_OPACITY.dusk);
    expect(MERCHANT_LIGHT_OPACITY.dusk).toBeLessThan(MERCHANT_LIGHT_OPACITY.night);
  });

  it('mode off → 0, low → moitié, high plafonné (jamais un spot)', () => {
    expect(merchantLightOpacity('night', 'off')).toBe(0);
    expect(merchantLightOpacity('night', 'low')).toBeCloseTo(MERCHANT_LIGHT_OPACITY.night / 2);
    expect(merchantLightOpacity('night', 'high')).toBeLessThanOrEqual(0.3);
  });
});

describe('lumière d’ambiance — spec de couche (garanties anti-« effet graphique »)', () => {
  const spec = merchantLightLayerSpec() as {
    slot: string;
    minzoom: number;
    paint: Record<string, unknown>;
  };

  it('dégradé intégral (blur 1) → aucun bord, donc aucun halo identifiable', () => {
    expect(spec.paint['circle-blur']).toBe(1);
  });

  it('couchée sur le sol (pitch-alignment map), jamais un rond plaqué à l’écran', () => {
    expect(spec.paint['circle-pitch-alignment']).toBe('map');
    expect(spec.paint['circle-pitch-scale']).toBe('map');
  });

  it('émissive → jamais assombrie par la nuit de Standard (une vitrine émet)', () => {
    expect(spec.paint['circle-emissive-strength']).toBe(1);
  });

  it('slot middle → au sol, derrière les bâtiments 3D, sous les labels', () => {
    expect(spec.slot).toBe('middle');
  });

  it('bascule de phase fondue (transition ≥ 2 s, jamais un événement visuel)', () => {
    expect(
      (spec.paint['circle-opacity-transition'] as { duration: number }).duration,
    ).toBeGreaterThanOrEqual(2000);
  });
});

describe('lightPhaseStore', () => {
  it('publie, déduplique et notifie', () => {
    const seen: string[] = [];
    const unsubscribe = subscribeLightPhase((p) => seen.push(p));
    const initial = getLightPhase();
    publishLightPhase(initial); // no-op (dédupliqué)
    publishLightPhase(initial === 'dusk' ? 'night' : 'dusk');
    publishLightPhase(initial === 'dusk' ? 'night' : 'dusk'); // no-op
    unsubscribe();
    publishLightPhase(initial); // après désabonnement → non vu
    expect(seen).toHaveLength(1);
    publishLightPhase('day'); // état propre pour les autres suites
  });
});
