import type { Map as MapboxMap } from 'mapbox-gl';

import { publishLightPhase } from './lightPhaseStore';

/**
 * CYCLE SOLAIRE — la carte vit avec la vraie journée de l'utilisateur.
 *
 * Le `lightPreset` du basemap Mapbox Standard suit le VRAI lever/coucher du
 * soleil (position + saison), pas des tranches horaires arbitraires : le
 * `dusk` tombe au coucher réel, en été comme en hiver (Lot A2, validé).
 *
 * - Astronomie : équation du lever du soleil (NOAA simplifiée, ±2-3 min) —
 *   calcul pur, zéro dépendance, testé unitairement.
 * - Position : le CENTRE de la carte (aucune permission requise ; pour une
 *   app de découverte locale, centre ≈ territoire de l'utilisateur).
 * - Application : uniquement quand la phase change (aucun churn GPU) ;
 *   Standard anime nativement la transition entre presets.
 * - Le thème (`faded`) n'est jamais touché — seul le preset varie.
 * - Désactivable : `EXPO_PUBLIC_MAP_LIGHT_CYCLE=off`.
 */

export type SolarPreset = 'dawn' | 'day' | 'dusk' | 'night';

/** Demi-fenêtre de transition autour du lever/coucher (dawn et dusk durent ~1 h 30). */
const PHASE_HALF_WINDOW_MS = 45 * 60 * 1000;
/** Réévaluation périodique (une bascule ne peut se rater que de ~1 min). */
const EVALUATE_EVERY_MS = 60 * 1000;

const DEG = Math.PI / 180;

/** Timestamp epoch (ms) → jour julien. */
const toJulian = (ms: number): number => ms / 86400000 + 2440587.5;
/** Jour julien → timestamp epoch (ms). */
const fromJulian = (j: number): number => (j - 2440587.5) * 86400000;

/**
 * Lever/coucher du soleil (epoch ms) pour l'instant et la position donnés.
 * `null` en régime polaire (jour ou nuit sans fin) — l'appelant choisit un repli.
 */
export function solarEvents(
  nowMs: number,
  latitude: number,
  longitude: number,
): { sunriseMs: number; sunsetMs: number } | null {
  const lw = -longitude; // convention « ouest positif » de l'équation
  const phi = latitude * DEG;

  const n = Math.round(toJulian(nowMs) - 2451545.0009 - lw / 360);
  const jStar = 2451545.0009 + lw / 360 + n; // midi solaire moyen
  const M = ((357.5291 + 0.98560028 * (jStar - 2451545)) % 360) * DEG; // anomalie moyenne
  const C = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M);
  const lambda = ((M / DEG + C + 180 + 102.9372) % 360) * DEG; // longitude écliptique
  const jTransit = jStar + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * lambda);
  const sinDelta = Math.sin(lambda) * Math.sin(23.4397 * DEG); // déclinaison solaire

  // Angle horaire au lever/coucher (réfraction + disque solaire : -0.833°).
  const cosOmega =
    (Math.sin(-0.833 * DEG) - Math.sin(phi) * sinDelta) /
    (Math.cos(phi) * Math.sqrt(1 - sinDelta * sinDelta));
  if (cosOmega > 1 || cosOmega < -1) return null; // polaire

  const omega = Math.acos(cosOmega) / DEG / 360;
  return { sunriseMs: fromJulian(jTransit - omega), sunsetMs: fromJulian(jTransit + omega) };
}

/** Phase lumineuse YOOTOO pour un instant/position — repli `day` (lisibilité d'abord). */
export function presetForTime(nowMs: number, latitude: number, longitude: number): SolarPreset {
  const events = solarEvents(nowMs, latitude, longitude);
  if (!events) return 'day';
  const { sunriseMs, sunsetMs } = events;
  if (nowMs < sunriseMs - PHASE_HALF_WINDOW_MS) return 'night';
  if (nowMs < sunriseMs + PHASE_HALF_WINDOW_MS) return 'dawn';
  if (nowMs < sunsetMs - PHASE_HALF_WINDOW_MS) return 'day';
  if (nowMs < sunsetMs + PHASE_HALF_WINDOW_MS) return 'dusk';
  return 'night';
}

/**
 * Installe le cycle sur la carte : évalue immédiatement puis toutes les minutes,
 * n'applique que les changements de phase. Retourne un dispose (aussi auto-appelé
 * sur `map.remove()`).
 */
export function installSolarLightCycle(map: MapboxMap): () => void {
  let current: SolarPreset | null = null;

  const evaluate = () => {
    try {
      const c = map.getCenter();
      const next = presetForTime(Date.now(), c.lat, c.lng);
      if (next === current) return;
      current = next;
      map.setConfigProperty('basemap', 'lightPreset', next);
      publishLightPhase(next);
      if (process.env.NODE_ENV !== 'production') {
         
        console.info(`[YOOTOO/map] cycle solaire → ${next}`);
      }
    } catch (err) {
       
      console.error('[YOOTOO/map] cycle solaire error', err);
    }
  };

  evaluate();
  const interval = setInterval(evaluate, EVALUATE_EVERY_MS);
  const dispose = () => clearInterval(interval);
  map.on('remove', dispose);
  return dispose;
}
