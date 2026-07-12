import { richesseLevel, richesseScore } from './richesse';

const base = { etat: 'TROUVE' } as const;

describe('richesse Google — la dépense va aux fiches qui créent de la valeur', () => {
  it("l'exemple canonique de la décision : photo+horaires+tél+adresse+300 avis SANS SITE = niveau A", () => {
    const f = { ...base, photo_ref: 'r', opening_hours: {}, phone: '04', adresse_ok: true, reviews: 300, rating: 4.6 };
    expect(richesseLevel(f)).toBe('A');
    expect(richesseScore(f)).toBe(5 + 4 + 4 + 4 + 3 + 3); // 23 — sans site ni type ni description
  });

  it('le site web seul ne fait jamais un niveau : il compte comme UNE info parmi d’autres', () => {
    expect(richesseLevel({ ...base, website: 'w' })).toBe('C');
    expect(richesseLevel({ ...base, website: 'w', rating: 4, reviews: 10, adresse_ok: true })).toBe('B'); // 4 infos
  });

  it('B = ≥4 informations fiables, même sans photo ni site', () => {
    expect(richesseLevel({ ...base, phone: '04', opening_hours: {}, rating: 4.2, reviews: 12 })).toBe('B');
  });

  it('C = fiche pauvre (reportée) ; D = introuvable (voie SIRENE, jamais exclue de la publication)', () => {
    expect(richesseLevel({ ...base, rating: 4.9 })).toBe('C');
    expect(richesseLevel({ etat: 'INTROUVABLE' })).toBe('D');
    expect(richesseScore({ etat: 'INTROUVABLE' })).toBe(0);
  });

  it('les types génériques (establishment/store) ne comptent jamais comme catégorie fiable', () => {
    expect(richesseScore({ ...base, types: ['establishment', 'point_of_interest'] })).toBe(0);
    expect(richesseScore({ ...base, types: ['bakery'] })).toBe(3);
  });

  it('photo = la pondération maximale (5) — mais elle ne suffit pas seule au niveau A', () => {
    const photoSeule = { ...base, photo_ref: 'r' };
    expect(richesseScore(photoSeule)).toBe(5);
    expect(richesseLevel(photoSeule)).toBe('C');
  });
});
