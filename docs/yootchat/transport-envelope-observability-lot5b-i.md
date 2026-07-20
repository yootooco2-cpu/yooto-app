# YootChat - Lot 5B-I observabilite sure de l'enveloppe transport

Date: 2026-07-20

## Source et filiation

- Branche source: `test/yootchat-runtime-live-classified`
- Commit source: `b367bff1c48ed5abd2b4e1b55ba73263b11a5fe7`
- Parent source: `5e15161e4219497f3feac889dd5361bd5a83641d`
- Branche de correction: `fix/yootchat-transport-envelope-observability`

## Objectif

Rendre explicable une categorie `SUPABASE_UNAVAILABLE` sans nouvelle requete reelle, en observant uniquement l'enveloppe du premier transport physique.

Le Lot 5B-H reste interprete prudemment:

- Hypothese 1: premier appel physique avec statut/code inconnu.
- Hypothese 2: premier appel echoue, puis retry logique bloque localement.
- Aucune hypothese n'est declaree vraie sans la future enveloppe transport.

## Enveloppe transport autorisee

Le garde anti-retry expose uniquement:

- `logicalCallCount`
- `physicalCallCount`
- `retryBlocked`
- `firstOutcome`
- `firstHttpStatus`
- `firstHttpStatusClass`

Valeurs normalisees:

- `firstOutcome`: `HTTP_RESPONSE`, `TYPE_ERROR`, `ABORTED`, `OTHER_ERROR`, `NONE`.
- `firstHttpStatusClass`: `HTTP_2XX`, `HTTP_4XX`, `HTTP_5XX`, `HTTP_OTHER`, `NONE`.

Le statut HTTP numerique est conserve uniquement comme metadonnee technique non sensible.

## Garde anti-retry

- Premier appel logique: atteint au maximum une fois le transport physique.
- Appels logiques suivants: bloques localement.
- Le blocage local retourne le code reserve `YOOTCHAT_RETRY_BLOCKED` avec statut local reserve `599`.
- Aucun second appel physique ne peut atteindre Supabase depuis ce garde.
- Aucune URL, cle, header, corps, message brut, JWT ou donnee metier n'est conserve.

## Classification ajoutee

| Preuve locale | Categorie |
| --- | --- |
| Code `YOOTCHAT_RETRY_BLOCKED` | `SUPABASE_RETRY_BLOCKED` |
| Statut local `599` | `SUPABASE_RETRY_BLOCKED` |

Cette categorie signifie seulement qu'un retry logique du SDK a ete empeche. Elle ne prouve pas la cause initiale du premier echec.

## Simulations hors ligne

| Scenario | Categorie | Transport observe |
| --- | --- | --- |
| HTTP 200 compatible | aucune erreur | 1 logique, 1 physique, `HTTP_RESPONSE`, `HTTP_2XX` |
| HTTP 401 cle/API refusee | `SUPABASE_AUTH_REJECTED` | 1 logique, 1 physique, `HTTP_RESPONSE`, `HTTP_4XX` |
| HTTP 401 avec `PGRST301` | `SUPABASE_AUTH_REJECTED` | 1 logique, 1 physique, `HTTP_RESPONSE`, `HTTP_4XX` |
| HTTP 403 avec `42501` | `SUPABASE_RLS_DENIED` | 1 logique, 1 physique, `HTTP_RESPONSE`, `HTTP_4XX` |
| HTTP 400 avec `42703` | `SCHEMA_INCOMPATIBLE` | 1 logique, 1 physique, `HTTP_RESPONSE`, `HTTP_4XX` |
| HTTP inconnu | `SUPABASE_UNAVAILABLE` | 1 logique, 1 physique, `HTTP_RESPONSE`, `HTTP_4XX` |
| TypeError direct | `SUPABASE_NETWORK_ERROR` | 1 logique, 0 physique dans le client fake direct |
| Abort / statut SDK 0 avec signal interrompu | `SUPABASE_TIMEOUT` | 1 logique, 1 physique, `ABORTED`, `NONE` |
| Retry logique SDK bloque | `SUPABASE_RETRY_BLOCKED` | 2 logiques, 1 physique, `TYPE_ERROR`, `NONE`, retry bloque |

## Sortie manuelle securisee

Apres l'agregat, le point d'entree manuel peut emettre:

```json
{
  "transport": {
    "logicalCallCount": 1,
    "physicalCallCount": 1,
    "retryBlocked": false,
    "firstOutcome": "HTTP_RESPONSE",
    "firstHttpStatus": 200,
    "firstHttpStatusClass": "HTTP_2XX"
  }
}
```

Le watchdog relaie cette ligne seulement si elle passe le filtre anti-fuite existant.

## Fichiers modifies

- `src/features/yootchat/readPort.ts`
- `src/features/yootchat/supabaseReadAdapter.ts`
- `src/features/yootchat/supabaseReadAdapter.test.ts`
- `src/features/yootchat/runtime.test.ts`
- `scripts/yootchat/runtime-live.manual.ts`
- `scripts/yootchat/runtime-live-watchdog.mjs`
- `scripts/yootchat/runtimeLiveHarness.test.ts`
- `scripts/yootchat/supabaseTransportDiagnostic.test.ts`
- `docs/yootchat/transport-envelope-observability-lot5b-i.md`

## Validations

- Tests ciblés Lot 5B-I: verts.
- TypeScript cible: vert.
- ESLint cible: vert.
- Suite complete Jest: verte.
- `git diff --check`: conforme.
- Scans secrets/ecritures/RPC/reseau: conformes.

## Limites

- Aucun nouveau live n'a ete effectue.
- Le resultat Lot 5B-H n'est pas requalifie retrospectivement.
- La prochaine tentative live devra lire l'objet `transport` pour choisir entre statut/code inconnu initial et retry logique bloque.

## Cout et securite

- Appel Supabase reel: 0.
- SELECT reel: 0.
- Curl ou fetch manuel: 0.
- Ecriture Supabase: 0.
- RPC: 0.
- OpenAI: 0.
- Deploiement: 0.
- Donnee brute: 0.
- Secret affiche: 0.
- Cout: 0 euro.

## Verdict

`SUPABASE_TRANSPORT_ENVELOPE_OBSERVABILITY_READY`
