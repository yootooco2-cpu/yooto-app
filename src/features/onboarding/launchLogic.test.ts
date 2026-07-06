import { deriveLaunchStatus, readBoolFlag } from './launchLogic';

describe('launchLogic', () => {
  it('deriveLaunchStatus : jamais vu → first-launch, déjà vu → returning', () => {
    expect(deriveLaunchStatus(false)).toBe('first-launch');
    expect(deriveLaunchStatus(true)).toBe('returning');
  });

  it('readBoolFlag : accepte true / "true" / "1", sinon false', () => {
    expect(readBoolFlag(true)).toBe(true);
    expect(readBoolFlag('true')).toBe(true);
    expect(readBoolFlag('1')).toBe(true);
    expect(readBoolFlag('false')).toBe(false);
    expect(readBoolFlag(null)).toBe(false);
    expect(readBoolFlag(undefined)).toBe(false);
    expect(readBoolFlag('')).toBe(false);
  });
});
