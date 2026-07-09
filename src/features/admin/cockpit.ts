import { selectDiscussions, useChatStore } from '@/features/chat';
import { useFavoriteIds } from '@/features/favorites';
import { getMapConfig } from '@/features/map';
import { DEMO_REQUIRE_PHOTO, hasMerchantPhoto, useMerchants } from '@/features/merchants';
import { getSupabaseClient } from '@/lib/supabase/client';

import { computeHealthScore, healthTone, type SignalStatus } from './health';

export { computeHealthScore, healthTone } from './health';
export type { SignalStatus } from './health';

/**
 * Cockpit YOOTOO — AGRÉGATEUR de données. Lit les services existants (commerces, chat, favoris,
 * config), n'en duplique aucune, et produit une vue de pilotage. ARCHITECTURE EXTENSIBLE : ajouter
 * un indicateur = pousser une entrée dans la section concernée (`real` = branché, `pending` = à
 * connecter). La logique de score est PURE (testable).
 */

export interface CockpitService {
  key: string;
  label: string;
  status: SignalStatus;
}

export interface CockpitMetric {
  label: string;
  value: string;
  /** Accent optionnel (santé de la valeur). */
  tone?: SignalStatus;
}

export interface CockpitPriority {
  severity: 'critical' | 'warn' | 'info' | 'ok';
  text: string;
}

export interface CockpitSection {
  /** Indicateurs réellement branchés. */
  real: CockpitMetric[];
  /** Indicateurs prévus, pas encore instrumentés (affichés « à connecter »). */
  pending: string[];
}

export interface CockpitLog {
  tone: SignalStatus;
  text: string;
  time?: string;
}

export interface CockpitData {
  health: { score: number; tone: SignalStatus };
  services: CockpitService[];
  priorities: CockpitPriority[];
  user: CockpitSection;
  network: CockpitSection;
  performance: CockpitSection;
  ai: CockpitSection;
  journal: CockpitLog[];
}

function relTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Agrège toutes les sources en une vue de pilotage. `now` injecté pour rester pur au rendu. */
export function useCockpitData(now: number): CockpitData {
  const merchantsQuery = useMerchants();
  const favCount = useFavoriteIds().length;
  const activity = useChatStore((s) => s.activity);
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);

  const merchants = merchantsQuery.data ?? [];
  const total = merchants.length;
  const withPhoto = merchants.filter(hasMerchantPhoto).length;
  const without = total - withPhoto;
  const coverage = total ? Math.round((withPhoto / total) * 100) : 0;
  const producers = merchants.filter((m) => m.isProducer || m.category === 'producer').length;
  const restaurants = merchants.filter((m) => m.category === 'restaurant').length;
  const shops = merchants.filter((m) => m.category === 'shop').length;
  const dataError = merchantsQuery.isError;
  const dataLoading = merchantsQuery.isLoading;
  const lastSync = merchantsQuery.dataUpdatedAt ? relTime(merchantsQuery.dataUpdatedAt, now) : '—';

  const supabaseOk = getSupabaseClient() !== null;
  const mapboxOk = Boolean(getMapConfig().token);

  const services: CockpitService[] = [
    { key: 'supabase', label: 'Supabase', status: !supabaseOk ? 'down' : dataError ? 'degraded' : 'up' },
    { key: 'mapbox', label: 'Mapbox', status: mapboxOk ? 'up' : 'down' },
    { key: 'auth', label: 'Authentification', status: supabaseOk ? 'up' : 'down' },
    { key: 'api', label: 'API', status: !supabaseOk ? 'down' : dataError ? 'degraded' : dataLoading ? 'degraded' : 'up' },
    { key: 'notifications', label: 'Notifications', status: 'degraded' }, // préférences OK, livraison à brancher
    { key: 'storage', label: 'Stockage', status: supabaseOk ? 'up' : 'down' },
  ];
  const servicesUp = services.filter((s) => s.status === 'up').length;
  const servicesDegraded = services.filter((s) => s.status === 'degraded').length;
  const score = computeHealthScore({ servicesUp, servicesDegraded, servicesTotal: services.length, coverage, hasError: dataError });

  const priorities: CockpitPriority[] = [];
  if (!supabaseOk) priorities.push({ severity: 'critical', text: 'Supabase non configuré' });
  if (!mapboxOk) priorities.push({ severity: 'critical', text: 'Mapbox non configuré (token absent)' });
  if (dataError) priorities.push({ severity: 'critical', text: 'Erreur de synchronisation des commerces' });
  if (without > 0) priorities.push({ severity: 'warn', text: `${without} commerce${without > 1 ? 's' : ''} sans photo` });
  priorities.push({ severity: 'info', text: 'Notifications : livraison à brancher' });
  if (priorities.every((p) => p.severity === 'info')) priorities.unshift({ severity: 'ok', text: 'Aucune action critique — tout est en ordre' });

  const publications = activity.length;
  const publicDiscussions = selectDiscussions(conversations, 'all').length;
  const messageCount = Object.values(messages).reduce((n, list) => n + list.length, 0);

  const journal: CockpitLog[] = [
    dataError
      ? { tone: 'down', text: 'Échec de synchronisation des commerces' }
      : dataLoading
        ? { tone: 'degraded', text: 'Synchronisation des commerces en cours…' }
        : { tone: 'up', text: `Synchronisation commerces — ${total} chargés`, time: lastSync },
    { tone: coverage >= 90 ? 'up' : 'degraded', text: `Couverture photo — ${withPhoto}/${total} (${coverage} %)` },
    { tone: mapboxOk ? 'up' : 'down', text: `Carte Mapbox — ${mapboxOk ? 'connectée' : 'token absent'}` },
    { tone: supabaseOk ? 'up' : 'down', text: `Supabase — ${supabaseOk ? 'client actif' : 'non configuré'}` },
  ];

  return {
    health: { score, tone: healthTone(score) },
    services,
    priorities,
    user: {
      real: [
        { label: 'Favoris enregistrés', value: String(favCount) },
        { label: 'Publications du Chat', value: String(publications) },
        { label: 'Discussions publiques', value: String(publicDiscussions) },
        { label: 'Messages', value: String(messageCount) },
      ],
      pending: ['Utilisateurs connectés', 'Nouveaux comptes', 'Utilisateurs actifs', 'Recherches'],
    },
    network: {
      real: [
        { label: 'Commerçants', value: String(total) },
        { label: 'Avec photo', value: String(withPhoto) },
        { label: 'Couverture photo', value: `${coverage} %`, tone: coverage >= 90 ? 'up' : 'degraded' },
        { label: 'Producteurs', value: String(producers) },
        { label: 'Restaurants', value: String(restaurants) },
        { label: 'Boutiques / artisans', value: String(shops) },
      ],
      pending: ['Actifs aujourd’hui', 'Nouveaux commerçants', 'Publications du jour', 'Plus consultés', 'Plus suivis'],
    },
    performance: {
      real: [{ label: 'Mode démo', value: DEMO_REQUIRE_PHOTO ? 'Oui' : 'Non' }],
      pending: ['Temps de chargement', "Temps d’ouverture", 'Réponse API', 'Erreurs', 'Crashs', 'FPS carte', 'Mémoire'],
    },
    ai: {
      real: [],
      pending: ['Recommandations', 'Conversations YootChat', 'Satisfaction', 'Latence', 'Coût IA', 'Tokens', 'Agents actifs'],
    },
    journal,
  };
}
