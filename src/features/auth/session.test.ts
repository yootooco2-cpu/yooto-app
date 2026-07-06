import { deriveIdentity, deriveSessionState, SIGNED_OUT } from './session';

describe('deriveSessionState', () => {
  it('null/undefined → signed-out', () => {
    expect(deriveSessionState(null)).toEqual(SIGNED_OUT);
    expect(deriveSessionState(undefined)).toEqual(SIGNED_OUT);
    expect(deriveSessionState({ user: null })).toEqual(SIGNED_OUT);
  });

  it('utilisateur anonyme → anonymous (sans identité)', () => {
    expect(deriveSessionState({ user: { id: 'u1', is_anonymous: true } })).toEqual({
      status: 'anonymous',
      userId: 'u1',
      isAnonymous: true,
      identity: null,
    });
  });

  it('utilisateur lié → authenticated (is_anonymous absent ou false)', () => {
    expect(deriveSessionState({ user: { id: 'u2', is_anonymous: false } }).status).toBe('authenticated');
    expect(deriveSessionState({ user: { id: 'u3' } }).status).toBe('authenticated');
  });
});

describe('deriveIdentity (métadonnées fournisseur)', () => {
  it('Google : full_name + email + avatar_url', () => {
    expect(
      deriveIdentity({
        id: 'g1',
        email: 'marie@gmail.com',
        user_metadata: { full_name: 'Marie Curie', avatar_url: 'https://x/p.jpg', name: 'Marie C' },
      }),
    ).toEqual({ displayName: 'Marie Curie', email: 'marie@gmail.com', avatarUrl: 'https://x/p.jpg' });
  });

  it('repli sur name puis picture', () => {
    const id = deriveIdentity({ id: 'g2', email: 'a@b.co', user_metadata: { name: 'Alan', picture: 'https://x/q.png' } });
    expect(id.displayName).toBe('Alan');
    expect(id.avatarUrl).toBe('https://x/q.png');
  });

  it('compose prénom + nom quand full_name absent', () => {
    const id = deriveIdentity({ id: 'g3', user_metadata: { given_name: 'Ada', family_name: 'Lovelace' } });
    expect(id.displayName).toBe('Ada Lovelace');
  });

  it('repli ultime sur la partie locale de l’email', () => {
    const id = deriveIdentity({ id: 'g4', email: 'grace@navy.mil', user_metadata: {} });
    expect(id.displayName).toBe('grace');
    expect(id.email).toBe('grace@navy.mil');
    expect(id.avatarUrl).toBeNull();
  });

  it('sans métadonnées ni email → tout null', () => {
    expect(deriveIdentity({ id: 'g5' })).toEqual({ displayName: null, email: null, avatarUrl: null });
  });
});
