/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { getMerchantEditorialScore } from './editorialScore';
import { GOLD_SCORE, RECOMMENDED_SCORE, markerState } from './markerState';

// markerState = importance éditoriale (Discovery), bandée par le SCORE (source unique, ADR-003).
// L'OR est RARE (score ≥ GOLD_SCORE) : une distinction, pas une récompense. Tests d'invariants +
// cohérence bande↔score (aucun seuil deviné : on dérive l'attendu du score réel).

const PHOTO = 'https://images.example.com/real.jpg';
const mk = (o: Partial<Merchant> & { name: string }): Merchant => o as unknown as Merchant;

/** Bande attendue pour un commerce ÉLIGIBLE (mission OK + vraie photo), dérivée de son score. */
const expectedBand = (m: Merchant): string => {
  const s = getMerchantEditorialScore(m);
  return s >= GOLD_SCORE ? 'exceptional' : s >= RECOMMENDED_SCORE ? 'recommended' : 'standard';
};

describe('markerState — garde-fous (jamais promu)', () => {
  it('hors-mission jamais promu, même producteur très bien noté (Elevage EDEN)', () => {
    const eden = mk({ name: 'Elevage EDEN', rawCategory: 'ranch', category: 'producer', isProducer: true, rating: 4.9, reviewCount: 300, photoUrl: PHOTO, description: '' });
    expect(markerState(eden)).toBe('standard');
  });

  it('service utile (mission low) jamais promu', () => {
    const m = mk({ name: 'Toiture Pro', rawCategory: 'roofing_contractor', rating: 5, reviewCount: 200, photoUrl: PHOTO });
    expect(markerState(m)).toBe('standard');
  });

  it('sans vraie photo → standard (la photo est l’émotion), même excellent', () => {
    const m = mk({ name: 'Boulangerie sans photo', rawCategory: 'bakery', rating: 5, reviewCount: 500, description: 'Pain au levain, artisan, bio.' });
    expect(markerState(m)).toBe('standard');
  });
});

describe('markerState — bandage cohérent avec le score', () => {
  const eligibles = [
    mk({ name: 'Domaine exceptionnel', rawCategory: 'winery', category: 'producer', isProducer: true, rating: 5, reviewCount: 400, photoUrl: PHOTO, galleryPhotos: [PHOTO, PHOTO, PHOTO], description: 'Vigneron, vente directe, terroir, bio.' }),
    mk({ name: 'Bon café', rawCategory: 'cafe', rating: 4.6, reviewCount: 120, photoUrl: PHOTO, description: 'Café de spécialité.' }),
    mk({ name: 'Café correct sans avis', rawCategory: 'cafe', rating: 4.2, photoUrl: PHOTO }),
    mk({ name: 'Restaurant moyen', rawCategory: 'restaurant', rating: 3.9, photoUrl: PHOTO }),
  ];

  it.each(eligibles.map((m) => [m.name, m] as const))('%s : la bande suit le score', (_name, m) => {
    expect(markerState(m)).toBe(expectedBand(m));
  });
});

describe('markerState — l’or est rare et exigeant', () => {
  it('une simple note haute NE suffit PAS à l’or (4.5 sans profondeur → pas exceptionnel)', () => {
    const m = mk({ name: 'Café juste bien noté', rawCategory: 'cafe', rating: 4.5, photoUrl: PHOTO });
    expect(markerState(m)).not.toBe('exceptional');
  });

  it('un lieu de très haute confiance éditoriale atteint l’or', () => {
    const top = mk({ name: 'Domaine de référence', rawCategory: 'winery', category: 'producer', isProducer: true, rating: 5, reviewCount: 500, photoUrl: PHOTO, galleryPhotos: [PHOTO, PHOTO, PHOTO, PHOTO], description: 'Vigneron, vente directe, terroir, savoir-faire, bio.' });
    expect(getMerchantEditorialScore(top)).toBeGreaterThanOrEqual(GOLD_SCORE);
    expect(markerState(top)).toBe('exceptional');
  });
});
