import { CATEGORY_FAMILIES, categoryFamilyById, type CategoryNode } from './categoryFamilies';
import { classifyMerchant } from './classification/engine';
import type { Merchant } from './types';

/** Fixture qui suit le VRAI chemin de l'app : la décision du moteur est calculée comme au mapping. */
const merchant = (over: Partial<Merchant>): Merchant => {
  const base = {
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
  } as Merchant;
  return { ...base, classification: classifyMerchant(base, { estEss: base.estEss === true }) };
};

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

  it('la feuille Producteurs suit la DÉCISION du moteur (un drapeau interne seul n’est pas une preuve)', () => {
    const alim = categoryFamilyById('alimentation');
    const producteurs = alim?.children?.find((i) => i.id === 'producteurs');
    // Preuve (catégorie Google producer / NAF agricole) → routé.
    expect(producteurs?.match?.(merchant({ category: 'producer' }))).toBe(true);
    expect(producteurs?.match?.(merchant({ nafCode: '01.13Z' } as Partial<Merchant>))).toBe(true);
    // Drapeau interne sans aucune preuve → quarantaine, pas de catégorie (Loi 2).
    expect(producteurs?.match?.(merchant({ isProducer: true }))).toBe(false);
  });

  it('chaque nœud de 1er niveau est valide (une branche avec enfants, ou une feuille avec match)', () => {
    expect(CATEGORY_FAMILIES.every((f) => (f.children?.length ?? 0) > 0 || typeof f.match === 'function')).toBe(true);
  });

  it('Nature = 10 sous-catégories (ordre validé) ; Fleuristes conservé ; Lacs/rivières/pêche fusionnés', () => {
    const nature = categoryFamilyById('nature');
    // Fusion Lacs & Rivières + Pêche → 11 - 1 = 10 sous-catégories.
    expect(nature?.children?.length).toBe(10);
    // Ordre validé : top-5 en tête (Voies vertes d'abord), Fleuristes conservé après.
    expect(nature?.children?.[0]?.id).toBe('voies-vertes');
    // Chaque enfant porte un visuel : cryptogramme (iconId) ou pictogramme dédié (pictoKey).
    expect(nature?.children?.every((i) => i.iconId !== undefined || i.pictoKey !== undefined)).toBe(true);
    const equitation = nature?.children?.find((i) => i.id === 'equitation');
    expect(equitation?.match?.(merchant({ name: 'Centre équestre du Lez' }))).toBe(true);
    const fleuristes = nature?.children?.find((i) => i.id === 'fleuristes');
    expect(fleuristes?.match?.(merchant({ rawCategory: 'florist' } as Partial<Merchant>))).toBe(true);
    // Le leaf fusionné couvre les deux univers (lacs/rivières ET pêche), avec le libellé combiné.
    const lacs = nature?.children?.find((i) => i.id === 'lacs-rivieres');
    expect(lacs?.label).toBe('Lacs, rivières & pêche');
    expect(lacs?.match?.(merchant({ name: 'Base nautique du lac du Salagou' }))).toBe(true);
    expect(lacs?.match?.(merchant({ name: 'Étang de pêche de Lunel' }))).toBe(true);
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

  it('Mobilité = 7 sous-catégories (ordre validé) ; Motos retiré de la famille ; Bus & Tramway exposé', () => {
    const mob = categoryFamilyById('mobilite');
    expect(mob?.children?.map((i) => i.id)).toEqual([
      'velos', 'trottinettes', 'bus-tramway', 'velos-cargo', 'mobilite-pmr', 'skate-rollers', 'poussettes',
    ]);
    // Motos & scooters n'est PLUS exposé dans la famille (les fiches restent en base, classées par le moteur).
    expect(mob?.children?.map((i) => i.id)).not.toContain('motos');
    ['covoiturage', 'parking', 'autopartage', 'transports'].forEach((old) =>
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

describe('Bien-être — la famille RESPECTE la décision moteur pour 85.51Z (exclusion effective)', () => {
  const be = () => categoryFamilyById('bienetre')!;
  const naf = (name: string, extra: Partial<Merchant> = {}) => merchant({ name, nafCode: '85.51Z', ...extra } as Partial<Merchant>);

  // Positifs : discipline bien-être explicite → dans la famille.
  it('Studio Yoga Montpellier 85.51Z → Bien-être', () => expect(be().match?.(naf('Studio Yoga Montpellier'))).toBe(true));
  it('Pilates Reformer Center 85.51Z → Bien-être', () => expect(be().match?.(naf('Pilates Reformer Center'))).toBe(true));
  it('Coach sportif Jean Dupont 85.51Z → Bien-être', () => expect(be().match?.(naf('Coach sportif Jean Dupont'))).toBe(true));
  it('Fitness Club Centre 85.51Z → Bien-être', () => expect(be().match?.(naf('Fitness Club Centre'))).toBe(true));

  // Exclusions : le mot-clé ne réintègre PLUS un cas exclu/ambigu par le moteur.
  it('Fitness Boxe Academy 85.51Z → PAS Bien-être (exclu « boxe », malgré « fitness »)', () => expect(be().match?.(naf('Fitness Boxe Academy'))).toBe(false));
  it('O Tennis Academy 85.51Z → PAS Bien-être', () => expect(be().match?.(naf('O Tennis Academy'))).toBe(false));
  it('CREPS 85.51Z sans signal → PAS Bien-être (ambigu non forcé)', () => expect(be().match?.(naf('CREPS'))).toBe(false));

  // Non-régression : sous-catégories historiques via NAF spécifique ou texte hors 85.51Z.
  it('Coiffure 96.02A → Bien-être (NAF, inchangé)', () => expect(be().match?.(merchant({ name: 'Salon X', nafCode: '96.02A' } as Partial<Merchant>))).toBe(true));
  it('Institut de beauté 96.02B → Bien-être', () => expect(be().match?.(merchant({ name: 'Institut Y', nafCode: '96.02B' } as Partial<Merchant>))).toBe(true));
  it('Spa 96.04Z → Bien-être', () => expect(be().match?.(merchant({ name: 'Spa Z', nafCode: '96.04Z' } as Partial<Merchant>))).toBe(true));
  it('Naturopathie (nom, sans NAF) → Bien-être (fallback texte historique préservé)', () => expect(be().match?.(merchant({ name: 'Cabinet de naturopathie Sainte-Anne' }))).toBe(true));
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
