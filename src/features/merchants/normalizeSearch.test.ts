/// <reference types="jest" />
import { normalizeSearch } from './normalizeSearch';

describe('normalizeSearch', () => {
  it('retire les accents et met en minuscules', () => {
    expect(normalizeSearch('Café')).toBe('cafe');
    expect(normalizeSearch('BOULANGERIE')).toBe('boulangerie');
    expect(normalizeSearch('Épicerie Française')).toBe('epicerie francaise');
  });

  it('rend « cafe » et « café » équivalents', () => {
    expect(normalizeSearch('cafe')).toBe(normalizeSearch('café'));
  });

  it('supprime les espaces de bord', () => {
    expect(normalizeSearch('  Marché  ')).toBe('marche');
  });

  it('gère les entrées vides / nulles', () => {
    expect(normalizeSearch('')).toBe('');
    expect(normalizeSearch(undefined)).toBe('');
    expect(normalizeSearch(null)).toBe('');
  });
});
