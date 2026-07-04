/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { getMerchantEditorialScore, rankMerchantsEditorially, visualQualityScore } from './editorialScore';

// Couche « qualité visuelle » : valorise les commerces à identité locale/terroir avec de vraies
// photos ; réduit l'impression événementielle. Fondé sur métadonnées + texte (aucune analyse
// d'image). Scénarios inspirés des vraies données Supabase.

const PHOTO = 'https://images.example.com/real.jpg';
const mk = (o: Partial<Merchant> & { name: string }): Merchant => o as unknown as Merchant;

// « Pousse Pas Mémé » (réel : category 'bar' → maison de vin/cave → remonté en max) : photo réelle.
const POUSSE = mk({ name: 'Pousse Pas Mémé dans la Vigne', rawCategory: 'bar', rating: 4.9, reviewCount: 1306, isOpenNow: true, photoUrl: PHOTO, description: 'Maison de vin ancrée à Écusson, cave signature découverte régionale.' });

// Traiteur événementiel MIEUX NOTÉ, photos de réception/mariage/buffet.
const TRAITEUR_EVENT = mk({ name: 'Prestige Traiteur Réception', rawCategory: 'caterer', rating: 5.0, reviewCount: 250, isOpenNow: true, photoUrl: PHOTO, description: 'Mariage, réception, buffet événementiel, salle de réception.' });

const AUGUSTA = mk({ name: 'Domaine Augusta', rawCategory: 'vineyard', category: 'producer', isProducer: true, rating: 4.7, reviewCount: 90, isOpenNow: true, photoUrl: PHOTO, galleryPhotos: [PHOTO, PHOTO], description: 'Domaine viticole, cave, vin de terroir.' });
const ABREUVOIR = mk({ name: "Domaine de l'Abreuvoir à Ceyras", rawCategory: 'winery', category: 'producer', isProducer: true, rating: 4.8, reviewCount: 6, isOpenNow: true, photoUrl: PHOTO, galleryPhotos: [PHOTO, PHOTO], description: 'Domaine, cave, vin, terroir.' });
const DELEUZE = mk({ name: 'Domaine Deleuze-Rochetin', rawCategory: 'winery', category: 'producer', isProducer: true, rating: 4.6, reviewCount: 40, isOpenNow: true, photoUrl: PHOTO, galleryPhotos: [PHOTO], description: 'Domaine bio, vigneron, terroir.' });
const BOULANGERIE = mk({ name: 'Boulangerie du Marché', rawCategory: 'bakery', rating: 4.4, reviewCount: 210, isOpenNow: true, photoUrl: PHOTO, description: 'Pain au levain, artisan.' });
const PRIMEUR = mk({ name: 'Primeur des Halles', rawCategory: 'greengrocer', rating: 4.2, reviewCount: 60, isOpenNow: true, photoUrl: PHOTO, description: 'Fruits et légumes locaux de saison.' });

const FALLBACK = mk({ name: 'Épicerie Sans Photo', rawCategory: 'grocery_store', rating: 4.5, reviewCount: 80, isOpenNow: true, description: 'Épicerie locale.' }); // aucune photo → fallback

describe('visualQualityScore — couche premium terroir', () => {
  it('1. Pousse Pas Mémé passe devant un traiteur événementiel MIEUX noté', () => {
    expect(TRAITEUR_EVENT.rating!).toBeGreaterThan(POUSSE.rating!);
    expect(getMerchantEditorialScore(POUSSE)).toBeGreaterThan(getMerchantEditorialScore(TRAITEUR_EVENT));
  });

  it('2. Domaine Augusta reste haut (au-dessus du traiteur événementiel et du fallback)', () => {
    expect(getMerchantEditorialScore(AUGUSTA)).toBeGreaterThan(getMerchantEditorialScore(TRAITEUR_EVENT));
    expect(getMerchantEditorialScore(AUGUSTA)).toBeGreaterThan(getMerchantEditorialScore(FALLBACK));
  });

  it("3. Domaine de l'Abreuvoir reste haut malgré 6 avis (photos + terroir), proche d'Augusta", () => {
    expect(getMerchantEditorialScore(ABREUVOIR)).toBeGreaterThan(getMerchantEditorialScore(TRAITEUR_EVENT));
    // 6 avis (≥5) → pleine confiance : pas d'effondrement dû au faible nombre d'avis.
    expect(Math.abs(getMerchantEditorialScore(ABREUVOIR) - getMerchantEditorialScore(AUGUSTA))).toBeLessThan(20);
  });

  it('4. Domaine Deleuze-Rochetin valorisé comme terroir crédible', () => {
    expect(getMerchantEditorialScore(DELEUZE)).toBeGreaterThan(getMerchantEditorialScore(TRAITEUR_EVENT));
  });

  it('5. Un traiteur mariage (photo réception) n’est PAS dans le top 5 s’il y a assez de terroir', () => {
    const ranked = rankMerchantsEditorially([TRAITEUR_EVENT, AUGUSTA, ABREUVOIR, DELEUZE, POUSSE, BOULANGERIE, PRIMEUR]);
    const pos = ranked.findIndex((m) => m === TRAITEUR_EVENT);
    expect(pos).toBeGreaterThanOrEqual(5);
  });

  it('6. Un commerce sans vraie photo (fallback YOOTOO) est pénalisé', () => {
    expect(visualQualityScore(FALLBACK)).toBeLessThan(visualQualityScore(POUSSE));
    expect(getMerchantEditorialScore(FALLBACK)).toBeLessThan(getMerchantEditorialScore(BOULANGERIE));
  });

  it('7. Aucun commerce supprimé (tous les scores restent finis)', () => {
    for (const m of [POUSSE, TRAITEUR_EVENT, AUGUSTA, ABREUVOIR, DELEUZE, BOULANGERIE, PRIMEUR, FALLBACK]) {
      expect(Number.isFinite(getMerchantEditorialScore(m))).toBe(true);
    }
  });

  it('plusieurs vraies photos > une seule (à identité égale)', () => {
    const one = mk({ name: 'Domaine Test', rawCategory: 'vineyard', rating: 4.5, reviewCount: 20, photoUrl: PHOTO, description: 'Domaine, vin.' });
    const many = mk({ name: 'Domaine Test', rawCategory: 'vineyard', rating: 4.5, reviewCount: 20, photoUrl: PHOTO, galleryPhotos: [PHOTO, PHOTO, PHOTO], description: 'Domaine, vin.' });
    expect(visualQualityScore(many)).toBeGreaterThan(visualQualityScore(one));
  });
});
