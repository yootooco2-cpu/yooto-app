/**
 * Rendering Bridge (Mapbox) — la FRONTIÈRE, et le seul fichier de l'app qui parle à Mapbox pour la
 * caméra. Il implémente le port `CameraDriver` : il TRADUIT un `CameraPlan` en appels SDK, rien
 * d'autre. Volontairement le fichier le plus ennuyeux de la base : il ne réfléchit jamais.
 *
 * INTERDIT ICI : `if (intent)`, `if (mood)`, `if (priority)`, `if (merchant)`, `if (category)`,
 * tout Discovery, tout Scheduler, tout UX. L'intelligence est déjà ailleurs. Supprimer Mapbox
 * demain = réécrire CE fichier, et lui seul. → docs/map/CAMERA.md · ADR-009.
 */
import { CAMERA_EASING, type CameraEasingId } from '@/design/tokens/camera';
import type { CameraCapabilities, CameraDone, CameraDriver } from '@/features/map/camera';
import type { CameraMotion, CameraPadding, CameraPlan, CameraPose } from '@/features/map/camera';

// ── Surface SDK minimale (structurelle) — le vrai `mapbox-gl` Map la satisfait ─────────────────

/** Options de caméra passées au SDK (forme Mapbox : center = [lng, lat]). */
export interface MapboxCameraOptions {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  padding?: CameraPadding;
  duration?: number;
  easing?: (t: number) => number;
  curve?: number;
  speed?: number;
}

/** Sous-ensemble de l'API Mapbox utilisé — permet un mock trivial en test. */
export interface MapboxCameraApi {
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
  getPitch(): number;
  getBearing(): number;
  jumpTo(options: MapboxCameraOptions): void;
  easeTo(options: MapboxCameraOptions): void;
  flyTo(options: MapboxCameraOptions): void;
  stop(): void;
  once(type: 'moveend', listener: () => void): void;
}

/** Capacités de Mapbox GL JS (web). */
export const MAPBOX_CAPABILITIES: CameraCapabilities = {
  supportsPitch: true,
  supportsBearing: true,
  supportsTerrain: true,
  supportsGlobe: true,
  supportsFreeCamera: true,
};

// ── Traductions PURES (testables sans SDK) ─────────────────────────────────────────────────────

/** `CameraPose` → options SDK. Pure. Aucune décision : mappe les champs, un pour un. */
export function poseToCameraOptions(pose: CameraPose): MapboxCameraOptions {
  const options: MapboxCameraOptions = {
    center: [pose.center.longitude, pose.center.latitude],
    zoom: pose.zoom,
    pitch: pose.pitch,
    bearing: pose.bearing,
  };
  if (pose.padding !== undefined) options.padding = pose.padding;
  return options;
}

/** Parse `cubic-bezier(a, b, c, d)` → [a, b, c, d]. Pur. */
export function parseCubicBezier(css: string): [number, number, number, number] {
  const nums = css.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 1, nums[3] ?? 1];
}

/**
 * Construit la fonction d'easing (t∈[0,1] → valeur) d'une courbe cubic-bezier. Pur (Newton-Raphson).
 * Mapbox attend une FONCTION d'easing, pas une chaîne CSS : c'est la traduction du token vers le SDK.
 */
export function cubicBezierEasing(p1x: number, p1y: number, p2x: number, p2y: number): (t: number) => number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number): number => ((ay * t + by) * t + cy) * t;
  const derivativeX = (t: number): number => (3 * ax * t + 2 * bx) * t + cx;
  const solveX = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = derivativeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return t;
  };
  return (x: number): number => sampleY(solveX(Math.max(0, Math.min(1, x))));
}

/** Résout la fonction d'easing d'un token (ou `undefined` → easing par défaut du SDK). */
export function easingFor(id: CameraEasingId | undefined): ((t: number) => number) | undefined {
  if (!id) return undefined;
  return cubicBezierEasing(...parseCubicBezier(CAMERA_EASING[id]));
}

/** `CameraMotion` → options d'animation SDK (durée + easing ou courbe de vol). Pure. */
export function motionToAnimationOptions(motion: CameraMotion): Partial<MapboxCameraOptions> {
  if (motion.primitive === 'fly') {
    return { duration: motion.durationMs, curve: motion.fly?.curve, speed: motion.fly?.speed };
  }
  return { duration: motion.durationMs, easing: easingFor(motion.easing) };
}

// ── Le Bridge ──────────────────────────────────────────────────────────────────────────────────

/**
 * Implémentation Mapbox du `CameraDriver`. Un seul `onDone` actif ; un jeton invalide les fins de
 * mouvement obsolètes (après `stop`/nouvelle anim) → jamais de double `onDone`, jamais de fin
 * fantôme. Les erreurs SDK sont absorbées puis `onDone` est appelé (le pipeline ne se bloque jamais).
 */
export class MapboxCameraBridge implements CameraDriver {
  readonly capabilities = MAPBOX_CAPABILITIES;
  private activeDone: CameraDone | null = null;
  private gen = 0;

  constructor(private readonly map: MapboxCameraApi) {}

  getPose(): CameraPose {
    const c = this.map.getCenter();
    return {
      center: { latitude: c.lat, longitude: c.lng },
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      bearing: this.map.getBearing(),
    };
  }

  jump(plan: CameraPlan, onDone?: CameraDone): void {
    const gen = this.begin(onDone);
    this.safely(() => this.map.jumpTo(poseToCameraOptions(plan.pose)));
    // Le saut est synchrone : on notifie tout de suite (pas de `moveend` à attendre).
    this.settle(gen);
  }

  ease(plan: CameraPlan, onDone?: CameraDone): void {
    this.animate('easeTo', plan, onDone);
  }

  fly(plan: CameraPlan, onDone?: CameraDone): void {
    this.animate('flyTo', plan, onDone);
  }

  stop(): void {
    this.gen++; // invalide tout `onDone` en vol
    this.activeDone = null;
    this.safely(() => this.map.stop());
  }

  // ── interne ────────────────────────────────────────────────────────────────────────────────

  private animate(method: 'easeTo' | 'flyTo', plan: CameraPlan, onDone?: CameraDone): void {
    const gen = this.begin(onDone);
    const options: MapboxCameraOptions = {
      ...poseToCameraOptions(plan.pose),
      ...motionToAnimationOptions(plan.motion),
    };
    let threw = false;
    this.safely(() => this.map[method](options), () => {
      threw = true;
    });
    if (threw) {
      this.settle(gen); // erreur SDK : on débloque le pipeline
      return;
    }
    this.map.once('moveend', () => this.settle(gen));
  }

  private begin(onDone?: CameraDone): number {
    this.activeDone = onDone ?? null;
    return ++this.gen;
  }

  private settle(gen: number): void {
    if (gen !== this.gen) return; // supersédé / stoppé → fin obsolète ignorée
    const done = this.activeDone;
    this.activeDone = null;
    done?.();
  }

  private safely(run: () => void, onError?: () => void): void {
    try {
      run();
    } catch {
      // Le Bridge ne laisse jamais une erreur SDK remonter dans l'app.
      onError?.();
    }
  }
}
