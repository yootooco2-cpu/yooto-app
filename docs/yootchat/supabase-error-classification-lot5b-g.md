# YootChat - Lot 5B-G classification typologique des erreurs Supabase

Date: 2026-07-20

## Filiation Git

- Branche source: `diagnostic/yootchat-supabase-transport-offline`
- Commit source: `7e56ed5860dfc436c9a89ad7d8eed8f461eb7abc`
- Parent source: `6a3b52d12f344b00ef8384a7cd8b3247e664563b`
- Branche de correction: `fix/yootchat-supabase-error-classification`

## Perimetre

- Appel Supabase reel: 0.
- SELECT reel: 0.
- Lecture volontaire de `.env.local`: 0.
- Curl ou fetch manuel: 0.
- OpenAI: 0.
- Deploiement: 0.
- Ecriture Supabase: 0.
- RPC: 0.
- Colonnes certifiees Lot 4/5: inchangees.
- Moteur deterministe: inchange.
- Header `Authorization`: non supprime.

## Matrice de classification

| Preuve disponible | Categorie normalisee | Fallback |
| --- | --- | --- |
| HTTP 401 | `SUPABASE_AUTH_REJECTED` | `SERVICE_UNAVAILABLE` |
| Code `PGRST301` | `SUPABASE_AUTH_REJECTED` | `SERVICE_UNAVAILABLE` |
| HTTP 403 | `SUPABASE_RLS_DENIED` | `SERVICE_UNAVAILABLE` |
| Code `42501` | `SUPABASE_RLS_DENIED` | `SERVICE_UNAVAILABLE` |
| Code `42703` | `SCHEMA_INCOMPATIBLE` | `SERVICE_UNAVAILABLE` |
| Codes schema certifies | `SCHEMA_INCOMPATIBLE` | `SERVICE_UNAVAILABLE` |
| `AbortError`, `ABORT_ERR` ou signal interrompu | `SUPABASE_TIMEOUT` | `SERVICE_UNAVAILABLE` |
| `TypeError` sans signal interrompu | `SUPABASE_NETWORK_ERROR` | `SERVICE_UNAVAILABLE` |
| Statut ou code non reconnu | `SUPABASE_UNAVAILABLE` | `SERVICE_UNAVAILABLE` |

Les messages libres ne sont pas utilises comme preuve principale lorsque le statut, le code ou le signal sont disponibles.

## Simulations hors ligne

| Scenario | Categorie | Terminal harnais | Compteur logique | Compteur physique |
| --- | --- | --- | ---: | ---: |
| HTTP 200 compatible | aucune erreur | `HARNESS_COMPLETED` | 1 | 1 |
| HTTP 401 cle/API refusee | `SUPABASE_AUTH_REJECTED` | `HARNESS_COMPLETED` | 1 | 1 |
| HTTP 401 avec `PGRST301` | `SUPABASE_AUTH_REJECTED` | `HARNESS_COMPLETED` | 1 | 1 |
| HTTP 403 avec `42501` | `SUPABASE_RLS_DENIED` | `HARNESS_COMPLETED` | 1 | 1 |
| HTTP 400 avec `42703` | `SCHEMA_INCOMPATIBLE` | `HARNESS_COMPLETED` | 1 | 1 |
| HTTP inconnu | `SUPABASE_UNAVAILABLE` | `HARNESS_COMPLETED` | 1 | 1 |
| `TypeError` transport direct | `SUPABASE_NETWORK_ERROR` | `HARNESS_COMPLETED` | 1 | 0 |
| `AbortError` | `SUPABASE_TIMEOUT` | `HARNESS_COMPLETED` | 1 | 1 |
| Statut SDK `0` avec signal interrompu | `SUPABASE_TIMEOUT` | `HARNESS_COMPLETED` | 1 | 1 |
| Retry interne SDK bloque localement | `SUPABASE_UNAVAILABLE` | `HARNESS_COMPLETED` | 2 | 1 |

## Preuve du garde anti-retry

- Un wrapper `fetch` borne le transport LIVE.
- Le premier appel logique atteint le transport injecte.
- Tout appel logique suivant retourne une reponse locale bornee.
- Le compteur physique reste a 1 dans le scenario de retry interne.
- Aucune URL, header, cle, JWT, corps brut ou donnee metier n'est journalise.
- Le wrapper entoure le transport du point d'entree LIVE sans modifier la requete initiale.

## Fichiers modifies

- `src/features/yootchat/readPort.ts`
- `src/features/yootchat/supabaseReadAdapter.ts`
- `src/features/yootchat/supabaseReadAdapter.test.ts`
- `src/features/yootchat/runtime.test.ts`
- `scripts/yootchat/runtimeLiveHarness.ts`
- `scripts/yootchat/runtimeLiveHarness.test.ts`
- `scripts/yootchat/runtime-live.manual.ts`
- `scripts/yootchat/supabaseTransportDiagnostic.test.ts`
- `docs/yootchat/supabase-error-classification-lot5b-g.md`

## Validations

- Simulations Lot 5B-G: 10/10 vertes.
- Tests adaptateur et runtime cible: verts.
- Harnais V3: vert.
- YootChat cible: vert.
- Suite complete Jest: verte.
- TypeScript cible: vert.
- ESLint cible: vert.
- `git diff --check`: conforme.
- Scans secrets/ecritures/RPC/reseau: conformes.
- Processus residuel detecte: non.

## Limites

- La cause exacte du blocage live Lot 5B-E n'est pas revendiquee.
- Le diagnostic corrige l'observabilite typologique et borne les retries physiques avant une future tentative.
- Le statut local de blocage anti-retry est volontairement classe `SUPABASE_UNAVAILABLE`.

## Recommandation pour la prochaine tentative live

- Executer une nouvelle tentative live uniquement apres autorisation explicite.
- Rapporter seulement la categorie normalisee, le terminal harnais et les compteurs autorises.
- Interpreter `SUPABASE_NETWORK_ERROR` comme panne de transport stricte, et non plus comme panier generique des erreurs Supabase.

## Cout

0 euro.

## Verdict

`SUPABASE_ERROR_CLASSIFICATION_READY`
