# YootChat - Lot 5C rapport des fallbacks

## Fallbacks prouves

- Aucun candidat actif: `NO_RESULT`, sans recommandation.
- Candidat non actif: quarantaine locale, `NO_RESULT`.
- Panne reseau simulee: `SERVICE_UNAVAILABLE`, sans recommandation ni action interface.
- Timeout simule: `SUPABASE_TIMEOUT` puis `SERVICE_UNAVAILABLE`.
- Sortie non certifiable: fallback deterministe, sans commerce invente.

## Invariants

- Aucun fallback ne fabrique d'identifiant commerçant.
- Aucun fallback ne cree d'action interface.
- Aucun fallback ne contient de donnee brute.
- Le meme echec produit la meme sortie.
