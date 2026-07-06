import { deriveLaunchStatus, milestoneKey, readBoolFlag } from './launchLogic';

describe('launchLogic (pur, sans logique métier)', () => {
  it('deriveLaunchStatus : jamais vu → first-launch, déjà vu → returning', () => {
    expect(deriveLaunchStatus(false)).toBe('first-launch');
    expect(deriveLaunchStatus(true)).toBe('returning');
  });

  it('milestoneKey : clé versionnée et générique (aucun nom métier codé en dur)', () => {
    expect(milestoneKey('onboarding')).toBe('yootoo.milestone.onboarding.v1');
    expect(milestoneKey('whatsnew-2')).toBe('yootoo.milestone.whatsnew-2.v1');
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
