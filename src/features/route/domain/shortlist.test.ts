/**
 * Tests de la shortlist client-side : filtrage, déduplication stable,
 * limite configurable, tri déterministe, audit complet, absence honnête,
 * et performance sur corpus représentatif.
 */

import { createRouteEngineConfig } from '../config';
import { makeCandidate, SIMULATED_ROUTE_COMEDIE_ARCEAUX } from '../fixtures';
import {
  makeComedieArceauxCandidates,
  makeRepresentativeCorpus,
  offsetNorthMeters,
  POINT_ON_ROUTE,
} from '../fixtures/corridorFixtures';
import { corridorForRoute } from '../geo/corridor';
import { buildShortlist } from './shortlist';

const WIDTH = createRouteEngineConfig().corridorWidthMetersByMode.walk;

function walkCorridor() {
  const result = corridorForRoute(SIMULATED_ROUTE_COMEDIE_ARCEAUX, WIDTH);
  if (!result.ok) throw new Error('corridor attendu');
  return result.corridor;
}

describe('buildShortlist — trajet simulé Comédie → Arceaux', () => {
  it('sélectionne les candidats du corridor, exclut et audite le reste', () => {
    const result = buildShortlist(makeComedieArceauxCandidates(WIDTH), walkCorridor(), {
      limit: 50,
    });

    expect(result.entries.map((entry) => entry.candidate.merchantId)).toEqual([
      'on-route',
      'inside',
    ]);
    // Le candidat sur l'axe est à distance ~0. « inside » est décalé plein
    // nord de WIDTH/2 depuis un segment OBLIQUE : sa distance perpendiculaire
    // est donc > 0 et ≤ WIDTH/2 (pas exactement WIDTH/2).
    expect(result.entries[0].distanceToRouteMeters).toBeCloseTo(0, 4);
    expect(result.entries[1].distanceToRouteMeters).toBeGreaterThan(0);
    expect(result.entries[1].distanceToRouteMeters).toBeLessThanOrEqual(WIDTH * 0.5);

    expect(result.audit).toMatchObject({
      inputCount: 6,
      invalidCoordinateCount: 2,
      withinCorridorCount: 2,
      truncatedCount: 0,
      limit: 50,
      corridorWidthMeters: WIDTH,
      routeVersion: 1,
    });
    // « just-outside » sort au calcul précis ou à la bbox ; « far-away » à la bbox.
    expect(
      result.audit.outsideBoundingBoxCount + result.audit.outsideCorridorCount,
    ).toBe(2);
  });

  it('un candidat à la limite exacte du corridor est inclus', () => {
    const atLimit = makeCandidate({
      merchantId: 'at-limit',
      position: offsetNorthMeters(POINT_ON_ROUTE, WIDTH),
    });
    const result = buildShortlist([atLimit], walkCorridor(), { limit: 10 });
    // Tolérance flottante : la distance recalculée doit rester ≤ largeur.
    expect(result.entries.map((entry) => entry.candidate.merchantId)).toEqual(['at-limit']);
    expect(result.entries[0].distanceToRouteMeters).toBeLessThanOrEqual(WIDTH);
  });
});

describe('buildShortlist — déduplication, limite, ordre', () => {
  it('déduplique par merchantId en conservant la première occurrence (stable)', () => {
    const first = makeCandidate({ merchantId: 'dup', position: POINT_ON_ROUTE, qualityScore: 0.9 });
    const second = makeCandidate({
      merchantId: 'dup',
      position: offsetNorthMeters(POINT_ON_ROUTE, 10),
      qualityScore: 0.1,
    });
    const result = buildShortlist([first, second], walkCorridor(), { limit: 10 });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].candidate.qualityScore).toBe(0.9);
    expect(result.audit.duplicateCount).toBe(1);
  });

  it('applique la limite configurable et compte la troncature', () => {
    const candidates = [10, 20, 30, 40, 50].map((meters) =>
      makeCandidate({
        merchantId: `m-${meters}`,
        position: offsetNorthMeters(POINT_ON_ROUTE, meters),
      }),
    );
    const result = buildShortlist(candidates, walkCorridor(), { limit: 3 });
    expect(result.entries.map((entry) => entry.candidate.merchantId)).toEqual([
      'm-10',
      'm-20',
      'm-30',
    ]);
    expect(result.audit.withinCorridorCount).toBe(5);
    expect(result.audit.truncatedCount).toBe(2);
  });

  it('départage les égalités de distance par merchantId — ordre stable quel que soit l’ordre d’entrée', () => {
    const a = makeCandidate({ merchantId: 'a', position: offsetNorthMeters(POINT_ON_ROUTE, 50) });
    const b = makeCandidate({ merchantId: 'b', position: offsetNorthMeters(POINT_ON_ROUTE, 50) });
    const forward = buildShortlist([a, b], walkCorridor(), { limit: 10 });
    const backward = buildShortlist([b, a], walkCorridor(), { limit: 10 });
    expect(forward.entries.map((entry) => entry.candidate.merchantId)).toEqual(['a', 'b']);
    expect(backward.entries.map((entry) => entry.candidate.merchantId)).toEqual(['a', 'b']);
  });

  it('absence honnête : aucun candidat dans le corridor → entrées vides, audit renseigné', () => {
    const result = buildShortlist(
      [makeCandidate({ merchantId: 'far', position: { latitude: 44.9, longitude: 5.5 } })],
      walkCorridor(),
      { limit: 10 },
    );
    expect(result.entries).toEqual([]);
    expect(result.audit.outsideBoundingBoxCount).toBe(1);
    expect(result.audit.withinCorridorCount).toBe(0);
  });
});

describe('buildShortlist — corpus représentatif et performance', () => {
  it('reste déterministe et borné sur 5 000 candidats, avec un budget temps large', () => {
    const corpus = makeRepresentativeCorpus(5000);
    const corridor = walkCorridor();

    const startedAt = performance.now();
    const result = buildShortlist(corpus, corridor, { limit: 50 });
    const durationMs = performance.now() - startedAt;

    // Déterminisme : deux exécutions produisent exactement le même résultat.
    expect(buildShortlist(corpus, corridor, { limit: 50 })).toEqual(result);

    // Cohérence de l'audit : chaque candidat est comptabilisé une seule fois.
    const { audit } = result;
    expect(
      audit.invalidCoordinateCount +
        audit.duplicateCount +
        audit.outsideBoundingBoxCount +
        audit.outsideCorridorCount +
        audit.withinCorridorCount,
    ).toBe(audit.inputCount);
    expect(result.entries.length).toBeLessThanOrEqual(50);
    expect(result.entries.length).toBe(Math.min(50, audit.withinCorridorCount));

    // Garde-fou anti-régression volontairement très large (machine partagée).
    expect(durationMs).toBeLessThan(500);
    // Trace factuelle pour le rapport de lot.
    console.info(
      `[perf] shortlist 5000 candidats: ${durationMs.toFixed(1)} ms — ` +
        `bbox out=${audit.outsideBoundingBoxCount}, précis out=${audit.outsideCorridorCount}, in=${audit.withinCorridorCount}`,
    );
  });
});
