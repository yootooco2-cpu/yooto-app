import { CATEGORY_FAMILIES, categoryFamilyById, type CategoryNode } from './categoryFamilies';
import type { Merchant } from './types';

const merchant = (over: Partial<Merchant>): Merchant =>
  ({
    id: '1',
    name: '',
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

const leafById = (id: string): CategoryNode | undefined => {
  const walk = (nodes: CategoryNode[]): CategoryNode | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = n.children ? walk(n.children) : undefined;
      if (found) return found;
    }
    return undefined;
  };
  return walk(CATEGORY_FAMILIES);
};

describe('categoryFamilies — arbre cible GATE 1', () => {
  it('expose les grandes familles (Niveau 1) dans l’ordre de la référence', () => {
    expect(CATEGORY_FAMILIES.map((f) => f.label)).toEqual([
      'Alimentation',
      'Restaurants',
      'Bien-être',
      'Artisanat',
      'Culture',
      'Mobilité',
      'Nature',
    ]);
  });

  it('Alimentation = 13 sous-catégories, dont Vignerons & Domaines et Coopératives (GATE 1)', () => {
    const alim = categoryFamilyById('alimentation');
    expect(alim?.children?.length).toBe(13);
    const ids = alim?.children?.map((i) => i.id) ?? [];
    expect(ids).toContain('vignerons-domaines');
    expect(ids).toContain('cooperatives');
    expect(alim?.children?.every((i) => i.iconId !== undefined)).toBe(true);
  });

  it('Vignerons & Domaines : la preuve NAF (niveau 1) route sans texte ; repli texte sinon (Loi 3)', () => {
    const leaf = leafById('vignerons-domaines')!;
    expect(leaf.match?.(merchant({ nafCode: '01.21Z' } as Partial<Merchant>))).toBe(true);
    expect(leaf.match?.(merchant({ nafCode: '11.02A' } as Partial<Merchant>))).toBe(true);
    expect(leaf.match?.(merchant({ nafCode: '47.21Z' } as Partial<Merchant>))).toBe(false);
    expect(leaf.match?.(merchant({ name: 'Vignoble des Cévennes' }))).toBe(true);
    // Union famille : un vigneron ∈ Alimentation.
    expect(categoryFamilyById('alimentation')?.match?.(merchant({ nafCode: '01.21Z' } as Partial<Merchant>))).toBe(true);
  });

  it('regroupe les catégories existantes (union de match) — un producteur ∈ Alimentation', () => {
    const alim = categoryFamilyById('alimentation');
    expect(alim?.match?.(merchant({ isProducer: true, category: 'producer' }))).toBe(true);
  });

  it('réutilise le match d’une catégorie existante pour la sous-catégorie (aucune duplication)', () => {
    const alim = categoryFamilyById('alimentation');
    const producteurs = alim?.children?.find((i) => i.id === 'producteurs');
    expect(producteurs?.match?.(merchant({ isProducer: true }))).toBe(true);
  });

  it('chaque nœud de 1er niveau est valide (une branche avec enfants, ou une feuille avec match)', () => {
    expect(CATEGORY_FAMILIES.every((f) => (f.children?.length ?? 0) > 0 || typeof f.match === 'function')).toBe(true);
  });

  it('Nature = Fleuristes (GATE 1) + 10 sous-catégories transversales', () => {
    const nature = categoryFamilyById('nature');
    expect(nature?.children?.length).toBe(11);
    expect(nature?.children?.[0]?.id).toBe('fleuristes');
    // Chaque enfant porte un visuel : cryptogramme (iconId) ou pictogramme dédié (pictoKey).
    expect(nature?.children?.every((i) => i.iconId !== undefined || i.pictoKey !== undefined)).toBe(true);
    const equitation = nature?.children?.find((i) => i.id === 'equitation');
    expect(equitation?.match?.(merchant({ name: 'Centre équestre du Lez' }))).toBe(true);
    const fleuristes = nature?.children?.find((i) => i.id === 'fleuristes');
    expect(fleuristes?.match?.(merchant({ rawCategory: 'florist' } as Partial<Merchant>))).toBe(true);
  });

  it('Bien-être = 8 métiers, chacun avec pictogramme dédié + couleur d’accent', () => {
    const be = categoryFamilyById('bienetre');
    expect(be?.children?.length).toBe(8);
    expect(be?.children?.every((i) => i.pictoKey && /^#[0-9A-F]{6}$/i.test(i.accent ?? ''))).toBe(true);
    const naturo = be?.children?.find((i) => i.id === 'naturopathie');
    expect(naturo?.match?.(merchant({ name: 'Cabinet de naturopathie Sainte-Anne' }))).toBe(true);
  });

  it('Restaurants = 13 sous-catégories, chacune avec pictogramme dédié + couleur d’accent', () => {
    const resto = categoryFamilyById('restaurants');
    expect(resto?.children?.length).toBe(13);
    expect(resto?.children?.every((i) => i.pictoKey && /^#[0-9A-F]{6}$/i.test(i.accent ?? ''))).toBe(true);
  });

  it('Culture = 10 sous-catégories (picto + accent)', () => {
    const cult = categoryFamilyById('culture');
    expect(cult?.children?.length).toBe(10);
    expect(cult?.children?.every((i) => i.pictoKey && /^#[0-9A-F]{6}$/i.test(i.accent ?? ''))).toBe(true);
    const musees = cult?.children?.find((i) => i.id === 'musees');
    expect(musees?.match?.(merchant({ name: 'Musée Fabre' }))).toBe(true);
  });

  it('Mobilité = 6 sous-catégories ; Bus / Tramway / Covoiturage RETIRÉES (GATE 1)', () => {
    const mob = categoryFamilyById('mobilite');
    expect(mob?.children?.map((i) => i.id)).toEqual([
      'velos', 'trottinettes', 'skate-rollers', 'poussettes', 'velos-cargo', 'mobilite-pmr',
    ]);
    ['bus', 'tramway', 'covoiturage', 'parking', 'autopartage', 'transports'].forEach((old) =>
      expect(mob?.children?.map((i) => i.id)).not.toContain(old),
    );
  });

  it('Artisanat = 12 familles, dont Réparation & Seconde main (GATE 1)', () => {
    const art = categoryFamilyById('artisanat');
    expect(art?.children?.length).toBe(12);
    expect(art?.children?.map((f) => f.id)).toContain('reparation-seconde-main');
    const repar = art?.children?.find((f) => f.id === 'reparation-seconde-main');
    expect(repar?.match?.(merchant({ name: "La Recyclerie d'Anduze" }))).toBe(true);
    expect(repar?.match?.(merchant({ name: 'Cordonnerie du Centre' }))).toBe(true);
    expect(repar?.match?.(merchant({ name: 'Boulangerie du Centre' }))).toBe(false);
    // Niveau 3 inchangé : Ébéniste ∈ Art du bois.
    const bois = art?.children?.find((f) => f.id === 'art-du-bois');
    expect(bois?.children?.find((m) => m.id === 'ebeniste')?.match?.(merchant({ name: 'Atelier d’ébénisterie du Peyrou' }))).toBe(true);
    expect(art?.match?.(merchant({ name: 'Supermarché Casino', rawCategory: 'supermarket' }))).toBe(false);
  });
});

describe('Loi 8 — classe « faux positifs lexicaux » éliminée (radical en début de mot)', () => {
  it("un radical ne matche jamais au milieu d'un mot ('velo' ≠ developpement)", () => {
    const velos = leafById('velos')!;
    expect(velos.match?.(merchant({ description: 'agence de developpement durable' }))).toBe(false);
    expect(velos.match?.(merchant({ description: 'reparation de velo electrique' }))).toBe(true);
  });

  it("les radicaux volontaires matchent en début de mot ('ebenist' → Ébénisterie)", () => {
    const ebeniste = leafById('ebeniste')!;
    expect(ebeniste.match?.(merchant({ name: 'Ébénisterie du Pic Saint-Loup' }))).toBe(true);
  });

  it("le bug d'origine : 'local_business' ne fait plus matcher AUCUNE feuille Mobilité", () => {
    const mob = categoryFamilyById('mobilite')!;
    const m = merchant({ rawCategory: 'local_business', rawMerchantType: 'local_business' } as Partial<Merchant>);
    for (const child of mob.children ?? []) {
      expect(child.match?.(m)).toBe(false);
    }
  });
});
