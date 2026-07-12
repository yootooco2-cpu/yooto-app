/**
 * Moteur Hierarchical Multi-Evidence — tests unitaires + RÉFÉRENTIEL MÉTIER PERMANENT.
 * Les 9 cas obligatoires (GATE 1/WS2) sont le jeu de validation officiel : toute évolution
 * future doit produire exactement ces résultats, sauf modification explicite de la doctrine.
 */
import { classifyMerchant } from './engine';
import type { Merchant } from '../types';

const m = (over: Partial<Merchant>): Merchant =>
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

describe('Référentiel métier permanent (cas obligatoires)', () => {
  it('Animalis (fixture RÉELLE, avec le libellé Google erroné) — contradiction intra-niveau → QUARANTAINE (v1.1)', () => {
    // La falsification a montré que la fixture v1.0 omettait rawCategory='florist' (leçon Loi 8).
    const d = classifyMerchant(m({ name: 'Animalis Nimes', nafCode: '47.76Z', rawCategory: 'florist' } as Partial<Merchant>));
    expect(d.status).toBe('QUARANTAINE');
    expect(d.source).toBe('contradiction intra-niveau');
    expect(d.evidence.join(' ')).toContain('florist');
    expect(d.evidence.join(' ')).toContain('animal');
  });

  it('GARDE anti-sur-prudence : 47.76Z + florist SANS indice contradictoire → fleuristes, HIGH', () => {
    const d = classifyMerchant(m({ name: 'Au Nom de la Rose', nafCode: '47.76Z', rawCategory: 'florist' } as Partial<Merchant>));
    expect(d.category).toBe('fleuristes');
    expect(d.confidence).toBe('HIGH');
  });

  it('Animalis sans libellé Google (texte seul, non contredit) → animaleries, HIGH', () => {
    const d = classifyMerchant(m({ name: 'Animalis Nimes', nafCode: '47.76Z' } as Partial<Merchant>));
    expect(d.category).toBe('animaleries');
    expect(d.confidence).toBe('HIGH');
  });

  it('La Cagette — SAS coopérative invisible au NAF : le flag ESS (preuve 1a) prime → cooperatives, HIGH', () => {
    const d = classifyMerchant(
      m({ name: 'La Cagette de Montpellier', nafCode: '47.11B', rawCategory: 'grocery_store' } as Partial<Merchant>),
      { estEss: true },
    );
    expect(d.category).toBe('cooperatives');
    expect(d.confidence).toBe('HIGH');
    expect(d.source).toBe('officiel (ESS)');
    expect(d.evidence.join(' ')).toContain('47.11B'); // l'activité reste en trace
  });

  it('Minit — NAF 95.29Z → reparation-seconde-main, HIGH ; le réseau relève du SPT, pas du moteur', () => {
    const d = classifyMerchant(m({ name: 'Minit France', nafCode: '95.29Z' } as Partial<Merchant>));
    expect(d.category).toBe('reparation-seconde-main');
    expect(d.confidence).toBe('HIGH');
  });

  it('Domaine de Verchant — NAF 01.21Z → vignerons-domaines, HIGH', () => {
    const d = classifyMerchant(m({ name: 'Domaine de Verchant', nafCode: '01.21Z' } as Partial<Merchant>));
    expect(d.category).toBe('vignerons-domaines');
    expect(d.confidence).toBe('HIGH');
    expect(d.evidence.join(' ')).toContain('01.21Z');
  });

  it('Caveau viticole — NAF 11.02B + Google liquor_store (même famille) : le NAF mène, divergence journalisée, HIGH', () => {
    const d = classifyMerchant(m({ name: 'Caveau des Vignerons', nafCode: '11.02B', rawCategory: 'liquor_store' } as Partial<Merchant>));
    expect(d.category).toBe('vignerons-domaines');
    expect(d.confidence).toBe('HIGH');
    expect(d.explanation).toContain('diverge dans la MÊME famille');
  });

  it('Bureau administratif viticole — NAF 01.21Z + Google corporate_office → QUARANTAINE (contradiction commerce/bureau)', () => {
    const d = classifyMerchant(m({ name: 'SCEA Gestion Viticole', nafCode: '01.21Z', rawCategory: 'corporate_office' } as Partial<Merchant>));
    expect(d.status).toBe('QUARANTAINE');
    expect(d.category).toBeNull();
    expect(d.source).toBe('contradiction NAF/Google');
    expect(d.explanation).toContain('accueil du public non prouvé');
  });

  it("Bus Montpellier — aucun NAF, aucun signal spécifique : LOW + QUARANTAINE (la correspondance lexicale interdite ne le classe plus)", () => {
    const d = classifyMerchant(m({ name: 'Bus Montpellier', rawCategory: 'local_business' } as Partial<Merchant>));
    expect(d.status).toBe('QUARANTAINE');
    expect(d.confidence).toBe('LOW');
    expect(d.category).toBeNull();
  });

  it('Cheese Nan — NAF 56.10C cohérent → restaurants, HIGH ; la pertinence (hors-mission) reste le domaine du SPT', () => {
    const d = classifyMerchant(m({ name: 'Cheese Nan Lunel', nafCode: '56.10C' } as Partial<Merchant>));
    expect(d.category).toBe('restaurants');
    expect(d.confidence).toBe('HIGH');
    // Le moteur classifie ; il ne décide JAMAIS de la publication.
    expect(d.status).toBe('CLASSIFIED');
  });

  it('Magasin Latino — NAF 47.11B + Google générique (« store ») : le générique n’est pas une preuve → epiceries, HIGH', () => {
    const d = classifyMerchant(m({ name: 'Magasin Latino', nafCode: '47.11B', rawCategory: 'store' } as Partial<Merchant>));
    expect(d.category).toBe('epiceries');
    expect(d.confidence).toBe('HIGH');
    expect(d.source).toBe('NAF');
  });
});

describe('Invariants du moteur', () => {
  it('aucune fiche ne devient invisible : sans NAF ni signal → LOW + QUARANTAINE, jamais un rejet', () => {
    const d = classifyMerchant(m({ name: 'Établissement inconnu' }));
    expect(d.status).toBe('QUARANTAINE');
    expect(d.confidence).toBe('LOW');
    expect(d.explanation).toContain('le silence ne punit pas');
  });

  it('NAF absent + Google spécifique → MEDIUM (le moteur descend d’un niveau, il n’abandonne pas)', () => {
    const d = classifyMerchant(m({ name: 'Le Jardin des Fleurs', rawCategory: 'florist' } as Partial<Merchant>));
    expect(d.category).toBe('fleuristes');
    expect(d.confidence).toBe('MEDIUM');
    expect(d.source).toBe('Google');
  });

  it('NAF absent + texte seul → MEDIUM par radical en début de mot (jamais de sous-chaîne)', () => {
    const d = classifyMerchant(m({ name: 'Vignoble des Cévennes' }));
    expect(d.category).toBe('vignerons-domaines');
    expect(d.confidence).toBe('MEDIUM');
    expect(d.source).toBe('texte');
  });

  it('contradiction inter-familles → QUARANTAINE, aucun niveau ne gagne, les deux preuves journalisées', () => {
    const d = classifyMerchant(m({ name: 'X', nafCode: '47.22Z', rawCategory: 'yoga_studio' } as Partial<Merchant>));
    // Google yoga → bienetre (via texte ? non : rawCategory inconnue du registre → pas de preuve).
    // On force une vraie contradiction : boucherie NAF vs librairie Google.
    const d2 = classifyMerchant(m({ name: 'X', nafCode: '47.22Z', rawCategory: 'book_store' } as Partial<Merchant>));
    expect(d2.status).toBe('QUARANTAINE');
    expect(d2.evidence.length).toBe(2);
    expect(d.category === null || d.status === 'CLASSIFIED').toBe(true); // pas de crash, décision rendue
  });

  it('NAF composite SEUL → QUARANTAINE (jamais une devinette)', () => {
    const d = classifyMerchant(m({ name: 'SARL Duval', nafCode: '47.76Z' } as Partial<Merchant>));
    expect(d.status).toBe('QUARANTAINE');
    expect(d.source).toBe('NAF composite seul');
  });

  it('deux indices textuels de catégories différentes = ambiguïté = aucune preuve', () => {
    const d = classifyMerchant(m({ name: 'Boucherie Fromagerie du Centre' }));
    expect(d.status).toBe('QUARANTAINE'); // le texte ne tranche pas, il révèle l'ambiguïté
  });

  it('NAF non cartographié (84.11Z mairie) + rien : LOW + QUARANTAINE avec trace du code', () => {
    const d = classifyMerchant(m({ name: 'Mairie du Vigan', nafCode: '84.11Z' } as Partial<Merchant>));
    expect(d.status).toBe('QUARANTAINE');
    expect(d.evidence.join(' ')).toContain('84.11Z');
  });

  it("v1.1 sans NAF : divergence 2a/2b INTER-familles → quarantaine ; INTRA-famille → raffinement, 2a mène (garde Caveau)", () => {
    // Inter-familles : Google fleuriste (nature) vs texte boucher (alimentation) → revue.
    const inter = classifyMerchant(m({ name: 'Boucherie des Roses', rawCategory: 'florist' } as Partial<Merchant>));
    expect(inter.status).toBe('QUARANTAINE');
    expect(inter.source).toBe('contradiction intra-niveau');
    // Intra-famille : Google épicerie vs texte primeur (même famille alimentation) → MEDIUM, pas de sur-prudence.
    const intra = classifyMerchant(m({ name: 'Primeur du Marché', rawCategory: 'grocery_store' } as Partial<Merchant>));
    expect(intra.status).toBe('CLASSIFIED');
    expect(intra.confidence).toBe('MEDIUM');
  });

  it('reproductibilité : deux appels identiques → décisions strictement égales', () => {
    const input = m({ name: 'Domaine de Verchant', nafCode: '01.21Z' } as Partial<Merchant>);
    expect(classifyMerchant(input)).toEqual(classifyMerchant(input));
  });
});

describe('Extension périmètre 12/07 — rattachement aux catégories EXISTANTES uniquement', () => {
  it('47.62Z (presse-papeterie) → Librairies, HIGH par NAF', () => {
    const d = classifyMerchant(m({ name: 'Maison de la Presse', nafCode: '47.62Z' } as Partial<Merchant>));
    expect(d.category).toBe('librairies');
    expect(d.confidence).toBe('HIGH');
  });

  it('47.63Z (disques) → Disquaires', () => {
    const d = classifyMerchant(m({ name: 'Vinyle Shop', nafCode: '47.63Z' } as Partial<Merchant>));
    expect(d.category).toBe('disquaires');
  });

  it('47.77Z (bijouterie de détail) → Bijouterie & Joaillerie', () => {
    const d = classifyMerchant(m({ name: 'Bijouterie du Centre', nafCode: '47.77Z' } as Partial<Merchant>));
    expect(d.category).toBe('bijouterie-joaillerie');
  });

  it('47.64Z (sport, COMPOSITE) sans preuve niveau 2 → jamais résolu seul', () => {
    const d = classifyMerchant(m({ name: 'Espace Sport 2000', nafCode: '47.64Z' } as Partial<Merchant>));
    expect(d.status).toBe('QUARANTAINE');
  });

  it('47.64Z + preuve Google bicycle_store → Mobilité (composite résolu par niveau 2)', () => {
    const d = classifyMerchant(m({ name: 'Culture Vélo', nafCode: '47.64Z', rawCategory: 'bicycle_store' } as Partial<Merchant>));
    expect(d.category).toBe('mobilite'); // famille existante — les feuilles UNION raffinent par texte
    expect(d.status).not.toBe('QUARANTAINE');
  });
});
