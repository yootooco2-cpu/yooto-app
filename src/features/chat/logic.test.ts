import { actorKindLabel, avatarUri, bikeMinutes, geoScope, isFresh, isLiveNow, isTerritoryActor, isTrusted, presence, proximityHint, reputationScore, walkMinutes } from './logic';

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

describe('proximité (indicateurs discrets)', () => {
  it('temps de marche / vélo (mini 1 min)', () => {
    expect(walkMinutes(0.4)).toBe(5);
    expect(bikeMinutes(3)).toBe(12);
    expect(walkMinutes(0.01)).toBe(1);
  });
  it('proximityHint : marche si très proche, vélo si proche, rien au-delà', () => {
    expect(proximityHint(0.4)).toEqual({ icon: '🚶', minutes: 5 });
    expect(proximityHint(3)?.icon).toBe('🚴');
    expect(proximityHint(9)).toBeNull();
    expect(proximityHint(undefined)).toBeNull();
  });
});

describe('activité en direct', () => {
  const NOW = new Date('2026-07-08T20:00:00Z').getTime();
  it('isLiveNow pendant l’événement', () => {
    const start = new Date(NOW - 30 * 60_000).toISOString();
    const end = new Date(NOW + 30 * 60_000).toISOString();
    expect(isLiveNow(start, end, NOW)).toBe(true);
    expect(isLiveNow(new Date(NOW + 60 * 60_000).toISOString(), undefined, NOW)).toBe(false);
    expect(isLiveNow(undefined, undefined, NOW)).toBe(false);
  });
  it('isFresh sous la minute', () => {
    expect(isFresh(new Date(NOW - 20_000).toISOString(), NOW)).toBe(true);
    expect(isFresh(new Date(NOW - 120_000).toISOString(), NOW)).toBe(false);
  });
});

describe('avatarUri (priorité logo > façade > perso > initiales)', () => {
  it('respecte l’ordre de priorité', () => {
    expect(avatarUri({ logoUrl: 'L', coverUrl: 'C', avatarUrl: 'A' })).toBe('L');
    expect(avatarUri({ coverUrl: 'C', avatarUrl: 'A' })).toBe('C');
    expect(avatarUri({ avatarUrl: 'A' })).toBe('A');
    expect(avatarUri({})).toBeNull();
  });
});

describe('présence (statut crédible, pas de point vert systématique)', () => {
  const NOW = new Date('2026-07-08T20:00:00Z').getTime();
  it('en ligne', () => {
    expect(presence({ online: true }, NOW)).toEqual({ label: 'En ligne', online: true });
  });
  it('paliers d’activité', () => {
    expect(presence({ lastActiveAt: new Date(NOW - 2 * 60_000).toISOString() }, NOW)).toEqual({ label: 'Actif il y a 2 min', online: false });
    expect(presence({ lastActiveAt: new Date(NOW - 15 * 60_000).toISOString() }, NOW)).toEqual({ label: 'Dernière activité il y a 15 min', online: false });
    const p = presence({ lastActiveAt: new Date(NOW - 3 * 60 * 60_000).toISOString() }, NOW);
    expect(p?.label).toMatch(/^Actif aujourd'hui à \d{2}:\d{2}$/);
  });
  it('aucune donnée → null', () => {
    expect(presence({}, NOW)).toBeNull();
  });
});
