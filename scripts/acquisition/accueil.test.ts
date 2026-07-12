/**
 * Règle de classe « existence ≠ accueil » — tests GÉNÉRIQUES, aucun métier privilégié.
 */
import { hasIntrinsicReception, receptionEvidence } from './accueil';

describe('accueil intrinsèque (pipeline A — la nomenclature décrit un lieu public)', () => {
  it.each([
    ['47.76Z', 'fleuriste'], ['47.22Z', 'boucherie'], ['56.30Z', 'bar'],
    ['95.23Z', 'cordonnerie'], ['96.02B', 'institut'], ['55.10Z', 'hôtel'],
  ])('NAF %s (%s) → accueil prouvé par le code lui-même', (naf) => {
    expect(hasIntrinsicReception(naf)).toBe(true);
    expect(receptionEvidence({ naf, nom: 'X', enseignes: null, adresse: 'Y' }).proven).toBe(true);
  });

  it.each([
    ['01.21Z', 'viticulture'], ['01.49Z', 'élevage'], ['10.71A', 'boulangerie industrielle'],
    ['11.02B', 'vinification'], ['02.10Z', 'sylviculture'], ['46.34Z', 'commerce de gros'],
  ])('NAF %s (%s) → activité, pas un lieu : preuve indépendante requise', (naf) => {
    expect(hasIntrinsicReception(naf)).toBe(false);
  });
});

describe('preuve indépendante (pipeline B — production)', () => {
  it('exploitant domicilié sans aucune trace de lieu → NON prouvé, file d’enrichissement', () => {
    const v = receptionEvidence({ naf: '01.21Z', nom: 'FRANCOISE BARRIERE (PARES)', enseignes: null, adresse: '17 RUE MARCEAU 34000 MONTPELLIER' });
    expect(v.proven).toBe(false);
    expect(v.missing).toContain('enrichissement requis');
  });

  it("INVARIANT : l'identité commerciale (enseigne OU dénomination) seule ne démontre JAMAIS la localisation", () => {
    const enseigneSeule = receptionEvidence({ naf: '01.49Z', nom: 'ERIC RAMOS', enseignes: ['LA CHEVRERIE DU PIC'], adresse: '12 RUE DE LA REPUBLIQUE' });
    expect(enseigneSeule.proven).toBe(false);
    expect(enseigneSeule.missing).toContain('identité commerciale existe');
    const denomSeule = receptionEvidence({ naf: '01.21Z', nom: "MAS D'EMBOUYS", enseignes: null, adresse: '25 RUE X' });
    expect(denomSeule.proven).toBe(false);
    expect(denomSeule.missing).toContain('Pipeline B');
  });

  it("preuve LOCALISÉE : l'adresse ouvre sur le lieu d'exploitation → prouvé (château, ferme, rucher…)", () => {
    expect(receptionEvidence({ naf: '01.21Z', nom: 'PIERRE DE COLBERT', enseignes: null, adresse: 'CHATEAU FLAUGERGUES 1744 AVENUE ALBERT EINSTEIN' }).proven).toBe(true);
    expect(receptionEvidence({ naf: '01.41Z', nom: 'JEAN DUPONT', enseignes: null, adresse: 'FERME DES OLIVIERS ROUTE DE NIMES' }).proven).toBe(true);
    expect(receptionEvidence({ naf: '01.49Z', nom: 'ERIC RAMOS', enseignes: null, adresse: 'RUCHERS DU TRENTAL ROUTE DE GANGES' }).proven).toBe(true);
  });

  it('structures patrimoniales → jamais une identité, encore moins un lieu', () => {
    expect(receptionEvidence({ naf: '01.21Z', nom: 'GFA LA COSTE', enseignes: null, adresse: '36 BD DES ARCEAUX' }).proven).toBe(false);
    expect(receptionEvidence({ naf: '01.21Z', nom: 'INDIVISION BRISSAC', enseignes: null, adresse: '5 RUE DES HOSPICES' }).proven).toBe(false);
  });

  it('sémantique INSEE : boulangerie/pâtisserie/charcuterie artisanales = vente sur place (pipeline A)', () => {
    expect(hasIntrinsicReception('10.71C')).toBe(true);
    expect(hasIntrinsicReception('10.71D')).toBe(true);
    expect(hasIntrinsicReception('10.13B')).toBe(true);
    expect(hasIntrinsicReception('10.71A')).toBe(false); // industriel : pas un lieu public
    expect(hasIntrinsicReception('10.51C')).toBe(false); // fabrication fromagère : pipeline B
  });

  it("classe « odonyme de voirie » : le toponyme dans le nom de la RUE n'est pas un lieu-dit", () => {
    expect(receptionEvidence({ naf: '01.21Z', nom: 'JEAN MOLITOR', enseignes: null, adresse: '584 RUE DU MAS ROUGE 34000 MONTPELLIER' }).proven).toBe(false);
    expect(receptionEvidence({ naf: '01.21Z', nom: 'X', enseignes: null, adresse: '232 AVENUE DES MOULINS 34080' }).proven).toBe(false);
    // Le lieu-dit EN TÊTE d'adresse reste une preuve.
    expect(receptionEvidence({ naf: '01.21Z', nom: 'MARIE BACARESSE', enseignes: null, adresse: 'MAS DU TILLEUL 2982 ROUTE DE VAUGUIERES' }).proven).toBe(true);
  });

  it("classe « enseigne discordante » : le vocabulaire de bureau n'est pas un accueil de production", () => {
    expect(receptionEvidence({ naf: '01.21Z', nom: 'SARL PONT DU MIEL', enseignes: ['RAMBIER IMMOBILIER'], adresse: '232 AVENUE DES MOULINS' }).proven).toBe(false);
  });

  it("« CHEZ M. X » ouvre un domicile, pas un lieu d'exploitation ; CUMA = structure de moyens", () => {
    expect(receptionEvidence({ naf: '01.26Z', nom: 'CUMA OLEICOLE DU MAS DIEU', enseignes: null, adresse: 'CHEZ M BOSC JEAN-FRANCOIS 1001 RUE DE FONTCAUDE' }).proven).toBe(false);
  });
});
