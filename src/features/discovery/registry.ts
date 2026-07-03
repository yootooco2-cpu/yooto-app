import { editorialSignals } from './editorial/editorialSignals';
import { intentSignals } from './intents/intentSignals';
import { merchantSignals } from './merchantSignals';
import { preferenceSignals } from './preferences/preferenceEngine';
import { timeSignals } from './timeSignals';
import type { Signal } from './types';
import { userSignals } from './userSignals';

/**
 * Registre des signaux — architecture "plug-in".
 * Les signaux intégrés sont chargés ici ; un futur module peut en ajouter via
 * `registerSignal()` sans modifier le moteur (faible couplage, extensible).
 */
const registry: Signal[] = [
  ...merchantSignals,
  ...timeSignals,
  ...userSignals,
  ...intentSignals,
  ...preferenceSignals,
  ...editorialSignals,
];

export function registerSignal(signal: Signal): void {
  registry.push(signal);
}

export function registerSignals(signals: Signal[]): void {
  registry.push(...signals);
}

export function getSignals(): readonly Signal[] {
  return registry;
}
