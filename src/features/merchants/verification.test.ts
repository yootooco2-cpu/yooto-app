import {
  getVerificationBadges,
  isNewInTown,
  isProvenIndependent,
  isProvenProducer,
  isVerifiedMerchant,
  verifiedSinceYear,
} from './verification';
import type { Merchant } from './types';

const base = (over: Partial<Merchant>): Merchant =>
  ({
    id: 'm1',
    name: 'Test',
    category: 'grocery',
    description: '',
    coordinates: { latitude: 43.6, longitude: 3.87 },
    distanceLabel: '—',
    isOpenNow: false,
    isProducer: false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    ...over,
  }) as Merchant;

describe('vérification SIRENE — un badge n’apparaît que s’il est prouvé', () => {
  it('sans SIRET : aucun badge (jamais deviné)', () => {
    expect(getVerificationBadges(base({}))).toEqual([]);
    expect(isVerifiedMerchant(base({}))).toBe(false);
  });

  it('établissement cessé (etat C) : plus vérifié, aucun badge', () => {
    const m = base({ siret: '123', sireneEtat: 'C', sireneNbEtablissements: 1 });
    expect(isVerifiedMerchant(m)).toBe(false);
    expect(getVerificationBadges(m)).toEqual([]);
  });

  it('SIRET actif → badge « Vérifié · registre officiel »', () => {
    const badges = getVerificationBadges(base({ siret: '52872535100019', sireneEtat: 'A' }));
    expect(badges.map((b) => b.id)).toEqual(['verified']);
  });

  it('1 seul établissement → « Entreprise indépendante » ; 3 établissements → non', () => {
    expect(isProvenIndependent(base({ siret: 'x', sireneEtat: 'A', sireneNbEtablissements: 1 }))).toBe(true);
    expect(isProvenIndependent(base({ siret: 'x', sireneEtat: 'A', sireneNbEtablissements: 3 }))).toBe(false);
  });

  it('NAF agricole (01.49Z) → « Producteur vérifié » ; commerce (47.21Z) → non', () => {
    expect(isProvenProducer(base({ siret: 'x', sireneEtat: 'A', nafCode: '01.49Z' }))).toBe(true);
    expect(isProvenProducer(base({ siret: 'x', sireneEtat: 'A', nafCode: '47.21Z' }))).toBe(false);
  });

  it('fiche complète (Chez Fabien) → preuves uniquement, « Depuis » exclu de la rangée', () => {
    const badges = getVerificationBadges(
      base({ siret: '52872535100019', sireneEtat: 'A', nafCode: '47.21Z', sireneNbEtablissements: 1, sireneCreationDate: '2010-10-01' }),
    );
    expect(badges.map((b) => b.id)).toEqual(['verified', 'independent']);
  });

  it('producteur indépendant → les 3 preuves, dans l’ordre', () => {
    const badges = getVerificationBadges(
      base({ siret: 'x', sireneEtat: 'A', nafCode: '01.49Z', sireneNbEtablissements: 1 }),
    );
    expect(badges.map((b) => b.id)).toEqual(['verified', 'producer', 'independent']);
  });

  it('verifiedSinceYear (affiché dans le header, plus dans la rangée) rejette les dates invalides', () => {
    expect(verifiedSinceYear(base({ sireneCreationDate: '2010-10-01' }))).toBe(2010);
    expect(verifiedSinceYear(base({ sireneCreationDate: 'n/a' }))).toBeUndefined();
    expect(verifiedSinceYear(base({}))).toBeUndefined();
  });
});

describe('« Nouveau dans votre quartier » (données prêtes, non affichées)', () => {
  const NOW = Date.parse('2026-07-10T12:00:00Z');
  it('création il y a 30 jours → nouveau', () => {
    expect(isNewInTown(base({ sireneCreationDate: '2026-06-10' }), NOW)).toBe(true);
  });
  it('création il y a ~250 jours → plus nouveau (hors fenêtre 210 j)', () => {
    expect(isNewInTown(base({ sireneCreationDate: '2025-11-01' }), NOW)).toBe(false);
  });
  it('date future ou absente → jamais nouveau', () => {
    expect(isNewInTown(base({ sireneCreationDate: '2026-09-01' }), NOW)).toBe(false);
    expect(isNewInTown(base({}), NOW)).toBe(false);
  });
});
