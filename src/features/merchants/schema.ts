import { z } from 'zod';

import { normalizeMerchantCategory } from './categories';
import type { Merchant } from './types';

/**
 * Schéma d'une ligne Supabase `merchants` — VOLONTAIREMENT tolérant.
 * Les champs aux formes incertaines (opening_hours, signature_tags) sont typés
 * `unknown` puis lus via des helpers défensifs → aucune ligne n'est rejetée à cause
 * d'une structure JSON inattendue. La validation sémantique (coords) vit dans `merchantLoader`.
 */
export const merchantRowSchema = z.object({
  id: z.coerce.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
  merchant_type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  accroche: z.string().nullable().optional(),
  specialite: z.string().nullable().optional(),
  signature_tags: z.unknown().nullable().optional(),
  city: z.string().nullable().optional(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  distance_label: z.string().nullable().optional(),
  is_open_now: z.boolean().nullable().optional(),
  opening_hours: z.unknown().nullable().optional(),
  is_producer: z.boolean().nullable().optional(),
  is_accessible: z.boolean().nullable().optional(),
  has_rewards: z.boolean().nullable().optional(),
  eco_score: z.coerce.number().nullable().optional(),
  eco_score_v2: z.coerce.number().nullable().optional(),
  google_rating: z.coerce.number().nullable().optional(),
  cover_photo_url: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  gallery_photos: z.unknown().nullable().optional(),
  photo_count: z.coerce.number().nullable().optional(),
  address: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  google_maps_url: z.string().nullable().optional(),
  review_count: z.coerce.number().nullable().optional(),
  reviews_count: z.coerce.number().nullable().optional(),
  local_score: z.coerce.number().nullable().optional(),
  partner_potential: z.coerce.number().nullable().optional(),
  status: z.string().nullable().optional(),
  // Identité légale vérifiée (SIRENE V2.4)
  siret: z.string().nullable().optional(),
  naf_code: z.string().nullable().optional(),
  sirene_date_creation: z.string().nullable().optional(),
  sirene_etat: z.string().nullable().optional(),
  sirene_nb_etablissements: z.coerce.number().nullable().optional(),
  verification_score: z.coerce.number().nullable().optional(),
  pin_x: z.coerce.number().nullable().optional(),
  pin_y: z.coerce.number().nullable().optional(),
});

export type MerchantRow = z.infer<typeof merchantRowSchema>;

/** Premier texte non vide parmi des candidats (string ou tableau de strings). */
function firstText(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (Array.isArray(candidate)) {
      const joined = candidate
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .join(', ');
      if (joined) return joined;
    }
  }
  return '';
}

/** Convertit une valeur inconnue en `string[]` (URLs de photos) ou `undefined`. */
function toStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

/** Lit `opening_hours.open_now` de façon défensive (JSON de forme variable). */
function readOpenNow(raw: unknown): boolean | undefined {
  if (raw && typeof raw === 'object' && 'open_now' in raw) {
    const value = (raw as { open_now?: unknown }).open_now;
    return typeof value === 'boolean' ? value : undefined;
  }
  return undefined;
}

/** Lit `opening_hours.weekday_text` (horaires lisibles) de façon défensive. */
function readWeekdayText(raw: unknown): string[] | undefined {
  if (raw && typeof raw === 'object' && 'weekday_text' in raw) {
    const value = (raw as { weekday_text?: unknown }).weekday_text;
    if (Array.isArray(value)) {
      const lines = value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      return lines.length > 0 ? lines : undefined;
    }
  }
  return undefined;
}

/** Mappe une ligne DB validée vers l'entité `Merchant` (conversions centralisées). */
export function mapMerchantRow(row: MerchantRow): Merchant {
  // `category` (Google) puis fallback `merchant_type`, normalisé en bucket canonique.
  const rawCategory = (row.category ?? row.merchant_type ?? '').trim().toLowerCase();
  const rawMerchantType = (row.merchant_type ?? '').trim().toLowerCase();
  const category = normalizeMerchantCategory(rawCategory);

  return {
    id: row.id,
    name: row.name,
    category,
    rawCategory: rawCategory || undefined,
    rawMerchantType: rawMerchantType || undefined,
    // Description : accroche → specialite → signature_tags → ''.
    description: firstText(row.accroche, row.specialite, row.signature_tags, row.description),
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    city: row.city ?? undefined,
    // S5.1 : `distanceLabel` est recalculé via GPS quand dispo ; sinon « — ».
    distanceLabel: row.distance_label ?? '—',
    // « Ouvert » réel via opening_hours.open_now, fallback booléen historique.
    isOpenNow: readOpenNow(row.opening_hours) ?? row.is_open_now ?? false,
    // Producteur : champ `is_producer` s'il existe un jour, sinon dérivé de la catégorie.
    isProducer: row.is_producer ?? category === 'producer',
    // PMR : aucune donnée fiable en base (pas de colonne accessibilité, signature_tags vides).
    // On ne marque JAMAIS un commerce accessible sans donnée fiable → toujours false ici.
    isAccessible: row.is_accessible ?? false,
    hasRewards: row.has_rewards ?? false,
    // Éco : UNIQUEMENT le vrai score (eco_score_v2). `eco_score` étant une constante
    // de défaut (=5 partout), on l'ignore pour ne pas afficher « Éco 5 ».
    ecoScore: row.eco_score_v2 ?? undefined,
    rating: row.google_rating ?? undefined,
    coverPhotoUrl: row.cover_photo_url ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    galleryPhotos: toStringArray(row.gallery_photos),
    photoCount: row.photo_count ?? undefined,
    address: row.address ?? undefined,
    postalCode: row.postal_code ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    instagram: row.instagram ?? undefined,
    facebook: row.facebook ?? undefined,
    googleMapsUrl: row.google_maps_url ?? undefined,
    reviewCount: row.review_count ?? row.reviews_count ?? undefined,
    // Tags de contenu depuis `signature_tags` (colonne existante) — réels, jamais inventés.
    tags: toStringArray(row.signature_tags),
    openingHours: readWeekdayText(row.opening_hours),
    localScore: row.local_score ?? undefined,
    partnerPotential: row.partner_potential ?? undefined,
    // Identité légale vérifiée (SIRENE V2.4) — NULL = non vérifié, jamais inventé.
    siret: row.siret ?? undefined,
    nafCode: row.naf_code ?? undefined,
    sireneCreationDate: row.sirene_date_creation ?? undefined,
    sireneEtat: row.sirene_etat ?? undefined,
    sireneNbEtablissements: row.sirene_nb_etablissements ?? undefined,
    verificationScore: row.verification_score ?? undefined,
    status: row.status ?? undefined,
    pin: { x: row.pin_x ?? 0, y: row.pin_y ?? 0 },
  };
}

/** Valide une ligne brute (strict) et la mappe — accès unitaire (getById). */
export function parseMerchantRow(row: unknown): Merchant {
  return mapMerchantRow(merchantRowSchema.parse(row));
}
