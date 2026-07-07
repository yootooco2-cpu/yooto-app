import { SUPPORT_EMAIL, supportMailtoUrl } from './support';

describe('support contact', () => {
  it('expose l’adresse de support officielle', () => {
    expect(SUPPORT_EMAIL).toBe('contact@yootoo.cloud');
  });

  it('construit un lien mailto valide', () => {
    expect(supportMailtoUrl()).toBe('mailto:contact@yootoo.cloud');
  });
});
