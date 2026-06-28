import type { MapCoordinate } from '@/features/map';

export type MerchantCategory = 'producer' | 'grocery' | 'restaurant' | 'shop' | 'service';

/** Commerce responsable (domaine). Le moteur carto ne le connaît pas directement. */
export interface Merchant {
  id: string;
  name: string;
  category: MerchantCategory;
  description: string;
  coordinates: MapCoordinate;
  /** Libellé de distance pré-calculé pour la démo (ex. « 320 m »). */
  distanceLabel: string;
  isOpenNow: boolean;
  isProducer: boolean;
  /** Accessible aux personnes à mobilité réduite. */
  isAccessible: boolean;
  hasRewards: boolean;
  /** Score écologique 0–100. */
  ecoScore: number;
  /** Position relative (%) sur la carte placeholder en attendant un provider. */
  pin: { x: number; y: number };
}

export type MerchantId = Merchant['id'];

/**
 * Contrat d'accès aux commerces.
 * Aujourd'hui : implémentation locale synchrone sur les données de démo.
 * Demain : implémentation Supabase (asynchrone) — d'où la signature `Promise`.
 */
export interface MerchantRepository {
  list(): Promise<Merchant[]>;
  getById(id: MerchantId): Promise<Merchant | null>;
}
