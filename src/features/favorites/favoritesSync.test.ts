import { mergeFavoriteIds } from './favoritesSync';

describe('mergeFavoriteIds', () => {
  it('union sans doublon (invariant 4)', () => {
    expect(mergeFavoriteIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });
  it('préserve l’ordre local (récent d’abord) puis serveur', () => {
    expect(mergeFavoriteIds(['b', 'a'], ['c'])).toEqual(['b', 'a', 'c']);
  });
  it('idempotent : re-fusionner ne change rien (invariant 6)', () => {
    const once = mergeFavoriteIds(['a'], ['b']);
    expect(mergeFavoriteIds(once, ['b'])).toEqual(once);
    expect(mergeFavoriteIds(once, once)).toEqual(once);
  });
  it('local seul / serveur seul', () => {
    expect(mergeFavoriteIds(['a'], [])).toEqual(['a']);
    expect(mergeFavoriteIds([], ['a'])).toEqual(['a']);
    expect(mergeFavoriteIds([], [])).toEqual([]);
  });
});
