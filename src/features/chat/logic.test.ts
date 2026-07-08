import { actorKindLabel, geoScope, isTerritoryActor, isTrusted, reputationScore } from './logic';

describe('geoScope', () => {
  it('classe par distance (near / neighborhood / city)', () => {
    expect(geoScope(0.3)).toBe('near');
    expect(geoScope(0.6)).toBe('near');
    expect(geoScope(1.5)).toBe('neighborhood');
    expect(geoScope(5)).toBe('city');
    expect(geoScope(undefined)).toBe('city');
  });
});

describe('actorKindLabel', () => {
  it('libelle les 4 types d’acteurs', () => {
    expect(actorKindLabel('particulier')).toBe('Particulier');
    expect(actorKindLabel('professionnel')).toBe('Professionnel');
    expect(actorKindLabel('producteur')).toBe('Producteur');
    expect(actorKindLabel('association')).toBe('Association');
  });
  it('distingue les acteurs du territoire', () => {
    expect(isTerritoryActor('professionnel')).toBe(true);
    expect(isTerritoryActor('producteur')).toBe(true);
    expect(isTerritoryActor('particulier')).toBe(false);
  });
});

describe('confiance (utilité, jamais popularité)', () => {
  it('reputationScore lit le score d’utilité', () => {
    expect(reputationScore({ helpfulScore: 64, acceptedAnswers: 9, confirmedRecos: 7 })).toBe(64);
    expect(reputationScore(undefined)).toBe(0);
  });
  it('isTrusted = vérifié OU réputation utile significative', () => {
    expect(isTrusted({ verified: true })).toBe(true);
    expect(isTrusted({ reputation: { helpfulScore: 64, acceptedAnswers: 9, confirmedRecos: 7 } })).toBe(true);
    expect(isTrusted({ reputation: { helpfulScore: 10, acceptedAnswers: 1, confirmedRecos: 0 } })).toBe(false);
    expect(isTrusted({})).toBe(false);
  });
});
