import { buildMerchantTemplate, MERCHANT_SLOTS, type ChatMerchant } from './merchantContent';

const mk = (category: string, name = 'Chez Marie'): ChatMerchant => ({ id: 'm1', name, category, photo: 'p' });

describe('buildMerchantTemplate', () => {
  it('injecte le nom du commerce dans les textes', () => {
    const t = buildMerchantTemplate(mk('restaurant', 'Le Petit Bistrot'), 0);
    expect(t.title).toContain('Le Petit Bistrot');
    expect(t.discussionTitle).toContain('Le Petit Bistrot');
    expect(t.dmFromUser).toContain('Le Petit Bistrot');
  });

  it('choisit un contenu cohérent avec la catégorie', () => {
    expect(buildMerchantTemplate(mk('producer'), 0).emoji).toBe('🥕');
    expect(buildMerchantTemplate(mk('restaurant'), 0).emoji).toBe('🍽️');
    expect(buildMerchantTemplate(mk('producer'), 0).chatCategory).toBe('producteurs');
  });

  it('retombe sur « service » pour une catégorie inconnue', () => {
    expect(buildMerchantTemplate(mk('inconnue'), 0).emoji).toBe('✨');
  });

  it('varie le titre selon le variant (évite la répétition)', () => {
    const a = buildMerchantTemplate(mk('shop'), 0).title;
    const b = buildMerchantTemplate(mk('shop'), 1).title;
    expect(a).not.toBe(b);
  });

  it('expose 6 emplacements pro', () => {
    expect(MERCHANT_SLOTS.length).toBe(6);
  });
});
