/// <reference types="jest" />
import {
  DEFAULT_TIER,
  resolveTier,
  TIER_PRIOR,
  tierPrior,
  type EditorialTier,
} from './categoryTiers';

describe('resolveTier — cas éditoriaux exigés (Sprint 1)', () => {
  it('café → max (catégorie brute)', () => {
    expect(resolveTier('cafe')).toBe('max');
    expect(resolveTier('coffee_shop')).toBe('max');
    expect(resolveTier('café')).toBe('max'); // accents normalisés
  });

  it('boulangerie par NOM → max (catégorie Google générique rattrapée)', () => {
    expect(resolveTier('establishment', undefined, 'Boulangerie Dupont')).toBe('max');
    expect(resolveTier(null, null, 'La Boulangerie du Coin', 'pain au levain')).toBe('max');
  });

  it('chocolatier → max', () => {
    expect(resolveTier('chocolate_shop')).toBe('max');
    expect(resolveTier(undefined, undefined, 'Chocolatier Léa')).toBe('max');
  });

  it('producteur → max', () => {
    expect(resolveTier('producer')).toBe('max');
    expect(resolveTier('farm')).toBe('max');
    expect(resolveTier('vineyard')).toBe('max');
  });

  it('fleuriste → medium', () => {
    expect(resolveTier('florist')).toBe('medium');
    expect(resolveTier(undefined, undefined, 'Fleuriste des Halles')).toBe('medium');
  });

  it('couvreur → low', () => {
    expect(resolveTier('roofing_contractor')).toBe('low');
    expect(resolveTier(undefined, undefined, 'Couvreur Martin')).toBe('low');
  });

  it('plombier → low', () => {
    expect(resolveTier('plumber')).toBe('low');
    expect(resolveTier(undefined, undefined, 'Plomberie Express', 'dépannage 24h')).toBe('low');
  });

  it('chatterie → veryLow', () => {
    expect(resolveTier('cattery')).toBe('veryLow');
    expect(resolveTier('pet_boarding_service')).toBe('veryLow');
    expect(resolveTier(undefined, undefined, 'Chatterie des Lilas')).toBe('veryLow');
  });

  it('élevage → veryLow', () => {
    expect(resolveTier('animal_breeding')).toBe('veryLow');
    expect(resolveTier(undefined, undefined, 'Élevage du Val', 'chiots de race')).toBe('veryLow');
  });

  it('catégorie inconnue → medium (repli sûr, jamais veryLow sans preuve)', () => {
    expect(resolveTier('some_unknown_google_type')).toBe(DEFAULT_TIER);
    expect(resolveTier(undefined, undefined, 'Nom neutre sans indice')).toBe('medium');
    expect(resolveTier(null, null, null, null)).toBe('medium');
    expect(resolveTier('')).toBe('medium');
  });
});

describe('resolveTier — cascade de résolution', () => {
  it('la catégorie brute prime sur le nom', () => {
    // Catégorie fiable `cafe` (max) même si le nom contient un terme low.
    expect(resolveTier('cafe', undefined, 'Garage Café')).toBe('max');
  });

  it('merchantType sert de secours quand rawCategory est absent/inconnu', () => {
    expect(resolveTier('point_of_interest', 'bakery')).toBe('max');
  });
});

describe('TIER_PRIOR — priors ordonnés et bornés', () => {
  it('max = neutre (1.0) et priors strictement décroissants', () => {
    expect(TIER_PRIOR.max).toBe(1.0);
    expect(TIER_PRIOR.max).toBeGreaterThan(TIER_PRIOR.medium);
    expect(TIER_PRIOR.medium).toBeGreaterThan(TIER_PRIOR.low);
    expect(TIER_PRIOR.low).toBeGreaterThan(TIER_PRIOR.veryLow);
    expect(TIER_PRIOR.veryLow).toBeGreaterThan(0); // jamais 0 → jamais supprimé
  });

  it('tierPrior() reflète la table', () => {
    (Object.keys(TIER_PRIOR) as EditorialTier[]).forEach((t) => {
      expect(tierPrior(t)).toBe(TIER_PRIOR[t]);
    });
  });
});
