import type { Map as MapboxMap } from 'mapbox-gl';

/**
 * LIGHT LAB (dev-only, web-only) — comparateur des ambiances officielles Mapbox Standard.
 *
 * Objectif : choisir la base visuelle YOOTOO parmi les 8 combinaisons natives
 * (4 `lightPreset` × 2 `theme`) SANS forker le style — uniquement les config
 * properties officielles du basemap Standard (`setConfigProperty`).
 *
 * Pilotage :
 *  - URL   : `?light=dawn|day|dusk|night` et `?theme=faded` (état initial) ;
 *  - Clavier (live, sans reload) : `L` cycle les presets, `T` bascule faded.
 *
 * AUCUN impact métier : ni clustering, ni marqueurs, ni caméra. Jamais monté
 * en production (gardé par NODE_ENV côté appelant).
 */

export const LIGHT_PRESETS = ['day', 'dawn', 'dusk', 'night'] as const;
export type LightPreset = (typeof LIGHT_PRESETS)[number];
export type BasemapTheme = 'default' | 'faded';

export interface LightLabState {
  lightPreset: LightPreset;
  theme: BasemapTheme;
}

export const LIGHT_LAB_DEFAULTS: LightLabState = { lightPreset: 'day', theme: 'default' };

/** État initial depuis l'URL (`?light=dusk&theme=faded`) — silencieusement défensif. */
export function readLightLabFromUrl(): LightLabState {
  if (typeof window === 'undefined') return { ...LIGHT_LAB_DEFAULTS };
  try {
    const params = new URLSearchParams(window.location.search);
    const light = params.get('light');
    const theme = params.get('theme');
    return {
      lightPreset: (LIGHT_PRESETS as readonly string[]).includes(light ?? '')
        ? (light as LightPreset)
        : LIGHT_LAB_DEFAULTS.lightPreset,
      theme: theme === 'faded' ? 'faded' : 'default',
    };
  } catch {
    return { ...LIGHT_LAB_DEFAULTS };
  }
}

const describe = (s: LightLabState): string =>
  `${s.lightPreset}${s.theme === 'faded' ? ' + faded' : ''}`;

/**
 * Installe le comparateur clavier sur la carte. Retourne un dispose ;
 * auto-nettoyé aussi sur `map.remove()` (événement `remove`).
 */
export function installLightPresetLab(map: MapboxMap, initial: LightLabState): () => void {
  const state: LightLabState = { ...initial };

  const apply = () => {
    try {
      map.setConfigProperty('basemap', 'lightPreset', state.lightPreset);
      map.setConfigProperty('basemap', 'theme', state.theme);
      // eslint-disable-next-line no-console
      console.info(`[YOOTOO/map] light lab → ${describe(state)}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[YOOTOO/map] light lab error', err);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    // Jamais pendant une saisie (recherche, chat…) ni avec modificateur.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'l' || e.key === 'L') {
      const i = LIGHT_PRESETS.indexOf(state.lightPreset);
      state.lightPreset = LIGHT_PRESETS[(i + 1) % LIGHT_PRESETS.length];
      apply();
    } else if (e.key === 't' || e.key === 'T') {
      state.theme = state.theme === 'faded' ? 'default' : 'faded';
      apply();
    }
  };

  window.addEventListener('keydown', onKey);
  const dispose = () => window.removeEventListener('keydown', onKey);
  map.on('remove', dispose);
  // eslint-disable-next-line no-console
  console.info(
    `[YOOTOO/map] light lab actif — ${describe(state)} · touche L = preset suivant, T = faded on/off · URL: ?light=dawn|day|dusk|night&theme=faded`,
  );
  return dispose;
}
