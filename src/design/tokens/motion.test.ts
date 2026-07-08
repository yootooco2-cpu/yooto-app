import { motion } from './motion';

describe('motion tokens', () => {
  it('classe les durées du plus vif au plus ample', () => {
    expect(motion.duration.fast).toBeLessThan(motion.duration.base);
    expect(motion.duration.base).toBeLessThan(motion.duration.slow);
  });

  it('garde toutes les durées positives et brèves (< 500ms)', () => {
    for (const d of Object.values(motion.duration)) {
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(500);
    }
  });

  it('applique un enfoncement subtil (échelle entre 0.9 et 1)', () => {
    expect(motion.pressScale).toBeGreaterThan(0.9);
    expect(motion.pressScale).toBeLessThan(1);
  });

  it('définit des ressorts fermes et peu rebondissants', () => {
    for (const s of [motion.spring.sheet, motion.spring.press]) {
      expect(s.damping).toBeGreaterThan(0);
      expect(s.stiffness).toBeGreaterThan(0);
      expect(s.mass).toBeGreaterThan(0);
    }
  });
});
