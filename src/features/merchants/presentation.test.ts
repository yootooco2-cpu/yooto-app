import { markPhotoFailed, presentationScore, sortForDisplay } from './presentation';
import type { Merchant } from './types';

const m = (over: Partial<Merchant>): Merchant =>
  ({
    id: over.id ?? 'x',
    name: over.name ?? 'Test',
    category: 'shop',
    description: '',
    coordinates: { latitude: 0, longitude: 0 },
    distanceLabel: '—',
    isOpenNow: false,
    isProducer: false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    ...over,
  }) as Merchant;

describe('score de complétude — il ordonne, il n’exclut jamais', () => {
  it('pondérations validées : photo 3 · vérifié 3 · téléphone 2 · note 2 · horaires 1 · site 1', () => {
    expect(presentationScore(m({}))).toBe(0);
    expect(presentationScore(m({ photoUrl: 'https://x/p.jpg' }))).toBe(3);
    expect(presentationScore(m({ siret: 'x', sireneEtat: 'A' }))).toBe(3);
    expect(presentationScore(m({ phone: '04' }))).toBe(2);
    expect(presentationScore(m({ rating: 4.5 }))).toBe(2);
    expect(presentationScore(m({ openingHours: ['lundi: 8h'] }))).toBe(1);
    expect(presentationScore(m({ website: 'https://y' }))).toBe(1);
    expect(
      presentationScore(m({ photoUrl: 'https://x/p.jpg', siret: 'x', sireneEtat: 'A', phone: '04', rating: 4.5, openingHours: ['l'], website: 'w' })),
    ).toBe(12);
  });

  it('la photo compte seulement si elle CHARGE : un échec de rendu la retire du score', () => {
    const rich = m({ id: 'r', photoUrl: 'https://x/dead.jpg' });
    expect(presentationScore(rich)).toBe(3);
    markPhotoFailed('https://x/dead.jpg');
    expect(presentationScore(rich)).toBe(0);
  });

  it('le vérifié SANS photo garde son rang de preuve : jamais écrasé par une simple photo Google', () => {
    const verifieNu = m({ id: 'v', siret: 'x', sireneEtat: 'A', phone: '04' }); // 3+2 = 5
    const photoSeule = m({ id: 'p', photoUrl: 'https://x/ok.jpg' }); // 3
    const [premier] = sortForDisplay([photoSeule, verifieNu]);
    expect(premier.id).toBe('v');
  });

  it('PERMUTATION, jamais un filtre : mêmes fiches avant/après, seul l’ordre change', () => {
    const list = [m({ id: 'a' }), m({ id: 'b', photoUrl: 'https://x/b.jpg', rating: 4 }), m({ id: 'c', phone: '04' })];
    const sorted = sortForDisplay(list);
    expect(sorted).toHaveLength(list.length);
    expect(new Set(sorted.map((x) => x.id))).toEqual(new Set(['a', 'b', 'c']));
    expect(sorted[0].id).toBe('b'); // 5 pts
    expect(sorted[1].id).toBe('c'); // 2 pts
  });

  it('ordre : complétude → score officiel persisté (proxy SPT) → distance → nom', () => {
    const a = m({ id: 'a', phone: '04', verificationScore: 90 });
    const b = m({ id: 'b', phone: '04', verificationScore: 60 });
    const c = m({ id: 'c', phone: '04', verificationScore: 60, distanceKm: 0.2 });
    const order = sortForDisplay([c, b, a]).map((x) => x.id);
    expect(order[0]).toBe('a');
    expect(order[1]).toBe('c'); // même score, même proxy → plus proche d'abord
  });
});
