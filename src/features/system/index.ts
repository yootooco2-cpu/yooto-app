/**
 * `features/system` — FONDATIONS TRANSVERSES de YOOTOO (parcours-agnostiques).
 *  A · Device Context   — lecture descriptive de l'OS (langue/région/devise/fuseau/thème).
 *  B · Launch/Milestones — orchestration de cycle de vie (1er lancement + milestones génériques).
 * Aucune logique métier (ni auth, ni onboarding) : ces briques sont consommées, pas modifiées.
 */
export {
  useDeviceContext,
  resolveDeviceContext,
  currencyForRegion,
  type DeviceContext,
  type ColorSchemeName,
} from './deviceContext';

export {
  deriveLaunchStatus,
  readBoolFlag,
  milestoneKey,
  LAUNCH_SEEN_KEY,
  type LaunchStatus,
} from './launchLogic';
export { useLaunchStore } from './launchState';
