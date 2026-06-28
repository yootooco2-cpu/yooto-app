import { z } from 'zod';

import type { Merchant } from './types';

/** Schéma d'une ligne Supabase `merchants` (snake_case), validée par zod. */
export const merchantRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['producer', 'grocery', 'restaurant', 'shop', 'service']),
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  distance_label: z.string().nullable().optional(),
  is_open_now: z.boolean().nullable().optional(),
  is_producer: z.boolean().nullable().optional(),
  is_accessible: z.boolean().nullable().optional(),
  has_rewards: z.boolean().nullable().optional(),
  eco_score: z.number(),
  pin_x: z.number().nullable().optional(),
  pin_y: z.number().nullable().optional(),
});

export type MerchantRow = z.infer<typeof merchantRowSchema>;

/** Mappe une ligne DB validée vers l'entité de domaine `Merchant`. */
export function mapMerchantRow(row: MerchantRow): Merchant {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    // S5.1 : `distanceLabel` deviendra dérivé du GPS ; `pin` est placeholder-only.
    distanceLabel: row.distance_label ?? '—',
    isOpenNow: row.is_open_now ?? false,
    isProducer: row.is_producer ?? false,
    isAccessible: row.is_accessible ?? false,
    hasRewards: row.has_rewards ?? false,
    ecoScore: row.eco_score,
    pin: { x: row.pin_x ?? 0, y: row.pin_y ?? 0 },
  };
}

/** Valide une ligne brute inconnue et la mappe (utilisé par la datasource). */
export function parseMerchantRow(row: unknown): Merchant {
  return mapMerchantRow(merchantRowSchema.parse(row));
}
