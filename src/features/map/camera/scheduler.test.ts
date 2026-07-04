/// <reference types="jest" />
import {
  CameraScheduler,
  type CameraDriver,
  type CameraRunHandle,
  type SchedulerTimer,
} from './scheduler';
import type { CameraPlan, CameraPose, CameraPriority } from './types';

// ── Faux ports (aucun Mapbox, aucune horloge réelle) ─────────────────────────────────────────

class FakeTimer implements SchedulerTimer {
  private items: Array<{ id: number; at: number; cb: () => void }> = [];
  private t = 0;
  private seq = 0;
  setTimer(delayMs: number, cb: () => void): () => void {
    const id = ++this.seq;
    this.items.push({ id, at: this.t + delayMs, cb });
    return () => {
      this.items = this.items.filter((i) => i.id !== id);
    };
  }
  advance(ms: number): void {
    this.t += ms;
    const due = this.items.filter((i) => i.at <= this.t).sort((a, b) => a.at - b.at);
    this.items = this.items.filter((i) => i.at > this.t);
    for (const i of due) i.cb();
  }
}

class FakeDriver implements CameraDriver {
  runs: CameraPlan[] = [];
  cancels = 0;
  private done: (() => void) | null = null;
  pose: CameraPose = { center: { latitude: 0, longitude: 0 }, zoom: 2, pitch: 0, bearing: 0 };
  getPose(): CameraPose {
    return this.pose;
  }
  run(plan: CameraPlan, onDone: () => void): CameraRunHandle {
    this.runs.push(plan);
    this.done = onDone;
    return {
      cancel: () => {
        this.cancels++;
        this.done = null;
      },
    };
  }
  /** Termine naturellement l'anim en cours. */
  complete(): void {
    const d = this.done;
    this.done = null;
    d?.();
  }
  get lastRun(): CameraPlan {
    return this.runs[this.runs.length - 1];
  }
}

// ── Fabrique de plans ────────────────────────────────────────────────────────────────────────

const POSE: CameraPose = { center: { latitude: 43.61, longitude: 3.877 }, zoom: 16, pitch: 40, bearing: 0 };
const plan = (priority: CameraPriority, over: Partial<CameraPlan> = {}): CameraPlan => ({
  pose: POSE,
  motion: { primitive: 'ease', durationMs: 600, easing: 'decel' },
  priority,
  mood: 'focus',
  ...over,
});
const withZoom = (priority: CameraPriority, zoom: number): CameraPlan =>
  plan(priority, { pose: { ...POSE, zoom } });

const setup = (config = {}) => {
  const timer = new FakeTimer();
  const driver = new FakeDriver();
  const sched = new CameraScheduler(driver, timer, config);
  return { timer, driver, sched };
};

// ── Anti-spam / fusion ────────────────────────────────────────────────────────────────────────

describe('anti-spam : la caméra respire', () => {
  it('fusionne des demandes quasi simultanées → UN seul mouvement', () => {
    const { timer, driver, sched } = setup();
    sched.submit(withZoom('auto', 14));
    sched.submit(withZoom('auto', 15));
    sched.submit(withZoom('auto', 16));
    timer.advance(120);
    expect(driver.runs).toHaveLength(1);
    expect(driver.lastRun.pose.zoom).toBe(16); // égalité de priorité → le plus récent gagne
  });

  it('recentrage + focus rapprochés = un seul mouvement (le focus)', () => {
    const { timer, driver, sched } = setup();
    sched.submit(withZoom('explicit', 15)); // recentrage
    const outcome = sched.submit(withZoom('explicit', 17.5)); // focus commerce
    expect(outcome).toBe('merged');
    timer.advance(120);
    expect(driver.runs).toHaveLength(1);
    expect(driver.lastRun.pose.zoom).toBe(17.5);
  });

  it('dead-zone : ignore un mouvement dont la cible ≈ la pose courante', () => {
    const { timer, driver, sched } = setup();
    driver.pose = { ...POSE }; // déjà là
    sched.submit(plan('auto'));
    timer.advance(120);
    expect(driver.runs).toHaveLength(0); // le meilleur mouvement est celui qu'on ne lance pas
  });

  it('le nudge (padding sheet) échappe à la dead-zone', () => {
    const { timer, driver, sched } = setup();
    driver.pose = { ...POSE };
    sched.submit(plan('navigation', { motion: { primitive: 'nudge', durationMs: 350, easing: 'gentle' } }));
    timer.advance(120);
    expect(driver.runs).toHaveLength(1);
  });
});

// ── L'utilisateur gagne toujours ────────────────────────────────────────────────────────────

describe('l’utilisateur gagne toujours', () => {
  it('ignore toute demande automatique pendant un geste', () => {
    const { timer, driver, sched } = setup();
    sched.notifyGestureStart();
    expect(sched.submit(plan('explicit'))).toBe('ignored');
    timer.advance(200);
    expect(driver.runs).toHaveLength(0);
  });

  it('interrompt immédiatement l’animation en cours au début d’un geste', () => {
    const { timer, driver, sched } = setup();
    sched.submit(plan('auto'));
    timer.advance(120);
    expect(sched.state).toBe('running');
    sched.notifyGestureStart();
    expect(driver.cancels).toBe(1);
    expect(sched.state).toBe('idle');
  });

  it('ne relance rien après le geste (aucun snap-back)', () => {
    const { timer, driver, sched } = setup();
    sched.submit(plan('auto'));
    timer.advance(120);
    sched.notifyGestureStart();
    sched.notifyGestureEnd();
    timer.advance(500);
    expect(driver.runs).toHaveLength(1); // rien de neuf
    expect(sched.state).toBe('idle');
  });
});

// ── Priorités / préemption / file / conflits ─────────────────────────────────────────────────

describe('arbitrage des priorités', () => {
  it('un plan de priorité ≥ interrompt et remplace l’anim en cours', () => {
    const { timer, driver, sched } = setup();
    sched.submit(withZoom('navigation', 15));
    timer.advance(120);
    expect(sched.state).toBe('running');
    const outcome = sched.submit(withZoom('explicit', 17));
    expect(outcome).toBe('preempt');
    expect(driver.cancels).toBe(1);
    expect(driver.runs).toHaveLength(2);
    expect(driver.lastRun.priority).toBe('explicit');
  });

  it('un plan plus faible attend en file, puis s’exécute à la fin (pas de starvation)', () => {
    const { timer, driver, sched } = setup();
    sched.submit(withZoom('explicit', 17));
    timer.advance(120);
    expect(sched.submit(withZoom('auto', 12))).toBe('queued');
    expect(sched.state).toBe('waiting');
    expect(driver.runs).toHaveLength(1);
    driver.complete(); // l'anim explicite se termine
    expect(driver.runs).toHaveLength(2);
    expect(driver.lastRun.pose.zoom).toBe(12);
  });

  it('la file ne garde que le MEILLEUR plan en attente (conflits)', () => {
    const { timer, driver, sched } = setup();
    sched.submit(withZoom('explicit', 17));
    timer.advance(120);
    sched.submit(withZoom('auto', 12)); // en file
    expect(sched.submit(withZoom('navigation', 14))).toBe('queued'); // meilleur → remplace
    expect(sched.submit(withZoom('auto', 11))).toBe('ignored'); // plus faible que la file
    driver.complete();
    expect(driver.lastRun.pose.zoom).toBe(14); // le navigation, pas l'auto
  });
});

// ── Reduce motion ────────────────────────────────────────────────────────────────────────────

describe('reduce-motion (appliqué par le Scheduler)', () => {
  it('force le jump et met la vue à plat, sans que les couches hautes s’en soucient', () => {
    const { timer, driver, sched } = setup({ reduceMotion: true });
    sched.submit(plan('explicit', { motion: { primitive: 'fly', durationMs: 1000, fly: { curve: 1.42, speed: 1.2 } } }));
    timer.advance(120);
    expect(driver.lastRun.motion.primitive).toBe('jump');
    expect(driver.lastRun.motion.durationMs).toBe(0);
    expect(driver.lastRun.pose.pitch).toBe(0);
  });
});

// ── Machine à états / starvation du pending ──────────────────────────────────────────────────

describe('machine à états', () => {
  it('idle → preparing → running → idle', () => {
    const { timer, driver, sched } = setup();
    expect(sched.state).toBe('idle');
    sched.submit(plan('auto'));
    expect(sched.state).toBe('preparing');
    timer.advance(120);
    expect(sched.state).toBe('running');
    driver.complete();
    expect(sched.state).toBe('idle');
  });

  it('la fusion ne repousse pas l’échéance (pas de starvation du pending)', () => {
    const { timer, driver, sched } = setup();
    sched.submit(withZoom('auto', 14)); // échéance à +120
    timer.advance(60);
    sched.submit(withZoom('auto', 16)); // fusion, PAS de reset du timer
    timer.advance(60); // total 120 → flush
    expect(driver.runs).toHaveLength(1);
    expect(driver.lastRun.pose.zoom).toBe(16);
  });
});
