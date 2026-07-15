/**
 * Tests des raisons déterministes : templates sans LLM, vocabulaire prudent
 * (« indiqué », « à confirmer »), état vide honnête.
 */

import { buildRecommendationReason, explainEmptyResult, formatDetourMinutes } from './reasons';

describe('formatDetourMinutes', () => {
  it('formate de façon déterministe', () => {
    expect(formatDetourMinutes(30)).toBe('moins de 1 min');
    expect(formatDetourMinutes(60)).toBe('1 min');
    expect(formatDetourMinutes(90)).toBe('2 min');
    expect(formatDetourMinutes(120)).toBe('2 min');
    expect(formatDetourMinutes(305)).toBe('5 min');
  });
});

describe('buildRecommendationReason', () => {
  it('ouverture confirmée : « Ouvert à votre passage, détour N min »', () => {
    const reason = buildRecommendationReason({
      opening: { status: 'open', confidence: 0.9 },
      detourSeconds: 120,
      accessibility: 'yes',
      accessibilityRequired: false,
      notes: [],
    });
    expect(reason).toBe('Ouvert à votre passage, détour 2 min');
  });

  it('horaires inconnus : jamais présentés comme une ouverture confirmée', () => {
    const reason = buildRecommendationReason({
      opening: { status: 'unknown', confidence: 0 },
      detourSeconds: 180,
      accessibility: 'yes',
      accessibilityRequired: false,
      notes: ['opening_to_confirm'],
    });
    expect(reason).toBe('Horaires à confirmer, détour 3 min');
    expect(reason).not.toContain('Ouvert');
  });

  it('ouverture peu fiable (note) : bascule aussi sur « Horaires à confirmer »', () => {
    const reason = buildRecommendationReason({
      opening: { status: 'open', confidence: 0.2 },
      detourSeconds: 60,
      accessibility: 'yes',
      accessibilityRequired: false,
      notes: ['opening_to_confirm'],
    });
    expect(reason).toBe('Horaires à confirmer, détour 1 min');
  });

  it('accessibilité vérifiée sous contrainte : « indiqué », jamais « garanti »', () => {
    const reason = buildRecommendationReason({
      opening: { status: 'open', confidence: 0.9 },
      detourSeconds: 60,
      accessibility: 'yes',
      accessibilityRequired: true,
      notes: [],
    });
    expect(reason).toBe('Ouvert à votre passage, détour 1 min · Accès fauteuil indiqué');
    expect(reason).not.toMatch(/garanti/i);
  });

  it('accessibilité inconnue hors contrainte : mention « à confirmer », jamais une promesse', () => {
    const reason = buildRecommendationReason({
      opening: { status: 'open', confidence: 0.9 },
      detourSeconds: 60,
      accessibility: 'unknown',
      accessibilityRequired: false,
      notes: ['accessibility_to_confirm'],
    });
    expect(reason).toBe(
      'Ouvert à votre passage, détour 1 min · Accessibilité à confirmer',
    );
    expect(reason).not.toContain('Accès fauteuil indiqué');
  });
});

describe('explainEmptyResult — état vide honnête', () => {
  it('aucun candidat évalué', () => {
    expect(explainEmptyResult(0, {})).toBe('Aucun commerce compatible sur ce trajet.');
  });

  it('explique le motif d’exclusion dominant', () => {
    expect(explainEmptyResult(5, { closed_at_eta: 3, detour_exceeded: 1 })).toBe(
      'Aucune étape proposée : les commerces seraient fermés à votre passage.',
    );
  });

  it('départage les ex æquo par un ordre fixe — résultat reproductible', () => {
    const a = explainEmptyResult(4, { closed_at_eta: 2, detour_exceeded: 2 });
    const b = explainEmptyResult(4, { detour_exceeded: 2, closed_at_eta: 2 });
    expect(a).toBe(b);
    expect(a).toBe('Aucune étape proposée : les détours dépassent votre tolérance.');
  });
});
