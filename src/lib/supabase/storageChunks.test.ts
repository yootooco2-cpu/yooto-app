import { chunkString } from './storageChunks';

describe('chunkString', () => {
  it('découpe en fragments de taille fixe', () => {
    expect(chunkString('abcdef', 2)).toEqual(['ab', 'cd', 'ef']);
  });
  it('dernier fragment partiel', () => {
    expect(chunkString('abcde', 2)).toEqual(['ab', 'cd', 'e']);
  });
  it('taille >= longueur → un seul fragment', () => {
    expect(chunkString('abc', 10)).toEqual(['abc']);
  });
  it('chaîne vide → un fragment vide (jamais [])', () => {
    expect(chunkString('', 100)).toEqual(['']);
  });
  it('taille invalide → valeur entière', () => {
    expect(chunkString('abc', 0)).toEqual(['abc']);
  });
  it('reconstruction = valeur d’origine', () => {
    const v = 'x'.repeat(5000);
    expect(chunkString(v, 1800).join('')).toBe(v);
  });
});
