/**
 * Authentification abstraite — LOT 3B.1 : aucune clé réelle.
 *
 * - Le vérificateur JWT est INJECTÉ (implémentation Supabase au 3B.3) ;
 * - le pseudonyme de quota est un HMAC (fonction injectée) du `sub` avec un
 *   `pepper` serveur (secret, jamais une valeur publique) ;
 * - le `sub` brut ne sort jamais de ce module : ni logs, ni amont ;
 * - le pseudonyme complet sert UNIQUEMENT de clé de quota — il n'apparaît
 *   pas dans les logs (la corrélation utilise un requestId généré serveur).
 */

export type JwtVerification =
  | { ok: true; sub: string }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' };

export type JwtVerifier = (authorizationHeader: string | null) => Promise<JwtVerification>;

/** HMAC injectée : (secret, message) → empreinte hexadécimale. */
export type HmacFn = (secret: string, message: string) => Promise<string>;

/** Force minimale exigée : 128 bits, soit 32 caractères hexadécimaux. */
export const MIN_PSEUDONYM_HEX_LENGTH = 32;

export type PseudonymResult =
  | { ok: true; pseudonym: string }
  | { ok: false; reason: 'pseudonym_too_short' };

/**
 * Pseudonyme de quota : HMAC(pepper, sub), conservé EN ENTIER comme clé
 * (≥ 128 bits exigés — une empreinte plus courte est refusée).
 */
export async function pseudonymFromSub(
  sub: string,
  hmacFn: HmacFn,
  pepper: string,
): Promise<PseudonymResult> {
  const digest = await hmacFn(pepper, sub);
  if (digest.length < MIN_PSEUDONYM_HEX_LENGTH) {
    return { ok: false, reason: 'pseudonym_too_short' };
  }
  return { ok: true, pseudonym: digest };
}
