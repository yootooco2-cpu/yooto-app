import { z } from 'zod';

import { normalizeMerchantCategory } from './categories';
import type { Merchant } from './types';

/**
 * Schéma d'une ligne Supabase `merchants` — VOLONTAIREMENT tolérant :
 * - `category` reste `string` (normalisée ensuite) → aucune valeur ne fait échouer le parse.
 * - nombres coercés (tolère `"45.76"`), `id` coercé en string (tolère un id numérique).
 * - champs métier nullable/optionnels → défauts appliqués au mapping.
 * La validation SÉMANTIQUE (coordonnées) vit dans `merchantLoader`.
 */
export const merchantRowSchema = z.object({
  id: z.coerce.string(),
  name: z.string(),
  category: z.string(),
  description: z.string().nullable().optional(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  distance_label: z.string().nullable().optional(),
  is_open_now: z.boolean().nullable().optional(),
  is_producer: z.boolean().nullable().optional(),
  is_accessible: z.boolean().nullable().optional(),
  has_rewards: z.boolean().nullable().optional(),
  eco_score: z.coerce.number().nullable().optional(),
  pin_x: z.coerce.number().nullable().optional(),
  pin_y: z.coerce.number().nullable().optional(),
});

export type MerchantRow = z.infer<typeof merchantRowSchema>;

/** Mappe une ligne DB validée vers l'entité de domaine `Merchant` (conversions centralisées). */
export function mapMerchantRow(row: MerchantRow): Merchant {
  return {
    id: row.id,
    name: row.name,
    category: normalizeMerchantCategory(row.category),
    description: row.description ?? '',
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    // S5.1 : `distanceLabel` deviendra dérivé du GPS ; `pin` est placeholder-only.
    distanceLabel: row.distance_label ?? '—',
    isOpenNow: row.is_open_now ?? false,
    isProducer: row.is_producer ?? false,
    isAccessible: row.is_accessible ?? false,
    hasRewards: row.has_rewards ?? false,
    ecoScore: row.eco_score ?? 0,
    pin: { x: row.pin_x ?? 0, y: row.pin_y ?? 0 },
  };
}

/** Valide une ligne brute (strict) et la mappe — utilisé pour un accès unitaire (getById). */
export function parseMerchantRow(row: unknown): Merchant {
  return mapMerchantRow(merchantRowSchema.parse(row));
}
