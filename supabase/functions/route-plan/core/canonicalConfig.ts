/**
 * Configuration canonique DÉTENUE PAR LE SERVEUR + empreinte de cohérence.
 *
 * `paramsHash` porte UNIQUEMENT sur la configuration de routage réellement
 * appliquée (profil, restrictions, paramètres influençant le calcul).
 * Il EXCLUT : coordonnées, JWT, pseudonyme, horodatage, identifiant de
 * requête. C'est une empreinte de cohérence — pas une preuve cryptographique
 * indépendante. La fonction de hachage est injectée (SHA-256 WebCrypto au
 * Lot 3B.3 ; les tests utilisent un hachage local déterministe).
 */

import type { RoutePlanMode } from './contracts.ts';

export interface WheelchairRestrictions {
  maximum_incline: number | 'any';
  maximum_sloped_kerb: number | 'any';
  minimum_width?: number;
  surface_type: string;
  smoothness_type: string;
  track_type: string;
}

export interface ServerRoutingConfig {
  version: number;
  profiles: Readonly<Record<RoutePlanMode, 'wheelchair' | 'foot-walking'>>;
  /** Défauts techniques ORS documentés — statut assumé : non validés terrain. */
  wheelchairRestrictions: WheelchairRestrictions;
  validationStatus: 'unvalidated' | 'pilot_validated';
}

export const SERVER_ROUTING_CONFIG_V1: ServerRoutingConfig = {
  version: 1,
  profiles: { wheelchair: 'wheelchair', walk: 'foot-walking' },
  wheelchairRestrictions: {
    maximum_incline: 6,
    maximum_sloped_kerb: 0.06,
    surface_type: 'cobblestone:flattened',
    smoothness_type: 'good',
    track_type: 'grade1',
  },
  validationStatus: 'unvalidated',
};

/**
 * JSON canonique : clés triées récursivement — deux objets égaux produisent
 * exactement la même chaîne, quel que soit l'ordre d'insertion des clés.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts = keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
  return `{${parts.join(',')}}`;
}

/** Fonction de hachage injectée : chaîne → empreinte hexadécimale. */
export type HashFn = (input: string) => Promise<string>;

/**
 * Matériau de l'empreinte : profil appliqué + restrictions réellement
 * transmises (fauteuil uniquement) + version. Rien d'autre, par
 * construction — aucune donnée de requête n'entre dans cette fonction.
 */
export function paramsHashMaterial(config: ServerRoutingConfig, mode: RoutePlanMode): string {
  return canonicalJson({
    version: config.version,
    profile: config.profiles[mode],
    restrictions: mode === 'wheelchair' ? config.wheelchairRestrictions : null,
  });
}

export async function computeParamsHash(
  config: ServerRoutingConfig,
  mode: RoutePlanMode,
  hashFn: HashFn,
): Promise<string> {
  return await hashFn(paramsHashMaterial(config, mode));
}
