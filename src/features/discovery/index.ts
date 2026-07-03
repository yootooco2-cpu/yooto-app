export { buildDiscoveryContext, seasonOf, clamp01 } from './context';
export { scoreMerchant } from './score';
export { getSignals, registerSignal, registerSignals } from './registry';
export { rankMerchants } from './ranking';
export { reasonsFromContributions } from './discoveryReasons';
export { recommend, getDiscoveryReasons } from './recommendationEngine';
export { buildHomeSections, editorialScore } from './homeSections';
export type { HomeSections, HomeSectionLimits, BuildHomeSectionsOptions } from './homeSections';
export { recommendCached, contextSignature } from './cache';
export { getRankingV2, setRankingV2 } from './flags';
export { editorialSignals } from './editorial/editorialSignals';
export { PLANNED_SIGNALS, signalTemplate } from './futureSignals';
export { resolveIntent } from './intents/intentEngine';
export { matchIntents, normalizeText } from './intents/intentMatcher';
export { INTENTS } from './intents/intentDictionary';
export type { IntentDefinition, ResolvedIntent } from './intents/types';
export {
  trackEvent,
  usePreferences,
  getPreferenceSnapshot,
  subscribePreferences,
  resetPreferences,
  exportPreferences,
  setPreferenceStorage,
} from './preferences';
export type {
  PreferenceEvent,
  PreferenceEventType,
  PreferenceProfile,
  PreferenceSnapshot,
} from './preferences/types';
export type {
  DiscoveryContext,
  ScoredMerchant,
  Season,
  Signal,
  SignalContribution,
  SignalKey,
} from './types';
