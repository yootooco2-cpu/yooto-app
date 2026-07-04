/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { markerState } from './markerState';

// markerState = décision d'IMPORTANCE éditoriale (Discovery). Pur. Cohérent avec le tri unique
// (ADR-003) : un hors-mission n'est jamais promu, même producteur, même très bien noté.

const PHOTO = 'https://images.example.com/real.jpg';
const mk = (o: Partial<Merchant> & { name: string }): Merchant => o as unknown as Merchant;

describe('markerState — importance éditoriale', () => {
  it('Exceptionnel : mission max + vraie photo + note haute', () => {
    const m = mk({ name: 'Boulangerie du Marché', rawCategory: 'bakery', rating: 4.7, photoUrl: PHOTO });
    expect(markerState(m)).toBe('exceptional');
  });

  it('Recommandé : mission max mais note < 4.5', () => {
    const m = mk({ name: 'Café Central', rawCategory: 'cafe', rating: 4.2, photoUrl: PHOTO });
    expect(markerState(m)).toBe('recommended');
  });

  it('Recommandé : producteur local (mission medium) noté ≥ 4.0 avec photo', () => {
    // florist → tier medium ; le statut producteur (category) le fait remonter.
    const m = mk({ name: 'Le Panier', rawCategory: 'florist', category: 'producer', rating: 4.3, photoUrl: PHOTO });
    expect(markerState(m)).toBe('recommended');
  });

  it('Standard : mission medium, non-producteur, même bien noté', () => {
    const m = mk({ name: 'Fleurs & Co', rawCategory: 'florist', rating: 4.8, photoUrl: PHOTO });
    expect(markerState(m)).toBe('standard');
  });

  it('Standard : mission max mais PAS de vraie photo (la photo est l’émotion)', () => {
    const m = mk({ name: 'Boulangerie sans photo', rawCategory: 'bakery', rating: 4.9 });
    expect(markerState(m)).toBe('standard');
  });

  it('Standard : hors-mission jamais promu, même producteur très bien noté', () => {
    // « Elevage EDEN » (ranch → producer, note 4.7, photo) : resolveTier force veryLow via le nom.
    const eden = mk({ name: 'Elevage EDEN', rawCategory: 'ranch', category: 'producer', isProducer: true, rating: 4.7, photoUrl: PHOTO });
    expect(markerState(eden)).toBe('standard');
  });

  it('Standard : service utile (mission low) jamais promu', () => {
    const m = mk({ name: 'Toiture Pro', rawCategory: 'roofing_contractor', rating: 4.9, photoUrl: PHOTO });
    expect(markerState(m)).toBe('standard');
  });
});
