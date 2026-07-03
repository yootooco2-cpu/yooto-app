/// <reference types="jest" />
import { photoPriority, selectPhotoMarkers, type RankablePoint } from './photoSelection';

const p = (id: string, over: Partial<RankablePoint> = {}): RankablePoint => ({
  id,
  photo: over.photo ?? `https://cdn/${id}.jpg`,
  rating: over.rating ?? 0,
  producer: over.producer ?? 0,
});

describe('photoPriority', () => {
  it('la présence de photo domine producteur et note', () => {
    const withPhoto = p('a', { photo: 'https://cdn/a.jpg', rating: 0, producer: 0 });
    const noPhotoProducer = p('b', { photo: '', rating: 5, producer: 1 });
    expect(photoPriority(withPhoto)).toBeGreaterThan(photoPriority(noPhotoProducer));
  });

  it('à photo égale, producteur passe devant, puis la note', () => {
    const producer = p('a', { producer: 1, rating: 3 });
    const rated = p('b', { producer: 0, rating: 5 });
    expect(photoPriority(producer)).toBeGreaterThan(photoPriority(rated));
  });
});

describe('selectPhotoMarkers', () => {
  it('n\'affiche en photo que les commerces AVEC vraie photo', () => {
    const points = [p('withphoto'), p('nophoto', { photo: '' })];
    const chosen = selectPhotoMarkers(points, { cap: 10 });
    expect(chosen.map((c) => c.id)).toEqual(['withphoto']);
  });

  it('respecte le plafond (cap) en gardant les plus prioritaires', () => {
    const points = [
      p('low', { rating: 1 }),
      p('mid', { rating: 3 }),
      p('top', { producer: 1, rating: 4 }),
    ];
    const chosen = selectPhotoMarkers(points, { cap: 2 });
    expect(chosen).toHaveLength(2);
    expect(chosen.map((c) => c.id)).toEqual(['top', 'mid']); // 'low' recalé
  });

  it('inclut TOUJOURS le commerce sélectionné, même au-delà du cap', () => {
    const points = [
      p('top', { producer: 1, rating: 5 }),
      p('mid', { rating: 3 }),
      p('selected', { rating: 0 }),
    ];
    const chosen = selectPhotoMarkers(points, { cap: 1, selectedId: 'selected' });
    const ids = chosen.map((c) => c.id);
    expect(ids).toContain('top'); // le meilleur dans le cap
    expect(ids).toContain('selected'); // forcé malgré le cap
    expect(ids).toHaveLength(2);
  });

  it('inclut le sélectionné même SANS photo (mise en avant garantie)', () => {
    const points = [p('a'), p('selected', { photo: '' })];
    const chosen = selectPhotoMarkers(points, { cap: 10, selectedId: 'selected' });
    expect(chosen.map((c) => c.id).sort()).toEqual(['a', 'selected']);
  });

  it('est déterministe (départage stable par id)', () => {
    const points = [p('b', { rating: 3 }), p('a', { rating: 3 })];
    expect(selectPhotoMarkers(points, { cap: 10 }).map((c) => c.id)).toEqual(['a', 'b']);
  });
});
