export {
  trackEvent,
  getPreferenceSnapshot,
  subscribePreferences,
  resetPreferences,
  exportPreferences,
} from './behaviorTracker';
export { usePreferences, preferenceSignals } from './preferenceEngine';
export { setPreferenceStorage, getPreferenceStorage } from './storage';
export type {
  PreferenceEvent,
  PreferenceEventType,
  PreferenceProfile,
  PreferenceSnapshot,
  PreferenceStorage,
} from './types';
