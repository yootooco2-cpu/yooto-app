/// <reference types="jest" />
import { mergeRealtime, type RealtimePayload } from './realtime';
import type { Departure } from './types';

const dep = (tripId: string, min: number): Departure =>
  ({ tripId, stopId: 'S1', routeId: 'T1', headsign: 'Mosson', epochMs: 1_000_000 + min * 60000, source: 'theorique' });
const payload = (over: Partial<RealtimePayload>): RealtimePayload =>
  ({ fresh: true, age_seconds: 20, updates: [], alerts: [], ...over });

describe('mergeRealtime — fusion temps réel × théorique', () => {
  it('flux FRAIS : remplace l’instant des courses mises à jour, marque « temps-reel », retrie', () => {
    const out = mergeRealtime(
      [dep('a', 5), dep('b', 10)],
      payload({ updates: [{ trip_id: 'b', stop_id: 'S1', epoch_ms: 1_000_000 + 2 * 60000 }] }),
      ['S1'],
    );
    expect(out.map((d) => [d.tripId, d.source])).toEqual([['b', 'temps-reel'], ['a', 'theorique']]);
  });

  it('flux PÉRIMÉ (fresh=false) : repli intégral sur le théorique, rien ne bouge', () => {
    const deps = [dep('a', 5), dep('b', 10)];
    const out = mergeRealtime(deps, payload({ fresh: false, age_seconds: 900, updates: [{ trip_id: 'b', stop_id: 'S1', epoch_ms: 0 }] }), ['S1']);
    expect(out).toEqual(deps);
    expect(out.every((d) => d.source === 'theorique')).toBe(true);
  });

  it('payload absent (fonction en panne) : repli théorique', () => {
    const deps = [dep('a', 5)];
    expect(mergeRealtime(deps, undefined, ['S1'])).toEqual(deps);
  });

  it('SUFFIXE TaM : une maj RT « 123-3 » s’applique au départ statique « 123 » (mesuré 14/07)', () => {
    const out = mergeRealtime([dep('123', 9)], payload({ updates: [{ trip_id: '123-3', stop_id: 'S1', epoch_ms: 1_000_000 + 4 * 60000 }] }), ['S1']);
    expect(out[0].source).toBe('temps-reel');
    expect(out[0].epochMs).toBe(1_000_000 + 4 * 60000);
  });

  it('mise à jour pour un AUTRE arrêt ou une course inconnue : ignorée (aucun départ fantôme)', () => {
    const deps = [dep('a', 5)];
    const out = mergeRealtime(deps, payload({ updates: [
      { trip_id: 'a', stop_id: 'AUTRE', epoch_ms: 1 },
      { trip_id: 'inconnue', stop_id: 'S1', epoch_ms: 1 },
    ] }), ['S1']);
    expect(out).toEqual(deps);
    expect(out).toHaveLength(1); // jamais de départ créé depuis le RT seul
  });
});
