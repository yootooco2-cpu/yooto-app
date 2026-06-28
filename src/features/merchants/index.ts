export { DEMO_MERCHANTS } from './data';
export {
  CATEGORY_LABELS,
  MERCHANT_CATEGORIES,
  normalizeMerchantCategory,
} from './categories';
export { QUICK_FILTERS } from './filters';
export { getMerchantById, localMerchantDataSource } from './selectors';
export { buildRecommendationReasons, getMerchantTags } from './insights';
export { merchantsToMapMarkers } from './toMapMarkers';
export { getMerchantRepository } from './repository';
export { useMerchant, useMerchants, merchantKeys } from './queries';
export {
  applyMerchantQueryLocal,
  buildSupabaseMerchantQuery,
  withDistance,
} from './merchantQuery';
export {
  parseMerchants,
  reportMerchantIssues,
  type MerchantImportIssue,
  type MerchantLoadResult,
} from './merchantLoader';
export { mapMerchantRow, merchantRowSchema, parseMerchantRow, type MerchantRow } from './schema';
export type {
  Merchant,
  MerchantCategory,
  MerchantDataSource,
  MerchantId,
  MerchantQuery,
  MerchantRepository,
} from './types';
export type { QuickFilter, QuickFilterId } from './filters';
