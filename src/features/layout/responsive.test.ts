/// <reference types="jest" />
import { DESKTOP_BREAKPOINT, isDesktopWeb } from './responsive';

describe('isDesktopWeb', () => {
  it('accepte Web au-delà du breakpoint', () => {
    expect(isDesktopWeb('web', DESKTOP_BREAKPOINT)).toBe(true);
    expect(isDesktopWeb('web', 1440)).toBe(true);
    expect(isDesktopWeb('web', 2560)).toBe(true);
  });

  it('rejette Web en dessous du breakpoint (mobile-web, tablette)', () => {
    expect(isDesktopWeb('web', DESKTOP_BREAKPOINT - 1)).toBe(false);
    expect(isDesktopWeb('web', 768)).toBe(false);
    expect(isDesktopWeb('web', 375)).toBe(false);
  });

  it('rejette le natif quelle que soit la largeur', () => {
    expect(isDesktopWeb('ios', 2000)).toBe(false);
    expect(isDesktopWeb('android', 5000)).toBe(false);
  });

  it('inclut la borne exacte (>=)', () => {
    expect(isDesktopWeb('web', DESKTOP_BREAKPOINT)).toBe(true);
  });
});
