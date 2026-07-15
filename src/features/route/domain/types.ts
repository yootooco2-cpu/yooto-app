/**
 * Types purs du domaine « Sur mon trajet ».
 *
 * Aucune dépendance vers l'UI, le réseau, Mapbox, Supabase, un LLM ni la
 * taxonomie de navigation : les catégories circulent sous forme
 * d'identifiants opaques fournis par la configuration — jamais des libellés
 * affichés, jamais un import de `categoryFamilies` ou du moteur de
 * classification.
 *
 * Le temps est toujours injecté (epoch ms) : aucune fonction du domaine
 * n'appelle Date.now().
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Modes de déplacement. Le fauteuil roulant est un mode à part entière :
 * il n'est jamais assimilé à la marche (seuils, corridors et contraintes
 * d'accessibilité distincts).
 */
export type TransportMode = 'walk' | 'wheelchair' | 'bike' | 'car' | 'transit';

/** Tri-état explicite : « unknown » n'est jamais confondu avec « no ». */
export type TriState = 'yes' | 'no' | 'unknown';

/**
 * Statut d'ouverture à l'heure estimée de passage.
 * « unknown » n'est jamais transformé en fermeture : une absence de donnée
 * n'est pas une preuve négative.
 */
export type OpeningStatus = 'open' | 'closed' | 'unknown';

export interface OpeningAtEta {
  status: OpeningStatus;
  /** Confiance [0,1] dans la donnée d'horaires (0 = aucune donnée). */
  confidence: number;
  /** Fraîcheur de la donnée horaire (epoch ms), si connue. */
  verifiedAtMs?: number;
}

export type MissionId =
  | 'bread'
  | 'coffee'
  | 'water'
  | 'pharmacy'
  | 'accessible_toilet';

export interface Mission {
  id: MissionId;
  /** Catégories directement visées (fit mission = 1). Identifiants opaques injectés. */
  primaryCategoryIds: readonly string[];
  /** Catégories acceptables en second choix (fit = config.compatibleCategoryFit). */
  compatibleCategoryIds: readonly string[];
  /** Mission essentielle : une ouverture incertaine devient bloquante. */
  essential: boolean;
  /** La mission exige un lieu accessible (ex. toilettes accessibles). */
  requiresAccessibility: boolean;
}

export interface MerchantCandidate {
  merchantId: string;
  position: GeoPoint;
  /** Identifiants de catégories opaques (mêmes référentiels que Mission). */
  categoryIds: readonly string[];
  opening: OpeningAtEta;
  accessibility: TriState;
  /** Qualité/fiabilité normalisée [0,1] ; absente si inconnue (jamais punie). */
  qualityScore?: number;
  /** Préférence locale normalisée [0,1] ; absente si inconnue (jamais punie). */
  localScore?: number;
}

export interface RouteEvaluation {
  merchantId: string;
  /** Version de la route pour laquelle ce détour a été calculé. */
  routeVersion: number;
  exitPoint: GeoPoint;
  rejoinPoint: GeoPoint;
  /** Heure estimée de passage au commerce (epoch ms). */
  etaAtMerchantMs: number;
  /** Détour réel fourni par le fournisseur de route — jamais inventé ici. */
  detourSeconds: number;
  detourMeters: number;
  /** Date du calcul (epoch ms) — gouverne la fraîcheur. */
  computedAtMs: number;
}

/**
 * Mentions honnêtes attachées à une recommandation : elles signalent une
 * donnée à confirmer, elles ne la transforment jamais en certitude.
 */
export type RecommendationNote = 'opening_to_confirm' | 'accessibility_to_confirm';

/** Identifiants de fournisseurs de routage connus du domaine. */
export type RouteProviderId = 'ors' | 'mapbox' | 'fixture';

/** Origine des données d'accessibilité d'une route. 'none' = aucune. */
export type AccessibilityDataSource = 'osm_via_ors' | 'none';

/**
 * Statut de validation d'une configuration de routage :
 * - 'unvalidated' : utilisable en fixtures/simulations, JAMAIS présentée
 *   comme une configuration terrain validée ;
 * - 'pilot_validated' : validée sur le pilote ;
 * - 'not_applicable' : le mode ne porte pas de promesse d'accessibilité.
 */
export type RoutingValidationStatus = 'unvalidated' | 'pilot_validated' | 'not_applicable';

/**
 * Provenance obligatoire de toute route calculée : elle rend auditables le
 * fournisseur, le profil, la version de configuration et le niveau de
 * confiance accessibilité. Une session ne mélange jamais deux provenances
 * (même providerId + profileId + routingConfigVersion du début à la fin).
 */
export interface RouteProvenance {
  providerId: RouteProviderId;
  profileId: string;
  routingConfigVersion: number;
  accessibilityDataSource: AccessibilityDataSource;
  validationStatus: RoutingValidationStatus;
  /** Horodatage de génération (epoch ms) — injecté, jamais Date.now(). */
  generatedAtMs: number;
}

/** Facteurs de score, tous normalisés [0,1], conservés pour audit. */
export interface ScoreFactors {
  mission: number;
  detour: number;
  openingConfidence: number;
  quality: number;
  localPreference: number;
}

export interface Recommendation {
  merchantId: string;
  scoreVersion: number;
  /** Score agrégé [0,1] — interne, jamais affiché tel quel. */
  score: number;
  factors: ScoreFactors;
  notes: readonly RecommendationNote[];
  /** Raison courte, déterministe, construite uniquement sur des faits structurés. */
  reason: string;
  routeVersion: number;
  detourSeconds: number;
  createdAtMs: number;
  expiresAtMs: number;
}
