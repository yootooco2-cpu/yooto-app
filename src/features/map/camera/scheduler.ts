/**
 * Camera Scheduler — LE CHEF D'ORCHESTRE. Il ne calcule aucun plan, ne connaît PAS Mapbox. Il
 * reçoit des `CameraPlan` et décide seulement : **maintenant · plus tard · jamais**. PUR :
 * l'exécution passe par un `CameraDriver` injecté (l'Adapter Mapbox arrive en C4), le temps par un
 * `SchedulerTimer` injecté → 100 % testable sans SDK ni horloge réelle. → docs/map/CAMERA.md · ADR-008.
 *
 * Règles absolues encodées :
 *  - **L'utilisateur gagne toujours** : pendant un geste, aucune caméra auto ; rien ne re-part après.
 *  - **Anti-spam** : fenêtre de coalescing (fusion des demandes quasi simultanées) + dead-zone
 *    (on n'exécute pas un mouvement inutile). « La meilleure animation est celle qu'on ne lance pas. »
 *  - **Interruption** : un geste arrête immédiatement tout mouvement non essentiel.
 *  - **Reduce-motion** : le Scheduler force le `jump`, sans que les couches supérieures s'en soucient.
 */
import { CAMERA_COALESCE_MS, CAMERA_DEAD_ZONE } from '@/design/tokens/camera';

import type { CameraDriver } from './driver';
import { haversineMeters } from './geo';
import type { CameraPlan, CameraPose, CameraPriority } from './types';

/** Port temporel injecté (setTimeout réel en prod, faux horloge en test). */
export interface SchedulerTimer {
  /** Planifie `cb` après `delayMs` ; renvoie une fonction d'annulation. */
  setTimer(delayMs: number, cb: () => void): () => void;
}

/** Machine à états — simple, lisible, testable. */
export type SchedulerState =
  | 'idle'
  | 'preparing' // fenêtre de coalescing (fusion) avant exécution
  | 'running'
  | 'waiting' // une anim tourne, un plan de moindre priorité attend
  | 'interrupted' // geste utilisateur : mouvement arrêté
  | 'completed'
  | 'cancelled'; // supersédé par un plan de priorité ≥

/** Décision immédiate rendue par `submit`. */
export type SubmitOutcome =
  | 'accepted' // mis en fenêtre de coalescing
  | 'merged' // fusionné avec une demande en attente
  | 'queued' // mis en file derrière l'anim en cours
  | 'preempt' // a interrompu et remplacé l'anim en cours (priorité ≥)
  | 'ignored'; // rejeté (geste utilisateur, ou plus faible que la file)

export interface SchedulerConfig {
  reduceMotion?: boolean;
  coalesceMs?: number;
  deadZone?: { centerMeters: number; zoom: number; pitch: number; bearing: number };
}

/** Rang numérique des priorités : l'utilisateur est absolu. */
const RANK: Record<CameraPriority, number> = { user: 3, explicit: 2, navigation: 1, auto: 0 };

export class CameraScheduler {
  private _state: SchedulerState = 'idle';
  private pending: CameraPlan | null = null; // en coalescing
  private cancelPending: (() => void) | null = null;
  private running: CameraPlan | null = null;
  private queued: CameraPlan | null = null; // une seule place (le meilleur)
  private userInteracting = false;
  /** Jeton d'exécution : invalide les callbacks `onDone` obsolètes (préemption/stop). */
  private runToken = 0;

  private readonly coalesceMs: number;
  private readonly deadZone: NonNullable<SchedulerConfig['deadZone']>;
  private reduceMotion: boolean;

  constructor(
    private readonly driver: CameraDriver,
    private readonly timer: SchedulerTimer,
    config: SchedulerConfig = {},
  ) {
    this.coalesceMs = config.coalesceMs ?? CAMERA_COALESCE_MS;
    this.deadZone = config.deadZone ?? CAMERA_DEAD_ZONE;
    this.reduceMotion = config.reduceMotion ?? false;
  }

  get state(): SchedulerState {
    return this._state;
  }

  /** Bascule reduce-motion à chaud (préférence système). */
  setReduceMotion(value: boolean): void {
    this.reduceMotion = value;
  }

  /** Soumet un plan. Décide immédiatement ; l'exécution réelle peut être différée/fusionnée/annulée. */
  submit(plan: CameraPlan): SubmitOutcome {
    // L'utilisateur gagne toujours : pendant un geste, aucune caméra automatique.
    if (this.userInteracting) return 'ignored';

    const p = this.coerceReduceMotion(plan);

    if (this.running) {
      // Priorité ≥ courante → préemption immédiate (un seul mouvement, pas de rebond).
      if (RANK[p.priority] >= RANK[this.running.priority]) {
        this.cancelRunning('cancelled');
        this.queued = null;
        this.startRun(p);
        return 'preempt';
      }
      // Plus faible → on garde le MEILLEUR en file (une seule place). Sinon on ignore.
      if (!this.queued || RANK[p.priority] > RANK[this.queued.priority]) {
        this.queued = p;
        this._state = 'waiting';
        return 'queued';
      }
      return 'ignored';
    }

    // Rien ne tourne : fenêtre de coalescing (anti-spam / fusion des demandes rapprochées).
    if (this.pending) {
      this.pending = this.pickWinner(this.pending, p); // fusion
      return 'merged';
    }
    this.pending = p;
    this._state = 'preparing';
    this.cancelPending = this.timer.setTimer(this.coalesceMs, () => this.flush());
    return 'accepted';
  }

  /** Geste utilisateur : interrompt tout, ne relance rien (la caméra ne lutte jamais). */
  notifyGestureStart(): void {
    if (this.cancelPending) {
      this.cancelPending();
      this.cancelPending = null;
    }
    this.pending = null;
    this.queued = null;
    this.cancelRunning('interrupted');
    this.userInteracting = true;
    this._state = 'idle';
  }

  /** Fin du geste : la caméra RESTE où l'utilisateur l'a laissée (aucun snap-back). */
  notifyGestureEnd(): void {
    this.userInteracting = false;
    this._state = 'idle';
  }

  // ── interne ────────────────────────────────────────────────────────────────────────────────

  /** Égalité de priorité → le plus récent gagne (dernière intention de l'utilisateur/système). */
  private pickWinner(a: CameraPlan, b: CameraPlan): CameraPlan {
    return RANK[b.priority] >= RANK[a.priority] ? b : a;
  }

  private flush(): void {
    this.cancelPending = null;
    const plan = this.pending;
    this.pending = null;
    if (!plan) {
      this._state = this.running ? 'running' : 'idle';
      return;
    }
    if (this.userInteracting) {
      this._state = 'idle';
      return; // ignoré : l'utilisateur a pris la main pendant la fenêtre
    }
    if (this.shouldSkip(plan)) {
      this._state = this.running ? 'running' : 'idle';
      return; // dead-zone : le meilleur mouvement est celui qu'on ne lance pas
    }
    this.startRun(plan);
  }

  private startRun(plan: CameraPlan): void {
    this._state = 'running';
    this.running = plan;
    const token = ++this.runToken;
    const onDone = (): void => {
      if (token === this.runToken) this.onDone(); // ignore un onDone obsolète (préempté/stoppé)
    };
    // Dispatch MÉCANIQUE de la primitive vers le port (aucune décision UX). Le nudge est une ease.
    switch (plan.motion.primitive) {
      case 'jump':
        this.driver.jump(plan, onDone);
        break;
      case 'fly':
        this.driver.fly(plan, onDone);
        break;
      case 'ease':
      case 'nudge':
        this.driver.ease(plan, onDone);
        break;
    }
  }

  private onDone(): void {
    this.running = null;
    this._state = 'completed';
    if (this.queued) {
      const q = this.queued;
      this.queued = null;
      if (!this.userInteracting && !this.shouldSkip(q)) {
        this.startRun(q); // la file s'exécute → pas de starvation
        return;
      }
    }
    this._state = 'idle';
  }

  private cancelRunning(reason: 'cancelled' | 'interrupted'): void {
    if (this.running) {
      this.runToken++; // invalide l'onDone en vol
      this.driver.stop();
      this.running = null;
      this._state = reason;
    }
  }

  /** Dead-zone : on ignore un mouvement dont la cible ≈ la pose courante. Le `nudge` en est exempt. */
  private shouldSkip(plan: CameraPlan): boolean {
    if (plan.motion.primitive === 'nudge') return false; // déjà minimal & délibéré (padding sheet)
    return this.withinDeadZone(this.driver.getPose(), plan.pose);
  }

  private withinDeadZone(a: CameraPose, b: CameraPose): boolean {
    return (
      haversineMeters(a.center, b.center) < this.deadZone.centerMeters &&
      Math.abs(a.zoom - b.zoom) < this.deadZone.zoom &&
      Math.abs(a.pitch - b.pitch) < this.deadZone.pitch &&
      Math.abs(a.bearing - b.bearing) < this.deadZone.bearing
    );
  }

  /** Reduce-motion : le Scheduler force le jump (pose à plat), transparent pour les couches hautes. */
  private coerceReduceMotion(plan: CameraPlan): CameraPlan {
    if (!this.reduceMotion || plan.motion.primitive === 'jump') return plan;
    return {
      ...plan,
      pose: { ...plan.pose, pitch: 0 },
      motion: { primitive: 'jump', durationMs: 0 },
    };
  }
}
