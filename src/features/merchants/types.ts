import type { EntityDataSource, EntityRepository } from '@/lib/data/types';
import type { ResolvedIntent } from '@/features/discovery';
import type { MapCoordinate } from '@/features/map';

import type { QuickFilterId } from './filters';

export type MerchantCategory = 'producer' | 'grocery' | 'restaurant' | 'shop' | 'service';

/** Commerce responsable (domaine). Le moteur carto ne le connaît pas directement. */
export interface Merchant {
  id: string;
  name: string;
  category: MerchantCategory;
  description: string;
  coordinates: MapCoordinate;
  /** Ville (affichée quand la distance est inconnue). */
  city?: string;
  /** Libellé de distance (« 320 m ») ou « — » si inconnue. */
  distanceLabel: string;
  isOpenNow: boolean;
  isProducer: boolean;
  /** Accessible aux personnes à mobilité réduite. */
  isAccessible: boolean;
  hasRewards: boolean;
  /** Score écologique significatif (ex. eco_score_v2). Absent = non affiché. */
  ecoScore?: number;
  /** Note (ex. google_rating), si disponible. */
  rating?: number;
  /** Photo de couverture principale. */
  coverPhotoUrl?: string;
  /** Photo secondaire (fallback). */
  photoUrl?: string;
  /** Galerie de photos. */
  galleryPhotos?: string[];
  /** Nombre de photos disponibles. */
  photoCount?: number;
  // --- Coordonnées & contact (fiche détaillée) ---
  address?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  googleMapsUrl?: string;
  /** Nombre d'avis Google. */
  reviewCount?: number;
  /** Horaires lisibles (weekday_text). */
  openingHours?: string[];
  /** Scores internes (non affichés comme score brut). */
  localScore?: number;
  partnerPotential?: number;
  status?: string;
  /** Position relative (%) sur la carte placeholder en attendant un provider. */
  pin: { x: number; y: number };
  /** Distance à l'utilisateur (km) — dérivée côté client quand le GPS est actif. */
  distanceKm?: number;
}

export type MerchantId = Merchant['id'];

/** Critères de requête commerces (recherche, filtres, distance). */
export interface MerchantQuery {
  search?: string;
  filters?: QuickFilterId[];
  /** Position utilisateur pour le tri/affichage distance (GPS ponctuel). */
  near?: MapCoordinate;
  /** Rayon max (km) — filtrage distance côté client en Phase A. */
  radiusKm?: number;
  /** Intention déduite de la recherche (élargit le filtrage). */
  intent?: ResolvedIntent;
}

/** Source de données commerces (Supabase, local…) — spécialisation générique. */
export type MerchantDataSource = EntityDataSource<Merchant, MerchantQuery>;

/** Repository commerces consommé par l'UI — spécialisation générique. */
export type MerchantRepository = EntityRepository<Merchant, MerchantQuery>;
