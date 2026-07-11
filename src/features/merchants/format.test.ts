import { formatCityName } from './format';

describe('formatCityName — villes de la base (stockées en minuscules)', () => {
  it('capitalise un nom simple', () => {
    expect(formatCityName('montpellier')).toBe('Montpellier');
  });
  it('capitalise après espace, tiret et apostrophe', () => {
    expect(formatCityName("clermont-l'hérault")).toBe("Clermont-L'Hérault");
    expect(formatCityName('saint jean de védas')).toBe('Saint Jean De Védas');
  });
  it('laisse intact un nom déjà correct', () => {
    expect(formatCityName('Anduze')).toBe('Anduze');
  });
  it('capitalise aussi une initiale accentuée', () => {
    expect(formatCityName('èze')).toBe('Èze');
  });
  it('undefined/null/vide → undefined (aucun affichage)', () => {
    expect(formatCityName(undefined)).toBeUndefined();
    expect(formatCityName(null)).toBeUndefined();
    expect(formatCityName('')).toBeUndefined();
  });
});
