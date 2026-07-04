/// <reference types="jest" />
import { resolveMood, resolvePriority } from './mood';
import type { CameraContext, CameraIntent } from './types';

const COORD = { latitude: 43.61, longitude: 3.877 };
const focus: CameraIntent = { kind: 'focus', target: COORD };
const reveal: CameraIntent = { kind: 'reveal', bounds: { west: 3.8, south: 43.5, east: 4, north: 43.7 } };

describe('resolveMood — contexte prioritaire', () => {
  const cases: Array<[CameraContext, string]> = [
    ['merchantSelected', 'focus'],
    ['merchantNavigation', 'browse'],
    ['aroundMe', 'follow'],
    ['recenter', 'follow'],
    ['backToMap', 'return'],
    ['autoZoom', 'explore'],
    ['firstOpen', 'discover'],
    ['search', 'discover'],
    ['sheetOpen', 'adjust'],
  ];
  it.each(cases)('contexte %s → mood %s', (context, mood) => {
    expect(resolveMood(focus, context)).toBe(mood);
  });

  it('un geste manuel → rest (la caméra se tait)', () => {
    expect(resolveMood(focus, 'manualPan')).toBe('rest');
  });

  it('une intention vide → rest, quel que soit le contexte', () => {
    expect(resolveMood({ kind: 'none' }, 'merchantSelected')).toBe('rest');
  });

  it('shiftForSheet → adjust même sans contexte', () => {
    expect(resolveMood({ kind: 'shiftForSheet', insets: { top: 0, right: 0, bottom: 300, left: 0 } })).toBe('adjust');
  });
});

describe('resolveMood — repli sur le type d’intent (sans contexte)', () => {
  it('focus → focus, reveal → discover', () => {
    expect(resolveMood(focus)).toBe('focus');
    expect(resolveMood(reveal)).toBe('discover');
  });
});

describe('resolvePriority — dépend du déclencheur, pas de l’émotion', () => {
  it('geste utilisateur = absolu', () => {
    expect(resolvePriority('manualPan')).toBe('user');
  });
  it('tap / recherche / recentrage = explicit', () => {
    expect(resolvePriority('merchantSelected')).toBe('explicit');
    expect(resolvePriority('search')).toBe('explicit');
    expect(resolvePriority('recenter')).toBe('explicit');
  });
  it('navigation entre fiches = navigation', () => {
    expect(resolvePriority('merchantNavigation')).toBe('navigation');
    expect(resolvePriority('backToMap')).toBe('navigation');
  });
  it('automatique = auto (le plus faible)', () => {
    expect(resolvePriority('firstOpen')).toBe('auto');
    expect(resolvePriority(undefined)).toBe('auto');
  });
});
