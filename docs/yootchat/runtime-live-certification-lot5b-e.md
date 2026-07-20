# YootChat - Lot 5B-E certification live du runtime

Date: 2026-07-20

## Source et filiation Git

- Branche source: `test/yootchat-runtime-live-certification`
- Commit source: `1ca74559bf5055066ec59d0a3f3a56f93db3aa01`
- Parent source: `7e255a2d6540fc16f5534391c177e6067efb99b8`
- Harnais utilise: V3, avec watchdog versionne.

## Preconditions anonymisees

- Branche et commit exacts verifies avant reprise.
- Worktree propre avant restauration de la configuration.
- `.env.local` present apres restauration locale.
- `.env.local` ignore par Git.
- Mode fichier `.env.local`: `600`.
- Declarations URL publiques: 1.
- Declarations cle publishable: 1.
- URL Supabase structurellement valide.
- Prefixe publishable public confirme.
- Aucune cle privilegiee detectee.
- Dependencies presentes.
- Aucun ancien processus live relance pendant ce rapport.
- Aucune valeur de configuration affichee.

## Commande executee

Commande executee exactement une fois:

`YOOTCHAT_RUNTIME_MODE=LIVE YOOTCHAT_LIVE_CONFIRM=YES YOOTCHAT_MANUAL_JEST_ENTRY=1 YOOTCHAT_WATCHDOG_TIMEOUT_MS=10000 node --env-file=.env.local scripts/yootchat/runtime-live-watchdog.mjs`

## Tentatives et SELECT

- Tentatives LIVE consommees: 1.
- SELECT Supabase consommes: 1.
- Retry: 0.
- Requete diagnostique: 0.
- Curl ou fetch manuel: 0.

## Etapes observees

1. `HARNESS_PRECHECK_START`
2. `HARNESS_PRECHECK_OK`
3. `HARNESS_CLIENT_READY`
4. `HARNESS_RUNTIME_READY`
5. `HARNESS_EXECUTE_START`
6. `HARNESS_READ_STARTED`
7. `HARNESS_READ_SETTLED`
8. `HARNESS_ENGINE_SETTLED`
9. `HARNESS_AGGREGATE_READY`
10. `HARNESS_COMPLETED`

## Resultat du watchdog

- Watchdog: `COMPLETED`.
- Code de sortie: 0.
- Signal: aucun.
- Derniere etape: `HARNESS_COMPLETED`.

## Agregat anonymise

```json
{
  "requestCount": 1,
  "readOk": false,
  "readErrorCode": "SUPABASE_NETWORK_ERROR",
  "rowCount": 0,
  "acceptedCount": 0,
  "quarantinedCount": 0,
  "quarantineReasonCounts": {},
  "engineOk": false,
  "topic": "NO_RESULT",
  "messageTemplate": "SERVICE_UNAVAILABLE",
  "recommendationCount": 0,
  "limitationCodes": [],
  "interfaceActionCount": 0,
  "durationBucketMs": "51-250",
  "terminalStage": "HARNESS_COMPLETED"
}
```

## Verdict

`YOOTCHAT_RUNTIME_LIVE_BLOCKED`

## Limites

- Le watchdog et le harnais se terminent correctement.
- La tentative consomme bien une seule lecture.
- La lecture publique n'est pas certifiable: `readOk=false`.
- Le moteur deterministe n'est pas certifiable sur cette tentative: `engineOk=false`.
- Aucun resultat marchand n'a ete certifie.

## Absences confirmees

- Aucune donnee brute affichee.
- Aucun nom de commerce affiche.
- Aucun identifiant de commerce affiche.
- Aucune coordonnee affichee.
- Aucune URL complete affichee.
- Aucune cle, JWT ou secret affiche.
- Aucune stack trace publiee.
- Aucune ecriture Supabase.
- Aucun INSERT, UPDATE, DELETE ou UPSERT.
- Aucun RPC.
- Aucun appel OpenAI.
- Aucun deploiement.
- Aucune migration.
- Aucun push.
- Aucune fusion.

## Cout reel

0 euro.
