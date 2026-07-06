import { deriveSessionState, SIGNED_OUT } from './session';

describe('deriveSessionState', () => {
  it('null/undefined → signed-out', () => {
    expect(deriveSessionState(null)).toEqual(SIGNED_OUT);
    expect(deriveSessionState(undefined)).toEqual(SIGNED_OUT);
    expect(deriveSessionState({ user: null })).toEqual(SIGNED_OUT);
  });

  it('utilisateur anonyme → anonymous', () => {
    expect(deriveSessionState({ user: { id: 'u1', is_anonymous: true } })).toEqual({
      status: 'anonymous',
      userId: 'u1',
      isAnonymous: true,
    });
  });

  it('utilisateur lié → authenticated (is_anonymous absent ou false)', () => {
    expect(deriveSessionState({ user: { id: 'u2', is_anonymous: false } })).toEqual({
      status: 'authenticated',
      userId: 'u2',
      isAnonymous: false,
    });
    expect(deriveSessionState({ user: { id: 'u3' } }).status).toBe('authenticated');
  });
});
