import { createEntityRepository } from '@/lib/data/createEntityRepository';
import { createSupabaseDataSource } from '@/lib/supabase/datasource';

import { parseMerchants, reportMerchantIssues } from './merchantLoader';
import { applyMerchantQueryLocal } from './merchantQuery';
import { parseMerchantRow } from './schema';
import { localMerchantDataSource } from './selectors';
import type { Merchant, MerchantDataSource, MerchantQuery, MerchantRepository } from './types';

/**
 * PROJECTION LISTE (Phase 1) — colonnes RÉELLEMENT consommées par `mapMerchantRow` et existant
 * dans la table (compteurs/classification, catégories, marqueurs, cartes horizontales, listes).
 * Les champs lourds propres à la FICHE (galerie détaillée, contacts secondaires…) restent inclus
 * ici UNIQUEMENT parce que la fiche `/explore` est alimentée par l'objet liste ; les colonnes de
 * pur analytics/technique (geom, timestamps, scores non affichés) sont écartées → payload allégé.
 * `getById` charge la fiche COMPLÈTE (`select('*')`), inchangé. Aucune logique de classification
 * n'est déplacée : la source unique reste le moteur TypeScript.
 */
const MERCHANT_LIST_COLUMNS = [
  'id', 'name', 'category', 'merchant_type', 'accroche', 'specialite', 'signature_tags',
  'city', 'latitude', 'longitude', 'opening_hours', 'eco_score_v2', 'google_rating',
  'cover_photo_url', 'photo_url', 'gallery_photos', 'photo_count', 'address', 'postal_code',
  'phone', 'email', 'website', 'instagram', 'facebook', 'google_maps_url', 'review_count',
  'reviews_count', 'local_score', 'partner_potential', 'status', 'siret', 'naf_code',
  'sirene_date_creation', 'sirene_etat', 'sirene_nb_etablissements', 'verification_score',
  'est_ess', 'est_bio', 'presentation_score',
].join(',');

/**
 * Repository commerces : Supabase si configuré, sinon fallback local.
 * Construit paresseusement (la datasource lit le client lazy) → web/Expo Go OK.
 *
 * Le serveur applique recherche + filtres ; la **distance** est dérivée côté
 * client (Phase A) en enveloppant la source distante avec `withDistance`.
 * COUTURE offline : passer un `cache` (MMKV) à `createEntityRepository` plus tard.
 */
export function getMerchantRepository(): MerchantRepository {
  const remoteBase = createSupabaseDataSource<Merchant, MerchantQuery>({
    table: 'merchants',
    parse: parseMerchantRow,
    // Parsing résilient ligne par ligne : une ligne invalide est ignorée, pas la liste.
    parseList: (rows) => {
      const result = parseMerchants(rows);
      reportMerchantIssues(result, 'supabase');
      return result.merchants;
    },
    // LISTE : projection allégée + pagination complète (lève le cap ~1000, charge tout le corpus).
    listColumns: MERCHANT_LIST_COLUMNS,
    // Pas de filtrage serveur : les colonnes is_open_now/is_producer/is_accessible
    // n'existent pas dans la table réelle (erreur 42703). Recherche/filtres/distance
    // sont appliqués côté client via applyMerchantQueryLocal (sémantique unique).
  });

  const remote: MerchantDataSource | null = remoteBase && {
    list: async (query) => applyMerchantQueryLocal(await remoteBase.list(), query),
    getById: (id) => remoteBase.getById(id),
  };

  return createEntityRepository<Merchant, MerchantQuery>({
    remote,
    fallback: localMerchantDataSource,
    // cache: merchantMmkvCache,  // ← S6 offline, non câblé
  });
}
