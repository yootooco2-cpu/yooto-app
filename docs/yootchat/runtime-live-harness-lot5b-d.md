# YootChat - Lot 5B-D harnais live auditable

Date: 2026-07-20

## Source et filiation

- Depot cible: `https://github.com/yootooco2-cpu/yooto-app.git`
- Branche source: `test/yootchat-runtime-live-validation`
- Commit source obligatoire: `07e4174e562df2d191835f68e379ffae569e329b`
- Parent certifie: `97ce09474466b210474cf71d5b3a71ab8d016bd1`
- Branche locale du lot: `test/yootchat-runtime-live-harness`
- Branche corrective D2: `fix/yootchat-runtime-live-harness-streaming`
- Commit source D2: `a7afe2e5f6207b0b1ad653bb59723380a32936d6`
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
- emet chaque etape en temps reel via `onStage`;
- produit uniquement un agregat ferme;
- expose un mode hors ligne avec faux client;
- prepare un point d'entree manuel garde pour un futur live;
- passe par un watchdog exterieur Node sans dependance pour les futures tentatives live.

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
Chaque occurrence est emise une seule fois au moment ou elle est atteinte. La liste finale reste
conservee dans le resultat, mais le point d'entree manuel ne reimprime pas les etapes apres la fin.

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
Le mode `LIVE` D2 exige uniquement `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` avec prefixe public
publishable. La cle anon legacy n'est pas acceptee par ce runner live.

La future demande live est bornee:

- message francais local;
- langue `fr`;
- aucune ville;
- aucune position;
- aucune coordonnee;
- aucun identifiant;
- aucun filtre metier;
- limite de lecture `5`.

Le texte complet de la demande n'est pas journalise.

## Mecanisme de timeout

Le chemin auditable distingue:

- timeout interne de l'adaptateur, agrege comme `SUPABASE_TIMEOUT`;
- timeout superieur du harnais, agrege comme `HARNESS_TIMEOUT`;
- non-fermeture du processus, controlee par une execution enfant hors ligne sans `--forceExit`.
- watchdog exterieur, code de sortie `124` en cas de depassement de duree totale.

Le timeout superieur du harnais declenche un `AbortController` partage avec l'adaptateur lorsque
le signal n'est pas fourni par l'appelant. Le faux client bloque certifie l'observation de cet abort.

## Preuve de fin du processus

Le mode hors ligne manuel est execute par Jest avec un fichier non decouvert par la suite normale.
Le test lance un processus enfant, sans `--forceExit`, et verifie une fin normale. D2 ajoute une
execution via `runtime-live-watchdog.mjs`, ainsi qu'un scenario bloque simule qui sort en `124` et
conserve la derniere etape recue avant arret.

## Resultats des tests

Resultats executes apres D2:

- Installation verrouillee: `npm ci --ignore-scripts`, sans variables Supabase transmises a npm.
- Tests correctifs du harnais: 35 reussis.
- Commande DRY_RUN manuelle via watchdog: terminee avec code `0`.
- Scenario watchdog bloque simule: termine avec code `124`.
- Tests runtime Lot 5A: 18 reussis.
- Tests YootChat cibles avec harnais: 215 reussis.
- Suite complete: 954 reussis, 6 ignores.
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

Commande executee pour certification locale:

`YOOTCHAT_RUNTIME_MODE=DRY_RUN YOOTCHAT_LIVE_CONFIRM=NO EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY= EXPO_PUBLIC_SUPABASE_ANON_KEY= YOOTCHAT_MANUAL_JEST_ENTRY=1 YOOTCHAT_WATCHDOG_TIMEOUT_MS=10000 node scripts/yootchat/runtime-live-watchdog.mjs`

## Future commande LIVE preparee mais non executee

Commande preparee pour un lot ulterieur explicitement autorise:

`YOOTCHAT_RUNTIME_MODE=LIVE YOOTCHAT_LIVE_CONFIRM=YES YOOTCHAT_MANUAL_JEST_ENTRY=1 YOOTCHAT_WATCHDOG_TIMEOUT_MS=10000 node scripts/yootchat/runtime-live-watchdog.mjs`

Cette commande n'a pas ete executee dans ce lot.

## Cout reel

0 euro.

## Risques restants

- La cause racine de l'ancien blocage reste non prouvee.
- Le prochain live devra confirmer si le blocage etait lie au lanceur, au reseau, a Supabase,
  a l'agregation ou a la fermeture du processus.
- Le point d'entree live prepare utilise le client officiel Supabase et n'a pas ete execute dans ce lot.
- Le watchdog lance `npx --no-install` en interne et interdit toute installation interactive.

## Recommandation unique

Au prochain lot, executer une seule tentative `LIVE` via le watchdog versionne et conserver les
etapes en temps reel et l'agregat borne comme seules preuves publiees.

## Verdict

`YOOTCHAT_LIVE_HARNESS_V2_READY`
