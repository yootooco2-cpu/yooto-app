import Constants from 'expo-constants';

/**
 * Métadonnées applicatives affichées dans « À propos » — lues DYNAMIQUEMENT depuis la config
 * Expo (app.json) plutôt qu'écrites en dur. Repli sûr si la config n'est pas disponible.
 */
export const APP_NAME = 'YOOTOO';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const APP_BUILD = String(
  Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1',
);

export const APP_TAGLINE = 'La couche d’intelligence territoriale locale.';
