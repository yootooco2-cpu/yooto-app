/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { editorialScore } from './editorialScore';

// Fixture minimale : uniquement les champs lus par editorialScore / getMerchantCoverPhoto.
function mk(partial: Partial<Merchant>): Merchant {
  return {
    id: partial.id ?? 'x',
    name: partial.name ?? 'Commerce',
    category: partial.category ?? 'shop',
    description: partial.description ?? '',
    coordinates: { latitude: 43.6, longitude: 3.87 },
    distanceLabel: '—',
    isOpenNow: partial.isOpenNow ?? false,
    isProducer: partial.isProducer ?? false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    ...partial,
  };
}

const REAL_PHOTO = 'https://cdn.yootoo.co/photos/real-123.jpg';

describe('editorialScore — consomme resolveTier (source unique)', () => {
  it('un café (catégorie brute) domine une chatterie, à photo égale', () => {
    const cafe = mk({ name: 'Le Comptoir', rawCategory: 'cafe', coverPhotoUrl: REAL_PHOTO });
    const chatterie = mk({ name: 'Refuge Félin', rawCategory: 'cattery', coverPhotoUrl: REAL_PHOTO });
    expect(editorialScore(cafe)).toBeGreaterThan(editorialScore(chatterie));
  });

  it('rattrape une catégorie Google générique via le NOM (boulangerie → max)', () => {
    const boulangerie = mk({ name: 'Boulangerie Dupont', rawCategory: 'establishment', coverPhotoUrl: REAL_PHOTO });
    const neutre = mk({ name: 'Commerce Générique', rawCategory: 'establishment', coverPhotoUrl: REAL_PHOTO });
    // La boulangerie (tier max via le nom) doit dépasser un commerce neutre (tier medium).
    expect(editorialScore(boulangerie)).toBeGreaterThan(editorialScore(neutre));
  });

  it('réagit à la catégorie brute seule (preuve de délégation au tier)', () => {
    // Même nom/photo neutres : seul rawCategory change → le score doit suivre le tier.
    const asCafe = mk({ name: 'Maison X', rawCategory: 'cafe', coverPhotoUrl: REAL_PHOTO });
    const asBank = mk({ name: 'Maison X', rawCategory: 'bank', coverPhotoUrl: REAL_PHOTO });
    expect(editorialScore(asCafe)).toBeGreaterThan(editorialScore(asBank));
  });
});

describe('editorialScore — hiérarchie des tiers alignée sur le brief', () => {
  const photo = { coverPhotoUrl: REAL_PHOTO };

  it('max > medium > low > veryLow (à photo égale, autres facteurs neutres)', () => {
    const max = editorialScore(mk({ name: 'A', rawCategory: 'restaurant', ...photo }));
    const medium = editorialScore(mk({ name: 'B', rawCategory: 'florist', ...photo }));
    const low = editorialScore(mk({ name: 'C', rawCategory: 'plumber', ...photo }));
    const veryLow = editorialScore(mk({ name: 'D', rawCategory: 'cattery', ...photo }));
    expect(max).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(veryLow);
  });

  it('différence justifiée : un plombier (low) est MOINS pénalisé qu\'une chatterie (veryLow)', () => {
    // Ancien modèle : les deux tombaient à -80. Nouveau : low = -30, veryLow = -80 (brief).
    const plombier = editorialScore(mk({ name: 'Plomberie Express', rawCategory: 'plumber', ...photo }));
    const chatterie = editorialScore(mk({ name: 'Chatterie', rawCategory: 'cattery', ...photo }));
    expect(plombier).toBeGreaterThan(chatterie);
  });
});

describe('editorialScore — présentation (photo) inchangée', () => {
  it('une vraie photo l\'emporte largement sur l\'absence de photo, à tier égal', () => {
    const withPhoto = editorialScore(mk({ name: 'A', rawCategory: 'cafe', coverPhotoUrl: REAL_PHOTO }));
    const withoutPhoto = editorialScore(mk({ name: 'A', rawCategory: 'cafe' }));
    expect(withPhoto).toBeGreaterThan(withoutPhoto);
  });

  it('un fallback générique n\'est pas compté comme vraie photo', () => {
    const fallback = editorialScore(mk({ name: 'A', rawCategory: 'cafe', coverPhotoUrl: 'https://cdn/fallbacks/store.jpg' }));
    const withoutPhoto = editorialScore(mk({ name: 'A', rawCategory: 'cafe' }));
    expect(fallback).toBe(withoutPhoto);
  });
});
