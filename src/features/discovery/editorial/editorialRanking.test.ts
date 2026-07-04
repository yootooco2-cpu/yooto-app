/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { getMerchantEditorialScore, rankMerchantsEditorially } from './editorialScore';

// Garde-fous de ranking éditorial : le cœur de mission YOOTOO (producteurs, alimentaire de
// proximité) doit primer sur les commerces hors intention (élevages, pompes funèbres, couvreurs),
// MÊME avec une meilleure note Google ET une catégorie brute qui « fuit » vers un tier élevé.
// Aucun n'est supprimé (score fini). Le tri passe par le helper UNIQUE rankMerchantsEditorially.

const PHOTO = 'https://images.example.com/real.jpg';
const mk = (o: Partial<Merchant> & { name: string }): Merchant => o as unknown as Merchant;

const CORE = {
  producteur: mk({ name: 'La Ferme du Coteau', rawCategory: 'producer', isProducer: true, category: 'producer', rating: 4.6, reviewCount: 120, isOpenNow: true, photoUrl: PHOTO, description: 'Maraîcher bio, circuit court.' }),
  primeur: mk({ name: 'Primeur des Halles', rawCategory: 'greengrocer', rating: 4.2, reviewCount: 60, isOpenNow: true, photoUrl: PHOTO, description: 'Fruits et légumes de saison.' }),
  boulangerie: mk({ name: 'Boulangerie du Marché', rawCategory: 'bakery', rating: 4.4, reviewCount: 210, isOpenNow: true, photoUrl: PHOTO, description: 'Pain au levain.' }),
  boucherie: mk({ name: 'Boucherie Centrale', rawCategory: 'butcher', rating: 4.3, reviewCount: 95, isOpenNow: true, photoUrl: PHOTO, description: 'Viande locale.' }),
  poissonnerie: mk({ name: 'Poissonnerie de la Criée', rawCategory: 'fishmonger', rating: 4.5, reviewCount: 85, isOpenNow: true, photoUrl: PHOTO, description: 'Poisson frais.' }),
  epicerie: mk({ name: 'Épicerie Vrac & Co', rawCategory: 'grocery_store', rating: 4.1, reviewCount: 48, isOpenNow: true, photoUrl: PHOTO, description: 'Zéro déchet, bio, local.' }),
};

// « Elevage EDEN » : note Google excellente ET catégorie brute qui fuit vers `farm` (tier max)
// → sans garde-fou, il remonterait en tête. Le mot « elevage » (non-producteur) force veryLow.
const EDEN = mk({ name: 'Elevage EDEN', rawCategory: 'farm', rating: 5.0, reviewCount: 300, isOpenNow: true, photoUrl: PHOTO, description: 'Elevage de chiens et chats de race, mastiff.' });

const OFF = {
  eden: EDEN,
  chatterie: mk({ name: 'Chatterie du Sud', rawCategory: 'cattery', rating: 4.9, reviewCount: 55, isOpenNow: true, photoUrl: PHOTO, description: 'Chatterie félins de race.' }),
  pompes: mk({ name: 'Pompes Funèbres Martin', rawCategory: 'funeral_home', rating: 4.8, reviewCount: 30, isOpenNow: true, photoUrl: PHOTO, description: 'Obsèques.' }),
  couvreur: mk({ name: 'Toiture & Façade Pro', rawCategory: 'roofing_contractor', rating: 4.9, reviewCount: 70, isOpenNow: true, photoUrl: PHOTO, description: 'Couvreur, ravalement de façade.' }),
};

describe('rankMerchantsEditorially — priorité éditoriale YOOTOO', () => {
  it('classe tout le cœur de mission au-dessus de tous les hors-intention', () => {
    const minCore = Math.min(...Object.values(CORE).map(getMerchantEditorialScore));
    const maxOff = Math.max(...Object.values(OFF).map(getMerchantEditorialScore));
    expect(minCore).toBeGreaterThan(maxOff);
  });

  it('rétrograde sans supprimer (score fini, jamais -Infinity)', () => {
    for (const m of Object.values(OFF)) {
      expect(Number.isFinite(getMerchantEditorialScore(m))).toBe(true);
    }
  });

  it('« Elevage EDEN » (note 5.0, catégorie brute fuyante `farm`) passe DERRIÈRE tout le cœur YOOTOO', () => {
    for (const core of Object.values(CORE)) {
      expect(getMerchantEditorialScore(core)).toBeGreaterThan(getMerchantEditorialScore(EDEN));
    }
  });

  it('helper unique : EDEN n’apparaît jamais avant un producteur/primeur/boulangerie/boucherie/poissonnerie/épicerie', () => {
    // Ordre d'entrée défavorable exprès : EDEN en tête.
    const input = [EDEN, ...Object.values(CORE), OFF.chatterie, OFF.pompes, OFF.couvreur];
    const ranked = rankMerchantsEditorially(input);
    const edenPos = ranked.findIndex((m) => m.name === 'Elevage EDEN');
    for (const core of Object.values(CORE)) {
      const corePos = ranked.findIndex((m) => m === core);
      expect(corePos).toBeLessThan(edenPos);
    }
  });

  it('tri STABLE : à score égal, l’ordre d’entrée (Discovery Engine) est conservé', () => {
    const a = mk({ name: 'Épicerie A', rawCategory: 'grocery_store', rating: 4.1, reviewCount: 48, isOpenNow: true, photoUrl: PHOTO, description: 'Local.' });
    const b = mk({ name: 'Épicerie B', rawCategory: 'grocery_store', rating: 4.1, reviewCount: 48, isOpenNow: true, photoUrl: PHOTO, description: 'Local.' });
    expect(getMerchantEditorialScore(a)).toBe(getMerchantEditorialScore(b));
    const ranked = rankMerchantsEditorially([a, b]);
    expect(ranked[0]).toBe(a);
    expect(ranked[1]).toBe(b);
  });
});
