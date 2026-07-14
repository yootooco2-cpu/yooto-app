import { filterGroupsByRoute, nextSheetState, SHEET_HEIGHT, sheetHeightPx, TOP_BAR_SPACE } from './sheetModel';

describe('sheetHeightPx', () => {
  it('réduit = hauteur absolue, indépendante de l’écran', () => {
    expect(sheetHeightPx('reduced', 800)).toBe(SHEET_HEIGHT.reduced);
    expect(sheetHeightPx('reduced', 400)).toBe(SHEET_HEIGHT.reduced);
  });

  it('intermédiaire/développé = fraction d’écran', () => {
    expect(sheetHeightPx('mid', 1000)).toBe(420);
    expect(sheetHeightPx('full', 1000)).toBe(814); // 860 plafonné à 1000 − TOP_BAR_SPACE
  });

  it('le sheet ne recouvre JAMAIS la barre flottante (plafond absolu)', () => {
    for (const h of [500, 700, 900]) {
      expect(sheetHeightPx('full', h)).toBeLessThanOrEqual(h - TOP_BAR_SPACE);
    }
  });
});

describe('nextSheetState — sans sélection (liste)', () => {
  it('monte réduit → intermédiaire → développé et s’arrête', () => {
    expect(nextSheetState('reduced', 1, false)).toBe('mid');
    expect(nextSheetState('mid', 1, false)).toBe('full');
    expect(nextSheetState('full', 1, false)).toBe('full');
  });

  it('descend développé → intermédiaire → réduit et s’arrête', () => {
    expect(nextSheetState('full', -1, false)).toBe('mid');
    expect(nextSheetState('mid', -1, false)).toBe('reduced');
    expect(nextSheetState('reduced', -1, false)).toBe('reduced');
  });
});

describe('nextSheetState — avec sélection (BUG corrigé : ouvrir les horaires en UN geste)', () => {
  it('réduit → développé directement : jamais la liste entre le résumé et les horaires', () => {
    expect(nextSheetState('reduced', 1, true)).toBe('full');
  });

  it('développé → réduit directement', () => {
    expect(nextSheetState('full', -1, true)).toBe('reduced');
  });

  it('état intermédiaire transitoire : rejoint l’échelle dans le sens demandé', () => {
    expect(nextSheetState('mid', 1, true)).toBe('full');
    expect(nextSheetState('mid', -1, true)).toBe('reduced');
  });

  it('bornes stables', () => {
    expect(nextSheetState('full', 1, true)).toBe('full');
    expect(nextSheetState('reduced', -1, true)).toBe('reduced');
  });
});

describe('filterGroupsByRoute — le filtre de ligne ne produit JAMAIS un vide silencieux', () => {
  const groups = [
    { routeId: 'T1', headsign: 'Mosson' },
    { routeId: 'T1', headsign: 'Odysseum' },
    { routeId: 'B35', headsign: 'Acacias' },
  ];

  it('sans ligne sélectionnée : tout, filtre inactif', () => {
    expect(filterGroupsByRoute(groups, null)).toEqual({ groups, active: false, missing: false });
  });

  it('ligne présente : uniquement ses directions, filtre actif', () => {
    const r = filterGroupsByRoute(groups, 'T1');
    expect(r.active).toBe(true);
    expect(r.missing).toBe(false);
    expect(r.groups.map((g) => g.headsign)).toEqual(['Mosson', 'Odysseum']);
  });

  it('ligne sans départ (ou hors mode) : TOUT est rendu et le manque est SIGNALÉ', () => {
    const r = filterGroupsByRoute(groups, 'B99');
    expect(r.groups).toEqual(groups);
    expect(r.active).toBe(false);
    expect(r.missing).toBe(true);
  });

  it('aucun groupe du tout : pas de double signal (le message global suffit)', () => {
    expect(filterGroupsByRoute([], 'T1')).toEqual({ groups: [], active: false, missing: false });
  });
});
