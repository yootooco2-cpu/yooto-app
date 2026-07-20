# YootChat - Lot 5B-D harnais live auditable

Date: 2026-07-20

## Source et filiation

- Depot cible: `https://github.com/yootooco2-cpu/yooto-app.git`
- Branche source: `test/yootchat-runtime-live-validation`
- Commit source obligatoire: `07e4174e562df2d191835f68e379ffae569e329b`
- Parent certifie: `97ce09474466b210474cf71d5b3a71ab8d016bd1`
- Branche locale du lot: `test/yootchat-runtime-live-harness`
- Verdict Lot 5A conserve: `YOOTCHAT_RUNTIME_ORCHESTRATION_READY`
- Verdict Lot 5B conserve: `YOOTCHAT_RUNTIME_LIVE_BLOCKED`

## Diagnostic statique

Le runtime Lot 5A compose l'adaptateur Supabase en lecture seule, puis appelle le moteur
deterministe existant via `runYootChatWithMerchantReadPort`.

Constats statiques confirmes:

- le runtime ne contient pas de boucle infinie evidente;
- le runtime ne contient pas de `fetch` direct;
- le runtime ne depend pas directement de React Native;
- l'adaptateur conserve une projection explicite;
- l'adaptateur conserve un timeout interne;
- le moteur deterministe n'est pas modifie dans ce lot.

## Preuves disponibles sur l'ancien blocage

La tentative live Lot 5B a consomme son unique autorisation. Le harnais temporaire utilise alors
n'a pas ete conserve et n'a pas emis d'etapes intermediaires certifiees. Aucun agregat exploitable
n'a ete produit avant interruption.

Preuves locales encore disponibles:

- rapport Lot 5B certifie et securise dans Git;
- ancien probleme Git `dataless` observe sur des metadonnees Git;
- aucun processus Git ou harnais Lot 5B actif detecte lors de la reprise;
- aucune sortie brute de terminal publiee.

Cause exacte de l'ancien blocage: `PREVIOUS_HARNESS_ROOT_CAUSE_UNPROVEN`.

## Hypotheses refutees

- Le rapport Lot 5B n'est pas perdu: il est securise dans Git.
- Le probleme Git `dataless` n'est pas une preuve d'un blocage du runtime applicatif.
- Aucune preuve ne permet d'attribuer le blocage au moteur deterministe.
- Aucune preuve ne permet d'attribuer le blocage a Supabase plutot qu'au lanceur ou a la fermeture du processus.

## Cause prouvee ou etat inconclusif

Etat inconclusif. Le nouveau harnais est construit pour separer les etapes suivantes lors d'un
prochain lot autorise: preconditions, creation client, creation runtime, demarrage execution,
lecture, moteur, agregation et fermeture du processus.

## Architecture du harnais

Fichiers ajoutes:

- `scripts/yootchat/runtimeLiveHarness.ts`
- `scripts/yootchat/runtimeLiveHarness.test.ts`
- `scripts/yootchat/runtime-live.manual.ts`
- `docs/yootchat/runtime-live-harness-lot5b-d.md`

Le harnais:

- recoit un client conforme a `ReadOnlySupabaseClient`;
- cree le runtime existant;
- lance une seule execution;
- ecoute les evenements existants de l'adaptateur;
- produit uniquement un agregat ferme;
- expose un mode hors ligne avec faux client;
- prepare un point d'entree manuel garde pour un futur live.

## Schema exact des etapes

Etapes autorisees:

- `HARNESS_PRECHECK_START`
- `HARNESS_PRECHECK_OK`
- `HARNESS_CLIENT_READY`
- `HARNESS_RUNTIME_READY`
- `HARNESS_EXECUTE_START`
- `HARNESS_READ_STARTED`
- `HARNESS_READ_SETTLED`
- `HARNESS_ENGINE_SETTLED`
- `HARNESS_AGGREGATE_READY`
- `HARNESS_COMPLETED`
- `HARNESS_TIMEOUT`
- `HARNESS_BLOCKED`

Aucune donnee libre n'est jointe aux etapes.

## Schema exact de l'agregat

Champs autorises:

- `requestCount`
- `readOk`
- `readErrorCode`
- `rowCount`
- `acceptedCount`
- `quarantinedCount`
- `quarantineReasonCounts`
- `engineOk`
- `topic`
- `messageTemplate`
- `recommendationCount`
- `limitationCodes`
- `interfaceActionCount`
- `durationBucketMs`
- `terminalStage`

L'agregat ne contient aucune ligne Supabase, aucun nom, aucun identifiant, aucune coordonnee,
aucune URL, aucune cle, aucun JWT et aucune stack trace.

## Protections de configuration

Le point d'entree manuel refuse:

- mode absent;
- mode inconnu;
- mode `LIVE` sans `YOOTCHAT_LIVE_CONFIRM=YES`;
- URL absente ou invalide;
- cle publique absente;
- cle interdite;
- cle inconnue.

Le mode `DRY_RUN` ne necessite aucune variable Supabase.

## Mecanisme de timeout

Le chemin auditable distingue:

- timeout interne de l'adaptateur, agrege comme `SUPABASE_TIMEOUT`;
- timeout superieur du harnais, agrege comme `HARNESS_TIMEOUT`;
- non-fermeture du processus, controlee par une execution enfant hors ligne sans `--forceExit`.

## Preuve de fin du processus

Le mode hors ligne manuel est execute par Jest avec un fichier non decouvert par la suite normale.
Le test lance un processus enfant, sans `--forceExit`, et verifie une fin normale.

## Resultats des tests

Resultats executes:

- Installation verrouillee: `npm ci --ignore-scripts`, sans variables Supabase transmises a npm.
- Tests du harnais: 26 reussis.
- Commande DRY_RUN manuelle: 1 test reussi, fin normale sans `--forceExit`.
- Tests runtime Lot 5A: 18 reussis.
- Tests YootChat cibles avec harnais: 206 reussis.
- Suite complete: 945 reussis, 6 ignores.
- TypeScript cible harnais: reussi.
- ESLint cible harnais: reussi.
- `git diff --check`: reussi.
- Scan secrets sur les nouveaux fichiers: aucun secret detecte.
- Scan reseau direct sur le harnais: aucun `fetch` direct ni client HTTP direct detecte.
- Scan ecritures/RPC/OpenAI sur les nouveaux fichiers: aucun appel detecte.
- Controle processus apres DRY_RUN: aucun processus manuel restant detecte.

TypeScript global conserve des erreurs preexistantes hors perimetre YootChat sur la propriete
`hovered` de `PressableStateCallbackType`. Aucune erreur TypeScript nouvelle du harnais n'a ete
detectee par le controle cible.

## Commande DRY_RUN executee

Commande prevue pour certification locale:

`YOOTCHAT_MANUAL_JEST_ENTRY=1 YOOTCHAT_RUNTIME_MODE=DRY_RUN YOOTCHAT_LIVE_CONFIRM=NO EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY= EXPO_PUBLIC_SUPABASE_ANON_KEY= npx --no-install jest --watchman=false --testRegex 'scripts/yootchat/runtime-live\\.manual\\.ts$' --runTestsByPath scripts/yootchat/runtime-live.manual.ts --runInBand`

## Future commande LIVE preparee mais non executee

Commande preparee pour un lot ulterieur explicitement autorise:

`YOOTCHAT_MANUAL_JEST_ENTRY=1 YOOTCHAT_RUNTIME_MODE=LIVE YOOTCHAT_LIVE_CONFIRM=YES npx --no-install jest --watchman=false --testRegex 'scripts/yootchat/runtime-live\\.manual\\.ts$' --runTestsByPath scripts/yootchat/runtime-live.manual.ts --runInBand --detectOpenHandles`

Cette commande n'a pas ete executee dans ce lot.

## Cout reel

0 euro.

## Risques restants

- La cause racine de l'ancien blocage reste non prouvee.
- Le prochain live devra confirmer si le blocage etait lie au lanceur, au reseau, a Supabase,
  a l'agregation ou a la fermeture du processus.
- Le point d'entree live prepare utilise le client officiel Supabase et n'a pas ete execute dans ce lot.

## Recommandation unique

Au prochain lot, executer une seule tentative `LIVE` avec le point d'entree versionne et conserver
les etapes et l'agregat bornes comme seules preuves publiees.

## Verdict

`YOOTCHAT_LIVE_HARNESS_READY_ROOT_CAUSE_UNPROVEN`
