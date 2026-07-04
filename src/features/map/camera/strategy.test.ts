/// <reference types="jest" />
import { CAMERA_LEVELS, TERRITORY_MODIFIER } from '@/design/tokens/camera';

import type { MapBounds } from '../types';

import { resolveCameraPlan } from './strategy';
import type { CameraEnvironment, CameraIntent, CameraPose } from './types';

const COORD = { latitude: 43.61, longitude: 3.877 };
const focus: CameraIntent = { kind: 'focus', target: COORD };
const bounds: MapBounds = { west: 3.82, south: 43.55, east: 3.93, north: 43.66 };
const VIEWPORT = { width: 800, height: 600 };
const CURRENT: CameraPose = { center: COORD, zoom: 17.5, pitch: 45, bearing: 0, padding: 32 };

describe('resolveCameraPlan — la caméra pense en intentions', () => {
  it('FOCUS : sélection d’un commerce = intimité (zoom max, pitch immersif, ease decel)', () => {
    const plan = resolveCameraPlan(focus, { context: 'merchantSelected' })!;
    expect(plan.mood).toBe('focus');
    expect(plan.pose.zoom).toBe(CAMERA_LEVELS.merchantSelected.zoom);
    expect(plan.pose.pitch).toBe(CAMERA_LEVELS.merchantSelected.pitch);
    expect(plan.motion.primitive).toBe('ease');
    expect(plan.motion.easing).toBe('decel');
    expect(plan.priority).toBe('explicit');
    expect(plan.reason).toContain('intimité');
  });

  it('BROWSE : navigation entre fiches = feuilletage plus court, même échelle', () => {
    const focusPlan = resolveCameraPlan(focus, { context: 'merchantSelected' })!;
    const browsePlan = resolveCameraPlan(focus, { context: 'merchantNavigation' })!;
    expect(browsePlan.mood).toBe('browse');
    expect(browsePlan.pose.zoom).toBe(focusPlan.pose.zoom); // même échelle
    expect(browsePlan.motion.durationMs).toBeLessThan(focusPlan.motion.durationMs);
    expect(browsePlan.priority).toBe('navigation');
  });

  it('FOLLOW : recentrage = vol vers l’utilisateur (niveau rue)', () => {
    const plan = resolveCameraPlan(focus, { context: 'recenter' })!;
    expect(plan.mood).toBe('follow');
    expect(plan.pose.zoom).toBe(CAMERA_LEVELS.street.zoom);
    expect(plan.motion.primitive).toBe('fly');
  });

  it('EXPLORE : cadrer un quartier (frameNeighborhood)', () => {
    const plan = resolveCameraPlan({ kind: 'frameNeighborhood', target: COORD }, { context: 'autoZoom' })!;
    expect(plan.mood).toBe('explore');
    expect(plan.pose.zoom).toBe(CAMERA_LEVELS.neighborhood.zoom);
  });

  it('DISCOVER : recherche = cadrer les résultats À PLAT (pitch 0, vol)', () => {
    const plan = resolveCameraPlan({ kind: 'reveal', bounds }, { context: 'search', viewport: VIEWPORT })!;
    expect(plan.mood).toBe('discover');
    expect(plan.pose.pitch).toBe(0); // on lit une liste sur une carte
    expect(plan.motion.primitive).toBe('fly');
    expect(plan.pose.zoom).toBeGreaterThanOrEqual(CAMERA_LEVELS.city.zoom);
    expect(plan.pose.zoom).toBeLessThanOrEqual(CAMERA_LEVELS.neighborhood.zoom);
  });

  it('DISCOVER : vue d’ensemble part du centre courant, niveau ville', () => {
    const plan = resolveCameraPlan({ kind: 'overview' }, { context: 'firstOpen', current: CURRENT })!;
    expect(plan.pose.zoom).toBe(CAMERA_LEVELS.city.zoom);
    expect(plan.pose.center).toEqual(CURRENT.center);
  });

  it('RETURN : fermeture de la fiche = légère prise de recul (niveau rue, ease)', () => {
    const plan = resolveCameraPlan({ kind: 'overview' }, { context: 'backToMap', current: CURRENT })!;
    expect(plan.mood).toBe('return');
    expect(plan.pose.zoom).toBe(CAMERA_LEVELS.street.zoom);
    expect(plan.motion.primitive).toBe('ease');
  });

  it('ADJUST : ouverture de la sheet = padding seul, mouvement imperceptible (nudge)', () => {
    const insets = { top: 0, right: 0, bottom: 320, left: 0 };
    const plan = resolveCameraPlan({ kind: 'shiftForSheet', insets }, { context: 'sheetOpen', current: CURRENT })!;
    expect(plan.mood).toBe('adjust');
    expect(plan.pose.center).toEqual(CURRENT.center); // rien ne bouge sauf le cadrage
    expect(plan.pose.zoom).toBe(CURRENT.zoom);
    expect(plan.pose.padding).toEqual(insets);
    expect(plan.motion.primitive).toBe('nudge');
  });
});

describe('resolveCameraPlan — la caméra se tait (rest = null)', () => {
  it('geste manuel → aucun plan', () => {
    expect(resolveCameraPlan(focus, { context: 'manualPan' })).toBeNull();
  });
  it('intention vide → aucun plan', () => {
    expect(resolveCameraPlan({ kind: 'none' })).toBeNull();
  });
  it('intention incohérente avec l’environnement → aucun plan (jamais d’à-peu-près)', () => {
    // reveal sans viewport : on ne peut pas cadrer honnêtement → silence.
    expect(resolveCameraPlan({ kind: 'reveal', bounds }, { context: 'search' })).toBeNull();
    // overview sans centre courant → silence.
    expect(resolveCameraPlan({ kind: 'overview' }, { context: 'firstOpen' })).toBeNull();
    // adjust sans pose courante → silence.
    expect(
      resolveCameraPlan({ kind: 'shiftForSheet', insets: { top: 0, right: 0, bottom: 300, left: 0 } }, {}),
    ).toBeNull();
  });
});

describe('resolveCameraPlan — accessibilité & garde-fous', () => {
  it('reduce-motion : aucun mouvement (jump 0 ms) et vue à plat (pitch 0)', () => {
    const plan = resolveCameraPlan(focus, { context: 'merchantSelected', reduceMotion: true })!;
    expect(plan.motion.primitive).toBe('jump');
    expect(plan.motion.durationMs).toBe(0);
    expect(plan.pose.pitch).toBe(0);
  });

  it('ne tourne JAMAIS gratuitement : bearing = 0 sur tous les plans', () => {
    const plans = [
      resolveCameraPlan(focus, { context: 'merchantSelected' }),
      resolveCameraPlan(focus, { context: 'recenter' }),
      resolveCameraPlan({ kind: 'reveal', bounds }, { context: 'search', viewport: VIEWPORT }),
      resolveCameraPlan({ kind: 'overview' }, { context: 'backToMap', current: CURRENT }),
    ];
    for (const p of plans) expect(p!.pose.bearing).toBe(0);
  });

  it('déterministe : mêmes entrées → même plan', () => {
    const env: CameraEnvironment = { context: 'merchantSelected' };
    expect(resolveCameraPlan(focus, env)).toEqual(resolveCameraPlan(focus, env));
  });
});

describe('resolveCameraPlan — modificateur territoire', () => {
  it('historique : caméra un peu plus basse (zoom +, pitch +) sur une vue inclinée', () => {
    const neutral = resolveCameraPlan(focus, { context: 'merchantSelected' })!;
    const historic = resolveCameraPlan(focus, { context: 'merchantSelected', territory: 'historic' })!;
    expect(historic.pose.zoom).toBeCloseTo(neutral.pose.zoom + TERRITORY_MODIFIER.historic.zoom, 5);
    expect(historic.pose.pitch).toBe(neutral.pose.pitch + TERRITORY_MODIFIER.historic.pitch);
  });

  it('n’incline jamais une vue PLANE (recherche à plat reste à 0° même en historique)', () => {
    const plan = resolveCameraPlan({ kind: 'reveal', bounds }, { context: 'search', viewport: VIEWPORT, territory: 'historic' })!;
    expect(plan.pose.pitch).toBe(0);
  });
});
