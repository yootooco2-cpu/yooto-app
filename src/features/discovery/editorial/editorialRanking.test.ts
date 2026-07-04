/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { getMerchantEditorialScore } from './editorialScore';

// Garde-fous de ranking éditorial : le cœur de mission YOOTOO (producteurs, alimentaire de
// proximité) doit primer sur les commerces hors intention (élevages, pompes funèbres, couvreurs),
// MÊME lorsque ces derniers ont une meilleure note Google. Aucun n'est supprimé (score fini).

const PHOTO = 'https://images.example.com/real.jpg';
const mk = (o: Partial<Merchant> & { name: string }): Merchant => o as unknown as Merchant;

const CORE = {
  producteur: mk({ name: 'La Ferme du Coteau', rawCategory: 'producer', isProducer: true, category: 'producer', rating: 4.6, reviewCount: 120, isOpenNow: true, photoUrl: PHOTO, description: 'Maraîcher bio, circuit court.' }),
  boulangerie: mk({ name: 'Boulangerie du Marché', rawCategory: 'bakery', rating: 4.4, reviewCount: 210, isOpenNow: true, photoUrl: PHOTO, description: 'Pain au levain.' }),
  poissonnerie: mk({ name: 'Poissonnerie de la Criée', rawCategory: 'fishmonger', rating: 4.5, reviewCount: 85, isOpenNow: true, photoUrl: PHOTO, description: 'Poisson frais.' }),
  boucherie: mk({ name: 'Boucherie Centrale', rawCategory: 'butcher', rating: 4.3, reviewCount: 95, isOpenNow: true, photoUrl: PHOTO, description: 'Viande locale.' }),
  fromagerie: mk({ name: 'Fromagerie Grand Cru', rawCategory: 'cheese_shop', rating: 4.7, reviewCount: 150, isOpenNow: true, photoUrl: PHOTO, description: 'Affineur.' }),
};

const OFF = {
  elevage: mk({ name: 'Élevage des Grands Mastiff', rawCategory: 'animal_breeding', rating: 5.0, reviewCount: 42, isOpenNow: true, photoUrl: PHOTO, description: 'Élevage de chiens mastiff.' }),
  chatterie: mk({ name: 'Chatterie du Sud', rawCategory: 'cattery', rating: 4.9, reviewCount: 55, isOpenNow: true, photoUrl: PHOTO, description: 'Chatterie félins de race.' }),
  pompes: mk({ name: 'Pompes Funèbres Martin', rawCategory: 'funeral_home', rating: 4.8, reviewCount: 30, isOpenNow: true, photoUrl: PHOTO, description: 'Obsèques.' }),
  couvreur: mk({ name: 'Toiture & Façade Pro', rawCategory: 'roofing_contractor', rating: 4.9, reviewCount: 70, isOpenNow: true, photoUrl: PHOTO, description: 'Couvreur, ravalement de façade.' }),
};

describe('getMerchantEditorialScore — priorité éditoriale YOOTOO', () => {
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

  it('ignore la meilleure note Google des hors-intention (élevage 5.0 < producteur 4.6)', () => {
    expect(getMerchantEditorialScore(CORE.producteur)).toBeGreaterThan(
      getMerchantEditorialScore(OFF.elevage),
    );
  });
});
