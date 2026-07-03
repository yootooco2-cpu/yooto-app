/// <reference types="jest" />
import {
  distributionRatio,
  formatRatingFr,
  hasRatingDistribution,
  starFill,
  type RatingDistribution,
} from './reviews';

describe('formatRatingFr', () => {
  it('formate à la française avec une décimale', () => {
    expect(formatRatingFr(4.6)).toBe('4,6');
    expect(formatRatingFr(5)).toBe('5,0');
    expect(formatRatingFr(3.25)).toBe('3,3');
  });
});

describe('starFill', () => {
  it('arrondit au plus proche et complète jusqu\'à 5', () => {
    expect(starFill(4.6)).toEqual({ full: 5, empty: 0 });
    expect(starFill(4.2)).toEqual({ full: 4, empty: 1 });
    expect(starFill(0)).toEqual({ full: 0, empty: 5 });
  });
  it('borne entre 0 et 5', () => {
    expect(starFill(9)).toEqual({ full: 5, empty: 0 });
    expect(starFill(-2)).toEqual({ full: 0, empty: 5 });
  });
});

describe('hasRatingDistribution — cœur de l\'évolutivité', () => {
  it('faux quand la répartition est absente (état actuel)', () => {
    expect(hasRatingDistribution(undefined)).toBe(false);
    expect(hasRatingDistribution(null)).toBe(false);
  });
  it('faux quand tous les compteurs sont à zéro (pas de fausses barres)', () => {
    expect(hasRatingDistribution({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })).toBe(false);
  });
  it('vrai dès qu\'une répartition réelle existe (barres activées automatiquement)', () => {
    expect(hasRatingDistribution({ 1: 2, 2: 3, 3: 10, 4: 40, 5: 73 })).toBe(true);
  });
});

describe('distributionRatio', () => {
  const d: RatingDistribution = { 1: 2, 2: 3, 3: 5, 4: 40, 5: 50 };
  it('calcule la proportion par étoile', () => {
    expect(distributionRatio(d, 5)).toBeCloseTo(0.5, 5);
    expect(distributionRatio(d, 4)).toBeCloseTo(0.4, 5);
  });
  it('renvoie 0 si aucun avis', () => {
    expect(distributionRatio({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, 5)).toBe(0);
  });
});
