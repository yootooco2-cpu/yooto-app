import { mapMerchantRow, merchantRowSchema } from './schema';
import type { Merchant } from './types';

export interface MerchantImportIssue {
  index: number;
  reason: 'invalid-shape' | 'invalid-coordinates';
  message: string;
}

export interface MerchantLoadResult {
  merchants: Merchant[];
  skipped: number;
  issues: MerchantImportIssue[];
}

function isValidCoordinate(lat: number, lng: number): boolean {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false; // « île nulle » = donnée manquante probable
  return true;
}

/**
 * Charge un lot de lignes brutes en tolérant les erreurs LIGNE PAR LIGNE :
 * une ligne invalide est ignorée (jamais de rejet global), et tracée dans `issues`.
 */
export function parseMerchants(rows: unknown[]): MerchantLoadResult {
  const merchants: Merchant[] = [];
  const issues: MerchantImportIssue[] = [];

  rows.forEach((row, index) => {
    const parsed = merchantRowSchema.safeParse(row);
    if (!parsed.success) {
      issues.push({
        index,
        reason: 'invalid-shape',
        message: parsed.error.issues
          .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('; '),
      });
      return;
    }

    const merchant = mapMerchantRow(parsed.data);
    if (!isValidCoordinate(merchant.coordinates.latitude, merchant.coordinates.longitude)) {
      issues.push({
        index,
        reason: 'invalid-coordinates',
        message: `lat=${merchant.coordinates.latitude}, lng=${merchant.coordinates.longitude}`,
      });
      return;
    }

    merchants.push(merchant);
  });

  return { merchants, skipped: issues.length, issues };
}

/** Journalise les lignes rejetées — UNIQUEMENT en développement (silencieux en prod). */
export function reportMerchantIssues(result: MerchantLoadResult, source: string): void {
  if (!__DEV__ || result.issues.length === 0) return;
  const total = result.merchants.length + result.skipped;
  console.warn(`[merchants:${source}] ${result.skipped}/${total} ligne(s) ignorée(s) :`);
  result.issues.forEach((issue) => {
    console.warn(`  • #${issue.index} (${issue.reason}) ${issue.message}`);
  });
}
